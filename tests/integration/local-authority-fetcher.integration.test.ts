import { LocalAuthorityParser } from '../../src/services/local-authority-parser';
import axios from 'axios';

interface AuthorityTestData {
  name: string;
  url: string;
}

describe('Local Authority Fetcher Integration', () => {
  let parser: LocalAuthorityParser;

  beforeEach(() => {
    parser = new LocalAuthorityParser();
  });

  describe('fetchAndParse()', () => {
    it('should fetch and parse DEFRA UK-AIR Local Authorities HTML', async () => {
      const url = 'https://uk-air.defra.gov.uk/links?view=la';
      
      const result = await parser.fetchAndParse(url);
      
      expect(result).toBeDefined();
      expect(result.authorities).toBeDefined();
      expect(Array.isArray(result.authorities)).toBe(true);
      
      // Should contain known local authorities
      const authorityNames = result.authorities.map((a: AuthorityTestData) => a.name);
      
      // Check for some well-known authorities
      const hasKnownAuthorities = authorityNames.some((name: string) => 
        name.includes('Council')
      );
      expect(hasKnownAuthorities).toBe(true);
    }, 30000); // 30 second timeout for network request

    it('should extract URLs for each local authority', async () => {
      const url = 'https://uk-air.defra.gov.uk/links?view=la';
      
      const result = await parser.fetchAndParse(url);
      
      // All authorities should have URLs
      result.authorities.forEach((authority: AuthorityTestData) => {
        expect(authority.url).toBeDefined();
        expect(authority.url).toMatch(/^https?:\/\//);
      });
    }, 30000);

    it('should handle network errors gracefully', async () => {
      // Use an invalid URL to simulate network error
      const url = 'https://invalid.defra.gov.uk/does-not-exist';
      
      await expect(parser.fetchAndParse(url)).rejects.toThrow();
    });

    it('should validate HTML contains expected structure', async () => {
      const url = 'https://uk-air.defra.gov.uk/links?view=la';
      
      // Fetch the HTML directly to verify structure
      const response = await axios.get(url);
      const html = response.data;
      
      // Should contain council links in list format
      expect(html).toContain('Council');
      expect(html).toContain('<ul');
      expect(html).toContain('<li');
      expect(html).toContain('href');
      
      // Should have alphabetical sections
      expect(html).toMatch(/[A-Z]<\/h/i); // Alphabetical headers
    }, 30000);
  });
});