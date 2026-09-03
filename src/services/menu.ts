import axios, { AxiosError } from 'axios';
import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import config from '../config';
import { MenuRequest, MenuResponse } from '../types/menu';
import { ApiError, AuthenticationError } from '../types/errors';

const HTTPS_AGENT = new https.Agent({
  keepAlive: true,
  timeout: 30000,
});

interface LoginResponse {
  headers: {
    'set-cookie'?: string[];
  };
}

export class MenuService {
  private cookie: string | undefined;

  constructor() {
    this.cookie = config.api.cookie;
  }

  private async refreshCookie(retryCount = 0): Promise<string> {
    const maxRetries = 3;
    const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff

    try {
      console.log(`Attempting to refresh cookie (attempt ${retryCount + 1}/${maxRetries + 1})`);

      const loginResponse = await axios.post<LoginResponse>(
        'https://ristorazionescolastica.it/Account/Login',
        {
          Email: config.api.username,
          Password: config.api.password,
          RememberMe: true
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          maxRedirects: 0,
          validateStatus: status => status >= 200 && status < 400,
          timeout: 30000, // 30 second timeout
          httpsAgent: HTTPS_AGENT
        }
      );

      const cookies = loginResponse.headers['set-cookie'];
      if (!cookies) {
        throw new AuthenticationError('No cookies received from login');
      }

      const authCookie = cookies.find(c => c.startsWith('.AspNetCore.Identity.Application='));
      if (!authCookie) {
        throw new AuthenticationError('Authentication cookie not found in response');
      }

      const cookie = authCookie.slice(authCookie.indexOf('=') + 1).split(';')[0];
      
      const envPath = path.join(process.cwd(), '.env');
      try {
        const envContent = await fs.readFile(envPath, 'utf-8');
        const updatedContent = envContent.includes('API_COOKIE=')
          ? envContent.replace(/API_COOKIE=.*/, `API_COOKIE=${cookie}`)
          : `${envContent.trimEnd()}\nAPI_COOKIE=${cookie}\n`;
        await fs.writeFile(envPath, updatedContent, 'utf-8');
      } catch (error) {
        console.warn('Could not persist refreshed cookie:', error);
      }

      this.cookie = cookie;
      console.log(`Cookie refreshed successfully`);
      return cookie;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Cookie refresh attempt ${retryCount + 1} failed:`, errorMessage);

      // Check if we should retry
      if (retryCount < maxRetries) {
        console.log(`Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.refreshCookie(retryCount + 1);
      }

      if (error instanceof AuthenticationError) {
        throw error;
      }

      // Check for specific TLS/network errors
      const err = error as any;
      if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND' || errorMessage.includes('TLS') || errorMessage.includes('socket')) {
        throw new AuthenticationError(`Network/TLS error after ${maxRetries + 1} attempts: ${errorMessage}`);
      }

      throw new AuthenticationError(`Failed to refresh cookie after ${maxRetries + 1} attempts: ${errorMessage}`);
    }
  }

  private async makeRequest(params: MenuRequest, cookieValue: string, retryCount = 0): Promise<MenuResponse> {
    const maxRetries = 2;
    const retryDelay = Math.pow(2, retryCount) * 2000; // Exponential backoff starting at 2s

    try {
      console.log(`Making API request (attempt ${retryCount + 1}/${maxRetries + 1})`);

      const response = await axios.post<MenuResponse>(config.api.url, params, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'it,en-GB;q=0.9,en;q=0.8',
          'Content-Type': 'application/json',
          'Cookie': `.AspNetCore.Identity.Application=${cookieValue}`,
          'Origin': 'https://ristorazionescolastica.it',
          'Referer': 'https://ristorazionescolastica.it/bassa-romagna/menu/',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin'
        },
        timeout: 30000, // 30 second timeout
        httpsAgent: HTTPS_AGENT
      });

      if (!response.data.succeeded) {
        throw new ApiError('API request was not successful');
      }

      console.log(`API request successful`);
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`API request attempt ${retryCount + 1} failed:`, errorMessage);

      // Check if we should retry for network/TLS errors
      const err = error as any;
      if (retryCount < maxRetries && (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT' || errorMessage.includes('TLS') || errorMessage.includes('socket') || errorMessage.includes('timeout'))) {
        console.log(`Retrying API request in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.makeRequest(params, cookieValue, retryCount + 1);
      }

      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          throw new AuthenticationError('Cookie expired');
        }
        throw new ApiError(errorMessage, error.response?.status);
      }
      throw error;
    }
  }

  async getMenuData(params: MenuRequest): Promise<MenuResponse> {
    if (!this.cookie) {
      this.cookie = await this.refreshCookie();
    }

    try {
      return await this.makeRequest(params, this.cookie);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        console.log('Cookie expired, refreshing...');
        this.cookie = await this.refreshCookie();
        return await this.makeRequest(params, this.cookie);
      }
      throw error;
    }
  }

  async saveMenuToMarkdown(menuData: MenuResponse): Promise<string> {
    const { dishes, day, menus } = menuData.data;

    // Find the current menu name
    const currentMenu = menus.find(m => m.diet.id.toString() === menuData.data.selectedDietId?.toString());
    const menuName = currentMenu?.name || 'Menu';

    // Group dishes by course
    const courseGroups = dishes.reduce((acc, dish) => {
      const courseName = dish.course.name;
      if (!acc[courseName]) {
        acc[courseName] = [];
      }
      acc[courseName].push(dish.name);
      return acc;
    }, {} as Record<string, string[]>);

    // Create markdown content for this menu
    let menuContent = `## ${menuName}\n\n`;
    for (const [course, dishes] of Object.entries(courseGroups)) {
      if (dishes.length > 0) {
        menuContent += `### ${course}\n`;
        dishes.forEach(dish => {
          menuContent += `- ${dish}\n`;
        });
        menuContent += '\n';
      }
    }

    return menuContent;
  }
}