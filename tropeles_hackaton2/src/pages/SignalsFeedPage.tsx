import { useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useInfiniteSignals } from "../hooks/useInfiniteSignals";
import type { Signal } from "../types";

export function SignalsFeedPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const filters = useMemo(() => {
    return {
      signalType: searchParams.get("signalType") ?? "",
      severity: searchParams.get("severity") ?? "",
      status: searchParams.get("status") ?? "",
      q: searchParams.get("q") ?? "",
    };
  }, [searchParams]);

  const {
    items,
    hasMore,
    loadingInitial,
    loadingMore,
    error,
    loadMore,
    retry,
    updateLocalSignal,
  } = useInfiniteSignals(filters);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);

    if (value) next.set(key, value);
    else next.delete(key);

    setSearchParams(next);
  }

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [loadMore]);

  useEffect(() => {
    const savedScroll = sessionStorage.getItem("signalsScrollY");

    if (!savedScroll || loadingInitial || items.length === 0) return;

    window.scrollTo({
      top: Number(savedScroll),
      behavior: "auto",
    });

    sessionStorage.removeItem("signalsScrollY");
  }, [loadingInitial, items.length]);

  useEffect(() => {
    const raw = sessionStorage.getItem("updatedSignal");
    if (!raw) return;

    try {
      const updated = JSON.parse(raw) as Signal;
      updateLocalSignal(updated);
    } catch {
      // ignorar
    } finally {
      sessionStorage.removeItem("updatedSignal");
    }
  }, [updateLocalSignal]);

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Feed de Señales</h1>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          className="border rounded px-3 py-2"
          placeholder="Buscar señal"
          value={filters.q}
          onChange={(e) => updateParam("q", e.target.value)}
        />

        <select
          className="border rounded px-3 py-2"
          value={filters.signalType}
          onChange={(e) => updateParam("signalType", e.target.value)}
        >
          <option value="">Todos los tipos</option>
          <option value="HAMBRE">HAMBRE</option>
          <option value="ABANDONO">ABANDONO</option>
          <option value="MUTACION">MUTACION</option>
          <option value="FUGA">FUGA</option>
          <option value="CONFLICTO">CONFLICTO</option>
          <option value="REPRODUCCION_MASIVA">REPRODUCCION_MASIVA</option>
          <option value="SENAL_CORRUPTA">SENAL_CORRUPTA</option>
        </select>

        <select
          className="border rounded px-3 py-2"
          value={filters.severity}
          onChange={(e) => updateParam("severity", e.target.value)}
        >
          <option value="">Todas las severidades</option>
          <option value="LEVE">LEVE</option>
          <option value="MODERADO">MODERADO</option>
          <option value="GRAVE">GRAVE</option>
          <option value="CRITICO">CRITICO</option>
        </select>

        <select
          className="border rounded px-3 py-2"
          value={filters.status}
          onChange={(e) => updateParam("status", e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="RECIBIDA">RECIBIDA</option>
          <option value="PROCESANDO">PROCESANDO</option>
          <option value="ATENDIDA">ATENDIDA</option>
        </select>
      </section>

      {loadingInitial && <p>Cargando señales...</p>}

      <section className="space-y-3 min-h-[500px]">
        {items.map((signal) => (
          <Link
            key={signal.id}
            to={`/signals/${signal.id}`}
            onClick={() => {
              sessionStorage.setItem("signalsScrollY", String(window.scrollY));
            }}
            className="block border rounded-xl p-4 hover:bg-gray-50"
          >
            <div className="flex justify-between gap-4">
              <h2 className="font-bold">{signal.signalType}</h2>
              <span>{signal.severity}</span>
            </div>

            <p>{signal.rawContent}</p>

            <p className="text-sm text-gray-500">
              {signal.tropel.name} · {signal.status}
            </p>
          </Link>
        ))}

        {!loadingInitial && items.length === 0 && <p>No hay señales.</p>}

        {error && (
          <div className="border border-red-300 rounded p-3">
            <p className="text-red-600">{error}</p>
            <button className="underline" onClick={retry}>
              Reintentar
            </button>
          </div>
        )}

        {loadingMore && <p>Cargando más...</p>}

        {!hasMore && items.length > 0 && (
          <p className="text-center text-gray-500">Fin de la lista.</p>
        )}

        <div ref={sentinelRef} className="h-8" />
      </section>
    </main>
  );
}