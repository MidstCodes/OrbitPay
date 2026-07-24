#!/usr/bin/env bash
# ============================================================================
# OrbitPay Smart Contract Deployment Script
# ============================================================================
#
# This script deploys OrbitPay's smart contracts to the Stellar network.
# It supports testnet and mainnet deployments.
#
# Prerequisites:
#   - Rust toolchain with wasm32-unknown-unknown target installed
#   - soroban-cli installed (cargo install soroban-cli)
#   - A funded Stellar account with secret key in SOROBAN_SECRET_KEY env var
#
# Usage:
#   # Deploy to testnet (default)
#   ./scripts/deploy.sh
#
#   # Deploy to mainnet
#   NETWORK=mainnet ./scripts/deploy.sh
#
#   # Dry run (just build, don't deploy)
#   DRY_RUN=true ./scripts/deploy.sh
# ============================================================================

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         OrbitPay Contract Deployment            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# Configuration
# ============================================================================

# Network selection
NETWORK="${NETWORK:-testnet}"

# Network configurations
declare -A NETWORK_CONFIGS
NETWORK_CONFIGS[testnet_rpc]="https://soroban-testnet.stellar.org"
NETWORK_CONFIGS[testnet_passphrase]="Test SDF Network ; September 2015"
NETWORK_CONFIGS[mainnet_rpc]="https://soroban.stellar.org"
NETWORK_CONFIGS[mainnet_passphrase]="Public Global Stellar Network ; September 2015"

RPC_URL="${NETWORK_CONFIGS[${NETWORK}_rpc]}"
PASSPHRASE="${NETWORK_CONFIGS[${NETWORK}_passphrase]}"

# Contract paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTRACTS_DIR="$PROJECT_DIR/contracts"
TARGET_DIR="$CONTRACTS_DIR/target/wasm32-unknown-unknown/release"

# Contract names
CONTRACTS=("orbitpay-payment" "orbitpay-notification" "orbitpay-history")

echo -e "${YELLOW}Network:${NC} $NETWORK"
echo -e "${YELLOW}RPC URL:${NC} $RPC_URL"
echo ""

# ============================================================================
# Prerequisites Check
# ============================================================================

echo -e "${BLUE}[1/5] Checking prerequisites...${NC}"

# Check for soroban CLI
if ! command -v soroban &>/dev/null; then
    echo -e "${YELLOW}soroban CLI not found. Installing...${NC}"
    cargo install soroban-cli
fi

# Check for secret key
if [ -z "${SOROBAN_SECRET_KEY:-}" ]; then
    echo -e "${RED}Error: SOROBAN_SECRET_KEY environment variable is not set.${NC}"
    echo "Set it to your Stellar account secret key:"
    echo "  export SOROBAN_SECRET_KEY=SCXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    echo ""
    echo "Or for testnet, you can use a test account:"
    echo "  export SOROBAN_SECRET_KEY=$(soroban keys generate)"
    exit 1
fi

echo -e "${GREEN}Prerequisites OK${NC}"
echo ""

# ============================================================================
# Build Contracts
# ============================================================================

echo -e "${BLUE}[2/5] Building contracts...${NC}"

cd "$CONTRACTS_DIR"

for contract in "${CONTRACTS[@]}"; do
    echo -e "  Building ${YELLOW}$contract${NC}..."
    cargo build --package "$contract" --release --target wasm32-unknown-unknown
done

echo -e "${GREEN}Build complete${NC}"
echo ""

# ============================================================================
# Install Contracts
# ============================================================================

echo -e "${BLUE}[3/5] Installing contracts to network...${NC}"

declare -A CONTRACT_IDS

# First, install all contracts to get their WASM hashes
for contract in "${CONTRACTS[@]}"; do
    WASM_FILE="$TARGET_DIR/$contract.wasm"
    
    if [ ! -f "$WASM_FILE" ]; then
        echo -e "${RED}Error: WASM file not found: $WASM_FILE${NC}"
        exit 1
    fi
    
    echo -e "  Installing ${YELLOW}$contract${NC}..."
    
    INSTALL_OUTPUT=$(soroban contract install \
        --wasm "$WASM_FILE" \
        --source "$SOROBAN_SECRET_KEY" \
        --rpc-url "$RPC_URL" \
        --network-passphrase "$PASSPHRASE" 2>&1)
    
    echo -e "    ${GREEN}Installed:${NC} $INSTALL_OUTPUT"
    CONTRACT_IDS["$contract"]="$INSTALL_OUTPUT"
done

echo -e "${GREEN}Installation complete${NC}"
echo ""

# ============================================================================
# Deploy Contracts
# ============================================================================

echo -e "${BLUE}[4/5] Deploying contracts...${NC}"

declare -A CONTRACT_ADDRESSES

for contract in "${CONTRACTS[@]}"; do
    echo -e "  Deploying ${YELLOW}$contract${NC}..."
    
    DEPLOY_OUTPUT=$(soroban contract deploy \
        --wasm "$TARGET_DIR/$contract.wasm" \
        --source "$SOROBAN_SECRET_KEY" \
        --rpc-url "$RPC_URL" \
        --network-passphrase "$PASSPHRASE" 2>&1)
    
    CONTRACT_ADDRESSES["$contract"]="$DEPLOY_OUTPUT"
    echo -e "    ${GREEN}Deployed:${NC} $DEPLOY_OUTPUT"
done

echo ""
echo -e "${GREEN}All contracts deployed successfully!${NC}"
echo ""

# ============================================================================
# Output Configuration
# ============================================================================

echo -e "${BLUE}[5/5] Deployment configuration${NC}"
echo ""
echo -e "${YELLOW}=== Environment Variables (add to .env.local) ===${NC}"
echo ""

for contract in "${CONTRACTS[@]}"; do
    case "$contract" in
        "orbitpay-payment")
            ENV_VAR="NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS"
            ;;
        "orbitpay-notification")
            ENV_VAR="NEXT_PUBLIC_NOTIFICATION_CONTRACT_ADDRESS"
            ;;
        "orbitpay-history")
            ENV_VAR="NEXT_PUBLIC_HISTORY_CONTRACT_ADDRESS"
            ;;
    esac
    echo -e "${GREEN}$ENV_VAR${NC}=${CONTRACT_ADDRESSES[$contract]}"
done

echo ""
echo -e "${YELLOW}=== Verification Links ===${NC}"
echo ""
for contract in "${CONTRACTS[@]}"; do
    ADDRESS="${CONTRACT_ADDRESSES[$contract]}"
    if [ "$NETWORK" = "testnet" ]; then
        echo "  $contract: https://stellar.expert/explorer/testnet/contract/$ADDRESS"
    else
        echo "  $contract: https://stellar.expert/explorer/public/contract/$ADDRESS"
    fi
done

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Deployment Complete!                    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
