/opt/homebrew/Library/Homebrew/cmd/shellenv.sh: line 27: /bin/ps: Operation not permitted
# Connections Game

A personal Connections-style word game with an English dictionary lookup.

## Start locally on Mac

Double-click `Start Connections Game.command` to start the game and open it in your browser. Keep the Terminal window open while playing. Close it or press Control+C to stop the local server. You can drag the launcher file to your Desktop for easier access.

## Local dictionary setup

1. Copy `.env.example` to `.env.local`.
2. Put your Merriam-Webster Collegiate Dictionary API key after `MW_COLLEGIATE_API_KEY=`.
3. Restart the local development server.

The key is read by the local server and is not included in the browser code. Do not commit `.env.local`.

## Online dictionary setup

GitHub Pages can host the game files but cannot run the secure dictionary proxy. The `/functions/api/dictionary.ts` endpoint is ready for Cloudflare Pages. Deploy this repository there with `yarn build` as the build command and `dist` as the output directory, then add `MW_COLLEGIATE_API_KEY` as an encrypted secret in the Pages project settings. The Cloudflare Pages URL will serve both the game and the dictionary endpoint.

The existing GitHub Pages site continues to use Wiktionary as a fallback because it cannot host the proxy.
