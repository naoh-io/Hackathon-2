import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';

interface Sector {
  id: string;
  name: string;
  sectorCode: string;
  climate: string;
  stabilityLevel: number;
}

export function SectorsPage() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
  apiFetch<{ content: Sector[] } | Sector[]>('/sectors')
    .then((res) => {
      if (Array.isArray(res)) setSectors(res);
      else if ('content' in res) setSectors(res.content);
    })
    .finally(() => setLoading(false));
}, []);

  if (loading) return <div className="text-gray-400">Cargando sectores...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Sectores</h1>
      <div className="grid gap-4">
        {sectors.map((s) => (
          <div
            key={s.id}
            onClick={() => navigate(`/sectors/${s.id}/story`)}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-emerald-600 transition-colors"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">{s.name}</p>
                <p className="text-xs text-gray-400">{s.sectorCode} · {s.climate}</p>
              </div>
              <span className="text-emerald-400 font-mono text-sm">
                {s.stabilityLevel}% estable
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

