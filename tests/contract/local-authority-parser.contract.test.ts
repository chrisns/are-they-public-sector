import { LocalAuthorityParser } from '../../src/services/local-authority-parser';
import { LocalAuthority } from '../../src/models/local-authority';

describe('Local Authority Parser Contract', () => {
  let parser: LocalAuthorityParser;

  beforeEach(() => {
    parser = new LocalAuthorityParser();
  });

  describe('parse()', () => {
    it('should return an array of Local Authorities with minimum 300 items', async () => {
      const url = 'https://uk-air.defra.gov.uk/links?view=la';
      
      const result = await parser.parse(url);
      
      expect(Array.isArray(result.authorities)).toBe(true);
      expect(result.authorities.length).toBeGreaterThanOrEqual(300);
      expect(result.count).toBeGreaterThanOrEqual(300);
      expect(result.timestamp).toBeDefined();
    });

    it('should return Local Authorities with required fields', async () => {
      const url = 'https://uk-air.defra.gov.uk/links?view=la';
      
      const result = await parser.parse(url);
      
      const firstAuthority = result.authorities[0];
      expect(firstAuthority).toHaveProperty('name');
      expect(firstAuthority).toHaveProperty('code');
      expect(firstAuthority).toHaveProperty('type');
      expect(firstAuthority).toHaveProperty('url');
      expect(typeof firstAuthority.name).toBe('string');
      expect(firstAuthority.name.length).toBeGreaterThan(0);
      expect(firstAuthority.code).toMatch(/^[a-z0-9-]+$/);
      expect(['county', 'district', 'borough', 'city', 'unitary']).toContain(firstAuthority.type);
      expect(firstAuthority.url).toMatch(/^https?:\/\//);
    });

    it('should infer council types from names', async () => {
      const url = 'https://uk-air.defra.gov.uk/links?view=la';
      
      const result = await parser.parse(url);
      
      // Check that different council types are identified
      const types = new Set(result.authorities.map((a: LocalAuthority) => a.type));
      expect(types.size).toBeGreaterThan(1); // Should have multiple types
      
      // Check specific type inference
      const countyCouncils = result.authorities.filter((a: LocalAuthority) => 
        a.name.includes('County Council')
      );
      if (countyCouncils.length > 0) {
        expect(countyCouncils[0].type).toBe('county');
      }
    });

    it('should fail with clear error when source is unavailable', async () => {
      const url = 'https://invalid-url-that-does-not-exist.com';
      
      await expect(parser.parse(url)).rejects.toThrow('Failed to fetch DEFRA UK-AIR Local Authorities page');
    });

    it('should fail when HTML structure is unexpected', async () => {
      // This will be tested with a mock in unit tests
      // For contract test, we ensure the parser validates structure
      const url = 'https://www.google.com'; // Wrong page
      
      await expect(parser.parse(url)).rejects.toThrow('Unable to parse Local Authorities - structure changed');
    });
  });
});