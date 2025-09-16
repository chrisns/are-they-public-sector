/**
 * Contract tests for Courts Mapper
 * Maps Court entities to Organisation model
 */

import { CourtsMapper } from '../../../src/services/mappers/courts-mapper';
import type { Court } from '../../../src/models/court';
import type { Organisation } from '../../../src/models/organisation';
import { Jurisdiction, CourtStatus, CourtType } from '../../../src/models/court';

describe('CourtsMapper Contract', () => {
  let mapper: CourtsMapper;

  beforeEach(() => {
    mapper = new CourtsMapper();
  });

  describe('map()', () => {
    it('should map Court to Organisation model', () => {
      // Arrange
      const court: Court = {
        name: 'Test Crown Court',
        type: [CourtType.CROWN_COURT],
        jurisdiction: Jurisdiction.ENGLAND_WALES,
        status: CourtStatus.ACTIVE,
        location: {
          addressLines: ['123 Test Street'],
          town: 'London',
          postcode: 'EC1A 1AA',
          country: 'United Kingdom',
          latitude: 51.5074,
          longitude: -0.1278
        },
        contact: {
          telephone: '020 1234 5678',
          email: 'test@court.gov.uk'
        },
        areasOfLaw: ['Criminal'],
        sourceSystem: 'CSV',
        lastUpdated: '2024-01-15T00:00:00Z'
      };

      // Act
      const org = mapper.map(court);

      // Assert
      expect(org.name).toBe('Test Crown Court');
      expect(org.type).toBe('JUDICIAL_BODY');
      expect(org.classification).toBe('Crown Court');
      expect(org.status).toBe('active');
      expect(org.location).toBeDefined();
      expect(org.location?.address).toContain('123 Test Street');
      expect(org.location?.region).toBe('London');
      expect(org.location?.country).toBe('United Kingdom');
      expect(org.additionalProperties?.contact).toBeDefined();
      expect(org.additionalProperties?.areasOfLaw).toEqual(['Criminal']);
    });

    it('should handle different court types correctly', () => {
      // Arrange
      const testCases = [
        { type: CourtType.MAGISTRATES_COURT, expected: "Magistrates' Court" },
        { type: CourtType.COUNTY_COURT, expected: 'County Court' },
        { type: CourtType.TRIBUNAL, expected: 'Tribunal' },
        { type: CourtType.SHERIFF_COURT, expected: 'Sheriff Court' }
      ];

      // Act & Assert
      testCases.forEach(testCase => {
        const court: Court = {
          name: 'Test Court',
          type: [testCase.type],
          jurisdiction: Jurisdiction.ENGLAND_WALES,
          status: CourtStatus.ACTIVE,
          sourceSystem: 'Test',
          lastUpdated: '2024-01-15T00:00:00Z'
        };

        const org = mapper.map(court);
        expect(org.classification).toBe(testCase.expected);
      });
    });

    it('should map jurisdiction correctly', () => {
      // Arrange
      const testCases = [
        { jurisdiction: Jurisdiction.ENGLAND_WALES, region: 'England & Wales' },
        { jurisdiction: Jurisdiction.NORTHERN_IRELAND, region: 'Northern Ireland' },
        { jurisdiction: Jurisdiction.SCOTLAND, region: 'Scotland' }
      ];

      // Act & Assert
      testCases.forEach(testCase => {
        const court: Court = {
          name: 'Test Court',
          type: [CourtType.OTHER],
          jurisdiction: testCase.jurisdiction,
          status: CourtStatus.ACTIVE,
          sourceSystem: 'Test',
          lastUpdated: '2024-01-15T00:00:00Z'
        };

        const org = mapper.map(court);
        expect(org.additionalProperties?.jurisdiction).toBe(testCase.region);
      });
    });

    it('should map court status to organisation status', () => {
      // Arrange
      const testCases = [
        { courtStatus: CourtStatus.ACTIVE, orgStatus: 'active' },
        { courtStatus: CourtStatus.INACTIVE, orgStatus: 'inactive' },
        { courtStatus: CourtStatus.UNKNOWN, orgStatus: 'active' } // Default to active
      ];

      // Act & Assert
      testCases.forEach(testCase => {
        const court: Court = {
          name: 'Test Court',
          type: [CourtType.OTHER],
          jurisdiction: Jurisdiction.ENGLAND_WALES,
          status: testCase.courtStatus,
          sourceSystem: 'Test',
          lastUpdated: '2024-01-15T00:00:00Z'
        };

        const org = mapper.map(court);
        expect(org.status).toBe(testCase.orgStatus);
      });
    });

    it('should handle minimal court data', () => {
      // Arrange
      const court: Court = {
        name: 'Minimal Court',
        type: [],
        jurisdiction: Jurisdiction.ENGLAND_WALES,
        status: CourtStatus.UNKNOWN,
        sourceSystem: 'Test',
        lastUpdated: '2024-01-15T00:00:00Z'
      };

      // Act
      const org = mapper.map(court);

      // Assert
      expect(org.name).toBe('Minimal Court');
      expect(org.type).toBe('JUDICIAL_BODY');
      expect(org.classification).toBe('Court');
      expect(org.status).toBe('active');
      expect(org.location).toBeUndefined();
      expect(org.additionalProperties?.contact).toBeUndefined();
    });

    it('should preserve all court metadata in additionalProperties', () => {
      // Arrange
      const court: Court = {
        name: 'Test Court',
        slug: 'test-court',
        identifier: 'TC123',
        type: [CourtType.CROWN_COURT, CourtType.COUNTY_COURT],
        jurisdiction: Jurisdiction.ENGLAND_WALES,
        status: CourtStatus.ACTIVE,
        areasOfLaw: ['Criminal', 'Civil'],
        services: ['Hearings', 'Trials'],
        sourceSystem: 'CSV',
        lastUpdated: '2024-01-15T00:00:00Z'
      };

      // Act
      const org = mapper.map(court);

      // Assert
      expect(org.additionalProperties?.slug).toBe('test-court');
      expect(org.additionalProperties?.identifier).toBe('TC123');
      expect(org.additionalProperties?.courtTypes).toEqual([
        'Crown Court',
        'County Court'
      ]);
      expect(org.additionalProperties?.areasOfLaw).toEqual(['Criminal', 'Civil']);
      expect(org.additionalProperties?.services).toEqual(['Hearings', 'Trials']);
      expect(org.additionalProperties?.sourceSystem).toBe('CSV');
    });
  });

  describe('mapMany()', () => {
    it('should map multiple courts to organisations', () => {
      // Arrange
      const courts: Court[] = [
        {
          name: 'Court 1',
          type: [CourtType.CROWN_COURT],
          jurisdiction: Jurisdiction.ENGLAND_WALES,
          status: CourtStatus.ACTIVE,
          sourceSystem: 'CSV',
          lastUpdated: '2024-01-15T00:00:00Z'
        },
        {
          name: 'Court 2',
          type: [CourtType.SHERIFF_COURT],
          jurisdiction: Jurisdiction.SCOTLAND,
          status: CourtStatus.ACTIVE,
          sourceSystem: 'API',
          lastUpdated: '2024-01-15T00:00:00Z'
        }
      ];

      // Act
      const orgs = mapper.mapMany(courts);

      // Assert
      expect(orgs).toHaveLength(2);
      expect(orgs[0].name).toBe('Court 1');
      expect(orgs[0].classification).toBe('Crown Court');
      expect(orgs[1].name).toBe('Court 2');
      expect(orgs[1].classification).toBe('Sheriff Court');
    });

    it('should handle empty array', () => {
      // Act
      const orgs = mapper.mapMany([]);

      // Assert
      expect(orgs).toEqual([]);
    });

    it('should skip invalid courts', () => {
      // Arrange
      const courts: Court[] = [
        {
          name: '', // Invalid - empty name
          type: [],
          jurisdiction: Jurisdiction.ENGLAND_WALES,
          status: CourtStatus.ACTIVE,
          sourceSystem: 'Test',
          lastUpdated: '2024-01-15T00:00:00Z'
        },
        {
          name: 'Valid Court',
          type: [CourtType.COUNTY_COURT],
          jurisdiction: Jurisdiction.ENGLAND_WALES,
          status: CourtStatus.ACTIVE,
          sourceSystem: 'Test',
          lastUpdated: '2024-01-15T00:00:00Z'
        }
      ];

      // Act
      const orgs = mapper.mapMany(courts);

      // Assert
      expect(orgs).toHaveLength(1);
      expect(orgs[0].name).toBe('Valid Court');
    });
  });
});