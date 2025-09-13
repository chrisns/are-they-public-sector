import { NHSParser } from '../../src/services/nhs-parser';
import axios from 'axios';

describe('NHS Fetcher Integration', () => {
  let parser: NHSParser;

  beforeEach(() => {
    parser = new NHSParser();
  });

  describe('fetchAndParse()', () => {
    it('should fetch and parse NHS Provider Directory HTML', async () => {
      const url = 'https://www.england.nhs.uk/publication/nhs-provider-directory/';
      
      const result = await parser.fetchAndParse(url);
      
      expect(result).toBeDefined();
      expect(result.trusts).toBeDefined();
      expect(Array.isArray(result.trusts)).toBe(true);
      
      // Should contain known NHS Trusts
      const trustNames = result.trusts.map((t: any) => t.name);
      
      // Check for some well-known trusts (these should be stable)
      const hasKnownTrusts = trustNames.some((name: string) => 
        name.includes('NHS') && (name.includes('Trust') || name.includes('Foundation'))
      );
      expect(hasKnownTrusts).toBe(true);
    }, 30000); // 30 second timeout for network request

    it('should handle network errors gracefully', async () => {
      // Use an invalid URL to simulate network error
      const url = 'https://invalid.nhs.england.uk/does-not-exist';
      
      await expect(parser.fetchAndParse(url)).rejects.toThrow();
    });

    it('should validate HTML contains expected structure', async () => {
      const url = 'https://www.england.nhs.uk/publication/nhs-provider-directory/';
      
      // Fetch the HTML directly to verify structure
      const response = await axios.get(url);
      const html = response.data;
      
      // Should contain NHS trust links
      expect(html).toContain('NHS');
      expect(html).toContain('Trust');
      
      // Should have alphabetical sections or links
      expect(html.toLowerCase()).toContain('href');
    }, 30000);
  });
});