import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";

function localDictionaryProxy(apiKey) {
  return {
    name: "local-dictionary-proxy",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? "/", "http://localhost");
        if (url.pathname !== "/api/dictionary") return next();

        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.setHeader("Cache-Control", "no-store");

        if (request.method !== "GET") {
          response.statusCode = 405;
          response.end(JSON.stringify({ error: "Only GET requests are supported." }));
          return;
        }

        if (!apiKey) {
          response.statusCode = 503;
          response.end(JSON.stringify({ error: "The dictionary key is not configured." }));
          return;
        }

        const word = url.searchParams.get("word")?.trim();
        if (!word || word.length > 80) {
          response.statusCode = 400;
          response.end(JSON.stringify({ error: "Enter a word of 1 to 80 characters." }));
          return;
        }

        try {
          const apiUrl = new URL(
            `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}`,
          );
          apiUrl.searchParams.set("key", apiKey);
          const upstream = await fetch(apiUrl);
          response.statusCode = upstream.status;
          response.end(await upstream.text());
        } catch {
          response.statusCode = 502;
          response.end(JSON.stringify({ error: "Could not reach Merriam-Webster." }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), localDictionaryProxy(env.MW_COLLEGIATE_API_KEY)],
    base: process.env.GITHUB_ACTIONS === "true" ? "/connections-game/" : "/",
  };
});
