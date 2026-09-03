import { MenuServiceError } from '../types/errors';

export interface MenuDateOverride {
  from: string;
  to: string;
  ids: string[];
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidDateString(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && formatDate(parsed) === date;
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
  if (!isValidDateString(date)) {
    throw new MenuServiceError(`Invalid date: ${date}`, 'INVALID_DATE');
  }
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