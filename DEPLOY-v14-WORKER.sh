#!/bin/bash
# Deploy zkProxy worker with v14 fixes
# Fixes: SEAL key TTL 8d→45d, showInput:true sender verification, events fallback
set -e
echo "Deploying zkProxy worker (v14 fixes)..."
cd ~/CONK/zkproxy-worker

# Login check
if ! npx wrangler whoami 2>/dev/null | grep -q "logged in"; then
  echo "Not logged in to Cloudflare. Run: npx wrangler login"
  echo "Then re-run this script."
  exit 1
fi

npx wrangler deploy
echo ""
echo "Verifying health..."
sleep 3
curl -s https://conk-zkproxy-v2.italktonumbers.workers.dev/health | python3 -m json.tool
echo ""
echo "✅ Worker deployed. SEAL decryption is now live and functional."
echo ""
echo "Post-deploy: run the E2E expiry test to verify end-to-end:"
echo "  cd ~/CONK/apps/conk"
echo "  DAEMON_PRIVATE_KEY=\$KEY node e2e-v14-test.mjs --verify-expired"
