import axios, { AxiosError } from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { MenuRequest, MenuResponse } from './types';
import config from '../config';

interface LoginResponse {
  headers: {
    'set-cookie'?: string[];
  };
}

export class MenuApiClient {
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
          validateStatus: status => status >= 200 && status < 400,
          httpsAgent: {
            rejectUnauthorized: false
          } as any
        }
      );

      const cookies = loginResponse.headers['set-cookie'];
      if (!cookies) {
        throw new Error('No cookies received from login');
      }

      const authCookie = cookies.find(c => c.startsWith('.AspNetCore.Identity.Application='));
      if (!authCookie) {
        throw new Error('Authentication cookie not found in response');
      }

      const cookie = authCookie.split(';')[0].split('=')[1];
      
      // Update .env file with new cookie
      const envPath = path.join(__dirname, '../../.env');
      const envContent = await fs.readFile(envPath, 'utf-8');
      const updatedContent = envContent.replace(
        /API_COOKIE=.*/,
        `API_COOKIE=${cookie}`
      );
      await fs.writeFile(envPath, updatedContent, 'utf-8');

      this.cookie = cookie;
      return cookie;
    } catch (error) {
      throw new Error(`Failed to refresh cookie: ${(error as Error).message}`);
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
        },
        httpsAgent: {
          rejectUnauthorized: false
        } as any
      });

      if (!response.data.succeeded) {
        throw new Error('API request was not successful');
      }

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          throw new Error('Cookie expired');
        }
        throw new Error(`API request failed: ${error.message} (${error.response?.status || 'unknown status'})`);
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
      if (error instanceof Error && error.message.includes('Cookie expired')) {
        console.log('Cookie expired, refreshing...');
        this.cookie = await this.refreshCookie();
        return await this.makeRequest(params, this.cookie);
      }
      throw error;
    }
  }
}