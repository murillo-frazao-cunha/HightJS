// Exportações do frontend
export * from '../react';
export * from '../client';
export * from '../components';

// Re-exports das funções mais usadas para conveniência
export { getSession } from '../client';
export { useSession, useAuth, SessionProvider } from '../react';
export { ProtectedRoute, AuthGuard, GuestOnly } from '../components';
