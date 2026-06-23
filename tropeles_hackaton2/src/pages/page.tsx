import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // ajusta el path si difiere
import SectorStory from "../components/SectorStory.jsx"; // apunta al JSX real

/**
 * Página de /sectors/:id/story (React Router).
 *
 * Esta ruta vive DENTRO del grupo protegido por <PrivateRoute>, así que
 * para cuando este componente monta, la sesión ya está resuelta y
 * autenticada — no hace falta repetir ese chequeo aquí (a diferencia del
 * wrapper de Next.js, que sí lo hacía porque ahí no existía un guard
 * previo del mismo tipo).
 *
 * Suposición sobre la forma de useAuth() (no confirmada — ajustar si
 * tu AuthContext real expone otra forma):
 *   const { token } = useAuth();
 */
export function SectorStoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  if (!id) {
    // No debería pasar dado el patrón de la ruta (:id es obligatorio),
    // pero TypeScript no puede garantizarlo — useParams() siempre
    // tipa los params como string | undefined.
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <SectorStory
      sectorId={id}
      authToken={token}
      onBack={() => navigate("/dashboard")} // ajusta si tu resumen de sectores vive en otra ruta
    />
  );
}