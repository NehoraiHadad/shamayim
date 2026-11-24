#!/usr/bin/env bash
# Real's perf in trees a and b, four rounds on one machine: a b, b a, a b, b a. A log's head names tree, commit, round, place in it.
set -uo pipefail
mkdir -p logs
for round in 1 2 3 4; do
  if (( round % 2 )); then order='a b'; else order='b a'; fi
  turn=0
  for dir in $order; do
    turn=$((turn + 1))
    commit=$(git -C "$dir" rev-parse HEAD)
    echo "@@ tree=$dir commit=$commit round=$round turn=$turn" | tee "logs/$round-$turn-$dir.log"
    (cd "$dir" && npm run test:perf -- --style=real 2>&1) | tee -a "logs/$round-$turn-$dir.log"
  done
done
lscpu | grep 'Model name' | tee logs/machine.txt
exit 0
