#!/usr/bin/env bash
set -euo pipefail

echo "=== Job Apply Assistant Setup ==="

if ! command -v node &>/dev/null; then
  echo ""
  echo "ERROR: Node.js is not installed."
  echo ""
  echo "This project requires Node.js 20+ and npm."
  echo ""
  echo "Install Node.js:"
  echo "  macOS:  Download LTS from https://nodejs.org  (easiest)"
  echo "          or run:  brew install node"
  echo "  Windows: Download LTS from https://nodejs.org"
  echo ""
  echo "After installing, QUIT AND REOPEN Terminal, then verify:"
  echo "  node -v"
  echo "  npm -v"
  echo ""
  echo "Then run this script again:  ./setup.sh"
  echo ""
  exit 1
fi

if ! command -v npm &>/dev/null; then
  echo ""
  echo "ERROR: npm was not found (Node.js may be partially installed)."
  echo "Reinstall Node.js LTS from https://nodejs.org and restart Terminal."
  echo ""
  exit 1
fi

echo "Node version: $(node -v)"
echo "npm version: $(npm -v)"

npm install

echo "Building packages..."
npm run build:packages

echo "Running database migrations..."
npm run db:migrate

echo "Seeding database..."
npm run db:seed

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — edit API keys if needed."
fi

echo ""
echo "Installing Playwright Chromium (required for Run Application)..."
npm run playwright:install

echo ""
echo "=== Setup complete ==="
echo ""
echo "Start the app:"
echo "  npm run dev"
echo ""
echo "Then open: http://localhost:5173"
echo ""
echo "Load Chrome extension:"
echo "  1. Open chrome://extensions"
echo "  2. Enable Developer mode"
echo "  3. Load unpacked → select the ./extension folder"
echo ""
