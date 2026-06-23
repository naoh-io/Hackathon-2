import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";

const CLIMATES = {
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
const DEFAULT_CLIMATE = {
  label: "Sector",
  base: "linear-gradient(180deg, #0a0a0a 0%, #131313 55%, #0a0a0a 100%)",
  texture: "none",
};

function getClimate(climateKey) {
  return CLIMATES[climateKey] ?? DEFAULT_CLIMATE;
}

const COLOR_TOKENS = {
  emerald: { accent: "#34d399", accentSoft: "rgba(52, 211, 153, 0.16)", glow: "rgba(52, 211, 153, 0.45)" },
  amber: { accent: "#fbbf24", accentSoft: "rgba(251, 191, 36, 0.16)", glow: "rgba(251, 191, 36, 0.45)" },
  rose: { accent: "#fb7185", accentSoft: "rgba(251, 113, 133, 0.16)", glow: "rgba(251, 113, 133, 0.45)" },
  violet: { accent: "#a78bfa", accentSoft: "rgba(167, 139, 250, 0.16)", glow: "rgba(167, 139, 250, 0.45)" },
  slate: { accent: "#94a3b8", accentSoft: "rgba(148, 163, 184, 0.16)", glow: "rgba(148, 163, 184, 0.45)" },
  cyan: { accent: "#22d3ee", accentSoft: "rgba(34, 211, 238, 0.16)", glow: "rgba(34, 211, 238, 0.45)" },
};
const DEFAULT_COLOR_TOKEN = COLOR_TOKENS.slate;

function getColorToken(token) {
  return COLOR_TOKENS[token] ?? DEFAULT_COLOR_TOKEN;
}


const SIGNAL_EVENTS = {
  HAMBRE: { label: "Hambre", icon: "▲" },
  ABANDONO: { label: "Abandono", icon: "○" },
  MUTACION: { label: "Mutación", icon: "◆" },
  FUGA: { label: "Fuga", icon: "→" },
  CONFLICTO: { label: "Conflicto", icon: "✕" },
  REPRODUCCION_MASIVA: { label: "Reproducción masiva", icon: "✦" },
  SENAL_CORRUPTA: { label: "Señal corrupta", icon: "✺" },
};
const DEFAULT_EVENT = { label: "Evento", icon: "•" };

function getEvent(eventKey) {
  return SIGNAL_EVENTS[eventKey] ?? { ...DEFAULT_EVENT, label: eventKey ?? "—" };
}

const METRIC_DISPLAY_MAX = { stability: 100, energy: 100, alerts: 20 };

function metricPercent(value, key) {
  const max = METRIC_DISPLAY_MAX[key] ?? 100;
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

function detectFeatureSupport() {
  const hasScrollTimeline =
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    (CSS.supports("animation-timeline: view()") ||
      CSS.supports("animation-timeline: scroll()"));

  const hasViewTransitions =
    typeof document !== "undefined" &&
    typeof document.startViewTransition === "function";

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return { hasScrollTimeline, hasViewTransitions, prefersReducedMotion };
}

async function fetchSectorStory(sectorId, authToken, { signal } = {}) {
  const res = await fetch(`/api/v1/sectors/${sectorId}/story`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken ?? ""}`,
      "Content-Type": "application/json",
    },
    signal,
  });

  if (!res.ok) {
    let body = null;
    try {
      body = await res.json();
    } catch {
    }
    const error = new Error(body?.message ?? `Error ${res.status}`);
    error.status = res.status;
    error.code = body?.error ?? "UNKNOWN_ERROR";
    error.details = body?.details ?? {};
    throw error;
  }

  const data = await res.json();
  if (!Array.isArray(data?.stages) || data.stages.length !== 8) {
    const error = new Error("La respuesta no contiene exactamente 8 etapas");
    error.code = "CONTRACT_MISMATCH";
    throw error;
  }
  return data;
}

function SectorDiorama({ stage, climate, transitionsEnabled }) {
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
      <div
        className="absolute inset-0 opacity-60"
        style={{ backgroundImage: climateStyle.texture }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${color.glow}, transparent 60%)`,
          opacity: 0.8,
          transition: transitionsEnabled ? "background 600ms ease" : "none",
        }}
        aria-hidden="true"
      />
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

      <div
        className="absolute left-4 top-4 flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-white/90 backdrop-blur"
        style={{ background: color.accentSoft, border: `1px solid ${color.accent}55` }}
      >
        <span aria-hidden="true">{event.icon}</span>
        <span>{event.label}</span>
      </div>

      <div className="absolute bottom-4 right-4 font-mono text-[10px] tracking-wide text-white/30">
        {climate} · {stage.assetKey}
      </div>
    </div>
  );
}


function MetricBar({ label, value, metricKey, color }) {
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

function JourneyProgress({ stages, activeIndex, localT }) {
  const current = stages[activeIndex];
  const next = stages[activeIndex + 1];
  const currentFraction = current.progress;
  const nextFraction = next ? next.progress : currentFraction;
  const globalFraction = currentFraction + (nextFraction - currentFraction) * localT;
  const widthPct = Math.max(0, Math.min(100, globalFraction * 100));

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-30 h-1 bg-white/5" aria-hidden="true">
      <div
        className="h-full bg-emerald-400"
        style={{ width: `${widthPct}%`, transition: "width 120ms linear" }}
      />
    </div>
  );
}

function StageRail({ stages, activeIndex, onSelect }) {
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
            style={{ outlineColor: color.accent }}
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
                "text-sm transition-colors " +
                (isActive ? "text-white" : "text-white/40 group-hover:text-white/70")
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

function StageSection({ stage, index, isActive, registerRef, hasScrollTimeline, prefersReducedMotion }) {
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
          (!hasScrollTimeline
            ? isActive
              ? " translate-y-0 opacity-100"
              : " translate-y-6 opacity-40"
            : "")
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

export default function SectorStory({ sectorId, authToken, onBack }) {
  const [story, setStory] = useState(null);
  const [status, setStatus] = useState("loading"); 
  const [errorInfo, setErrorInfo] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [localT, setLocalT] = useState(0); 

  const featureSupport = useMemo(detectFeatureSupport, []);
  const { hasScrollTimeline, hasViewTransitions, prefersReducedMotion } = featureSupport;

  const sectionRefs = useRef([]);
  const containerRef = useRef(null);

  const registerRef = useCallback((index, el) => {
    sectionRefs.current[index] = el;
  }, []);


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
      .catch((err) => {
        if (controller.signal.aborted) return;
        setErrorInfo({
          status: err.status,
          code: err.code,
          message: err.message,
        });
        setStatus("error");
      });

    return () => controller.abort();
  }, [sectorId, authToken]);

  useEffect(() => {
    if (status !== "ready") return;

    const observer = new IntersectionObserver(
      (entries) => {
        let best = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (!best || entry.intersectionRatio > best.intersectionRatio) {
            best = entry;
          }
        }
        if (best) {
          const idx = Number(best.target.dataset.stageIndex);
          setActiveIndex(idx);
        }
      },
      { threshold: [0.4, 0.6, 0.8] }
    );

    sectionRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [status]);

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

  const goToStage = useCallback(
    (index) => {
      const el = sectionRefs.current[index];
      if (!el) return;
      el.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
      el.focus({ preventScroll: true });
    },
    [prefersReducedMotion]
  );

  useEffect(() => {
    if (status !== "ready" || !story) return;

    const handleKeyDown = (e) => {
      const isArrowNav =
        e.key === "ArrowDown" || e.key === "PageDown" || e.key === "ArrowUp" || e.key === "PageUp";
      if (!isArrowNav) return;

      const tag = document.activeElement?.tagName;
      if (tag === "BUTTON" || tag === "A" || tag === "INPUT") return;

      e.preventDefault();
      const delta = e.key === "ArrowDown" || e.key === "PageDown" ? 1 : -1;
      const nextIndex = Math.min(story.stages.length - 1, Math.max(0, activeIndex + delta));
      goToStage(nextIndex);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status, story, activeIndex, goToStage]);

  const handleBack = useCallback(() => {
    if (!onBack) return;
    if (hasViewTransitions && !prefersReducedMotion) {
      document.startViewTransition(() => onBack());
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
      style={{ viewTransitionName: "sector-story" }}
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
              <SectorDiorama
                stage={activeStage}
                climate={sector.climate}
                transitionsEnabled={!prefersReducedMotion}
              />
            </div>
          </div>
          <div className="hidden h-full w-full lg:block">
            <SectorDiorama
              stage={activeStage}
              climate={sector.climate}
              transitionsEnabled={!prefersReducedMotion}
            />
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