#!/bin/zsh

PROJECT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
NODE_RUNTIME="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"

if [ ! -x "$NODE_RUNTIME" ]; then
  if [ -x /opt/homebrew/bin/node ]; then
    NODE_RUNTIME="/opt/homebrew/bin/node"
  elif [ -x /usr/local/bin/node ]; then
    NODE_RUNTIME="/usr/local/bin/node"
  else
    echo "Node.js was not found. Open this project in Codex and ask for setup help."
    read -r "?Press Return to close this window..."
    exit 1
  fi
fi

VITE_ENTRY="$PROJECT_DIR/node_modules/vite/bin/vite.js"
if [ ! -f "$VITE_ENTRY" ]; then
  echo "The game dependencies are missing. Open this project in Codex and ask for setup help."
  read -r "?Press Return to close this window..."
  exit 1
fi

if ! grep -Eq '^MW_COLLEGIATE_API_KEY=.+$' "$PROJECT_DIR/.env.local" 2>/dev/null; then
  echo "The game will open, but dictionary lookup needs a key in .env.local."
fi

cd "$PROJECT_DIR" || exit 1
echo "Starting Connections Game. Keep this window open while you play."
"$NODE_RUNTIME" "$VITE_ENTRY" --host 127.0.0.1 --open
