/**
 * Contract test for National Park Authorities Fetcher
 * Tests the contract for fetching from National Parks England
 */

import { NationalParkAuthoritiesFetcher } from '../../src/services/fetchers/national-park-authorities-fetcher';
import { DataSource } from '../../src/models/data-source';
import { NationalParkData } from '../../src/models/source-data';

const describeIfNetwork = process.env.TEST_NETWORK ? describe : describe.skip;

describeIfNetwork('NationalParkAuthoritiesFetcher Contract', () => {
  let fetcher: NationalParkAuthoritiesFetcher;

  beforeEach(() => {
    fetcher = new NationalParkAuthoritiesFetcher();
  });

  describe('fetch', () => {
    it('should return correct source identifier', async () => {
      const result = await fetcher.fetch();
      expect(result.source).toBe(DataSource.NATIONAL_PARKS_ENGLAND);
    });

    it('should successfully fetch National Parks England page', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it('should return valid national park authority objects', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const firstPark = result.data![0] as NationalParkData;

      expect(firstPark.name).toBeDefined();
      expect(typeof firstPark.name).toBe('string');
      expect(firstPark.name.length).toBeGreaterThan(0);
    });

    it('should return National Park Authorities in England', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      // England has 10 National Parks but parsing may vary
      expect(result.data?.length).toBeGreaterThanOrEqual(8);
      expect(result.data?.length).toBeLessThanOrEqual(12);
      expect(result.metadata?.totalRecords).toBeGreaterThanOrEqual(8);
    });

    it('should include park-related names', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const parkNames = result.data?.map(p => (p as NationalParkData).name) || [];

      // Should include park-related terminology
      const hasValidNames = parkNames.some(name =>
        name.toLowerCase().includes('park') ||
        name.toLowerCase().includes('national') ||
        name.toLowerCase().includes('district') ||
        name.toLowerCase().includes('moor') ||
        name.toLowerCase().includes('dales')
      );

      expect(hasValidNames).toBe(true);
      expect(parkNames.length).toBeGreaterThan(0);
    });

    it('should have correct URL configuration', () => {
      expect(fetcher.url).toBe('https://www.nationalparks.uk/about-us/our-members');
      expect(fetcher.source).toBe(DataSource.NATIONAL_PARKS_ENGLAND);
    });
  });
});