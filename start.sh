#!/usr/bin/env bash
#
# Imperium Markets — Full Stack Launcher
#
# Starts Hardhat node (local only), deploys contracts, starts ImperiumAPI,
# and launches the CLI agent.
#
# Usage:
#   ./start.sh                          # local Hardhat Network
#   ./start.sh --network hedera-testnet # Hedera Testnet (requires .env)
#
# Stop:   Ctrl+C (kills all background processes automatically)
#

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# ── Parse arguments ──────────────────────────────────────────────────
NETWORK="local"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --network)
      NETWORK="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: ./start.sh [--network local|hedera-testnet]"
      exit 1
      ;;
  esac
done

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
echo -e "${CYAN}║   Network: $(printf '%-41s' "$NETWORK")║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$NETWORK" = "local" ]; then
  # ── LOCAL MODE: Start Hardhat Node + Deploy ──────────────────────

  # 1) Start Hardhat Node
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

  # 2) Compile & Deploy
  echo -e "${YELLOW}[2/4]${NC} Compiling and deploying contracts..."
  npx hardhat compile > /tmp/hardhat-compile.log 2>&1
  npx hardhat run scripts/deploy.js --network localhost > /tmp/hardhat-deploy.log 2>&1
  echo -e "${GREEN}   ✅ Contracts deployed (local)${NC}"

else
  # ── TESTNET MODE: Deploy to Hedera Testnet ───────────────────────

  # Verify .env is configured
  if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found. Copy .env.example and fill in your Hedera credentials.${NC}"
    exit 1
  fi

  if ! grep -q "HEDERA_TESTNET_PRIVATE_KEY" .env 2>/dev/null; then
    echo -e "${RED}❌ HEDERA_TESTNET_PRIVATE_KEY not found in .env${NC}"
    exit 1
  fi

  echo -e "${YELLOW}[1/4]${NC} Skipping local node (using Hedera Testnet RPC)..."
  echo -e "${GREEN}   ✅ Using Hashio JSON-RPC Relay${NC}"

  # 2) Compile & Deploy to Hedera Testnet
  echo -e "${YELLOW}[2/4]${NC} Compiling and deploying contracts to Hedera Testnet..."
  npx hardhat compile > /tmp/hardhat-compile.log 2>&1
  npx hardhat run scripts/deploy.js --network hederaTestnet 2>&1 | tee /tmp/hardhat-deploy.log
  echo -e "${GREEN}   ✅ Contracts deployed to Hedera Testnet${NC}"
fi

# ── 3) Start ImperiumAPI ──────────────────────────────────────────
echo -e "${YELLOW}[3/4]${NC} Starting API on port 4000 (network: ${NETWORK})..."
node api/imperium-api.js --network "$NETWORK" > /tmp/imperium-api.log 2>&1 &
API_PID=$!
PIDS+=($API_PID)

# Wait for API to be ready
RETRIES=0
until curl -s -o /dev/null http://127.0.0.1:4000/health 2>/dev/null; do
  RETRIES=$((RETRIES + 1))
  if [ "$RETRIES" -gt 15 ]; then
    echo -e "${RED}❌ ImperiumAPI failed to start after 15s. Check /tmp/imperium-api.log${NC}"
    exit 1
  fi
  sleep 1
done
echo -e "${GREEN}   ✅ API running (PID $API_PID)${NC}"

# ── 4) Launch Agent or Web Frontend ───────────────────────────────
echo ""
echo -e "${GREEN}   ✅ Backend ready!${NC}"
echo ""
echo -e "${CYAN}   Web UI:   ${NC}http://localhost:4000  (or run ${YELLOW}npm run dev:web${NC} for dev server on :5173)"
echo -e "${CYAN}   CLI Agent:${NC} Run ${YELLOW}node agent/cli-agent.js${NC} in another terminal"
echo ""
echo -e "${YELLOW}[4/4]${NC} Launching CLI Agent..."
echo -e "${CYAN}────────────────────────────────────────────────────────${NC}"
echo ""

NETWORK="$NETWORK" node agent/cli-agent.js
