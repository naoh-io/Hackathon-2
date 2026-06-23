import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../api/client";
import type { Signal, SignalsFeedResponse } from "../types";

interface FeedFilters {
  signalType: string;
  severity: string;
  status: string;
  q: string;
}

export function useInfiniteSignals(filters: FeedFilters) {
  const [items, setItems] = useState<Signal[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const inFlightRef = useRef(false);
  const requestKeyRef = useRef(0);

  const buildQuery = useCallback(
    (cursor?: string | null) => {
      const query = new URLSearchParams();
      query.set("limit", "15");

      if (cursor) query.set("cursor", cursor);

      Object.entries(filters).forEach(([key, value]) => {
        if (value) query.set(key, value);
      });

      return query.toString();
    },
    [filters]
  );

  const loadFirstPage = useCallback(async () => {
    const currentKey = ++requestKeyRef.current;

    setLoadingInitial(true);
    setError("");
    setItems([]);
    setNextCursor(null);
    setHasMore(true);

    try {
      const response = await apiFetch<SignalsFeedResponse>(
        `/signals/feed?${buildQuery()}`
      );

      if (currentKey !== requestKeyRef.current) return;

      setItems(response.items);
      setNextCursor(response.nextCursor);
      setHasMore(response.hasMore);
    } catch {
      if (currentKey === requestKeyRef.current) {
        setError("No se pudo cargar el feed.");
      }
    } finally {
      if (currentKey === requestKeyRef.current) {
        setLoadingInitial(false);
      }
    }
  }, [buildQuery]);

  const loadMore = useCallback(async () => {
    if (!hasMore || inFlightRef.current || loadingInitial || !nextCursor) return;

    inFlightRef.current = true;
    setLoadingMore(true);
    setError("");

    const currentKey = requestKeyRef.current;

    try {
      const response = await apiFetch<SignalsFeedResponse>(
        `/signals/feed?${buildQuery(nextCursor)}`
      );

      if (currentKey !== requestKeyRef.current) return;

      setItems((prev) => {
        const map = new Map<string, Signal>();

        for (const item of prev) map.set(item.id, item);
        for (const item of response.items) map.set(item.id, item);

        return Array.from(map.values());
      });

      setNextCursor(response.nextCursor);
      setHasMore(response.hasMore);
    } catch {
      if (currentKey === requestKeyRef.current) {
        setError("Error al cargar más señales. Puedes reintentar.");
      }
    } finally {
      inFlightRef.current = false;
      setLoadingMore(false);
    }
  }, [buildQuery, hasMore, loadingInitial, nextCursor]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  return {
    items,
    hasMore,
    loadingInitial,
    loadingMore,
    error,
    loadMore,
    retry: loadMore,
  };
}