/**
 * Integration tests for NI Courts parser and mapper
 */

import { NICourtsParser } from '../../src/services/ni-courts-parser';
import { CourtsMapper } from '../../src/services/mappers/courts-mapper';

describe('NI Courts Integration', () => {
  let parser: NICourtsParser;
  let mapper: CourtsMapper;

  beforeEach(() => {
    parser = new NICourtsParser();
    mapper = new CourtsMapper();
  });

  it('should fetch and map NI courts to organisations', async () => {
    // Act
    const rawCourts = await parser.parse();
    const courts = parser.mapToCourtModel(rawCourts);
    const organisations = mapper.mapMany(courts);

    // Assert
    expect(organisations.length).toBeGreaterThan(10);
    expect(organisations.every(org =>
      org.additionalProperties?.jurisdiction === 'Northern Ireland'
    )).toBe(true);
  }, 30000);

  it('should parse court names from HTML', async () => {
    // Act
    const rawCourts = await parser.parse();
    const courts = parser.mapToCourtModel(rawCourts);
    const organisations = mapper.mapMany(courts);

    // Assert
    const courtNames = organisations.map(org => org.name);
    expect(courtNames.some(name => name.includes('Belfast') || name.includes('Antrim'))).toBe(true);
  }, 30000);

  it('should set correct organisation type', async () => {
    // Act
    const rawCourts = await parser.parse();
    const courts = parser.mapToCourtModel(rawCourts);
    const organisations = mapper.mapMany(courts);

    // Assert
    expect(organisations.every(org => org.type === 'judicial_body')).toBe(true);
  }, 30000);

  it('should handle courts with node IDs', async () => {
    // Act
    const rawCourts = await parser.parse();
    const courtsWithNodeId = rawCourts.filter(c => c.nodeId);

    if (courtsWithNodeId.length > 0) {
      const courts = parser.mapToCourtModel(courtsWithNodeId);
      const organisations = mapper.mapMany(courts);

      // Assert
      expect(organisations.some(org =>
        org.additionalProperties?.identifier !== undefined
      )).toBe(true);
    }
  }, 30000);
});