# Como Usar Autenticação nas Rotas da API

Este guia mostra como puxar o usuário autenticado nas suas rotas da API usando o sistema HWebAuth.

## 1. Configuração Básica

Primeiro, você precisa inicializar o sistema de auth com suas configurações:

```typescript
import { HWebAuth } from './src/auth/core';

// Configuração do auth
const auth = new HWebAuth({
    secret: 'seu-secret-aqui', // Use uma string segura em produção
    providers: [
        {
            id: 'credentials',
            name: 'Credentials',
            type: 'credentials',
            authorize: async (credentials) => {
                // Sua lógica de autenticação aqui
                const { email, password } = credentials;
                
                // Exemplo: verificar no banco de dados
                const user = await verificarUsuario(email, password);
                
                if (user) {
                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        // outros campos que você quiser
                    };
                }
                
                return null;
            }
        }
    ],
    session: {
        strategy: 'jwt',
        maxAge: 86400 // 24 horas
    }
});
```

## 2. Middleware para Puxar o Usuário

### Método 1: Usando middleware() - Usuário Opcional
Use quando a rota pode funcionar com ou sem usuário logado:

```typescript
import { HightJSRequest, HightJSResponse } from './src/api/http';

export async function minhaRota(req: HightJSRequest) {
    // Pega o usuário (pode ser null)
    const { session, user } = await auth.middleware(req);
    
    if (user) {
        // Usuário está logado
        return HightJSResponse.json({
            message: `Olá, ${user.name}!`,
            userEmail: user.email,
            dados: 'dados específicos do usuário'
        });
    } else {
        // Usuário não está logado
        return HightJSResponse.json({
            message: 'Visitante anônimo',
            dados: 'dados públicos'
        });
    }
}
```

### Método 2: Usando requireAuth() - Usuário Obrigatório
Use quando a rota só pode ser acessada por usuários autenticados:

```typescript
export async function rotaProtegida(req: HightJSRequest) {
    // Verifica se o usuário está autenticado
    const authResult = await auth.requireAuth(req);
    
    // Se não estiver autenticado, retorna erro automaticamente
    if (authResult instanceof HightJSResponse) {
        return authResult; // Retorna 401 Unauthorized
    }
    
    // Se chegou aqui, o usuário está autenticado
    const { user, session } = authResult;
    
    return HightJSResponse.json({
        message: `Área restrita! Bem-vindo, ${user.name}`,
        userId: user.id,
        sessionExpires: session.expires,
        dadosSensíveis: 'informações importantes'
    });
}
```

### Método 3: Usando getSession() - Só a Sessão
Use quando você só precisa verificar se existe uma sessão válida:

```typescript
export async function verificarSessao(req: HightJSRequest) {
    const session = await auth.getSession(req);
    
    if (session) {
        return HightJSResponse.json({
            status: 'authenticated',
            user: session.user,
            expires: session.expires
        });
    }
    
    return HightJSResponse.json({
        status: 'unauthenticated'
    });
}
```

## 3. Exemplos Práticos

### Rota de Perfil do Usuário
```typescript
export async function perfilUsuario(req: HightJSRequest) {
    const authResult = await auth.requireAuth(req);
    
    if (authResult instanceof HightJSResponse) {
        return authResult;
    }
    
    const { user } = authResult;
    
    // Buscar dados completos do usuário no banco
    const dadosCompletos = await buscarUsuarioCompleto(user.id);
    
    return HightJSResponse.json({
        id: dadosCompletos.id,
        name: dadosCompletos.name,
        email: dadosCompletos.email,
        avatar: dadosCompletos.avatar,
        createdAt: dadosCompletos.createdAt
    });
}
```

### Rota de Lista de Posts (com dados personalizados)
```typescript
export async function listarPosts(req: HightJSRequest) {
    const { user } = await auth.middleware(req);
    
    if (user) {
        // Usuário logado - mostrar posts personalizados
        const posts = await buscarPostsPersonalizados(user.id);
        return HightJSResponse.json({
            posts,
            personalized: true,
            userId: user.id
        });
    } else {
        // Visitante - mostrar posts públicos
        const posts = await buscarPostsPublicos();
        return HightJSResponse.json({
            posts,
            personalized: false
        });
    }
}
```

### Rota para Atualizar Dados do Usuário
```typescript
export async function atualizarPerfil(req: HightJSRequest) {
    const authResult = await auth.requireAuth(req);
    
    if (authResult instanceof HightJSResponse) {
        return authResult;
    }
    
    const { user } = authResult;
    const dadosAtualizacao = await req.json();
    
    // Atualizar apenas os dados do usuário logado
    const usuarioAtualizado = await atualizarUsuario(user.id, dadosAtualizacao);
    
    return HightJSResponse.json({
        success: true,
        user: usuarioAtualizado
    });
}
```

## 4. Como o Token é Enviado

O sistema busca o token de autenticação em duas formas:

### Via Cookie (Recomendado)
O token é automaticamente enviado pelo browser:
```typescript
// Não precisa fazer nada no frontend, o cookie é enviado automaticamente
fetch('/api/perfil')
```

### Via Header Authorization
Para APIs ou quando não pode usar cookies:
```typescript
fetch('/api/perfil', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
})
```

## 5. Verificações Úteis

### Verificar se usuário está autenticado (simples)
```typescript
export async function statusAuth(req: HightJSRequest) {
    const isAuth = await auth.isAuthenticated(req);
    
    return HightJSResponse.json({
        authenticated: isAuth
    });
}
```

### Middleware personalizado para múltiplas rotas
```typescript
export async function middleware(req: HightJSRequest, next: Function) {
    const { user, session } = await auth.middleware(req);
    
    // Adicionar user e session no contexto da requisição
    (req as any).user = user;
    (req as any).session = session;
    
    return next();
}

// Usar em outras rotas
export async function minhaRota(req: HightJSRequest) {
    const user = (req as any).user;
    
    if (user) {
        return HightJSResponse.json({
            message: `Logado como ${user.name}`
        });
    }
    
    return HightJSResponse.json({
        message: 'Não logado'
    });
}
```

## 6. Tratamento de Erros

```typescript
export async function rotaComTratamentoErros(req: HightJSRequest) {
    try {
        const authResult = await auth.requireAuth(req);
        
        if (authResult instanceof HightJSResponse) {
            return authResult;
        }
        
        const { user } = authResult;
        
        // Sua lógica aqui
        
        return HightJSResponse.json({ success: true });
        
    } catch (error) {
        console.error('Erro na rota:', error);
        return HightJSResponse.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
}
```

## Resumo Rápido

- **`auth.middleware(req)`** → Usuário opcional (pode ser null)
- **`auth.requireAuth(req)`** → Usuário obrigatório (retorna erro se não logado)
- **`auth.getSession(req)`** → Só a sessão (sem dados completos do usuário)
- **`auth.isAuthenticated(req)`** → Boolean simples

Use `requireAuth()` para rotas protegidas e `middleware()` para rotas que podem funcionar com ou sem usuário.
