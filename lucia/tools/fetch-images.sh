#!/usr/bin/env bash
#
# Downloads every photograph in the LUCIA image manifest into assets/img/.
#
#   bash tools/fetch-images.sh
#
# Afterwards, open assets/js/images.js and set:
#
#   const USE_LOCAL = true;
#
# ...and the whole site serves its own images instead of the Pexels CDN.
# Re-running tools/build_pdf.py after this also adds photography to the PDF:
# the build script places anything it finds in assets/img/ into the photo slots
# on the cover and on the Antipasti / Pasta / Sea / Fire pages.
#
# Source: Pexels, under the Pexels License — https://www.pexels.com/license/
# Full credits: IMAGE_SOURCES.md

set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p assets/img

# key<TAB>pexels photo id — kept in sync with assets/js/images.js
MANIFEST=$(cat <<'EOF'
heroRoom	28059309
roomBar	5863513
roomWarm	9371714
roomNight	11279651
roomClassic	2504911
roomStylish	4913313
fireChef	7205249
fireGrill	1233101
kitchen	5251019
seafoodGrill	4571250
tableSetting	735869
napkin	19921112
espresso	30384438
winePour	4691211
negroni	1304540
sea	29837765
seaRocks	23962081
octopus	921361
octopusPlate	14885388
burrata	26833230
mezze	5944
caprese	28841111
pastaPesto	4162492
pastaMush	3214160
pastaMarble	4518879
fishFine	6839650
fishWhole	11653557
prawns	1998920
vegetables	19856566
cakeCitrus	15526782
cakePistachio	13715795
cakeChoc	30128890
cheeseBoard	4187783
EOF
)

WIDTH=${WIDTH:-2000}
count=0

while IFS=$'\t' read -r key id; do
  [ -z "${key:-}" ] && continue
  out="assets/img/${key}.jpg"
  if [ -s "$out" ]; then
    printf '  · %-14s already present\n' "$key"
    continue
  fi
  url="https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=${WIDTH}"
  printf '  ↓ %-14s %s\n' "$key" "$id"
  curl -fsSL --retry 2 -o "$out" "$url" || { echo "    ! failed: $key ($id)"; rm -f "$out"; continue; }
  count=$((count + 1))
done <<< "$MANIFEST"

echo
echo "Downloaded ${count} image(s) into assets/img/"
echo "Now set  USE_LOCAL = true  in assets/js/images.js"

# Optional: generate WebP alongside the JPEGs if cwebp is installed.
if command -v cwebp >/dev/null 2>&1; then
  echo "cwebp found — writing .webp variants"
  for f in assets/img/*.jpg; do
    [ -e "$f" ] || continue
    [ -e "${f%.jpg}.webp" ] && continue
    cwebp -quiet -q 82 "$f" -o "${f%.jpg}.webp"
  done
fi
