/**
 * Integration tests for English Courts parser and mapper
 */

import { EnglishCourtsParser } from '../../src/services/english-courts-parser';
import { CourtsMapper } from '../../src/services/mappers/courts-mapper';

describe('English Courts Integration', () => {
  let parser: EnglishCourtsParser;
  let mapper: CourtsMapper;

  beforeEach(() => {
    parser = new EnglishCourtsParser();
    mapper = new CourtsMapper();
  });

  it('should fetch and map English courts to organisations', async () => {
    // Act
    const rawCourts = await parser.parse();
    const courts = parser.mapToCourtModel(rawCourts);
    const organisations = mapper.mapMany(courts);

    // Assert
    expect(organisations.length).toBeGreaterThan(100);
    expect(organisations[0].type).toBe('judicial_body');
    expect(organisations[0].additionalProperties?.jurisdiction).toBe('England & Wales');
  }, 30000);

  it('should handle different court types', async () => {
    // Act
    const rawCourts = await parser.parse();
    const courts = parser.mapToCourtModel(rawCourts);
    const organisations = mapper.mapMany(courts);

    // Assert
    const courtTypes = new Set(organisations.map(org => org.classification));
    expect(courtTypes.size).toBeGreaterThanOrEqual(1); // Should have at least one court type
  }, 30000);

  it('should include location data where available', async () => {
    // Act
    const rawCourts = await parser.parse();
    const courts = parser.mapToCourtModel(rawCourts);
    const organisations = mapper.mapMany(courts);

    // Assert
    const orgsWithLocation = organisations.filter(org => org.location?.coordinates);
    expect(orgsWithLocation.length).toBeGreaterThan(0);

    const orgWithCoords = orgsWithLocation[0];
    expect(orgWithCoords.location?.coordinates?.latitude).toBeDefined();
    expect(orgWithCoords.location?.coordinates?.longitude).toBeDefined();
  }, 30000);

  it('should calculate data quality scores', async () => {
    // Act
    const rawCourts = await parser.parse();
    const courts = parser.mapToCourtModel(rawCourts);
    const organisations = mapper.mapMany(courts);

    // Assert
    expect(organisations.every(org =>
      org.dataQuality?.completeness !== undefined &&
      org.dataQuality.completeness >= 0 &&
      org.dataQuality.completeness <= 1
    )).toBe(true);
  }, 30000);
});