/**
 * Contract test for Districts of England Fetcher
 * Tests the contract for fetching districts from Wikipedia
 */

import { DistrictsOfEnglandFetcher } from '../../src/services/fetchers/districts-of-england-fetcher';
import { DataSource } from '../../src/models/data-source';
import { DistrictCouncilData } from '../../src/models/source-data';

describe('DistrictsOfEnglandFetcher Contract', () => {
  let fetcher: DistrictsOfEnglandFetcher;

  beforeEach(() => {
    fetcher = new DistrictsOfEnglandFetcher();
  });

  describe('fetch', () => {
    it('should return correct source identifier', async () => {
      const result = await fetcher.fetch();
      expect(result.source).toBe(DataSource.WIKIPEDIA);
    });

    it('should successfully fetch and parse Wikipedia page', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should return valid district council objects', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const firstDistrict = result.data![0] as DistrictCouncilData;

      expect(firstDistrict.name).toBeDefined();
      expect(typeof firstDistrict.name).toBe('string');
      expect(firstDistrict.name.length).toBeGreaterThan(0);
    });

    it('should include county information where available', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const districts = result.data as DistrictCouncilData[];
      const withCounty = districts.filter(d => d.county);

      expect(withCounty.length).toBeGreaterThan(0);
    });

    it('should include district type classification', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const districts = result.data as DistrictCouncilData[];
      const withType = districts.filter(d => d.type);

      expect(withType.length).toBeGreaterThan(0);
      const types = ['Borough', 'City', 'District'];
      expect(types).toContain(withType[0].type);
    });

    it('should return approximately 164 districts', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      expect(result.metadata?.totalRecords).toBeDefined();
      // England has approximately 164 non-metropolitan districts
      expect(result.metadata?.totalRecords).toBeGreaterThan(150);
      expect(result.metadata?.totalRecords).toBeLessThan(180);
    });

    it('should have correct URL configuration', () => {
      expect(fetcher.url).toBe('https://en.wikipedia.org/wiki/Districts_of_England');
      expect(fetcher.source).toBe(DataSource.WIKIPEDIA);
    });
  });
});