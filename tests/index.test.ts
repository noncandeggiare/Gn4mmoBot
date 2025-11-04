import { getMenuData } from '../src';

describe('getMenuData', () => {
  it('should fetch menu data successfully', async () => {
    const params = {
      enteName: 'bassa-romagna',
      date: '2025-11-04',
      menuId: '591',
      serviceId: '3',
      supplypointId: '31'
    };

    const result = await getMenuData(params);
    expect(result).toBeDefined();
  });

  // Add more tests here for error cases
});