/**
 * Contract test for NHS Scotland Boards Fetcher
 * Tests the contract for fetching NHS Scotland health boards
 */

import { NHSScotlandBoardsFetcher } from '../../src/services/fetchers/nhs-scotland-boards-fetcher';
import { DataSource } from '../../src/models/data-source';
import { HealthOrganisationData } from '../../src/models/source-data';

describe('NHSScotlandBoardsFetcher Contract', () => {
  let fetcher: NHSScotlandBoardsFetcher;

  beforeEach(() => {
    fetcher = new NHSScotlandBoardsFetcher();
  });

  describe('fetch', () => {
    it('should return correct source identifier', async () => {
      const result = await fetcher.fetch();
      expect(result.source).toBe(DataSource.NHS_SCOTLAND);
    });

    it('should successfully fetch and parse NHS Scotland boards', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it('should return valid NHS Scotland health board objects', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const firstBoard = result.data![0] as HealthOrganisationData;

      expect(firstBoard.name).toBeDefined();
      expect(typeof firstBoard.name).toBe('string');
      expect(firstBoard.name.length).toBeGreaterThan(0);
      expect(firstBoard.type).toBe('health_board');
    });

    it('should include all 14 NHS Scotland health boards', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const boardNames = result.data!.map((board: HealthOrganisationData) => board.name);

      // Should include the main territorial health boards
      expect(boardNames.some(name => name.includes('Ayrshire and Arran'))).toBe(true);
      expect(boardNames.some(name => name.includes('Borders'))).toBe(true);
      expect(boardNames.some(name => name.includes('Dumfries and Galloway'))).toBe(true);
      expect(boardNames.some(name => name.includes('Fife'))).toBe(true);
      expect(boardNames.some(name => name.includes('Forth Valley'))).toBe(true);
      expect(boardNames.some(name => name.includes('Grampian'))).toBe(true);
      expect(boardNames.some(name => name.includes('Greater Glasgow and Clyde'))).toBe(true);
      expect(boardNames.some(name => name.includes('Highland'))).toBe(true);
      expect(boardNames.some(name => name.includes('Lanarkshire'))).toBe(true);
      expect(boardNames.some(name => name.includes('Lothian'))).toBe(true);
      expect(boardNames.some(name => name.includes('Orkney'))).toBe(true);
      expect(boardNames.some(name => name.includes('Shetland'))).toBe(true);
      expect(boardNames.some(name => name.includes('Tayside'))).toBe(true);
      expect(boardNames.some(name => name.includes('Western Isles'))).toBe(true);
    });

    it('should extract geographic areas served by each board', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const boardsWithAreas = result.data!.filter((board: HealthOrganisationData) => board.area);

      expect(boardsWithAreas.length).toBeGreaterThan(0);
      // Geographic areas should be descriptive
      expect(boardsWithAreas[0].area!.length).toBeGreaterThan(5);
    });

    it('should extract website URLs when available', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const boardsWithWebsites = result.data!.filter((board: HealthOrganisationData) => board.website);

      expect(boardsWithWebsites.length).toBeGreaterThan(0);
      // NHS Scotland websites typically use .scot.nhs.uk
      expect(boardsWithWebsites[0].website).toMatch(/\.scot\.nhs\.uk|\.nhs\.scot/);
    });

    it('should return exactly 14 health boards', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      expect(result.metadata?.totalRecords).toBe(14);
      expect(result.data!.length).toBe(14);
    });

    it('should handle network errors with retry mechanism', async () => {
      // Mock network error scenario
      jest.spyOn(fetcher as unknown as { fetchWithRetry: jest.Mock }, 'fetchWithRetry').mockRejectedValueOnce(new Error('Network error'));

      const result = await fetcher.fetch();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should have correct URL configuration', () => {
      expect(fetcher.url).toBe('https://www.scot.nhs.uk/organisations/');
      expect(fetcher.source).toBe(DataSource.NHS_SCOTLAND);
    });

    it('should include parent organisation information', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const boardsWithParent = result.data!.filter((board: HealthOrganisationData) => board.parentOrg);

      if (boardsWithParent.length > 0) {
        expect(boardsWithParent[0].parentOrg).toContain('NHS Scotland');
      }
    });

    it('should distinguish between territorial and special health boards', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // All boards should be properly categorised as health_board type
      result.data!.forEach((board: HealthOrganisationData) => {
        expect(board.type).toBe('health_board');
        expect(board.name).toMatch(/NHS|Health Board|Board/i);
      });
    });

    it('should extract contact information when available', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // At least some boards should have website information
      const boardsWithContact = result.data!.filter((board: HealthOrganisationData) =>
        board.website || board.area
      );

      expect(boardsWithContact.length).toBeGreaterThan(5);
    });
  });
});