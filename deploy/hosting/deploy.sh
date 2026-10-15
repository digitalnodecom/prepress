#!/usr/bin/env bash
# Build and deploy the Prepress hosting API + Caddy config.
#   deploy/hosting/deploy.sh [root@95.217.217.146]
# The server needs /etc/prepress-hosting.env (see prepress-hosting.env.example); this script never touches it.
set -euo pipefail
HOST=${1:-root@95.217.217.146}
cd "$(dirname "$0")/../.."
npx bun build --compile --minify --target=bun-linux-x64 hosting/main.ts --outfile bin/prepress-hosting-linux-x64
scp -q bin/prepress-hosting-linux-x64 "$HOST:/usr/local/bin/prepress-hosting.new"
scp -q deploy/hosting/prepress-hosting.service "$HOST:/etc/systemd/system/prepress-hosting.service"
scp -q deploy/hosting/Caddyfile "$HOST:/etc/caddy/Caddyfile.new"
ssh "$HOST" 'set -e
caddy validate --config /etc/caddy/Caddyfile.new --adapter caddyfile >/dev/null
chmod 755 /usr/local/bin/prepress-hosting.new && mv /usr/local/bin/prepress-hosting.new /usr/local/bin/prepress-hosting
mv /etc/caddy/Caddyfile.new /etc/caddy/Caddyfile
systemctl daemon-reload && systemctl restart prepress-hosting && systemctl reload caddy
sleep 1 && curl -fsS 127.0.0.1:8787/api/v1/health && echo'
