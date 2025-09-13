import { NHSParser } from '../../src/services/nhs-parser';
import { NHSTrust } from '../../src/models/nhs-trust';

describe('NHS Parser Contract', () => {
  let parser: NHSParser;

  beforeEach(() => {
    parser = new NHSParser();
  });

  describe('parse()', () => {
    it('should return an array of NHS Trusts with minimum 100 items', async () => {
      const url = 'https://www.england.nhs.uk/publication/nhs-provider-directory/';
      
      const result = await parser.parse(url);
      
      expect(Array.isArray(result.trusts)).toBe(true);
      expect(result.trusts.length).toBeGreaterThanOrEqual(100);
      expect(result.count).toBeGreaterThanOrEqual(100);
      expect(result.timestamp).toBeDefined();
    });

    it('should return NHS Trusts with required fields', async () => {
      const url = 'https://www.england.nhs.uk/publication/nhs-provider-directory/';
      
      const result = await parser.parse(url);
      
      const firstTrust = result.trusts[0];
      expect(firstTrust).toHaveProperty('name');
      expect(firstTrust).toHaveProperty('code');
      expect(firstTrust).toHaveProperty('type');
      expect(typeof firstTrust.name).toBe('string');
      expect(firstTrust.name.length).toBeGreaterThan(0);
      expect(firstTrust.code).toMatch(/^[a-z0-9-]+$/);
      expect(['trust', 'foundation-trust']).toContain(firstTrust.type);
    });

    it('should identify Foundation Trusts by name', async () => {
      const url = 'https://www.england.nhs.uk/publication/nhs-provider-directory/';
      
      const result = await parser.parse(url);
      
      const foundationTrusts = result.trusts.filter((t: NHSTrust) => 
        t.type === 'foundation-trust'
      );
      expect(foundationTrusts.length).toBeGreaterThan(0);
      
      // Check that Foundation Trusts have "Foundation" in their name
      foundationTrusts.forEach((trust: NHSTrust) => {
        expect(trust.name.toLowerCase()).toContain('foundation');
      });
    });

    it('should fail with clear error when source is unavailable', async () => {
      const url = 'https://invalid-url-that-does-not-exist.com';
      
      await expect(parser.parse(url)).rejects.toThrow('Failed to fetch NHS Provider Directory');
    });

    it('should fail when HTML structure is unexpected', async () => {
      // This will be tested with a mock in unit tests
      // For contract test, we ensure the parser validates structure
      const url = 'https://www.google.com'; // Wrong page
      
      await expect(parser.parse(url)).rejects.toThrow('Unable to parse NHS Provider Directory - structure changed');
    });
  });
});