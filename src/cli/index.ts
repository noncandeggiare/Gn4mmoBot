import { program } from 'commander';
import config from '../config';
import { MenuService } from '../services/menu';
import { MenuRequest } from '../types/menu';
import { fileExists, formatDate, shouldIncludeMenu, ensureError } from '../utils';
import fs from 'fs/promises';

interface CliOptions {
  ente: string;
  date?: string;
  serviceId: string;
  supplypointId: string;
  menuIds?: string;
  output?: string;
}

export async function run(): Promise<void> {
  program
    .option('--ente <n>', 'Ente name', 'bassa-romagna')
    .option('--date <date>', 'Date in YYYY-MM-DD format')
    .option('--service-id <id>', 'Service ID', '3')
    .option('--supplypoint-id <id>', 'Supply Point ID', '31')
    .option('--menu-ids <ids>', 'Comma-separated Menu IDs', config.menu.ids.join(','))
    .option('--output <file>', 'Output file path', config.output.file)
    .parse(process.argv);

  const options = program.opts() as CliOptions;
  
  // If no date is provided, use today
  const date = options.date || formatDate(new Date());
  const outputFile = options.output || config.output.file;
  
  // Get menu IDs from options or environment
  const menuIds = (options.menuIds || '').split(',').filter(Boolean);

  // Filter menus based on day of week
  const today = new Date(date);
  const dayOfWeek = today.getDay();
  const filteredMenuIds = menuIds.filter(id => 
    shouldIncludeMenu(id, dayOfWeek, config.menu.filterRules)
  );

  const menuService = new MenuService();

  try {
    // Clear the output file before starting
    if (await fileExists(outputFile)) {
      await fs.unlink(outputFile);
    }

    // Execute requests for filtered menus
    const results = await Promise.all(
      filteredMenuIds.map(menuId => {
        const request: MenuRequest = {
          enteName: options.ente,
          date,
          menuId,
          serviceId: options.serviceId,
          supplypointId: options.supplypointId,
          dietId: null
        };
        return menuService.getMenuData(request);
      })
    );

    // Filter out any responses without dishes
    const validResults = results.filter(result => result.data.dishes.length > 0);

    // Check if the menu is essentially empty (only generic items like "FRUTTA")
    const hasSubstantialContent = validResults.some(result => {
      const dishes = result.data.dishes;
      // Consider it substantial if it has more than just "FRUTTA" or very few items
      const nonGenericDishes = dishes.filter(dish => 
        !dish.name.toUpperCase().includes('FRUTTA') && 
        dish.name.trim().length > 0
      );
      return nonGenericDishes.length > 0 || dishes.length > 2;
    });

    if (validResults.length > 0 && hasSubstantialContent) {
      // Get the formatted date from the first result
      const { day } = validResults[0].data;
      const formattedDate = `${day.weekDay} ${day.dd} ${day.monthName} ${day.year}`;
      
      // Collect all menu contents
      const menuContents = await Promise.all(validResults.map(result => menuService.saveMenuToMarkdown(result)));
      
      // Sort menus (infanzia before primaria)
      menuContents.sort((a, b) => {
        const isInfanziaA = a.toLowerCase().includes('infanzia');
        const isInfanziaB = b.toLowerCase().includes('infanzia');
        return isInfanziaB ? 1 : isInfanziaA ? -1 : 0;
      });

      // Create final content
      const content = `# Menu del ${formattedDate}\n\n${menuContents.join('')}`;
      
      // Write to file
      await fs.writeFile(outputFile, content, 'utf-8');
      console.log(`Menu saved to ${outputFile}`);
    } else {
      // No substantial menus found - school is closed or menu contains only generic items
      const formattedDate = `${new Date(date).toLocaleDateString('it-IT', { 
        weekday: 'long', 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      })}`;
      
      const content = `# Menu del ${formattedDate}\n\n## Scuola chiusa\n\nNessun menu disponibile per questa data.`;
      
      // Write to file
      await fs.writeFile(outputFile, content, 'utf-8');
      console.log(`School closed message saved to ${outputFile}`);
    }
  } catch (error) {
    const err = ensureError(error);
    console.error('Error:', err.message);
    process.exit(1);
  }
}