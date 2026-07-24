#!/usr/bin/env bash
# ============================================================================
# OrbitPay Deployment Preparation Script
# ============================================================================
# This script prepares both contracts and frontend for deployment.
# It supports a "demo mode" that works without deployed contracts
# by using the built-in simulation layer.
#
# Usage:
#   ./scripts/prepare-deploy.sh              # Full deploy (requires Soroban CLI)
#   ./scripts/prepare-deploy.sh --demo        # Demo mode (simulated contracts)
#   ./scripts/prepare-deploy.sh --contracts   # Contracts only
#   ./scripts/prepare-deploy.sh --frontend    # Frontend only
# ============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

MODE="${1:-full}"

echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       OrbitPay Deployment Preparation            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# Frontend Build
# ============================================================================

build_frontend() {
  echo -e "${YELLOW}[1/3] Building frontend...${NC}"
  cd /workspaces/OrbitPay

  npm run build 2>&1 | tail -5

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Frontend build successful${NC}"
  else
    echo -e "${RED}Frontend build failed${NC}"
    exit 1
  fi
}

# ============================================================================
# Contract Build (if Soroban CLI available)
# ============================================================================

build_contracts() {
  echo -e "${YELLOW}[2/3] Building smart contracts...${NC}"
  cd /workspaces/OrbitPay/contracts

  if source $HOME/.cargo/env && command -v soroban &>/dev/null; then
    cargo build --release --target wasm32-unknown-unknown 2>&1 | tail -5
    echo -e "${GREEN}Contract build successful${NC}"
  else
    echo -e "${YELLOW}Soroban CLI not available. Skipping contract build.${NC}"
    echo -e "${YELLOW}Install with: cargo install soroban-cli${NC}"
    echo -e "${YELLOW}Contracts will work in simulation mode.${NC}"
  fi
}

# ============================================================================
# Environment Setup
# ============================================================================

setup_environment() {
  echo -e "${YELLOW}[3/3] Setting up environment...${NC}"

  if [ ! -f .env.local ]; then
    cp .env.template .env.local
    echo -e "${GREEN}Created .env.local from template${NC}"
  else
    echo -e "${YELLOW}.env.local already exists, skipping${NC}"
  fi

  echo ""
  echo -e "${GREEN}Environment ready!${NC}"
  echo ""
  echo -e "${YELLOW}Next steps:${NC}"
  echo "  1. Deploy contracts:    ./scripts/deploy.sh"
  echo "  2. Start development:   npm run dev"
  echo "  3. Run tests:          npm test"
  echo "  4. Deploy to Vercel:   npx vercel --prod"
}

# ============================================================================
# Main
# ============================================================================

case "$MODE" in
  --demo)
    echo -e "${YELLOW}Demo Mode: Using simulated contract data${NC}"
    build_frontend
    setup_environment
    echo ""
    echo -e "${GREEN}Demo deployment ready!${NC}"
    echo -e "Start with: ${BLUE}npm run dev${NC}"
    ;;
  --contracts)
    build_contracts
    ;;
  --frontend)
    build_frontend
    ;;
  full)
    build_frontend
    build_contracts
    setup_environment
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║       Deployment Preparation Complete!           ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
    ;;
esac
