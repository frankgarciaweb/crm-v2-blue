import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppProvider } from '@/contexts/AppContext';
import { Layout } from '@/components/Layout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useSession } from '@/hooks/useAuth';

// Lazy-loaded pages
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Login = lazy(() => import('@/pages/Login'));
const Clientes = lazy(() => import('@/pages/Clientes'));
const Productos = lazy(() => import('@/pages/Productos'));
const Inventario = lazy(() => import('@/pages/Inventario'));
const Pedidos = lazy(() => import('@/pages/Pedidos'));
const Trabajos = lazy(() => import('@/pages/Trabajos'));
const Proveedores = lazy(() => import('@/pages/Proveedores'));
const Cotizaciones = lazy(() => import('@/pages/Cotizaciones'));
const Finanzas = lazy(() => import('@/pages/Finanzas'));
const Reportes = lazy(() => import('@/pages/Reportes'));
const Calendario = lazy(() => import('@/pages/Calendario'));
const Configuracion = lazy(() => import('@/pages/Configuracion'));
const Archivos = lazy(() => import('@/pages/Archivos'));
const Plotter = lazy(() => import('@/pages/Plotter'));
const PedidosPDF = lazy(() => import('@/pages/PedidosPDF'));
const CalcularMadera = lazy(() => import('@/pages/CalcularMadera'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0f1a]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PageLoader() {
  return (
    <div className="flex h-full min-h-[400px] items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/pedidos" element={<Pedidos />} />
          <Route path="/trabajos" element={<Trabajos />} />
          <Route path="/proveedores" element={<Proveedores />} />
          <Route path="/cotizaciones" element={<Cotizaciones />} />
          <Route path="/finanzas" element={<Finanzas />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/calendario" element={<Calendario />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="/archivos" element={<Archivos />} />
          <Route path="/plotter" element={<Plotter />} />
          <Route path="/calcular-madera" element={<CalcularMadera />} />
          <Route path="/pedidos-pdf" element={<PedidosPDF />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </QueryClientProvider>
  );
}
