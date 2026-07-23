#!/usr/bin/env bash
# Generate era scenes 2..12 in parallel (each uses the already-saved Era 1 as the style-lock
# reference). Concurrency kept modest to be nice to the API; the client retries on 429.
set -u
cd "$(dirname "$0")/../.."
CONC=4
pids=()
for n in 2 3 4 5 6 7 8 9 10 11 12; do
  node tools/kimi/01-scenes.mjs "$n" > "tools/kimi/outputs/gen-era-$n.log" 2>&1 &
  pids+=($!)
  # throttle
  while [ "$(jobs -rp | wc -l)" -ge "$CONC" ]; do sleep 2; done
done
wait
echo "ALL SCENES DONE"
ls -la scenes/
