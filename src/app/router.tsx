/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { MainLayout } from '@components/layout/MainLayout';
import { Loading } from '@components/common/Loading';

// Lazy load pages for code splitting
const Home = lazy(() => import('@pages/Home/Home'));
const Login = lazy(() => import('@pages/Login/Login'));
const Dashboard = lazy(() => import('@pages/Dashboard/Dashboard'));

// Wrapper component for lazy loaded routes
const LazyRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<Loading />}>{children}</Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <LazyRoute>
        <Login />
      </LazyRoute>
    ),
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: (
          <LazyRoute>
            <Home />
          </LazyRoute>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <LazyRoute>
            <Dashboard />
          </LazyRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    element: (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>404 - Página não encontrada</h1>
        <p>A página que você procura não existe.</p>
        <a href="/">Voltar para o início</a>
      </div>
    ),
  },
]);
