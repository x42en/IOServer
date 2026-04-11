export default defineNuxtConfig({
  extends: ["docus"],
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL ?? "/ioserver/",
  },
  site: {
    url: process.env.NUXT_SITE_URL ?? "https://docs.circle-cyber.com/ioserver",
  },
  llms: {
    title: "IOServer",
    description:
      "TypeScript framework combining Fastify and Socket.IO with a modular component architecture.",
    full: {
      title: "IOServer — Complete Documentation",
      description:
        "Complete documentation for IOServer, a TypeScript framework for building real-time applications with Fastify and Socket.IO using a modular component model (services, controllers, managers, watchers, middlewares).",
    },
  },
});
