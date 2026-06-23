import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type CSSProperties,
} from "react";

/**
 * /sectors/:id/story — scrollytelling
 * ------------------------------------------------------------------
 * Contrato real (TropelCare Control API, confirmado contra routes.ts
 * y schemas.ts):
 *
 * GET /api/v1/sectors/:id/story   (JWT bearer requerido)
 *
 * 200 → {
 *   sector: { id: string, name: string, climate: Climate },
 *   stages: Array<{          // SIEMPRE longitud 8, ya viene ordenado por order
 *     id: string,
 *     order: number,          // Integer 0..7
 *     title: string,
 *     narrative: string,
 *     dominantEvent: SignalType,  // enum cerrado, ver SIGNAL_EVENTS abajo
 *     metrics: { stability: number, energy: number, alerts: number }, // Integer, sin rango declarado en el schema
 *     assetKey: string,       // identificador de asset local, NO una URL
 *     colorToken: string,     // string libre — el FE decide el mapeo visual
 *     progress: number,       // Number 0..1 (FRACCIÓN, no porcentaje)
 *   }>
 * }
 *
 * Errores (ErrorResponse, igual en 400/401/404/429/500):
 *   { error: string, message: string, timestamp: string, path: string,
 *     details: Record<string, unknown> }
 *
 * Decisiones de arquitectura:
 * 1. La etapa activa se determina con IntersectionObserver (no con cálculo
 *    de scrollY), porque funciona igual con o sin soporte de CSS
 *    Scroll-Driven Animations y es la base del fallback universal.
 * 2. El progreso de recorrido interpola usando los `progress` reales que
 *    manda el backend (fracción 0–1) — nunca se asume espaciado uniforme.
 * 3. Ninguna etapa se desmonta ni se oculta con display:none. Todas viven
 *    en el DOM siempre, así Tab/flechas nunca "saltan" contenido.
 * 4. El visual persistente (panel izq. en desktop, fondo fijo en mobile)
 *    es el mismo árbol de componentes en ambos breakpoints — solo cambia
 *    el layout vía Tailwind, no la lógica.
 * 5. metrics.* no trae rango declarado en el schema de /story. Las barras
 *    clampean defensivamente contra un máximo configurable en vez de
 *    asumir una escala fija — si el backend manda 0–100 hoy, sigue
 *    funcionando; si cambia, no rompe visualmente.
 */

// ---------------------------------------------------------------------------
// Tipos del contrato — espejo exacto de schemas.ts (TypeBox) en el backend.
// Si el backend agrega un valor a un enum, TypeScript señala en
// tiempo de compilación cada switch/registry que no lo cubre.
// ---------------------------------------------------------------------------

export type Climate = "PIXEL_FOREST" | "NEON_CAVE" | "CLOUD_AQUARIUM" | "RETRO_ARCADE";

export type SignalType =
  | "HAMBRE"
  | "ABANDONO"
  | "MUTACION"
  | "FUGA"
  | "CONFLICTO"
  | "REPRODUCCION_MASIVA"
  | "SENAL_CORRUPTA";

export interface StageMetrics {
  stability: number;
  energy: number;
  alerts: number;
}

export interface Stage {
  id: string;
  order: number; // 0..7
  title: string;
  narrative: string;
  dominantEvent: SignalType;
  metrics: StageMetrics;
  assetKey: string;
  colorToken: string; // string libre, no enum — el FE decide el mapeo
  progress: number; // fracción 0..1
}

export interface SectorStoryResponse {
  sector: {
    id: string;
    name: string;
    climate: Climate;
  };
  stages: Stage[]; // longitud exacta 8, garantizada por el contrato
}

export interface ApiErrorBody {
  error: string;
  message: string;
  timestamp: string;
  path: string;
  details: Record<string, unknown>;
}

export class SectorStoryFetchError extends Error {
  status?: number;
  code: string;
  details: Record<string, unknown>;

  constructor(message: string, opts: { status?: number; code: string; details?: Record<string, unknown> }) {
    super(message);
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details ?? {};
  }
}

type LoadStatus = "loading" | "ready" | "error";

interface ColorTokenStyle {
  accent: string;
  accentSoft: string;
  glow: string;
}

interface ClimateStyle {
  label: string;
  base: string;
  texture: string;
}

interface EventStyle {
  label: string;
  icon: string;
}

// ---------------------------------------------------------------------------
// Registry de clima — Climate es un enum CERRADO de 4 valores (schemas.ts).
// Tipar la clave como Record<Climate, ...> obliga a TypeScript a exigir
// las 4 entradas: si el backend agrega un quinto clima, este objeto da
// error de compilación hasta que se agregue acá también.
// ---------------------------------------------------------------------------

const CLIMATES: Record<Climate, ClimateStyle> = {
  PIXEL_FOREST: {
    label: "Bosque pixel",
    base: "linear-gradient(180deg, #0b1310 0%, #0e1b16 55%, #0a1310 100%)",
    texture: "repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 14px, transparent 14px 28px)",
  },
  NEON_CAVE: {
    label: "Cueva neón",
    base: "linear-gradient(180deg, #0a0a14 0%, #150b22 55%, #0a0a14 100%)",
    texture: "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 10px, transparent 10px 20px)",
  },
  CLOUD_AQUARIUM: {
    label: "Acuario en las nubes",
    base: "linear-gradient(180deg, #07131c 0%, #0c1f2c 55%, #07131c 100%)",
    texture: "repeating-radial-gradient(circle at 30% 50%, rgba(255,255,255,0.05) 0 3px, transparent 3px 16px)",
  },
  RETRO_ARCADE: {
    label: "Arcade retro",
    base: "linear-gradient(180deg, #160a14 0%, #220c1b 55%, #160a14 100%)",
    texture: "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 8px, transparent 8px 16px)",
  },
};

const DEFAULT_CLIMATE: ClimateStyle = {
  label: "Sector",
  base: "linear-gradient(180deg, #0a0a0a 0%, #131313 55%, #0a0a0a 100%)",
  texture: "none",
};

function getClimate(climateKey: string): ClimateStyle {
  return (CLIMATES as Record<string, ClimateStyle>)[climateKey] ?? DEFAULT_CLIMATE;
}

// ---------------------------------------------------------------------------
// Registry de color — colorToken es STRING LIBRE en el schema (no enum):
// el backend lo manda, pero el significado visual lo decide el frontend.
// Por eso la clave es Record<string, ...>, no Record<ColorToken, ...> —
// no existe un set cerrado que TypeScript pueda exigir aquí.
// ---------------------------------------------------------------------------

const COLOR_TOKENS: Record<string, ColorTokenStyle> = {
  emerald: { accent: "#34d399", accentSoft: "rgba(52, 211, 153, 0.16)", glow: "rgba(52, 211, 153, 0.45)" },
  amber: { accent: "#fbbf24", accentSoft: "rgba(251, 191, 36, 0.16)", glow: "rgba(251, 191, 36, 0.45)" },
  rose: { accent: "#fb7185", accentSoft: "rgba(251, 113, 133, 0.16)", glow: "rgba(251, 113, 133, 0.45)" },
  violet: { accent: "#a78bfa", accentSoft: "rgba(167, 139, 250, 0.16)", glow: "rgba(167, 139, 250, 0.45)" },
  slate: { accent: "#94a3b8", accentSoft: "rgba(148, 163, 184, 0.16)", glow: "rgba(148, 163, 184, 0.45)" },
  cyan: { accent: "#22d3ee", accentSoft: "rgba(34, 211, 238, 0.16)", glow: "rgba(34, 211, 238, 0.45)" },
};
const DEFAULT_COLOR_TOKEN = COLOR_TOKENS.slate;

function getColorToken(token: string): ColorTokenStyle {
  return COLOR_TOKENS[token] ?? DEFAULT_COLOR_TOKEN;
}

// ---------------------------------------------------------------------------
// Registry de eventos — dominantEvent usa SignalType, que SÍ es un enum
// cerrado (schemas.ts). Record<SignalType, ...> obliga a cubrir los 7
// valores reales; si el backend agrega un octavo, esto no compila hasta
// que se agregue acá.
// ---------------------------------------------------------------------------

const SIGNAL_EVENTS: Record<SignalType, EventStyle> = {
  HAMBRE: { label: "Hambre", icon: "▲" },
  ABANDONO: { label: "Abandono", icon: "○" },
  MUTACION: { label: "Mutación", icon: "◆" },
  FUGA: { label: "Fuga", icon: "→" },
  CONFLICTO: { label: "Conflicto", icon: "✕" },
  REPRODUCCION_MASIVA: { label: "Reproducción masiva", icon: "✦" },
  SENAL_CORRUPTA: { label: "Señal corrupta", icon: "✺" },
};
const DEFAULT_EVENT: EventStyle = { label: "Evento", icon: "•" };

function getEvent(eventKey: string): EventStyle {
  return (SIGNAL_EVENTS as Record<string, EventStyle>)[eventKey] ?? { ...DEFAULT_EVENT, label: eventKey || "—" };
}

// ---------------------------------------------------------------------------
// Métricas — sin rango declarado en el schema de /story. En vez de asumir
// una escala fija (p. ej. 0-100), se clampea defensivamente contra un
// máximo configurable: si el valor real excede el máximo asumido, la
// barra se llena al 100% en vez de desbordar o romperse.
// ---------------------------------------------------------------------------

type MetricKey = keyof StageMetrics;

const METRIC_DISPLAY_MAX: Record<MetricKey, number> = { stability: 100, energy: 100, alerts: 20 };

function metricPercent(value: number, key: MetricKey): number {
  const max = METRIC_DISPLAY_MAX[key] ?? 100;
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

// ---------------------------------------------------------------------------
// Soporte de features — se calcula una vez, no en cada render
// ---------------------------------------------------------------------------

interface FeatureSupport {
  hasScrollTimeline: boolean;
  hasViewTransitions: boolean;
  prefersReducedMotion: boolean;
}

function detectFeatureSupport(): FeatureSupport {
  const hasScrollTimeline =
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    (CSS.supports("animation-timeline: view()") || CSS.supports("animation-timeline: scroll()"));

  const hasViewTransitions =
    typeof document !== "undefined" && typeof (document as any).startViewTransition === "function";

  const prefersReducedMotion =
    typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

  return { hasScrollTimeline, hasViewTransitions, prefersReducedMotion };
}

// ---------------------------------------------------------------------------
// Fetch real — apunta exactamente al contrato de routes.ts.
// authToken se inyecta desde fuera (contexto de auth), nunca se lee de
// window globals en producción.
// ---------------------------------------------------------------------------

async function fetchSectorStory(
  sectorId: string,
  authToken: string | null | undefined,
  { signal }: { signal?: AbortSignal } = {},
): Promise<SectorStoryResponse> {
  const res = await fetch(`/api/v1/sectors/${sectorId}/story`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken ?? ""}`,
      "Content-Type": "application/json",
    },
    signal,
  });

  if (!res.ok) {
    // El backend siempre devuelve ErrorResponse en este formato exacto
    // para 400/401/404/429/500 — lo parseamos para poder mostrar el
    // mensaje real en vez de un genérico.
    let body: ApiErrorBody | null = null;
    try {
      body = await res.json();
    } catch {
      // respuesta no-JSON inesperada; seguimos con body = null
    }
    throw new SectorStoryFetchError(body?.message ?? `Error ${res.status}`, {
      status: res.status,
      code: body?.error ?? "UNKNOWN_ERROR",
      details: body?.details,
    });
  }

  const data = (await res.json()) as SectorStoryResponse;
  if (!Array.isArray(data?.stages) || data.stages.length !== 8) {
    // El contrato garantiza minItems/maxItems = 8, pero si algo en el
    // camino (proxy, mock, versión vieja del backend) lo rompe, mejor
    // fallar explícito que renderizar a medias.
    throw new SectorStoryFetchError("La respuesta no contiene exactamente 8 etapas", {
      code: "CONTRACT_MISMATCH",
    });
  }
  return data;
}

// ---------------------------------------------------------------------------
// Visual persistente — diorama generado en CSS, parametrizado por
// climate (mundo) + colorToken (momento) + assetKey (referencia).
// Reemplazable por <img src={spriteFor(assetKey)} /> el día que existan
// sprites reales, sin tocar el resto del árbol.
// ---------------------------------------------------------------------------

interface SectorDioramaProps {
  stage: Stage;
  climate: Climate;
  transitionsEnabled: boolean;
}

function SectorDiorama({ stage, climate, transitionsEnabled }: SectorDioramaProps) {
  const climateStyle = getClimate(climate);
  const color = getColorToken(stage.colorToken);
  const event = getEvent(stage.dominantEvent);

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10"
      style={{
        background: climateStyle.base,
        transition: transitionsEnabled ? "background 600ms ease" : "none",
      }}
      role="img"
      aria-label={`Diorama del sector (${climateStyle.label}) en la etapa: ${stage.title}. Evento dominante: ${event.label}.`}
    >
      {/* Textura propia del clima — estable entre etapas, solo cambia entre sectores */}
      <div
        className="absolute inset-0 opacity-60"
        style={{ backgroundImage: climateStyle.texture }}
        aria-hidden="true"
      />

      {/* Halo de color — único elemento que cambia de tono entre etapas */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${color.glow}, transparent 60%)`,
          opacity: 0.8,
          transition: transitionsEnabled ? "background 600ms ease" : "none",
        }}
        aria-hidden="true"
      />

      {/* Partículas — representan el assetKey de forma abstracta */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="grid grid-cols-4 gap-2 opacity-90" aria-hidden="true">
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              key={i}
              className="block h-3 w-3 rounded-sm"
              style={{
                background: color.accent,
                opacity: i % 5 === 0 ? 1 : 0.25 + ((i * 7) % 5) / 10,
              }}
            />
          ))}
        </div>
      </div>

      {/* Etiqueta de evento dominante */}
      <div
        className="absolute left-4 top-4 flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-white/90 backdrop-blur"
        style={{ background: color.accentSoft, border: `1px solid ${color.accent}55` }}
      >
        <span aria-hidden="true">{event.icon}</span>
        <span>{event.label}</span>
      </div>

      {/* Identificador de asset — referencia visual para implementación */}
      <div className="absolute bottom-4 right-4 font-mono text-[10px] tracking-wide text-white/30">
        {climate} · {stage.assetKey}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Métrica individual con barra
// ---------------------------------------------------------------------------

interface MetricBarProps {
  label: string;
  value: number;
  metricKey: MetricKey;
  color: ColorTokenStyle;
}

function MetricBar({ label, value, metricKey, color }: MetricBarProps) {
  const pct = metricPercent(value, metricKey);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs text-white/60">
        <span>{label}</span>
        <span className="font-mono text-white/80">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, background: color.accent }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Barra de progreso de recorrido — interpola con los `progress` reales
// que manda el backend (fracción 0–1), NO con espaciado uniforme.
// ---------------------------------------------------------------------------

interface JourneyProgressProps {
  stages: Stage[];
  activeIndex: number;
  localT: number;
}

function JourneyProgress({ stages, activeIndex, localT }: JourneyProgressProps) {
  const current = stages[activeIndex];
  const next = stages[activeIndex + 1];
  // progress es fracción 0–1 según el schema; se convierte a % solo para
  // el ancho del CSS, nunca se reasigna la escala internamente.
  const currentFraction = current.progress;
  const nextFraction = next ? next.progress : currentFraction;
  const globalFraction = currentFraction + (nextFraction - currentFraction) * localT;
  const widthPct = Math.max(0, Math.min(100, globalFraction * 100));

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-30 h-1 bg-white/5" aria-hidden="true">
      <div className="h-full bg-emerald-400" style={{ width: `${widthPct}%`, transition: "width 120ms linear" }} />
    </div>
  );
}

interface StageRailProps {
  stages: Stage[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

function StageRail({ stages, activeIndex, onSelect }: StageRailProps) {
  return (
    <nav aria-label="Etapas de la historia del sector" className="hidden flex-col gap-3 lg:flex">
      {stages.map((stage, i) => {
        const color = getColorToken(stage.colorToken);
        const isActive = i === activeIndex;
        return (
          <button
            key={stage.id}
            type="button"
            onClick={() => onSelect(i)}
            aria-current={isActive ? "true" : undefined}
            className="group flex items-center gap-3 rounded-lg px-2 py-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ outlineColor: color.accent } as CSSProperties}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full transition-transform"
              style={{
                background: isActive ? color.accent : "rgba(255,255,255,0.25)",
                transform: isActive ? "scale(1.6)" : "scale(1)",
              }}
              aria-hidden="true"
            />
            <span
              className={
                "text-sm transition-colors " + (isActive ? "text-white" : "text-white/40 group-hover:text-white/70")
              }
            >
              {stage.title}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Una sección de narrativa. Siempre montada — nunca display:none — para
// que el foco de teclado y los lectores de pantalla nunca pierdan contenido.
// Usa CSS scroll-driven animation cuando hay soporte; si no, fallback con
// clases controladas por estado derivado del mismo IntersectionObserver.
// ---------------------------------------------------------------------------

interface StageSectionProps {
  stage: Stage;
  index: number;
  isActive: boolean;
  registerRef: (index: number, el: HTMLElement | null) => void;
  hasScrollTimeline: boolean;
  prefersReducedMotion: boolean;
}

function StageSection({
  stage,
  index,
  isActive,
  registerRef,
  hasScrollTimeline,
  prefersReducedMotion,
}: StageSectionProps) {
  const color = getColorToken(stage.colorToken);

  return (
    <section
      ref={(el) => registerRef(index, el)}
      id={`stage-${stage.id}`}
      data-stage-index={index}
      tabIndex={-1}
      aria-label={`Etapa ${index + 1} de 8: ${stage.title}`}
      className={
        "stage-section relative flex min-h-[100vh] flex-col justify-center px-6 py-24 sm:px-10 lg:px-16" +
        (hasScrollTimeline && !prefersReducedMotion ? " stage-section--timeline" : "")
      }
    >
      <div
        className={
          "stage-section-inner max-w-xl transition-all duration-500" +
          (!hasScrollTimeline ? (isActive ? " translate-y-0 opacity-100" : " translate-y-6 opacity-40") : "")
        }
      >
        <div className="mb-4 inline-flex items-center gap-2 font-mono text-xs text-white/50" aria-hidden="true">
          <span>ETAPA {String(index + 1).padStart(2, "0")} / 08</span>
        </div>

        <h2 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">{stage.title}</h2>

        <p className="mt-4 text-base leading-relaxed text-white/70">{stage.narrative}</p>

        <dl className="mt-8 grid max-w-sm grid-cols-3 gap-4">
          <div>
            <dt className="text-xs text-white/40">Estabilidad</dt>
            <dd className="font-mono text-lg" style={{ color: color.accent }}>
              {stage.metrics.stability}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-white/40">Energía</dt>
            <dd className="font-mono text-lg" style={{ color: color.accent }}>
              {stage.metrics.energy}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-white/40">Alertas</dt>
            <dd className="font-mono text-lg" style={{ color: color.accent }}>
              {stage.metrics.alerts}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Componente raíz
// ---------------------------------------------------------------------------

export interface SectorStoryProps {
  sectorId: string;
  authToken: string | null | undefined;
  onBack?: () => void;
}

interface ErrorInfo {
  status?: number;
  code?: string;
  message: string;
}

export default function SectorStory({ sectorId, authToken, onBack }: SectorStoryProps) {
  const [story, setStory] = useState<SectorStoryResponse | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [localT, setLocalT] = useState(0); // 0-1 dentro de la etapa activa, para interpolar progreso

  const featureSupport = useMemo(detectFeatureSupport, []);
  const { hasScrollTimeline, hasViewTransitions, prefersReducedMotion } = featureSupport;

  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const registerRef = useCallback((index: number, el: HTMLElement | null) => {
    sectionRefs.current[index] = el;
  }, []);

  // ---- Carga de datos contra el backend real ----
  useEffect(() => {
    if (!sectorId) {
      setStatus("error");
      setErrorInfo({ message: "Falta el id del sector en la ruta." });
      return;
    }

    const controller = new AbortController();
    setStatus("loading");
    setErrorInfo(null);

    fetchSectorStory(sectorId, authToken, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setStory(data);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const fetchError = err instanceof SectorStoryFetchError ? err : null;
        setErrorInfo({
          status: fetchError?.status,
          code: fetchError?.code,
          message: err instanceof Error ? err.message : "Error desconocido",
        });
        setStatus("error");
      });

    return () => controller.abort();
  }, [sectorId, authToken]);

  // ---- IntersectionObserver: fuente de verdad para la etapa activa ----
  useEffect(() => {
    if (status !== "ready") return;

    const observer = new IntersectionObserver(
      (entries) => {
        let best: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (!best || entry.intersectionRatio > best.intersectionRatio) {
            best = entry;
          }
        }
        if (best) {
          const idx = Number((best.target as HTMLElement).dataset.stageIndex);
          setActiveIndex(idx);
        }
      },
      { threshold: [0.4, 0.6, 0.8] },
    );

    sectionRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [status]);

  // ---- Progreso local dentro de la etapa activa ----
  useEffect(() => {
    if (status !== "ready") return;

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const el = sectionRefs.current[activeIndex];
        if (el) {
          const rect = el.getBoundingClientRect();
          const vh = window.innerHeight;
          const t = Math.min(1, Math.max(0, (vh - rect.top) / (rect.height + vh)));
          setLocalT(t);
        }
        ticking = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [status, activeIndex]);

  // ---- Navegación programática (rail, teclado) ----
  const goToStage = useCallback(
    (index: number) => {
      const el = sectionRefs.current[index];
      if (!el) return;
      el.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
      el.focus({ preventScroll: true });
    },
    [prefersReducedMotion],
  );

  // ---- Teclado: flechas / PageUp/PageDown navegan etapa a etapa ----
  useEffect(() => {
    if (status !== "ready" || !story) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isArrowNav =
        e.key === "ArrowDown" || e.key === "PageDown" || e.key === "ArrowUp" || e.key === "PageUp";
      if (!isArrowNav) return;

      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "BUTTON" || tag === "A" || tag === "INPUT") return;

      e.preventDefault();
      const delta = e.key === "ArrowDown" || e.key === "PageDown" ? 1 : -1;
      const nextIndex = Math.min(story.stages.length - 1, Math.max(0, activeIndex + delta));
      goToStage(nextIndex);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status, story, activeIndex, goToStage]);

  // ---- Volver al resumen, con View Transition si hay soporte ----
  const handleBack = useCallback(() => {
    if (!onBack) return;
    if (hasViewTransitions && !prefersReducedMotion) {
      (document as any).startViewTransition(() => onBack());
    } else {
      const root = containerRef.current;
      if (root) {
        root.style.transition = "opacity 220ms ease";
        root.style.opacity = "0";
        window.setTimeout(onBack, 220);
      } else {
        onBack();
      }
    }
  }, [onBack, hasViewTransitions, prefersReducedMotion]);

  // ---- Estados de carga / error ----
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0f0d] text-white/60">
        <p role="status">Cargando historia del sector…</p>
      </div>
    );
  }

  if (status === "error" || !story) {
    const isAuthError = errorInfo?.status === 401;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0a0f0d] px-6 text-center text-white">
        <p className="text-lg font-medium">
          {isAuthError ? "La sesión expiró o no es válida." : "No se pudo cargar la historia de este sector."}
        </p>
        <p className="text-sm text-white/50">
          {errorInfo?.message ?? "Revisa la conexión o vuelve a intentarlo desde el resumen."}
        </p>
        {onBack && (
          <button
            type="button"
            onClick={handleBack}
            className="mt-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 hover:border-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            Volver al resumen
          </button>
        )}
      </div>
    );
  }

  const { sector, stages } = story;
  const activeStage = stages[activeIndex];

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-[#0a0f0d] text-white"
      style={{ viewTransitionName: "sector-story" } as CSSProperties}
    >
      <style>{`
        @supports (animation-timeline: view()) {
          .stage-section--timeline .stage-section-inner {
            animation: stage-reveal linear both;
            animation-timeline: view();
            animation-range: entry 10% cover 35%;
          }
        }
        @keyframes stage-reveal {
          from { opacity: 0.35; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .stage-section--timeline .stage-section-inner {
            animation: none !important;
          }
        }
      `}</style>

      <JourneyProgress stages={stages} activeIndex={activeIndex} localT={localT} />

      <header className="fixed inset-x-0 top-1 z-30 flex items-center justify-between px-6 py-3 sm:px-10">
        {onBack ? (
          <button
            type="button"
            onClick={handleBack}
            className="rounded-full bg-black/30 px-3 py-1.5 text-sm text-white/80 backdrop-blur hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            ← Resumen
          </button>
        ) : (
          <span />
        )}
        <span className="rounded-full bg-black/30 px-3 py-1.5 text-sm text-white/60 backdrop-blur">
          {sector.name}
        </span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_360px]">
        <aside className="sticky top-0 hidden h-screen items-center px-8 lg:flex">
          <StageRail stages={stages} activeIndex={activeIndex} onSelect={goToStage} />
        </aside>

        <main className="relative">
          {stages.map((stage, i) => (
            <StageSection
              key={stage.id}
              stage={stage}
              index={i}
              isActive={i === activeIndex}
              registerRef={registerRef}
              hasScrollTimeline={hasScrollTimeline}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </main>

        <aside className="pointer-events-none fixed inset-0 z-10 lg:sticky lg:top-0 lg:z-0 lg:flex lg:h-screen lg:items-center lg:p-10">
          <div className="absolute inset-0 lg:hidden">
            <div className="h-full w-full opacity-25">
              <SectorDiorama stage={activeStage} climate={sector.climate} transitionsEnabled={!prefersReducedMotion} />
            </div>
          </div>
          <div className="hidden h-full w-full lg:block">
            <SectorDiorama stage={activeStage} climate={sector.climate} transitionsEnabled={!prefersReducedMotion} />
          </div>
        </aside>
      </div>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 px-6 py-4 lg:hidden">
        <div className="pointer-events-auto rounded-xl bg-black/50 p-4 backdrop-blur">
          <div className="grid grid-cols-3 gap-3">
            <MetricBar
              label="Estabilidad"
              value={activeStage.metrics.stability}
              metricKey="stability"
              color={getColorToken(activeStage.colorToken)}
            />
            <MetricBar
              label="Energía"
              value={activeStage.metrics.energy}
              metricKey="energy"
              color={getColorToken(activeStage.colorToken)}
            />
            <MetricBar
              label="Alertas"
              value={activeStage.metrics.alerts}
              metricKey="alerts"
              color={getColorToken(activeStage.colorToken)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}