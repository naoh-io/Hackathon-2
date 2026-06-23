import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TropelsPage } from './pages/TropelsPage';
import { SignalsFeedPage } from "./pages/SignalsFeedPage";
import { SignalDetailPage } from "./pages/SignalDetailPage";
import SectorStoryPage from "./pages/page";

function SectorStoryRouteWrapper() {
  const params = useParams<{ id: string }>();

  return <SectorStoryPage params={Promise.resolve({ id: params?.id ?? '' })} />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            {/* Tus compañeros conectarán sus rutas aquí */}
            <Route path="/tropels" element={<TropelsPage />} />
            <Route path="/signals" element={<SignalsFeedPage />} />
            <Route path="/signals/:id" element={<SignalDetailPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
          <Route path="/sectors/:id" element={<SectorStoryRouteWrapper />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

