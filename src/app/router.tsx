import { QueryClientProvider } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Navigate,
  Outlet
} from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { AppShell } from '../components/AppShell';
import { AuthProvider } from '../features/auth/AuthProvider';
import { LoginPage } from '../features/auth/LoginPage';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { AuthenticatedHome } from '../features/dashboard/AuthenticatedHome';

interface RouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootComponent
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Navigate to="/app" />
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app',
  component: () => (
    <ProtectedRoute>
      <AppShell>
        <AuthenticatedHome />
      </AppShell>
    </ProtectedRoute>
  )
});

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, appRoute]);

export const router = createRouter({
  routeTree,
  context: {
    queryClient: undefined as unknown as QueryClient
  },
  defaultPreload: 'intent'
});

function RootComponent() {
  const { queryClient } = rootRoute.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  );
}

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
