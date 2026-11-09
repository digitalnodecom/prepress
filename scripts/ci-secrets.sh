#!/usr/bin/env bash
# One-time setup for .github/workflows/release-desktop.yml: uploads the signing secrets to the
# "release" environment of digitalnodecom/prepress (only main can use them). Nothing is printed.
#
#   scripts/ci-secrets.sh <developer-id.p12> <AuthKey_XXXXXXXXXX.p8> <ASC key id> <ASC issuer id>
#
#   developer-id.p12  Keychain Access → My Certificates → "Developer ID Application: AMPLIFY2 OY"
#                     (the one whose SHA-1 fingerprint starts D3920ACD) → Export… → .p12 with a
#                     password. The script asks for that password.
#   AuthKey_….p8      App Store Connect → Users and Access → Integrations → Team Keys → "+"
#                     (access: Developer). The key id is shown in the list, the issuer id above it.
#   The updater key is read from ~/.config/prepress/updater.key
#   (its password from PREPRESS_UPDATER_KEY_PASSWORD, empty by default).
set -euo pipefail
REPO=digitalnodecom/prepress
ENV=release

[ $# -eq 4 ] || { sed -n '2,15p' "$0"; exit 1; }
p12=$1 p8=$2 key_id=$3 issuer=$4
updater="$HOME/.config/prepress/updater.key"
for f in "$p12" "$p8" "$updater"; do [ -f "$f" ] || { echo "Missing: $f" >&2; exit 1; }; done
[[ $key_id =~ ^[A-Z0-9]{10}$ ]] || { echo "The API key id looks like 2X9R4HXF34 (10 characters)." >&2; exit 1; }
[[ $issuer =~ ^[0-9a-f-]{36}$ ]] || { echo "The issuer id is a UUID." >&2; exit 1; }

read -r -s -p "Password of $(basename "$p12"): " p12pass; echo
# Check the .p12 opens with that password and holds the Developer ID identity (in a scratch keychain).
kc=$(mktemp -u "${TMPDIR:-/tmp}/ci-secrets-XXXXXX").keychain-db
security create-keychain -p x "$kc" >/dev/null
trap 'security delete-keychain "$kc" 2>/dev/null || true' EXIT
security import "$p12" -P "$p12pass" -k "$kc" -f pkcs12 >/dev/null 2>&1 \
  || { echo "Can't open $(basename "$p12") with that password." >&2; exit 1; }
security find-identity -p codesigning "$kc" | grep -q 'D3920ACD7231C17D3C08CE957029159CC5C30B58' \
  || { echo "$(basename "$p12") doesn't hold the Developer ID certificate D3920ACD… (export that one)." >&2; exit 1; }

set_secret() { gh secret set "$1" --env "$ENV" -R "$REPO" >/dev/null && echo "✓ $1"; }
base64 < "$p12" | tr -d '\n' | set_secret MACOS_CERT_P12
printf '%s' "$p12pass" | set_secret MACOS_CERT_PASSWORD
set_secret ASC_KEY_P8 < "$p8"
printf '%s' "$key_id" | set_secret ASC_KEY_ID
printf '%s' "$issuer" | set_secret ASC_ISSUER_ID
set_secret TAURI_SIGNING_PRIVATE_KEY < "$updater"
[ -n "${PREPRESS_UPDATER_KEY_PASSWORD:-}" ] && printf '%s' "$PREPRESS_UPDATER_KEY_PASSWORD" | set_secret TAURI_SIGNING_PRIVATE_KEY_PASSWORD
echo "Done. Delete the exported .p12 now; keep the .p8 somewhere safe (Apple shows it only once)."
