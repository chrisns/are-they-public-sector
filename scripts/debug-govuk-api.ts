#!/usr/bin/env tsx

/**
 * Debug script to test GOV.UK API pagination directly
 * This helps identify the correct pagination field names
 */

import axios from 'axios';

async function debugGovUkApi() {
  console.log('🔍 Testing GOV.UK API pagination...\n');
  
  const baseUrl = 'https://www.gov.uk/api/organisations';
  let totalOrgs = 0;
  let page = 1;
  let hasMore = true;
  
  try {
    // First request to understand the response structure
    console.log(`Fetching: ${baseUrl}`);
    const firstResponse = await axios.get(baseUrl);
    
    console.log('\n📊 Response structure:');
    console.log('Keys:', Object.keys(firstResponse.data));
    
    // Check for various pagination patterns
    if (firstResponse.data.results) {
      console.log(`✓ Found 'results' array with ${firstResponse.data.results.length} items`);
      totalOrgs += firstResponse.data.results.length;
    }
    
    if (firstResponse.data.links) {
      console.log('✓ Found "links" object:', Object.keys(firstResponse.data.links));
      if (firstResponse.data.links.next) {
        console.log(`  → Next page URL: ${firstResponse.data.links.next}`);
      }
    }
    
    if (firstResponse.data.next_page_url) {
      console.log(`✓ Found "next_page_url": ${firstResponse.data.next_page_url}`);
    }
    
    if (firstResponse.data.total) {
      console.log(`✓ Total organizations reported: ${firstResponse.data.total}`);
    }
    
    if (firstResponse.data.pages) {
      console.log(`✓ Total pages reported: ${firstResponse.data.pages}`);
    }
    
    // Try to fetch all pages
    console.log('\n📄 Fetching all pages...');
    let currentUrl = baseUrl;
    let pageCount = 1;
    
    while (hasMore && pageCount < 20) { // Safety limit
      const response = await axios.get(currentUrl);
      
      if (response.data.results) {
        const count = response.data.results.length;
        totalOrgs += (pageCount === 1 ? 0 : count); // Don't double count first page
        console.log(`  Page ${pageCount}: ${count} organizations`);
      }
      
      // Check for next page
      let nextUrl = null;
      
      // Try different pagination patterns
      if (response.data.links?.next) {
        nextUrl = response.data.links.next;
        if (!nextUrl.startsWith('http')) {
          nextUrl = `https://www.gov.uk${nextUrl}`;
        }
      } else if (response.data.next_page_url) {
        nextUrl = response.data.next_page_url;
        if (!nextUrl.startsWith('http')) {
          nextUrl = `https://www.gov.uk${nextUrl}`;
        }
      } else if (response.data.next) {
        nextUrl = response.data.next;
        if (!nextUrl.startsWith('http')) {
          nextUrl = `https://www.gov.uk${nextUrl}`;
        }
      }
      
      if (nextUrl && nextUrl !== currentUrl) {
        currentUrl = nextUrl;
        pageCount++;
      } else {
        hasMore = false;
      }
    }
    
    console.log('\n✅ Summary:');
    console.log(`  Total organizations fetched: ${totalOrgs}`);
    console.log(`  Total pages fetched: ${pageCount}`);
    
    // Verify against expected count
    const EXPECTED_COUNT = 611;
    if (totalOrgs === EXPECTED_COUNT) {
      console.log(`  ✓ Matches expected count of ${EXPECTED_COUNT}`);
    } else {
      console.log(`  ⚠️ Expected ${EXPECTED_COUNT} but got ${totalOrgs}`);
      console.log(`  Difference: ${totalOrgs - EXPECTED_COUNT}`);
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the debug script
debugGovUkApi().catch(console.error);