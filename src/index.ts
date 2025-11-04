import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

interface MenuRequest {
  enteName: string;
  date: string;
  dietId?: string | null;
  menuId: string;
  serviceId: string;
  supplypointId: string;
}

const API_URL = 'https://ristorazionescolastica.it/api/Enti/getDayMenuDataSource';

export async function getMenuData(params: MenuRequest) {
  try {
    const response = await axios.post(API_URL, params, {
      auth: {
        username: process.env.API_USERNAME || '',
        password: process.env.API_PASSWORD || ''
      }
    });
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`API request failed: ${error.message}`);
    }
    throw error;
  }
}

// CLI handling
if (require.main === module) {
  const { program } = require('commander');
  
  program
    .option('--ente <name>', 'Ente name')
    .option('--date <date>', 'Date in YYYY-MM-DD format')
    .option('--menu-id <id>', 'Menu ID')
    .option('--service-id <id>', 'Service ID')
    .option('--supplypoint-id <id>', 'Supply Point ID')
    .option('--diet-id <id>', 'Diet ID')
    .parse(process.argv);

  const options = program.opts();
  
  getMenuData({
    enteName: options.ente,
    date: options.date,
    menuId: options.menuId,
    serviceId: options.serviceId,
    supplypointId: options.supplypointId,
    dietId: options.dietId || null
  })
    .then(data => console.log(JSON.stringify(data, null, 2)))
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}