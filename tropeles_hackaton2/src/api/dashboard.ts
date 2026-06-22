import { apiFetch } from './client';
import type { DashboardSummary } from '../types/api';

export function getDashboardSummary() {
  return apiFetch<DashboardSummary>('/dashboard/summary');
}
