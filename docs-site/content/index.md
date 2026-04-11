---
seo:
  title: IOServer — TypeScript Real-Time Framework
  description: TypeScript framework combining Fastify and Socket.IO with a modular component architecture for building real-time backends.
---

:::u-page-hero
#title
Real-time backends, the TypeScript way.

#description
IOServer is a **TypeScript framework** that combines Fastify (HTTP) and Socket.IO (WebSocket) behind a clean, modular architecture. Define clear boundaries between services, controllers, managers, watchers, and middlewares — and let IOServer wire them together.

#links
::::u-button{to="/docs/getting-started/introduction" size="xl" trailing-icon="i-lucide-arrow-right" color="neutral"}
Get Started
::::

::::u-button{to="https://github.com/x42en/IOServer" target="_blank" size="xl" variant="outline" color="neutral" icon="i-simple-icons-github"}
Star on GitHub
::::
:::

:::u-page-section
#title
Why IOServer?

#features
::::u-page-feature{icon="i-lucide-layers" title="Modular by design" description="Five distinct component types — services, controllers, managers, watchers, and middlewares — each with a single, well-defined responsibility."}
::::

::::u-page-feature{icon="i-lucide-zap" title="Fastify + Socket.IO" description="Built on the fastest Node.js HTTP framework and the most popular WebSocket library. No compromises on performance."}
::::

::::u-page-feature{icon="i-lucide-shield-check" title="Strict TypeScript" description="Full type safety throughout. Every public API is typed, including the AppHandle that connects your components together."}
::::

::::u-page-feature{icon="i-lucide-share-2" title="Shared app handle" description="Managers are registered in a shared AppHandle accessible to every component — no global singletons, no dependency injection boilerplate."}
::::

::::u-page-feature{icon="i-lucide-radio" title="Automatic WS routing" description="Every public method on a Service automatically becomes a Socket.IO event handler. No decorators, no registration boilerplate."}
::::

::::u-page-feature{icon="i-lucide-file-json" title="JSON-based HTTP routes" description="HTTP routes are declared in plain JSON files and mapped to controller methods by name. Clean separation of routing and logic."}
::::
:::
