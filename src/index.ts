import './types/errors';
import { MenuService } from './services/menu';
import { run } from './cli';
import { MenuRequest, MenuResponse } from './types/menu';

export { MenuRequest, MenuResponse };

// Export the service for library usage
export const menuService = new MenuService();
export const { getMenuData, saveMenuToMarkdown } = menuService;

// CLI handling
if (require.main === module) {
  run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}