/**
 * Integration tests for Scottish Courts parser and mapper
 */

import { ScottishCourtsParser } from '../../src/services/scottish-courts-parser';
import { CourtsMapper } from '../../src/services/mappers/courts-mapper';

const describeIfNetwork = process.env.TEST_NETWORK ? describe : describe.skip;

describeIfNetwork('Scottish Courts Integration', () => {
  let parser: ScottishCourtsParser;
  let mapper: CourtsMapper;

  beforeEach(() => {
    parser = new ScottishCourtsParser();
    mapper = new CourtsMapper();
  });

  it('should fetch or use fallback for Scottish courts', async () => {
    // Act
    const rawCourts = await parser.parse();
    const courts = parser.mapToCourtModel(rawCourts);
    const organisations = mapper.mapMany(courts);

    // Assert
    expect(organisations.length).toBeGreaterThan(0);
    if (parser.getLastError()) {
      console.log('Used fallback data:', parser.getLastError());
    }

    expect(organisations.every(org =>
      org.additionalProperties?.jurisdiction === 'Scotland'
    )).toBe(true);
  }, 30000);

  it('should include major Scottish court types', async () => {
    // Act
    const rawCourts = await parser.parse();
    const courts = parser.mapToCourtModel(rawCourts);
    const organisations = mapper.mapMany(courts);

    // Assert
    const classifications = organisations.map(org => org.classification);
    expect(classifications).toContain('Sheriff Court');
  }, 30000);

  it('should include courts from major Scottish cities', async () => {
    // Act
    const rawCourts = await parser.parse();
    const courts = parser.mapToCourtModel(rawCourts);
    const organisations = mapper.mapMany(courts);

    // Assert
    const courtNames = organisations.map(org => org.name);
    const majorCities = ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee'];
    const hasMajorCity = majorCities.some(city =>
      courtNames.some(name => name.includes(city))
    );
    expect(hasMajorCity).toBe(true);
  }, 30000);

  it('should handle Scottish court data properly', async () => {
    // Act
    const rawCourts = await parser.parse();
    const courts = parser.mapToCourtModel(rawCourts);
    const organisations = mapper.mapMany(courts);

    // Assert
    expect(organisations.length).toBeGreaterThan(40); // Should have at least 40 Scottish courts
    expect(organisations[0].sources[0].confidence).toBe(1.0);
  }, 60000); // Increase timeout for web scraping
});