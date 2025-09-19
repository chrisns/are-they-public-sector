#!/bin/bash

# Fix any types in test files
for file in tests/contract/*.test.ts; do
  sed -i '' "s/jest.spyOn(fetcher as any/jest.spyOn(fetcher as unknown as { fetchWithRetry: jest.Mock }/g" "$file"
  sed -i '' "s/const org = result.data!\[0\] as any/const org = result.data![0]/g" "$file"
done

echo "Fixed test any types"
