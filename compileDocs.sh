#!/bin/bash

if $1 do
  OUT_DIR=$1
else
  OUT_DIR="thesis/docs"
fi

echo "Generating documentation with lits..."
timeout 10s lits --outDir "$OUT_DIR" || true

echo "Converting markdown to typst..."
find thesis/docs -type f -name "*.md" -print0 | while IFS= read -r -d $'\0' md_file; do
  typ_file="${md_file%.md}.typ"
  echo "Converting $md_file to $typ_file"
  pandoc -f markdown+raw_attribute -t typst "$md_file" -o "$typ_file"
  echo "Prepending header to $typ_file"
  {
    echo '#import "@preview/glossarium:0.5.9": make-glossary, register-glossary, print-glossary, gls, glspl'
    echo ''
    cat "$typ_file"
  } > "${typ_file}.tmp" && mv "${typ_file}.tmp" "$typ_file"
done