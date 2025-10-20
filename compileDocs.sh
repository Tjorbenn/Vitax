#!/bin/zsh

lits --outDir thesis/docs &

echo "Waiting for 10 seconds to let LitScript compile the source to markdown..."
sleep 10

echo "Converting markdown to typst..."
find thesis/docs -type f -name "*.md" -print0 | while IFS= read -r -d $'\0' md_file; do
  typ_file="${md_file%.md}.typ"
  echo "Converting $md_file to $typ_file"
  pandoc -f markdown+raw_attribute -t typst "$md_file" -o "$typ_file"
done
