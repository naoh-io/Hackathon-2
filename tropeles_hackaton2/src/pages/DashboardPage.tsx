import { useEffect, useState } from 'react';
import { getDashboardSummary } from '../api/dashboard';
import type { DashboardSummary } from '../types/api';

export function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboardSummary()
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Error al cargar dashboard')
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-gray-400 animate-pulse">Cargando dashboard...</div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 bg-red-950 border border-red-800 rounded p-4">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    { label: 'Total Tropeles', value: data.totalTropels, color: 'text-white' },
    { label: 'Tropeles Críticos', value: data.criticalTropels, color: 'text-red-400' },
    { label: 'Señales Abiertas', value: data.openSignals, color: 'text-yellow-400' },
    {
      label: 'Estabilidad Promedio',
      value: `${data.sectorStabilityAvg}%`,
      color: 'text-emerald-400',
    },
  ];

  const severityColors: Record<string, string> = {
    LEVE: 'text-blue-400',
    MODERADO: 'text-yellow-400',
    GRAVE: 'text-orange-400',
    CRITICO: 'text-red-400',
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4"
          >
            <p className="text-xs text-gray-400 mb-1">{k.label}</p>
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Señales por severidad */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">
          Señales por Severidad
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(data.signalsBySeverity).map(([sev, count]) => (
            <div key={sev} className="text-center">
              <p className={`text-2xl font-bold ${severityColors[sev] ?? 'text-white'}`}>
                {count}
              </p>
              <p className="text-xs text-gray-400 mt-1">{sev}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-600 mt-4 text-right">
        Actualizado: {new Date(data.generatedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}
