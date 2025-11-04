import dotenv from 'dotenv';
import { ConfigurationError } from '../types/errors';

dotenv.config();

interface Config {
  api: {
    url: string;
    username: string;
    password: string;
    cookie?: string;
  };
  output: {
    file: string;
  };
  menu: {
    ids: string[];
    filterRules: {
      [key: string]: {
        daysOfWeek: number[];
      };
    };
  };
}

function validateConfig(config: Config): void {
  if (!config.api.url) {
    throw new ConfigurationError('API URL is not configured');
  }
  if (!config.api.username || !config.api.password) {
    throw new ConfigurationError('API credentials are not configured');
  }
  if (!config.menu.ids || config.menu.ids.length === 0) {
    throw new ConfigurationError('No menu IDs configured');
  }
}

const config: Config = {
  api: {
    url: process.env.API_URL || 'https://ristorazionescolastica.it/api/Enti/getDayMenuDataSource',
    username: process.env.API_USERNAME || '',
    password: process.env.API_PASSWORD || '',
    cookie: process.env.API_COOKIE,
  },
  output: {
    file: process.env.OUTPUT_FILE || 'output.md',
  },
  menu: {
    ids: (process.env.MENU_IDS || '').split(',').filter(Boolean),
    filterRules: {
      '591': { // primaria menu
        daysOfWeek: [1, 3], // Monday and Wednesday
      },
    },
  },
};

validateConfig(config);

export default config;