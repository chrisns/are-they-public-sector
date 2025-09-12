#!/usr/bin/env tsx

/**
 * Detailed debug of ONS Excel structure
 */

import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Read the downloaded Excel file
const tempPath = path.join(process.cwd(), 'temp_ons_debug.xls');

if (!fs.existsSync(tempPath)) {
  console.error('❌ File not found. Run debug-ons-excel.ts first!');
  process.exit(1);
}

console.log('📊 Detailed Excel Analysis\n');
const workbook = XLSX.readFile(tempPath);

// Focus on sheets that likely contain organizations
const targetSheets = [
  'Central Government',
  'Local Government', 
  'Public Corporations',
  'ValidationLists',
  'Index'
];

targetSheets.forEach(sheetName => {
  if (workbook.SheetNames.includes(sheetName)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Sheet: "${sheetName}"`);
    console.log('='.repeat(60));
    
    const sheet = workbook.Sheets[sheetName];
    
    // Get raw data
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    if (rawData.length > 0) {
      // Find first non-empty row (likely headers)
      let headerRow = -1;
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i];
        if (row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
          headerRow = i;
          break;
        }
      }
      
      if (headerRow >= 0) {
        const headers = rawData[headerRow];
        console.log(`Headers at row ${headerRow + 1}:`, headers.slice(0, 10));
        
        // Count non-empty data rows
        let dataCount = 0;
        for (let i = headerRow + 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (row && row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
            dataCount++;
          }
        }
        
        console.log(`Data rows: ${dataCount}`);
        
        // Show sample data
        console.log('\nSample data:');
        for (let i = headerRow + 1; i < Math.min(headerRow + 4, rawData.length); i++) {
          const row = rawData[i];
          if (row && row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
            console.log(`  Row ${i - headerRow}:`, row.slice(0, 5));
          }
        }
      }
    }
    
    // Also try reading with default options
    const jsonData = XLSX.utils.sheet_to_json(sheet);
    if (jsonData.length > 0) {
      console.log(`\nAlternative parsing: ${jsonData.length} objects`);
      console.log('First object keys:', Object.keys(jsonData[0]));
      console.log('Sample:', JSON.stringify(jsonData[0], null, 2).substring(0, 300));
    }
  }
});

console.log('\n\n📌 Summary:');
console.log('The ONS Excel file has a different structure than expected.');
console.log('Organizations appear to be in sheets like:');
console.log('  - Central Government (874 rows)');
console.log('  - Local Government (746 rows)');
console.log('  - Public Corporations (if exists)');
console.log('Total expected would be much higher than initially thought!');