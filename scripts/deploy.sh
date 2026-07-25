#!/usr/bin/env bash
# ============================================================================
# OrbitPay Smart Contract Deployment Script
# ============================================================================
#
# Uses the Stellar CLI (`stellar`) which replaced `soroban-cli`.
# Supports testnet and mainnet deployments.
#
# Prerequisites:
#   - Rust toolchain with wasm32v1-none target installed
#   - stellar-cli installed (curl -fsSL https://github.com/stellar/stellar-cli/install.sh | sh)
#   - A funded Stellar account (identity) with testnet XLM
#
# Usage:
#   # Deploy to testnet (default)
#   ./scripts/deploy.sh
#
#   # Deploy to mainnet
#   NETWORK=mainnet ./scripts/deploy.sh
#
#   # Use a specific identity
#   STELLAR_ACCOUNT=alice ./scripts/deploy.sh
#
# Quick start (first time):
#   stellar keys generate alice --network testnet --fund
#   STELLAR_ACCOUNT=alice ./scripts/deploy.sh
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

NETWORK="${NETWORK:-testnet}"
STELLAR_ACCOUNT="${STELLAR_ACCOUNT:-}"
# Use SOROBAN_SECRET_KEY as fallback for backward compatibility
SOROBAN_SECRET_KEY="${SOROBAN_SECRET_KEY:-}"

# Contract paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTRACTS_DIR="$PROJECT_DIR/contracts"
TARGET_DIR="$CONTRACTS_DIR/target/wasm32v1-none/release"

# Contract names
CONTRACTS=("orbitpay-payment" "orbitpay-notification" "orbitpay-history")

echo -e "${YELLOW}Network:${NC} $NETWORK"
echo ""

# ============================================================================
# Prerequisites Check
# ============================================================================

echo -e "${BLUE}[1/4] Checking prerequisites...${NC}"

# Check for stellar CLI
STELLAR_CMD=""
if command -v stellar &>/dev/null; then
    STELLAR_CMD="stellar"
elif command -v soroban &>/dev/null; then
    echo -e "${YELLOW}Note: 'soroban' CLI found but has been renamed to 'stellar'.${NC}"
    echo -e "${YELLOW}Consider upgrading: curl -fsSL https://github.com/stellar/stellar-cli/install.sh | sh${NC}"
    STELLAR_CMD="soroban"
else
    echo -e "${YELLOW}stellar CLI not found. Installing...${NC}"
    echo -e "${YELLOW}  curl -fsSL https://github.com/stellar/stellar-cli/install.sh | sh${NC}"
    echo ""
    echo -e "${YELLOW}Or install via Cargo (~10 min):${NC}"
    echo "  cargo install stellar-cli"
    echo ""
    echo -e "${RED}Please install stellar CLI and re-run this script.${NC}"
    exit 1
fi

# Determine source: STELLAR_ACCOUNT > SOROBAN_SECRET_KEY > error
SOURCE_FLAG=""
if [ -n "$STELLAR_ACCOUNT" ]; then
    SOURCE_FLAG="--source-account $STELLAR_ACCOUNT"
    echo -e "  Using identity: ${GREEN}$STELLAR_ACCOUNT${NC}"
elif [ -n "$SOROBAN_SECRET_KEY" ]; then
    # For soroban CLI compatibility
    if [ "$STELLAR_CMD" = "stellar" ]; then
        echo -e "${YELLOW}Using SOROBAN_SECRET_KEY. For future runs, create an identity:${NC}"
        echo "  stellar keys generate alice --network testnet --fund"
        echo "  STELLAR_ACCOUNT=alice ./scripts/deploy.sh"
    fi
else
    echo -e "${RED}Error: No account configured.${NC}"
    echo "Set one of:"
    echo ""
    echo "  Option A: Generate an identity (recommended):"
    echo "    stellar keys generate alice --network testnet --fund"
    echo "    STELLAR_ACCOUNT=alice ./scripts/deploy.sh"
    echo ""
    echo "  Option B: Use a secret key (legacy):"
    echo "    export SOROBAN_SECRET_KEY=SC..."
    echo "    ./scripts/deploy.sh"
    exit 1
fi

echo -e "${GREEN}Prerequisites OK${NC}"
echo ""

# ============================================================================
# Build Contracts
# ============================================================================

echo -e "${BLUE}[2/4] Building contracts...${NC}"

cd "$CONTRACTS_DIR"

for contract in "${CONTRACTS[@]}"; do
    echo -e "  Building ${YELLOW}$contract${NC}..."
    CARGO_BUILD_TARGET=wasm32v1-none cargo build --package "$contract" --release
done

echo -e "${GREEN}Build complete${NC}"
echo ""

# ============================================================================
# Deploy Contracts
# ============================================================================
# The `stellar contract deploy --wasm` command handles both
# installing the WASM blob and creating the contract instance.

echo -e "${BLUE}[3/4] Deploying contracts...${NC}"

declare -A CONTRACT_ADDRESSES

for contract in "${CONTRACTS[@]}"; do
    wasm_name="${contract//-/_}"
    WASM_FILE="$TARGET_DIR/${wasm_name}.wasm"

    if [ ! -f "$WASM_FILE" ]; then
        echo -e "${RED}Error: WASM file not found: $WASM_FILE${NC}"
        ls "$TARGET_DIR"/*.wasm 2>/dev/null || echo "  (no .wasm files in $TARGET_DIR)"
        exit 1
    fi

    echo -e "  Deploying ${YELLOW}$contract${NC}..."

    if [ "$STELLAR_CMD" = "stellar" ] && [ -n "$STELLAR_ACCOUNT" ]; then
        # New stellar CLI with named identity (recommended)
        DEPLOY_OUTPUT=$(stellar contract deploy \
            --wasm "$WASM_FILE" \
            --source-account "$STELLAR_ACCOUNT" \
            --network "$NETWORK" 2>&1)
    elif [ "$STELLAR_CMD" = "soroban" ] && [ -n "$SOROBAN_SECRET_KEY" ]; then
        # Legacy soroban CLI with secret key
        # Select correct RPC URL and passphrase based on network
        if [ "$NETWORK" = "testnet" ]; then
            SOROBAN_RPC="https://soroban-testnet.stellar.org"
            SOROBAN_PASSPHRASE="Test SDF Network ; September 2015"
        else
            SOROBAN_RPC="https://soroban.stellar.org"
            SOROBAN_PASSPHRASE="Public Global Stellar Network ; September 2015"
        fi
        DEPLOY_OUTPUT=$(soroban contract deploy \
            --wasm "$WASM_FILE" \
            --source "$SOROBAN_SECRET_KEY" \
            --rpc-url "$SOROBAN_RPC" \
            --network-passphrase "$SOROBAN_PASSPHRASE" 2>&1)
    else
        echo -e "${RED}No valid deployment method available.${NC}"
        echo "  For stellar CLI: set STELLAR_ACCOUNT=<identity>"
        echo "  For soroban CLI: set SOROBAN_SECRET_KEY=SC..."
        exit 1
    fi

    CONTRACT_ADDRESSES["$contract"]="$DEPLOY_OUTPUT"
    echo -e "    ${GREEN}Deployed:${NC} $DEPLOY_OUTPUT"
done

echo ""
echo -e "${GREEN}All contracts deployed successfully!${NC}"
echo ""

# ============================================================================
# Output Configuration
# ============================================================================

echo -e "${BLUE}[4/4] Deployment summary${NC}"
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
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}
"
