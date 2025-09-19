/**
 * Contract test for Scottish Government Organisations Fetcher
 * Tests the contract for fetching government organisations from MyGov.scot
 */

import { ScottishGovernmentOrgsFetcher } from '../../src/services/fetchers/scottish-government-orgs-fetcher';
import { DataSource } from '../../src/models/data-source';
import { GenericOrganisationData } from '../../src/models/source-data';

const describeIfNetwork = process.env.TEST_NETWORK ? describe : describe.skip;

describeIfNetwork('ScottishGovernmentOrgsFetcher Contract', () => {
  let fetcher: ScottishGovernmentOrgsFetcher;

  beforeEach(() => {
    fetcher = new ScottishGovernmentOrgsFetcher();
  });

  describe('fetch', () => {
    it('should return correct source identifier', async () => {
      const result = await fetcher.fetch();
      expect(result.source).toBe(DataSource.MYGOV_SCOT);
    });

    it('should successfully fetch and parse MyGov.scot organisations page', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it('should return valid Scottish government organisation objects', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const firstOrg = result.data![0] as GenericOrganisationData;

      expect(firstOrg.name).toBeDefined();
      expect(typeof firstOrg.name).toBe('string');
      expect(firstOrg.name.length).toBeGreaterThan(0);
      expect(firstOrg.region).toBe('Scotland');
    });

    it('should include known Scottish government bodies', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const orgNames = result.data!.map((org: GenericOrganisationData) => org.name);

      // Should include major Scottish government organisations
      expect(orgNames.some(name => name.includes('Scottish Government'))).toBe(true);
      expect(orgNames.some(name => name.includes('Education Scotland'))).toBe(true);
      expect(orgNames.some(name => name.includes('Historic Environment Scotland'))).toBe(true);
    });

    it('should extract organisation types when available', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const orgsWithTypes = result.data!.filter((org: GenericOrganisationData) => org.type);

      expect(orgsWithTypes.length).toBeGreaterThan(0);
      // Common types in Scottish government
      const types = orgsWithTypes.map(org => org.type);
      expect(types.some(type => type?.includes('Agency') || type?.includes('Executive'))).toBe(true);
    });

    it('should extract website URLs when available', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const orgsWithWebsites = result.data!.filter((org: GenericOrganisationData) => org.website);

      expect(orgsWithWebsites.length).toBeGreaterThan(0);
      // Scottish government websites typically use .scot or .gov.uk
      expect(orgsWithWebsites[0].website).toMatch(/\.(scot|gov\.uk)/);
    });

    it('should return approximately 50-100 Scottish government organisations', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      expect(result.metadata?.totalRecords).toBeDefined();
      // MyGov.scot lists various Scottish government bodies
      expect(result.metadata?.totalRecords).toBeGreaterThan(40);
      expect(result.metadata?.totalRecords).toBeLessThan(120);
    });

    it('should handle network errors with retry mechanism', async () => {
      // Mock network error scenario
      jest.spyOn(fetcher as unknown as { fetchWithRetry: jest.Mock }, 'fetchWithRetry').mockRejectedValueOnce(new Error('Network error'));

      const result = await fetcher.fetch();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should have correct URL configuration', () => {
      expect(fetcher.url).toBe('https://www.mygov.scot/organisations');
      expect(fetcher.source).toBe(DataSource.MYGOV_SCOT);
    });

    it('should filter out duplicate organisations', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const names = result.data!.map((org: GenericOrganisationData) => org.name);
      const uniqueNames = [...new Set(names)];

      expect(names.length).toBe(uniqueNames.length);
    });

    it('should parse hierarchical organisation structure when available', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // Some organisations may have additional info about parent departments
      const orgsWithAdditionalInfo = result.data!.filter((org: GenericOrganisationData) =>
        org.additionalInfo && Object.keys(org.additionalInfo).length > 0
      );

      if (orgsWithAdditionalInfo.length > 0) {
        expect(orgsWithAdditionalInfo[0].additionalInfo).toBeDefined();
      }
    });
  });
});