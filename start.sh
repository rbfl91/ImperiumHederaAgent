#!/usr/bin/env bash
#
# Imperium Markets — Full Stack Launcher
#
# Starts Hardhat node, deploys contracts, starts mock API, and launches the CLI agent.
# Usage:  ./start.sh
# Stop:   Ctrl+C (kills all background processes automatically)
#

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Track background PIDs for cleanup
PIDS=()

cleanup() {
  echo ""
  echo -e "${YELLOW}🛑 Shutting down...${NC}"
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null
  echo -e "${GREEN}✅ All processes stopped.${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   🦞  Imperium Markets — Full Stack Launcher         ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# ── 1) Start Hardhat Node ────────────────────────────────────────────
echo -e "${YELLOW}[1/4]${NC} Starting Hardhat node on port 8545..."
npx hardhat node > /tmp/hardhat-node.log 2>&1 &
HARDHAT_PID=$!
PIDS+=($HARDHAT_PID)

# Wait for Hardhat node to be ready
RETRIES=0
until curl -s -o /dev/null -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' 2>/dev/null; do
  RETRIES=$((RETRIES + 1))
  if [ "$RETRIES" -gt 30 ]; then
    echo -e "${RED}❌ Hardhat node failed to start after 30s. Check /tmp/hardhat-node.log${NC}"
    exit 1
  fi
  sleep 1
done
echo -e "${GREEN}   ✅ Hardhat node running (PID $HARDHAT_PID)${NC}"

# ── 2) Compile & Deploy ─────────────────────────────────────────────
echo -e "${YELLOW}[2/4]${NC} Compiling and deploying contracts..."
npx hardhat compile > /tmp/hardhat-compile.log 2>&1
npx hardhat run scripts/deploy.js --network localhost > /tmp/hardhat-deploy.log 2>&1
echo -e "${GREEN}   ✅ Contracts deployed${NC}"

# ── 3) Start Mock API ───────────────────────────────────────────────
echo -e "${YELLOW}[3/4]${NC} Starting Mock API on port 4000..."
node mocks/mock-api.js > /tmp/mock-api.log 2>&1 &
API_PID=$!
PIDS+=($API_PID)

# Wait for API to be ready
RETRIES=0
until curl -s -o /dev/null http://127.0.0.1:4000/health 2>/dev/null; do
  RETRIES=$((RETRIES + 1))
  if [ "$RETRIES" -gt 15 ]; then
    echo -e "${RED}❌ Mock API failed to start after 15s. Check /tmp/mock-api.log${NC}"
    exit 1
  fi
  sleep 1
done
echo -e "${GREEN}   ✅ Mock API running (PID $API_PID)${NC}"

# ── 4) Launch Agent ─────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[4/4]${NC} Launching CLI Agent..."
echo -e "${CYAN}────────────────────────────────────────────────────────${NC}"
echo ""

node agent/cli-agent.js
