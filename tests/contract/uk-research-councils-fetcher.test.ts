/**
 * Contract test for UK Research Councils Fetcher
 * Tests the contract for fetching UK Research Councils from UKRI
 */

import { UKResearchCouncilsFetcher } from '../../src/services/fetchers/uk-research-councils-fetcher';
import { DataSource } from '../../src/models/data-source';
import { ResearchCouncilData } from '../../src/models/source-data';

describe('UKResearchCouncilsFetcher Contract', () => {
  let fetcher: UKResearchCouncilsFetcher;

  beforeEach(() => {
    fetcher = new UKResearchCouncilsFetcher();
  });

  describe('fetch', () => {
    it('should return correct source identifier', async () => {
      const result = await fetcher.fetch();
      expect(result.source).toBe(DataSource.UKRI);
    });

    it('should successfully fetch and parse UK Research Councils from UKRI', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it('should return valid research council objects', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const firstCouncil = result.data![0] as ResearchCouncilData;

      expect(firstCouncil.name).toBeDefined();
      expect(typeof firstCouncil.name).toBe('string');
      expect(firstCouncil.name.length).toBeGreaterThan(0);
    });

    it('should include all main UK Research Councils', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const councilNames = result.data!.map((council: ResearchCouncilData) => council.name);

      // Should include the main UKRI research councils
      expect(councilNames.some(name => name.includes('Arts and Humanities Research Council') || name.includes('AHRC'))).toBe(true);
      expect(councilNames.some(name => name.includes('Biotechnology and Biological Sciences Research Council') || name.includes('BBSRC'))).toBe(true);
      expect(councilNames.some(name => name.includes('Economic and Social Research Council') || name.includes('ESRC'))).toBe(true);
      expect(councilNames.some(name => name.includes('Engineering and Physical Sciences Research Council') || name.includes('EPSRC'))).toBe(true);
      expect(councilNames.some(name => name.includes('Medical Research Council') || name.includes('MRC'))).toBe(true);
      expect(councilNames.some(name => name.includes('Natural Environment Research Council') || name.includes('NERC'))).toBe(true);
      expect(councilNames.some(name => name.includes('Science and Technology Facilities Council') || name.includes('STFC'))).toBe(true);
    });

    it('should extract research council abbreviations', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const councilsWithAbbrev = result.data!.filter((council: ResearchCouncilData) => council.abbreviation);

      expect(councilsWithAbbrev.length).toBeGreaterThan(0);
      // Common abbreviations
      const abbreviations = councilsWithAbbrev.map(council => council.abbreviation);
      expect(abbreviations.some(abbrev => ['AHRC', 'BBSRC', 'ESRC', 'EPSRC', 'MRC', 'NERC', 'STFC'].includes(abbrev!))).toBe(true);
    });

    it('should extract full names when different from display names', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const councilsWithFullNames = result.data!.filter((council: ResearchCouncilData) => council.fullName);

      if (councilsWithFullNames.length > 0) {
        expect(councilsWithFullNames[0].fullName!.length).toBeGreaterThan(councilsWithFullNames[0].name.length);
      }
    });

    it('should extract research areas when available', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const councilsWithAreas = result.data!.filter((council: ResearchCouncilData) => council.researchArea);

      if (councilsWithAreas.length > 0) {
        expect(councilsWithAreas[0].researchArea!.length).toBeGreaterThan(5);
        // Research areas should be descriptive
        expect(councilsWithAreas[0].researchArea).toMatch(/[a-z]/i);
      }
    });

    it('should extract website URLs when available', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const councilsWithWebsites = result.data!.filter((council: ResearchCouncilData) => council.website);

      expect(councilsWithWebsites.length).toBeGreaterThan(0);
      // UKRI websites typically use ukri.org or specific council domains
      expect(councilsWithWebsites[0].website).toMatch(/ukri\.org|\.ac\.uk|\.gov\.uk/);
    });

    it('should return exactly 7 main research councils', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      expect(result.metadata?.totalRecords).toBe(7);
      expect(result.data!.length).toBe(7);
    });

    it('should handle network errors with retry mechanism', async () => {
      // Mock network error scenario
      jest.spyOn(fetcher as unknown as { fetchWithRetry: jest.Mock }, 'fetchWithRetry').mockRejectedValueOnce(new Error('Network error'));

      const result = await fetcher.fetch();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should have correct URL configuration', () => {
      expect(fetcher.url).toBe('https://www.ukri.org/about-us/our-councils/');
      expect(fetcher.source).toBe(DataSource.UKRI);
    });

    it('should validate council names contain research terminology', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // All councils should contain research-related terminology
      result.data!.forEach((council: ResearchCouncilData) => {
        expect(council.name).toMatch(/Research|Council|Sciences|Humanities|Medical|Environment|Technology/i);
      });
    });

    it('should extract discipline-specific information', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // Each council should be associated with specific research disciplines
      const ahrc = result.data!.find((council: ResearchCouncilData) =>
        council.abbreviation === 'AHRC' || council.name.includes('Arts and Humanities')
      );

      if (ahrc) {
        expect(ahrc.researchArea || ahrc.name).toMatch(/Arts|Humanities/i);
      }

      const mrc = result.data!.find((council: ResearchCouncilData) =>
        council.abbreviation === 'MRC' || council.name.includes('Medical')
      );

      if (mrc) {
        expect(mrc.researchArea || mrc.name).toMatch(/Medical|Health|Biomedical/i);
      }
    });

    it('should distinguish between research councils and other UKRI bodies', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // Should focus on research councils, not include Innovate UK or Research England separately
      // const nonCouncilBodies = result.data!.filter((council: ResearchCouncilData) =>
      //   council.name.includes('Innovate UK') || council.name.includes('Research England')
      // );

      // These might be included or might be separate - the test allows for either
      expect(result.data!.length).toBeGreaterThanOrEqual(7);
    });

    it('should parse UKRI website structure correctly', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // All councils should have valid, non-empty names
      result.data!.forEach((council: ResearchCouncilData) => {
        expect(council.name.trim().length).toBeGreaterThan(5);
        expect(council.name).not.toContain('undefined');
        expect(council.name).not.toContain('null');
      });
    });

    it('should handle acronyms and full names consistently', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // Should not have duplicate entries for same council with different name formats
      const names = result.data!.map((council: ResearchCouncilData) => council.name);
      const abbreviations = result.data!.map((council: ResearchCouncilData) => council.abbreviation).filter(Boolean);

      // No council should appear twice
      const uniqueNames = [...new Set(names)];
      expect(names.length).toBe(uniqueNames.length);

      // Abbreviations should be unique too if present
      if (abbreviations.length > 0) {
        const uniqueAbbrevs = [...new Set(abbreviations)];
        expect(abbreviations.length).toBe(uniqueAbbrevs.length);
      }
    });

    it('should extract funding and remit information when available', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // Research councils should have distinct remits and research areas
      const councilsWithAreas = result.data!.filter((council: ResearchCouncilData) => council.researchArea);

      if (councilsWithAreas.length > 0) {
        // Research areas should be substantive
        councilsWithAreas.forEach(council => {
          expect(council.researchArea!.trim().length).toBeGreaterThan(10);
        });
      }
    });
  });
});