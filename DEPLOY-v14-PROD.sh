#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# DEPLOY-v14-PROD.sh — CONK v13 → v14 Production Upgrade
# Axiom Tide LLC — DO NOT RUN without founder approval
# ═══════════════════════════════════════════════════════════════════════════════
#
# This script upgrades the production CONK package from v13 → v14 using
# the production UpgradeCap. It will modify the live package on Sui mainnet.
#
# Prerequisites:
#   export CONFIRMED=yes   # must be set to run
#   Active wallet: 0x4c320500126014a2c1048ecca47bcd8e4d8c252c85257398239a7c8da0e2ea26
#   sui CLI must be on the correct environment (mainnet)
#
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Safety gate ─────────────────────────────────────────────────────────────

if [[ "${CONFIRMED:-}" != "yes" ]]; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════════╗"
  echo "║          ⚠  PRODUCTION UPGRADE — MAINNET — IRREVERSIBLE  ⚠     ║"
  echo "╠══════════════════════════════════════════════════════════════════╣"
  echo "║  This upgrades the LIVE CONK package on Sui mainnet.           ║"
  echo "║  Once executed, the upgrade cannot be rolled back.              ║"
  echo "║                                                                  ║"
  echo "║  To proceed:  export CONFIRMED=yes && bash DEPLOY-v14-PROD.sh  ║"
  echo "╚══════════════════════════════════════════════════════════════════╝"
  echo ""
  exit 1
fi

SUI=/opt/homebrew/bin/sui
UPGRADE_CAP=0x97ce119a7999e6d50cff74660edbc179cc6e12ab7e749727896dc93eb2c85cee
PROTOCOL_DIR=~/CONK/protocol
GAS_BUDGET=200000000

echo ""
echo "══════════════════════════════════════════════════════════════════"
echo "  CONK v14 PRODUCTION UPGRADE — STARTING"
echo "  $(date -u)"
echo "══════════════════════════════════════════════════════════════════"
echo ""

# ─── Step 1: Verify environment ───────────────────────────────────────────────

echo "[1/5] Verifying sui environment..."
CURRENT_ENV=$($SUI client active-env 2>&1)
echo "  Active env: $CURRENT_ENV"
if [[ "$CURRENT_ENV" != "mainnet" ]]; then
  echo "  ERROR: Active env is not mainnet. Run: sui client switch --env mainnet"
  exit 1
fi
echo "  ✓ On mainnet"

# ─── Step 2: Build v14 package ───────────────────────────────────────────────

echo ""
echo "[2/5] Building v14 Move package..."
cd "$PROTOCOL_DIR"
BUILD_OUTPUT=$($SUI move build 2>&1)

if echo "$BUILD_OUTPUT" | grep -q "error\["; then
  echo "  ERROR: Build failed:"
  echo "$BUILD_OUTPUT"
  exit 1
fi
echo "  ✓ Build clean (warnings OK)"

# ─── Step 3: Execute upgrade ──────────────────────────────────────────────────

echo ""
echo "[3/5] Executing upgrade on mainnet..."
echo "  UpgradeCap: $UPGRADE_CAP"
echo "  Gas budget: $GAS_BUDGET MIST"
echo ""

UPGRADE_OUTPUT=$($SUI client upgrade \
  --upgrade-capability "$UPGRADE_CAP" \
  --gas-budget "$GAS_BUDGET" \
  "$PROTOCOL_DIR" 2>&1)

echo "$UPGRADE_OUTPUT"

# ─── Step 4: Extract new package address ──────────────────────────────────────

echo ""
echo "[4/5] Extracting new package address..."

NEW_PACKAGE=$(echo "$UPGRADE_OUTPUT" | grep -A2 "Published Objects" | grep "PackageID:" | awk '{print $2}' | head -1)

if [[ -z "$NEW_PACKAGE" ]]; then
  # Fallback: look for published-at in output
  NEW_PACKAGE=$(echo "$UPGRADE_OUTPUT" | grep -E "0x[a-f0-9]{64}" | head -1 | awk '{print $1}')
fi

TX_DIGEST=$(echo "$UPGRADE_OUTPUT" | grep "Transaction Digest:" | awk '{print $3}' | head -1)

echo ""
echo "══════════════════════════════════════════════════════════════════"
echo "  ✅ UPGRADE COMPLETE"
echo "══════════════════════════════════════════════════════════════════"
echo "  New package address : $NEW_PACKAGE"
echo "  Transaction digest  : $TX_DIGEST"
echo "══════════════════════════════════════════════════════════════════"

# ─── Step 5: Print follow-up checklist ───────────────────────────────────────

echo ""
echo "[5/5] MANDATORY follow-up steps (do in order):"
echo ""
echo "  1. Update zkProxy worker:"
echo "     cd ~/CONK/zkproxy-worker"
echo "     # Edit wrangler.toml: CONK_PACKAGE = \"$NEW_PACKAGE\""
echo "     bash ~/CONK/DEPLOY-v14-WORKER.sh"
echo ""
echo "  2. Update Railway env vars:"
echo "     CONK_PACKAGE=$NEW_PACKAGE"
echo "     Restart all Railway services after setting."
echo ""
echo "  3. Update SDK:"
echo "     Edit ~/CONK/apps/conk/src/sui/index.ts"
echo "     PACKAGES.CONK = \"$NEW_PACKAGE\""
echo "     Rebuild and deploy frontend."
echo ""
echo "  4. Publish SDK:"
echo "     cd ~/CONK/apps/conk"
echo "     npm version 0.7.0"
echo "     npm publish --access public"
echo ""
echo "  5. Deploy drift-keeper-v14 cron:"
echo "     CONK_PACKAGE=$NEW_PACKAGE in plist"
echo "     launchctl load ~/Library/LaunchAgents/com.axiomtide.drift-keeper-v14.plist"
echo ""
echo "  6. Deploy brain-indexer-v14 cron:"
echo "     CONK_PACKAGE=$NEW_PACKAGE in plist"
echo "     launchctl load ~/Library/LaunchAgents/com.axiomtide.brain-indexer-v14.plist"
echo ""
echo "  7. Update ~/CONK/protocol/Move.toml published-at to: $NEW_PACKAGE"
echo "     git commit and push to v14-expiry-as-visibility branch."
echo ""
echo "  8. Open PR: v14-expiry-as-visibility → main"
echo ""
