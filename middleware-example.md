# Sistema de Middleware do HightJS

O HightJS agora suporta middlewares para rotas de backend! Os middlewares são executados sequencialmente antes do handler da rota.

## Como Funciona

### 1. Middleware por Diretório

Se você criar um arquivo `middleware.ts` ou `middleware.tsx` em qualquer pasta dentro de `/src/web/backend/routes/`, todas as rotas nessa pasta (e subpastas) terão esse middleware aplicado automaticamente.

#### Estrutura de Exemplo:
```
src/
  web/
    backend/
      routes/
        middleware.ts          // Middleware global (todas as rotas)
        auth.ts               // Rota sem middleware específico
        dashboard/
          middleware.ts       // Middleware para todas as rotas em /dashboard/*
          stats.ts           // Herda middleware global + dashboard
          admin/
            middleware.ts     // Middleware para /dashboard/admin/*
            users.ts         // Herda global + dashboard + admin middlewares
```

### 2. Criando um Middleware

Um middleware deve ter a seguinte assinatura:

```typescript
import { HightJSRequest, HightJSResponse } from 'hightjs';

// Middleware de autenticação
export default async function authMiddleware(
  request: HightJSRequest,
  params: { [key: string]: string },
  next: () => Promise<HightJSResponse>
): Promise<HightJSResponse> {
  // Verificar se o usuário está autenticado
  const token = request.headers.authorization;
  
  if (!token) {
    return new HightJSResponse().status(401).json({
      error: 'Token de acesso necessário'
    });
  }
  
  try {
    // Validar o token aqui
    const user = validateToken(token);
    
    // Adicionar dados do usuário à requisição
    (request as any).user = user;
    
    // Continuar para o próximo middleware ou handler
    return await next();
  } catch (error) {
    return new HightJSResponse().status(401).json({
      error: 'Token inválido'
    });
  }
}
```

### 3. Middleware com Múltiplas Funções

Você também pode exportar múltiplas funções de middleware:

```typescript
// middleware.ts
import { HightJSRequest, HightJSResponse } from 'hightjs';

export async function corsMiddleware(req, params, next) {
  const response = await next();
  response.header('Access-Control-Allow-Origin', '*');
  return response;
}

export async function loggingMiddleware(req, params, next) {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  return await next();
}

// Ou exportar como array
export default [corsMiddleware, loggingMiddleware];
```

### 4. Middleware Específico por Rota

Você também pode adicionar middlewares específicos diretamente na configuração da rota:

```typescript
// dashboard/stats.ts
import { HightJSRequest, HightJSResponse } from 'hightjs';
import { BackendRouteConfig } from 'hightjs';

async function rateLimitMiddleware(req, params, next) {
  // Lógica de rate limiting
  return await next();
}

export default {
  pattern: '/api/dashboard/stats',
  middleware: [rateLimitMiddleware], // Middleware específico desta rota
  
  GET: async (request: HightJSRequest, params) => {
    // Este handler receberá:
    // 1. Middleware global (se existir)
    // 2. Middleware do diretório dashboard (se existir) 
    // 3. rateLimitMiddleware
    // 4. Finalmente este handler
    
    return new HightJSResponse().json({
      stats: 'data'
    });
  }
} as BackendRouteConfig;
```

### 5. Ordem de Execução

Os middlewares são executados na seguinte ordem:

1. **Middlewares de diretórios pais** (começando da raiz)
2. **Middlewares de diretórios filhos** (descendo na hierarquia)
3. **Middlewares específicos da rota** (definidos na propriedade `middleware`)
4. **Handler final da rota**

### 6. Interceptando Requisições

Um middleware pode interceptar a requisição e retornar uma resposta sem chamar `next()`:

```typescript
// middleware.ts - Middleware de manutenção
export default async function maintenanceMiddleware(req, params, next) {
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';
  
  if (isMaintenanceMode) {
    // Intercepta e retorna resposta de manutenção
    return new HightJSResponse()
      .status(503)
      .json({
        error: 'Sistema em manutenção',
        message: 'Voltaremos em breve!'
      });
  }
  
  // Continua normalmente
  return await next();
}
```

## Exemplo Completo

### Estrutura:
```
src/web/backend/routes/
├── middleware.ts              # CORS global
├── auth.ts                   # Login (sem auth)
└── dashboard/
    ├── middleware.ts         # Autenticação
    ├── stats.ts             # Estatísticas
    └── admin/
        ├── middleware.ts     # Verificação de admin
        └── users.ts         # Gerenciar usuários
```

### Arquivos:

**`/middleware.ts`** (Global):
```typescript
export default async function corsMiddleware(req, params, next) {
  const response = await next();
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  return response;
}
```

**`/dashboard/middleware.ts`** (Autenticação):
```typescript
export default async function authMiddleware(req, params, next) {
  const token = req.headers.authorization;
  if (!token) {
    return new HightJSResponse().status(401).json({ error: 'Unauthorized' });
  }
  (req as any).user = { id: 1, name: 'User' }; // Simular usuário
  return await next();
}
```

**`/dashboard/admin/middleware.ts`** (Admin check):
```typescript
export default async function adminMiddleware(req, params, next) {
  const user = (req as any).user;
  if (!user.isAdmin) {
    return new HightJSResponse().status(403).json({ error: 'Admin required' });
  }
  return await next();
}
```

**`/dashboard/admin/users.ts`** (Rota final):
```typescript
export default {
  pattern: '/api/dashboard/admin/users',
  
  GET: async (request, params) => {
    // Middlewares executados:
    // 1. corsMiddleware (global)
    // 2. authMiddleware (dashboard)
    // 3. adminMiddleware (admin)
    // 4. Este handler
    
    const user = (request as any).user;
    return new HightJSResponse().json({
      message: `Admin ${user.name} acessando usuários`,
      users: ['user1', 'user2']
    });
  }
};
```

Agora o HightJS executará automaticamente todos os middlewares na ordem correta! 🎉
