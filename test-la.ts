import { LocalAuthorityParser } from './src/services/local-authority-parser.js';

async function test() {
  console.log('Testing Local Authority Parser...');
  const parser = new LocalAuthorityParser();
  try {
    const result = await parser.parse('https://uk-air.defra.gov.uk/links?view=la');
    console.log('Success! Found', result.count, 'Local Authorities');
  } catch (error) {
    console.error('Error:', error);
  }
}

test();