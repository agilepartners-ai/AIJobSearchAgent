#!/bin/sh
# Compile every .tex in the mounted /work directory with TeX Live 2025, the
# same release Texapi runs. Prints the first LaTeX error for any failure,
# which Texapi never reports.
#
#   docker run --rm -v "<dir>:/work" texlive/texlive:TL2025-historic sh /work/compile-local.sh
cd /work || exit 1
status=0
for f in *.tex; do
  name="${f%.tex}"
  if pdflatex -interaction=nonstopmode -halt-on-error "$f" >/dev/null 2>&1; then
    pages=$(grep -a -c "/Type */Page[^s]" "$name.pdf" 2>/dev/null || echo "?")
    printf 'OK    %-12s\n' "$name"
  else
    status=1
    printf 'FAIL  %-12s %s\n' "$name" "$(grep -m1 -A3 '^!' "$name.log" | tr '\n' ' ' | cut -c1-220)"
  fi
done
exit $status
