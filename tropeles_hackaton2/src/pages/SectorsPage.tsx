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
  const token = localStorage.getItem('token') // o como guardes el token
  console.log('TOKEN:', token)
  
  fetch(`${import.meta.env.VITE_API_BASE_URL}/sectors`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(r => {
      console.log('STATUS:', r.status)
      return r.json()
    })
    .then(data => {
      console.log('DATA:', data)
      if (Array.isArray(data)) setSectors(data)
      else if (data.sectors) setSectors(data.sectors)
      else if (data.content) setSectors(data.content)
      else if (data.items) setSectors(data.items)
    })
    .catch(e => console.error('FETCH ERROR:', e))
    .finally(() => setLoading(false))
}, [])

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

