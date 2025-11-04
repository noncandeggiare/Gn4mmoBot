import { MenuServiceError } from '../types/errors';

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

export function ensureError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new MenuServiceError(String(error), 'UNKNOWN_ERROR');
}