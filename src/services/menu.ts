import axios, { AxiosError } from 'axios';
import fs from 'fs/promises';
import path from 'path';
import config from '../config';
import { MenuRequest, MenuResponse } from '../types/menu';
import { ApiError, AuthenticationError } from '../types/errors';
import { fileExists } from '../utils';

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

  private async refreshCookie(): Promise<string> {
    try {
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
          validateStatus: status => status >= 200 && status < 400
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

      const cookie = authCookie.split(';')[0].split('=')[1];
      
      // Update .env file with new cookie
      const envPath = path.join(process.cwd(), '.env');
      const envContent = await fs.readFile(envPath, 'utf-8');
      const updatedContent = envContent.replace(
        /API_COOKIE=.*/,
        `API_COOKIE=${cookie}`
      );
      await fs.writeFile(envPath, updatedContent, 'utf-8');

      this.cookie = cookie;
      return cookie;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(`Failed to refresh cookie: ${String(error)}`);
    }
  }

  private async makeRequest(params: MenuRequest, cookieValue: string): Promise<MenuResponse> {
    try {
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
        }
      });

      if (!response.data.succeeded) {
        throw new ApiError('API request was not successful');
      }

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          throw new AuthenticationError('Cookie expired');
        }
        throw new ApiError(error.message, error.response?.status);
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