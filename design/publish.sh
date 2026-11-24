#!/bin/sh
# Publish the shortlisted variations to https://design.dontpanicv.com and the index to dontpanicv.com/design/.
# Usage: ./publish.sh [--dry-run]     Edit KEEP to change the shortlist.
set -eu
cd "$(dirname "$0")"
KEEP="02 04 07 08 14 15 16 17 19"
BASE="https://design.dontpanicv.com/"

FLAG="${1:-}"
rm -rf site && mkdir -p site/shots
files=""
for n in $KEEP; do
  f=$(basename variations/"$n"-*.html .html)
  files="$files $f"
  cp "shots/$f.png" site/shots/
done
set -- $files
count=$#
i=0
for f in "$@"; do
  i=$((i + 1))
  prev=$(eval "echo \${$(( (i + count - 2) % count + 1 ))}")
  next=$(eval "echo \${$(( i % count + 1 ))}")
  # Re-point the nav pill at the neighbours inside the shortlist.
  PREV="$prev" NEXT="$next" perl -pe '
    s{href="[^"]*"([^>]*aria-label="Previous variation")}{href="$ENV{PREV}.html"$1};
    s{href="[^"]*"([^>]*aria-label="Next variation")}{href="$ENV{NEXT}.html"$1};
    s{(\d\d)/20 · }{$1 · };
  ' "variations/$f.html" > "site/$f.html"
done

# Index: only the shortlist, thumbnails next to it, <base> so the same file also works on the main domain.
KEEP="$KEEP" COUNT="$count" BASE="$BASE" perl -ne '
  BEGIN { %k = map { $_ => 1 } split " ", $ENV{KEEP} }
  next if /^\s*\["(\d\d)-/ && !$k{$1};
  s{\.\./shots/}{shots/};
  s{20 design variations}{$ENV{COUNT} design variations}g;
  s{<meta charset="utf-8">}{<meta charset="utf-8">\n<base href="$ENV{BASE}">\n<meta name="robots" content="noindex">};
  print;
' variations/index.html > site/index.html
printf '/*\n  X-Robots-Tag: noindex\n  X-Content-Type-Options: nosniff\n' > site/_headers

# Self-check: every shortlisted page exists and no pill points outside the shortlist.
for f in "$@"; do
  for href in $(grep -o '<div id="vnav".*</div>' "site/$f.html" | grep -o 'href="[^"]*"' | cut -d'"' -f2); do
    [ -f "site/$href" ] || { echo "broken pill link in $f: $href" >&2; exit 1; }
  done
done
[ "$(grep -c '^\s*\["' site/index.html)" = "$count" ] || { echo "index does not list $count variations" >&2; exit 1; }

mkdir -p ../astro/public/design && cp site/index.html ../astro/public/design/index.html
../astro/node_modules/.bin/cf deploy ./site $FLAG
