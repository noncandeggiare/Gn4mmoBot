import { menuService } from '../src';
import { MenuService } from '../src/services/menu';
import { ApiError, AuthenticationError } from '../src/types/errors';
import { shouldIncludeMenu } from '../src/utils';

describe('MenuService', () => {
  let service: MenuService;

  beforeEach(() => {
    service = menuService;
  });

  describe('getMenuData', () => {
    it('should fetch menu data successfully', async () => {
      const params = {
        enteName: 'bassa-romagna',
        date: '2025-11-04',
        menuId: '591',
        serviceId: '3',
        supplypointId: '31'
      };

      const result = await service.getMenuData(params);
      expect(result).toBeDefined();
      expect(result.succeeded).toBe(true);
      expect(result.data.dishes).toBeDefined();
    });

    it('should handle expired cookie', async () => {
      // TODO: Mock expired cookie scenario
    });

    it('should handle API errors', async () => {
      // TODO: Mock API error scenarios
    });
  });
});

describe('Menu filtering', () => {
  const filterRules = {
    '591': { daysOfWeek: [1, 3] } // Monday and Wednesday
  };

  it('should include menu 591 on Monday', () => {
    const result = shouldIncludeMenu('591', 1, filterRules);
    expect(result).toBe(true);
  });

  it('should include menu 591 on Wednesday', () => {
    const result = shouldIncludeMenu('591', 3, filterRules);
    expect(result).toBe(true);
  });

  it('should not include menu 591 on other days', () => {
    const result = shouldIncludeMenu('591', 2, filterRules);
    expect(result).toBe(false);
  });

  it('should include menus without rules on any day', () => {
    const result = shouldIncludeMenu('590', 2, filterRules);
    expect(result).toBe(true);
  });
});