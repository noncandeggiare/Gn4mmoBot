export interface MenuRequest {
  enteName: string;
  date: string;
  dietId?: string | null;
  menuId: string;
  serviceId: string;
  supplypointId: string;
}

export interface Dish {
  name: string;
  course: {
    name: string;
  };
}

export interface Menu {
  id: number;
  name: string;
  diet: {
    id: number;
    name: string;
  };
}

export interface Day {
  date: string;
  weekDay: string;
  dd: string;
  mm: string;
  year: string;
  monthName: string;
}

export interface MenuResponse {
  data: {
    dishes: Dish[];
    day: Day;
    menus: Menu[];
    selectedDietId: number;
  };
  succeeded: boolean;
}