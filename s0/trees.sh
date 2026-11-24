#!/usr/bin/env bash
# trees.sh <commit a> <commit b>: checkouts ./a and ./b of ./src's history, with dependencies and one Chromium.
set -euo pipefail
for pair in "a $1" "b $2"; do
  read -r dir ref <<< "$pair"
  commit=$(git -C src rev-parse --verify --quiet "origin/$ref^{commit}" || git -C src rev-parse --verify "$ref^{commit}")
  git -C src worktree add --detach "../$dir" "$commit"
  (cd "$dir" && npm ci && npm i --no-save playwright@1.63.0)
  echo "$dir = $(git -C "$dir" rev-parse HEAD)"
done
(cd b && npx playwright install --with-deps chromium)
