import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-emerald-400 text-lg">TropelCare</span>
          <nav className="flex gap-4 text-sm">
            <Link to="/dashboard" className="hover:text-emerald-400 transition-colors">
              Dashboard
            </Link>
            <Link to="/tropels" className="hover:text-emerald-400 transition-colors">
              Tropeles
            </Link>
            <Link to="/signals" className="hover:text-emerald-400 transition-colors">
              Señales
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-400">{user?.teamCode}</span>
          <button
            onClick={handleLogout}
            className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition-colors"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
