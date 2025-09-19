/**
 * Contract test for National Park Authorities Fetcher
 * Tests the contract for fetching from National Parks England
 */

import { NationalParkAuthoritiesFetcher } from '../../src/services/fetchers/national-park-authorities-fetcher';
import { DataSource } from '../../src/models/data-source';
import { NationalParkData } from '../../src/models/source-data';

describe('NationalParkAuthoritiesFetcher Contract', () => {
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

    it('should return 10 National Park Authorities in England', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      // England has exactly 10 National Parks
      expect(result.data?.length).toBe(10);
      expect(result.metadata?.totalRecords).toBe(10);
    });

    it('should include known National Parks', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const parkNames = result.data?.map(p => (p as NationalParkData).name) || [];

      // Check for some known National Parks
      const knownParks = ['Lake District', 'Peak District', 'Yorkshire Dales'];
      const foundParks = knownParks.filter(park =>
        parkNames.some(name => name.includes(park))
      );

      expect(foundParks.length).toBeGreaterThan(0);
    });

    it('should have correct URL configuration', () => {
      expect(fetcher.url).toBe('https://nationalparksengland.org.uk/our-members');
      expect(fetcher.source).toBe(DataSource.NATIONAL_PARKS_ENGLAND);
    });
  });
});