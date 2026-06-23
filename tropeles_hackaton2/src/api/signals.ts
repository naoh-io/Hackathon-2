import { apiFetch } from './client';

export interface Signal {
  id: string;
  signalType: string;
  severity: string;
  status: string;
  rawContent: string;
  createdAt: string;
  updatedAt: string;
  tropel: {
    id: string;
    name: string;
    species: string;
  };
}

export interface SignalFeedResponse {
  items: Signal[];
  nextCursor: string | null;
  hasMore: boolean;
  totalEstimate: number;
}

export interface SignalFilters {
  signalType?: string;
  severity?: string;
  status?: string;
  q?: string;
}

export function getSignalsFeed(cursor?: string | null, limit = 15, filters: SignalFilters = {}) {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', String(limit));
  if (filters.signalType) params.set('signalType', filters.signalType);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.status) params.set('status', filters.status);
  if (filters.q) params.set('q', filters.q);
  return apiFetch<SignalFeedResponse>(`/signals/feed?${params.toString()}`);
}