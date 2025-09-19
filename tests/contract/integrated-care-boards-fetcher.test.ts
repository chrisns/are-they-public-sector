/**
 * Contract test for Integrated Care Boards Fetcher
 * Tests the contract for fetching ICBs from NHS
 */

import { IntegratedCareBoardsFetcher } from '../../src/services/fetchers/integrated-care-boards-fetcher';
import { DataSource } from '../../src/models/data-source';
import { HealthOrganisationData } from '../../src/models/source-data';

describe('IntegratedCareBoardsFetcher Contract', () => {
  let fetcher: IntegratedCareBoardsFetcher;

  beforeEach(() => {
    fetcher = new IntegratedCareBoardsFetcher();
  });

  describe('fetch', () => {
    it('should return correct source identifier', async () => {
      const result = await fetcher.fetch();
      expect(result.source).toBe(DataSource.NHS);
    });

    it('should successfully fetch NHS ICB page', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it('should return valid ICB objects', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const firstICB = result.data![0] as HealthOrganisationData;

      expect(firstICB.name).toBeDefined();
      expect(typeof firstICB.name).toBe('string');
      expect(firstICB.type).toBe('integrated_care_board');
    });

    it('should return 42 Integrated Care Boards', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      // England has 42 ICBs as of 2022
      expect(result.data?.length).toBeGreaterThanOrEqual(42);
      expect(result.metadata?.totalRecords).toBeGreaterThanOrEqual(42);
    });

    it('should include geographic area information', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const icbs = result.data as HealthOrganisationData[];
      const withArea = icbs.filter(i => i.area);

      expect(withArea.length).toBeGreaterThan(0);
    });

    it('should have correct URL configuration', () => {
      expect(fetcher.url).toBe('https://www.nhs.uk/nhs-services/find-your-local-integrated-care-board/');
      expect(fetcher.source).toBe(DataSource.NHS);
    });
  });
});