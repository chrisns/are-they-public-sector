#!/usr/bin/env tsx

/**
 * Debug script to test ONS Excel sheet names and structure
 * This helps identify the correct sheet names and record counts
 */

import XLSX from 'xlsx';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

async function debugOnsExcel() {
  console.log('🔍 Testing ONS Excel file structure...\n');
  
  const onsPageUrl = 'https://www.ons.gov.uk/economy/nationalaccounts/uksectoraccounts/datasets/publicsectorclassificationguide';
  
  try {
    // Step 1: Scrape the ONS page to find Excel links
    console.log('📄 Fetching ONS page...');
    const pageResponse = await axios.get(onsPageUrl);
    const html = pageResponse.data;
    
    // Find all Excel file links
    const xlsxPattern = /href="([^"]*\.xlsx?)"/gi;
    const matches = [...html.matchAll(xlsxPattern)];
    
    console.log(`Found ${matches.length} Excel file links:`);
    matches.forEach((match, i) => {
      console.log(`  ${i + 1}. ${match[1]}`);
    });
    
    // Find the most likely classification guide - get the FIRST one (most recent)
    let excelUrl = null;
    
    if (matches.length > 0) {
      // Use the first Excel file (most recent)
      excelUrl = matches[0][1];
      console.log(`\n✓ Using most recent Excel file: ${excelUrl}`);
    }
    
    if (!excelUrl) {
      console.error('❌ No Excel file found');
      return;
    }
    
    // Make URL absolute
    if (!excelUrl.startsWith('http')) {
      excelUrl = new URL(excelUrl, 'https://www.ons.gov.uk').toString();
    }
    
    // Step 2: Download the Excel file
    console.log(`\n📥 Downloading: ${excelUrl}`);
    const excelResponse = await axios.get(excelUrl, {
      responseType: 'arraybuffer'
    });
    
    // Save temporarily (use correct extension)
    const ext = excelUrl.endsWith('.xlsx') ? '.xlsx' : '.xls';
    const tempPath = path.join(process.cwd(), `temp_ons_debug${ext}`);
    fs.writeFileSync(tempPath, excelResponse.data);
    console.log(`✓ Saved to: ${tempPath}`);
    
    // Step 3: Read and analyze the Excel file
    console.log('\n📊 Analyzing Excel structure...');
    const workbook = XLSX.readFile(tempPath);
    
    console.log(`\nWorkbook has ${workbook.SheetNames.length} sheets:`);
    console.log('=' . repeat(60));
    
    workbook.SheetNames.forEach((sheetName, index) => {
      console.log(`\nSheet ${index + 1}: "${sheetName}"`);
      console.log('-'.repeat(40));
      
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      if (jsonData.length > 0) {
        // Show column headers
        const headers = jsonData[0];
        console.log('Columns:', headers);
        console.log(`Records: ${jsonData.length - 1} data rows`);
        
        // Check for key patterns
        if (sheetName.toLowerCase().includes('institutional') || 
            sheetName.toLowerCase().includes('organisation')) {
          console.log('  → Likely INSTITUTIONAL UNITS sheet');
          
          // Count non-empty rows
          const nonEmptyRows = jsonData.slice(1).filter(row => 
            row.some(cell => cell !== null && cell !== undefined && cell !== '')
          ).length;
          console.log(`  → Non-empty data rows: ${nonEmptyRows}`);
          
          if (nonEmptyRows === 3360) {
            console.log('  ✅ Matches expected 3360 institutional units!');
          }
        }
        
        if (sheetName.toLowerCase().includes('non-institutional') ||
            sheetName.toLowerCase().includes('non institutional')) {
          console.log('  → Likely NON-INSTITUTIONAL UNITS sheet');
          
          // Count non-empty rows
          const nonEmptyRows = jsonData.slice(1).filter(row => 
            row.some(cell => cell !== null && cell !== undefined && cell !== '')
          ).length;
          console.log(`  → Non-empty data rows: ${nonEmptyRows}`);
          
          if (nonEmptyRows === 57) {
            console.log('  ✅ Matches expected 57 non-institutional units!');
          }
        }
        
        // Show first few rows as sample
        if (jsonData.length > 1) {
          console.log('\n  Sample data (first 2 rows):');
          for (let i = 1; i <= Math.min(2, jsonData.length - 1); i++) {
            const row = jsonData[i];
            const sample: any = {};
            headers.forEach((header: any, j: number) => {
              if (row[j]) sample[header] = row[j];
            });
            console.log(`    Row ${i}:`, JSON.stringify(sample, null, 2).substring(0, 200) + '...');
          }
        }
      } else {
        console.log('  (Empty sheet)');
      }
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Analysis complete!');
    console.log('\n📌 Sheet name patterns to use:');
    console.log('  - Exact sheet names shown above should be used in parser');
    console.log('  - Update parser.ts to match these exact names');
    
    // Clean up
    fs.unlinkSync(tempPath);
    console.log('\n🧹 Temporary file cleaned up');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the debug script
debugOnsExcel().catch(console.error);