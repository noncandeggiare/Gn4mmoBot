import { MenuServiceError } from '../types/errors';

export interface MenuDateOverride {
  from: string;
  to: string;
  ids: string[];
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function shouldIncludeMenu(menuId: string, dayOfWeek: number, filterRules: Record<string, { daysOfWeek: number[] }>): boolean {
  const rule = filterRules[menuId];
  if (!rule) {
    return true; // No rules means always include
  }
  return rule.daysOfWeek.includes(dayOfWeek);
}

export function resolveMenuIdsForDate(
  date: string,
  defaultMenuIds: string[],
  dateOverrides: MenuDateOverride[] = [],
  filterRules: Record<string, { daysOfWeek: number[] }> = {}
): string[] {
  const targetDate = date.slice(0, 10);
  const override = dateOverrides.find(({ from, to }) => targetDate >= from && targetDate <= to);
  const effectiveMenuIds = override?.ids ?? defaultMenuIds;
  const dayOfWeek = new Date(`${targetDate}T00:00:00`).getDay();

  return effectiveMenuIds.filter(menuId => shouldIncludeMenu(menuId, dayOfWeek, filterRules));
}

export function ensureError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new MenuServiceError(String(error), 'UNKNOWN_ERROR');
}