#!/bin/bash

# Add eslint-disable comments for unused _page parameters
for file in src/services/fetchers/*.ts; do
  sed -i '' 's/private async fetchPage(_page: number)/\
  \/\/ eslint-disable-next-line @typescript-eslint\/no-unused-vars\
  private async fetchPage(_page: number)/' "$file"
done

echo "Added eslint-disable comments"
