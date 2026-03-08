import { Hono } from 'hono';
import type { Handler } from 'hono/types';
import updatedFetch from '../src/__create/fetch';

export const API_BASENAME = '/api';
export const api = new Hono();

if (globalThis.fetch) {
  globalThis.fetch = updatedFetch;
}

type RouteMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

type RouteModule = Partial<
  Record<
    RouteMethod,
    (request: Request, context?: { params?: Record<string, string> }) => Response | Promise<Response>
  >
>;

/**
 * Vite will rewrite these imports during build, so aliases like "@/..."
 * inside the route modules keep working in production.
 */
const routeModules = {
  ...import.meta.glob<RouteModule>('../src/app/api/**/route.js'),
  ...import.meta.glob<RouteModule>('../src/app/api/**/route.ts'),
};

function getHonoPath(modulePath: string): string {
  const relativePath = modulePath
    .replace('../src/app/api', '')
    .replace(/\/route\.(js|ts)$/, '');

  if (!relativePath) {
    return '/';
  }

  const segments = relativePath.split('/').filter(Boolean);

  const honoSegments = segments.map((segment) => {
    // [id] -> :id
    // [...slug] -> :slug{.+}
    const match = segment.match(/^\[(\.{3})?([^\]]+)\]$/);
    if (!match) return segment;

    const [, dots, param] = match;
    return dots === '...' ? `:${param}{.+}` : `:${param}`;
  });

  return `/${honoSegments.join('/')}`;
}

async function registerRoutes() {
  api.routes = [];

  const routeEntries = Object.entries(routeModules).sort(([a], [b]) => {
    // Register more specific paths first
    return b.length - a.length;
  });

  const methods: RouteMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  for (const [modulePath, loadModule] of routeEntries) {
    const honoPath = getHonoPath(modulePath);

    for (const method of methods) {
      const methodLower = method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';

      const handler: Handler = async (c) => {
        const mod = await loadModule();
        const fn = mod[method];

        if (!fn) {
          return c.json({ error: `Method ${method} not implemented` }, 405);
        }

        const params = c.req.param();
        return await fn(c.req.raw, { params });
      };

      switch (methodLower) {
        case 'get':
          api.get(honoPath, handler);
          break;
        case 'post':
          api.post(honoPath, handler);
          break;
        case 'put':
          api.put(honoPath, handler);
          break;
        case 'delete':
          api.delete(honoPath, handler);
          break;
        case 'patch':
          api.patch(honoPath, handler);
          break;
      }
    }
  }
}

await registerRoutes();

if (import.meta.env.DEV && import.meta.hot) {
  import.meta.hot.accept(async () => {
    try {
      await registerRoutes();
    } catch (err) {
      console.error('Error reloading routes:', err);
    }
  });
}