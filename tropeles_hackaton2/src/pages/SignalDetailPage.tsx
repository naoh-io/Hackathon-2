import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import type { Signal, SignalStatus } from "../types";

export function SignalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [signal, setSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadSignal() {
      if (!id) {
        setError("ID de señal inválido.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await apiFetch<Signal>(`/signals/${id}`);
        setSignal(response);
      } catch {
        setError("No se pudo cargar la señal.");
      } finally {
        setLoading(false);
      }
    }

    loadSignal();
  }, [id]);

  async function updateStatus(status: Exclude<SignalStatus, "RECIBIDA">) {
    if (!id || !signal) return;

    const previousSignal = signal;

    setLoadingAction(true);
    setActionError("");
    setSuccess("");

    try {
      const updated = await apiFetch<Signal>(`/signals/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setSignal(updated);
      sessionStorage.setItem("updatedSignal", JSON.stringify(updated));
      setSuccess(`Estado actualizado a ${updated.status}.`);
    } catch {
      setSignal(previousSignal);
      setActionError("No se pudo actualizar. Intenta nuevamente.");
    } finally {
      setLoadingAction(false);
    }
  }

  if (loading) {
    return <main className="p-6">Cargando señal...</main>;
  }

  if (error || !signal) {
    return (
      <main className="p-6 space-y-4">
        <p className="text-red-600">{error || "Señal no encontrada."}</p>
        <Link className="underline" to="/signals">
          Volver al feed
        </Link>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <button className="underline" onClick={() => navigate("/signals")}>
        ← Volver al feed
      </button>

      <section className="border rounded-xl p-5 space-y-3">
        <h1 className="text-2xl font-bold">{signal.signalType}</h1>

        <p>{signal.rawContent}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <p>
            <strong>Severidad:</strong> {signal.severity}
          </p>
          <p>
            <strong>Estado:</strong> {signal.status}
          </p>
          <p>
            <strong>Tropel:</strong> {signal.tropel.name}
          </p>
          <p>
            <strong>Especie:</strong> {signal.tropel.species}
          </p>
          <p>
            <strong>Creada:</strong>{" "}
            {new Date(signal.createdAt).toLocaleString()}
          </p>
          <p>
            <strong>Actualizada:</strong>{" "}
            {new Date(signal.updatedAt).toLocaleString()}
          </p>
        </div>
      </section>

      <section className="border rounded-xl p-5 space-y-3">
        <h2 className="font-bold">Actualizar estado</h2>

        <div className="flex gap-3">
          <button
            className="border rounded px-4 py-2 disabled:opacity-40"
            disabled={loadingAction || signal.status === "PROCESANDO"}
            onClick={() => updateStatus("PROCESANDO")}
          >
            Marcar PROCESANDO
          </button>

          <button
            className="border rounded px-4 py-2 disabled:opacity-40"
            disabled={loadingAction || signal.status === "ATENDIDA"}
            onClick={() => updateStatus("ATENDIDA")}
          >
            Marcar ATENDIDA
          </button>
        </div>

        {loadingAction && <p>Actualizando...</p>}
        {success && <p className="text-green-600">{success}</p>}
        {actionError && <p className="text-red-600">{actionError}</p>}
      </section>
    </main>
  );
} 