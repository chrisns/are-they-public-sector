/**
 * Full integration test for all UK courts
 */

import { EnglishCourtsParser } from '../../src/services/english-courts-parser';
import { NICourtsParser } from '../../src/services/ni-courts-parser';
import { ScottishCourtsParser } from '../../src/services/scottish-courts-parser';
import { CourtsMapper } from '../../src/services/mappers/courts-mapper';
import type { Organisation } from '../../src/models/organisation';

const describeIfNetwork = process.env.TEST_NETWORK ? describe : describe.skip;

describeIfNetwork('Full Courts Integration', () => {
  let englishParser: EnglishCourtsParser;
  let niParser: NICourtsParser;
  let scottishParser: ScottishCourtsParser;
  let mapper: CourtsMapper;

  beforeEach(() => {
    englishParser = new EnglishCourtsParser();
    niParser = new NICourtsParser();
    scottishParser = new ScottishCourtsParser();
    mapper = new CourtsMapper();
  });

  it('should aggregate courts from all jurisdictions', async () => {
    const allOrganisations: Organisation[] = [];

    // Fetch English/Welsh courts
    try {
      const englishRaw = await englishParser.parse();
      const englishCourts = englishParser.mapToCourtModel(englishRaw);
      const englishOrgs = mapper.mapMany(englishCourts);
      allOrganisations.push(...englishOrgs);
      console.log(`English/Welsh courts: ${englishOrgs.length}`);
    } catch (error) {
      console.error('Failed to fetch English courts:', error);
    }

    // Fetch NI courts
    try {
      const niRaw = await niParser.parse();
      const niCourts = niParser.mapToCourtModel(niRaw);
      const niOrgs = mapper.mapMany(niCourts);
      allOrganisations.push(...niOrgs);
      console.log(`NI courts: ${niOrgs.length}`);
    } catch (error) {
      console.error('Failed to fetch NI courts:', error);
    }

    // Fetch Scottish courts
    try {
      const scottishRaw = await scottishParser.parse();
      const scottishCourts = scottishParser.mapToCourtModel(scottishRaw);
      const scottishOrgs = mapper.mapMany(scottishCourts);
      allOrganisations.push(...scottishOrgs);
      console.log(`Scottish courts: ${scottishOrgs.length}`);
    } catch (error) {
      console.error('Failed to fetch Scottish courts:', error);
    }

    // Assert
    expect(allOrganisations.length).toBeGreaterThan(150); // Should have at least 150 courts total
    expect(allOrganisations.every(org => org.type === 'judicial_body')).toBe(true);
  }, 60000);

  it('should not deduplicate between sources (FR-020)', async () => {
    const allOrganisations: Organisation[] = [];

    // Fetch from all sources
    const englishRaw = await englishParser.parse();
    const englishCourts = englishParser.mapToCourtModel(englishRaw);
    const englishOrgs = mapper.mapMany(englishCourts);
    allOrganisations.push(...englishOrgs);

    const niRaw = await niParser.parse();
    const niCourtModels = niParser.mapToCourtModel(niRaw);
    const niOrgs = mapper.mapMany(niCourtModels);
    allOrganisations.push(...niOrgs);

    const scottishRaw = await scottishParser.parse();
    const scottishCourtModels = scottishParser.mapToCourtModel(scottishRaw);
    const scottishOrgs = mapper.mapMany(scottishCourtModels);
    allOrganisations.push(...scottishOrgs);

    // Check that each jurisdiction's courts are preserved
    const englandWalesCourts = allOrganisations.filter(org =>
      org.additionalProperties?.jurisdiction === 'England & Wales'
    );
    const niCourts = allOrganisations.filter(org =>
      org.additionalProperties?.jurisdiction === 'Northern Ireland'
    );
    const scottishCourts = allOrganisations.filter(org =>
      org.additionalProperties?.jurisdiction === 'Scotland'
    );

    expect(englandWalesCourts.length).toBeGreaterThan(100);
    expect(niCourts.length).toBeGreaterThan(10);
    expect(scottishCourts.length).toBeGreaterThan(40);

    // Total should be sum of all
    expect(allOrganisations.length).toBe(
      englandWalesCourts.length + niCourts.length + scottishCourts.length
    );
  }, 60000);

  it('should map all courts to organisations with valid structure', async () => {
    const allOrganisations: Organisation[] = [];

    // Fetch from all sources
    const englishRaw = await englishParser.parse();
    const englishCourts = englishParser.mapToCourtModel(englishRaw);
    allOrganisations.push(...mapper.mapMany(englishCourts));

    const niRaw = await niParser.parse();
    const niCourts = niParser.mapToCourtModel(niRaw);
    allOrganisations.push(...mapper.mapMany(niCourts));

    const scottishRaw = await scottishParser.parse();
    const scottishCourts = scottishParser.mapToCourtModel(scottishRaw);
    allOrganisations.push(...mapper.mapMany(scottishCourts));

    // Validate structure of all organisations
    allOrganisations.forEach(org => {
      expect(org.id).toBeDefined();
      expect(org.name).toBeDefined();
      expect(org.type).toBe('judicial_body');
      expect(org.classification).toBeDefined();
      expect(org.status).toMatch(/^(active|inactive)$/);
      expect(org.sources).toHaveLength(1);
      expect(org.sources[0].source).toBeDefined();
      expect(org.sources[0].confidence).toBe(1.0);
      expect(org.dataQuality).toBeDefined();
      expect(org.dataQuality.completeness).toBeGreaterThanOrEqual(0);
      expect(org.dataQuality.completeness).toBeLessThanOrEqual(1);
      expect(org.additionalProperties?.jurisdiction).toMatch(/^(England & Wales|Northern Ireland|Scotland)$/);
    });
  }, 60000);
});