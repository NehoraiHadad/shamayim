#!/usr/bin/env bash
# Copies the Worker's forecast log (Workers KV, keys log:<UTC hour>, gzipped JSON) to data/forecast_log/*.json.gz.
# Entries expire after 13 months in KV, so run this at least once a year.
# Needs `npx wrangler login` once. Usage: research/verification/fetch_forecast_log.sh
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
out="$here/data/forecast_log"
mkdir -p "$out"
cd "$here/../../worker"
npx wrangler kv key list --binding LIVE --remote --prefix log: | python3 -c 'import json,sys; [print(k["name"]) for k in json.load(sys.stdin)]' |
while read -r key; do
  file="$out/${key//:/_}.json.gz"
  [ -s "$file" ] && continue
  npx wrangler kv key get --binding LIVE --remote "$key" > "$file.tmp" && mv "$file.tmp" "$file"
  echo "$key"
done
