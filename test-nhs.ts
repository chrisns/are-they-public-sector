import { NHSParser } from './src/services/nhs-parser.js';

async function test() {
  console.log('Testing NHS Parser...');
  const parser = new NHSParser();
  try {
    const result = await parser.parse('https://www.england.nhs.uk/publication/nhs-provider-directory/');
    console.log('Success! Found', result.count, 'NHS Trusts');
  } catch (error) {
    console.error('Error:', error);
  }
}

test();