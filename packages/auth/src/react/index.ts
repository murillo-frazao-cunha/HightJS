/*
 * This file is part of the HightJS Project.
 * Copyright (c) 2025 itsmuzin
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// Exportações do frontend
export * from '../react';
export * from '../client';
export * from '../components';

// Re-exports das funções mais usadas para conveniência
export { getSession } from '../client';
export { useSession, useAuth, SessionProvider } from '../react';
export { ProtectedRoute, AuthGuard, GuestOnly } from '../components';
