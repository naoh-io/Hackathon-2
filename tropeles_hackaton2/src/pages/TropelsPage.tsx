import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import type { Sector, SectorsResponse, TropelsResponse } from "../types";

export function TropelsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<TropelsResponse | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestIdRef = useRef(0);

  const params = useMemo(() => {
    return {
      page: searchParams.get("page") ?? "0",
      size: searchParams.get("size") ?? "20",
      species: searchParams.get("species") ?? "",
      vitalState: searchParams.get("vitalState") ?? "",
      sectorId: searchParams.get("sectorId") ?? "",
      q: searchParams.get("q") ?? "",
      sort: searchParams.get("sort") ?? "updatedAt,desc",
    };
  }, [searchParams]);

  useEffect(() => {
    async function loadSectors() {
      try {
        const response = await apiFetch<SectorsResponse>("/sectors");
        setSectors(response.items);
      } catch {
        setSectors([]);
      }
    }

    loadSectors();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const currentRequestId = ++requestIdRef.current;

    async function loadTropels() {
      setLoading(true);
      setError("");

      const query = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (value !== "") query.set(key, value);
      });

      try {
        const response = await apiFetch<TropelsResponse>(
          `/tropels?${query.toString()}`,
          { signal: controller.signal }
        );

        if (currentRequestId === requestIdRef.current) {
          setData(response);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("No se pudieron cargar los Tropeles.");
        }
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }

    loadTropels();

    return () => controller.abort();
  }, [params]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);

    if (value) next.set(key, value);
    else next.delete(key);

    if (key !== "page") next.set("page", "0");

    setSearchParams(next);
  }

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Atlas de Tropeles</h1>

      <section className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <input
          className="border rounded px-3 py-2"
          placeholder="Buscar"
          value={params.q}
          onChange={(e) => updateParam("q", e.target.value)}
        />

        <select
          className="border rounded px-3 py-2"
          value={params.species}
          onChange={(e) => updateParam("species", e.target.value)}
        >
          <option value="">Todas las especies</option>
          <option value="BLOBITO">BLOBITO</option>
          <option value="CHISPA">CHISPA</option>
          <option value="GRUNON">GRUNON</option>
          <option value="DORMILON">DORMILON</option>
          <option value="GLITCHY">GLITCHY</option>
        </select>

        <select
          className="border rounded px-3 py-2"
          value={params.vitalState}
          onChange={(e) => updateParam("vitalState", e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="ESTABLE">ESTABLE</option>
          <option value="HAMBRIENTO">HAMBRIENTO</option>
          <option value="AGITADO">AGITADO</option>
          <option value="MUTANDO">MUTANDO</option>
          <option value="CRITICO">CRITICO</option>
        </select>

        <select
          className="border rounded px-3 py-2"
          value={params.sectorId}
          onChange={(e) => updateParam("sectorId", e.target.value)}
        >
          <option value="">Todos los sectores</option>
          {sectors.map((sector) => (
            <option key={sector.id} value={sector.id}>
              {sector.sectorCode} - {sector.name}
            </option>
          ))}
        </select>

        <select
          className="border rounded px-3 py-2"
          value={params.sort}
          onChange={(e) => updateParam("sort", e.target.value)}
        >
          <option value="updatedAt,desc">Actualizados</option>
          <option value="name,asc">Nombre A-Z</option>
          <option value="chaosIndex,desc">Mayor caos</option>
        </select>

        <select
          className="border rounded px-3 py-2"
          value={params.size}
          onChange={(e) => updateParam("size", e.target.value)}
        >
          <option value="10">10 por página</option>
          <option value="20">20 por página</option>
          <option value="50">50 por página</option>
        </select>
      </section>

      <section className="min-h-[420px] space-y-3">
        {loading && <p>Cargando Tropeles...</p>}

        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && data?.content.length === 0 && (
          <p>No hay resultados.</p>
        )}

        {data?.content.map((tropel) => (
          <article key={tropel.id} className="border rounded-xl p-4">
            <h2 className="font-bold">{tropel.name}</h2>
            <p>
              {tropel.species} · {tropel.vitalState}
            </p>
            <p>Energía: {tropel.energyLevel}</p>
            <p>Caos: {tropel.chaosIndex}</p>
            <p>Sector: {tropel.sector.name}</p>
          </article>
        ))}
      </section>

      {data && (
        <footer className="flex gap-3 items-center">
          <button
            className="border rounded px-3 py-2 disabled:opacity-40"
            disabled={Number(params.page) <= 0}
            onClick={() =>
              updateParam("page", String(Number(params.page) - 1))
            }
          >
            Anterior
          </button>

          <span>
            Página {data.currentPage + 1} de {data.totalPages}
          </span>

          <button
            className="border rounded px-3 py-2 disabled:opacity-40"
            disabled={data.currentPage + 1 >= data.totalPages}
            onClick={() =>
              updateParam("page", String(Number(params.page) + 1))
            }
          >
            Siguiente
          </button>
        </footer>
      )}
    </main>
  );
}