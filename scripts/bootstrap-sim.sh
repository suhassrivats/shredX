#!/bin/bash

# Boot the iOS Simulator, start the backend (Docker), and launch the mobile
# app in Expo Go against it.
# Usage: ./scripts/bootstrap-sim.sh ["iPhone 17 Pro"]

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SIM_NAME="${1:-iPhone 17 Pro}"

echo "🐳 Starting Docker..."
if ! docker info >/dev/null 2>&1; then
    open -a Docker
    until docker info >/dev/null 2>&1; do sleep 2; done
fi

echo "🚀 Starting backend..."
(cd "$ROOT_DIR" && docker compose up -d)

echo "⏳ Waiting for backend on :5000..."
until curl -sf -o /dev/null "http://localhost:5000/" || curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/" | grep -q "404"; do
    sleep 1
done

echo "📱 Booting simulator: $SIM_NAME..."
UDID=$(xcrun simctl list devices available | grep "$SIM_NAME" | grep -o '[0-9A-F-]\{36\}' | head -1)
if [ -z "$UDID" ]; then
    echo "❌ Error: simulator '$SIM_NAME' not found!"
    exit 1
fi
xcrun simctl boot "$UDID" 2>/dev/null || true
open -a Simulator

cd "$ROOT_DIR/mobile"

if ! xcrun simctl listapps "$UDID" 2>/dev/null | grep -q "host.exp.Exponent"; then
    echo "⬇️  Expo Go not installed on this simulator, installing (needs network)..."
    npx expo start --ios >/tmp/expo-go-install.log 2>&1 &
    for i in $(seq 1 30); do
        xcrun simctl listapps "$UDID" 2>/dev/null | grep -q "host.exp.Exponent" && break
        sleep 2
    done
    pkill -f "expo start" 2>/dev/null || true
    sleep 1
fi

echo "📦 Launching Expo (offline mode, skips EAS login)..."
exec npx expo start --ios --offline
