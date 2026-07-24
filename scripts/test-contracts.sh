#!/usr/bin/env bash
# ============================================================================
# OrbitPay Smart Contract Test Script
# ============================================================================
# Runs all smart contract tests with output formatting.
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$SCRIPT_DIR/../contracts"

echo "╔══════════════════════════════════════════╗"
echo "║     OrbitPay Contract Tests              ║"
echo "╚══════════════════════════════════════════╝"
echo ""

cd "$CONTRACTS_DIR"

# Run tests with output
cargo test 2>&1

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     Contract Tests Complete               ║"
echo "╚══════════════════════════════════════════╝"
