/**
 * Contract test for English Unitary Authorities Fetcher
 * Tests the contract for fetching unitary authorities from ONS with dynamic CSV link
 */

import { EnglishUnitaryAuthoritiesFetcher } from '../../src/services/fetchers/english-unitary-authorities-fetcher';
import { DataSource } from '../../src/models/data-source';
import { UnitaryAuthorityData } from '../../src/models/source-data';

describe('EnglishUnitaryAuthoritiesFetcher Contract', () => {
  let fetcher: EnglishUnitaryAuthoritiesFetcher;

  beforeEach(() => {
    fetcher = new EnglishUnitaryAuthoritiesFetcher();
  });

  describe('fetch', () => {
    it('should return correct source identifier', async () => {
      const result = await fetcher.fetch();
      expect(result.source).toBe(DataSource.ONS);
    });

    it('should successfully fetch the ONS page and extract CSV link', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      expect(result.metadata?.dynamicUrl).toBeDefined();
      // ONS uses download/table?format=csv pattern, not direct .csv files
      expect(result.metadata?.dynamicUrl).toMatch(/format=csv|\.csv$/);
    });

    it('should return array of unitary authority data', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it('should return valid unitary authority objects', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const firstAuthority = result.data![0] as UnitaryAuthorityData;

      expect(firstAuthority.name).toBeDefined();
      expect(typeof firstAuthority.name).toBe('string');
      expect(firstAuthority.name.length).toBeGreaterThan(0);
      expect(firstAuthority.region).toBe('England');
    });

    it('should include ONS codes when available', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const authorities = result.data as UnitaryAuthorityData[];
      const withCodes = authorities.filter(a => a.code);

      expect(withCodes.length).toBeGreaterThan(0);
      // ONS codes typically start with 'E'
      expect(withCodes[0].code).toMatch(/^E/);
    });

    it('should return approximately 59 English unitary authorities', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      expect(result.metadata?.totalRecords).toBeDefined();
      // England has approximately 59 unitary authorities
      expect(result.metadata?.totalRecords).toBeGreaterThan(50);
      expect(result.metadata?.totalRecords).toBeLessThan(70);
    });

    it('should handle network errors with retry mechanism', async () => {
      // Mock network error scenario
      jest.spyOn(fetcher as unknown as { fetchWithRetry: jest.Mock }, 'fetchWithRetry').mockRejectedValueOnce(new Error('Network error'));

      const result = await fetcher.fetch();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should have correct URL configuration', () => {
      expect(fetcher.url).toBe('https://www.ons.gov.uk/aboutus/transparencyandgovernance/freedomofinformationfoi/alistofunitaryauthoritiesinenglandwithageographicalmap');
      expect(fetcher.source).toBe(DataSource.ONS);
    });
  });
});