#!/bin/bash

# Fix CSV record type issues in English Unitary Authorities fetcher
sed -i '' "s/const name = record\['Name'\]/const name = (record as Record<string, unknown>)['Name']/" src/services/fetchers/english-unitary-authorities-fetcher.ts
sed -i '' "s/const code = record\['Code'\]/const code = (record as Record<string, unknown>)['Code']/" src/services/fetchers/english-unitary-authorities-fetcher.ts

# Fix response types in fetchers
for file in src/services/fetchers/*.ts; do
  sed -i '' 's/Promise<any>/Promise<unknown>/' "$file"
  sed -i '' 's/): any {/): unknown {/' "$file"
done

echo "Fixed any types in fetchers"
