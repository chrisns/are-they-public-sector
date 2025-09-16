/**
 * Contract tests for Northern Ireland Schools Mapper
 * These tests define the expected behavior for mapping NI schools to Organisation format
 */

import { NISchoolsMapper } from '../../src/services/mappers/ni-schools-mapper';
import { NISchoolRaw } from '../../src/services/ni-schools-parser';

describe('NISchoolsMapper Contract', () => {
  let mapper: NISchoolsMapper;

  beforeEach(() => {
    mapper = new NISchoolsMapper();
  });

  describe('map()', () => {
    it('should map a basic school to Organisation format', () => {
      // Arrange
      const rawSchool: NISchoolRaw = {
        schoolName: 'Test Primary School',
        schoolType: 'Primary',
        status: 'Open',
        address1: '123 Main Street',
        town: 'Belfast',
        postcode: 'BT1 1AA'
      };

      // Act
      const result = mapper.map(rawSchool);

      // Assert
      expect(result.name).toBe('Test Primary School');
      expect(result.additionalProperties?.category).toBe('Northern Ireland School');
      expect(result.additionalProperties?.subcategory).toBe('Primary School');
      expect(result.location).toEqual({
        address: '123 Main Street',
        region: 'Belfast',
        country: 'Northern Ireland'
      });
    });

    it('should map all school types correctly', () => {
      // Arrange
      const schoolTypes = [
        { input: 'Primary', expected: 'Primary School' },
        { input: 'Post-Primary', expected: 'Post-Primary School' },
        { input: 'Special', expected: 'Special School' },
        { input: 'Nursery', expected: 'Nursery School' },
        { input: 'Unknown Type', expected: 'Other School' }
      ];

      // Act & Assert
      schoolTypes.forEach(({ input, expected }) => {
        const school: NISchoolRaw = {
          schoolName: 'Test School',
          schoolType: input,
          status: 'Open'
        };
        const result = mapper.map(school);
        expect(result.additionalProperties?.subcategory).toBe(expected);
      });
    });

    it('should handle complete address information', () => {
      // Arrange
      const rawSchool: NISchoolRaw = {
        schoolName: 'Test School',
        schoolType: 'Primary',
        status: 'Open',
        address1: '123 Main Street',
        address2: 'District Area',
        address3: 'County Down',
        town: 'Belfast',
        postcode: 'BT1 1AA'
      };

      // Act
      const result = mapper.map(rawSchool);

      // Assert
      expect(result.location?.address).toBe('123 Main Street, District Area, County Down');
      expect(result.location?.region).toBe('Belfast');
      expect(result.additionalProperties?.metadata?.postcode).toBe('BT1 1AA');
    });

    it('should handle contact information', () => {
      // Arrange
      const rawSchool: NISchoolRaw = {
        schoolName: 'Test School',
        schoolType: 'Primary',
        status: 'Open',
        telephone: '028 9012 3456',
        email: 'info@school.ni.sch.uk',
        website: 'https://www.school.ni.sch.uk'
      };

      // Act
      const result = mapper.map(rawSchool);

      // Assert
      expect(result.additionalProperties?.contact).toEqual({
        telephone: '028 9012 3456',
        email: 'info@school.ni.sch.uk',
        website: 'https://www.school.ni.sch.uk'
      });
    });

    it('should preserve metadata fields', () => {
      // Arrange
      const rawSchool: NISchoolRaw = {
        schoolName: 'Test School',
        schoolType: 'Primary',
        status: 'Open',
        managementType: 'Controlled',
        principalName: 'John Smith',
        enrolment: 250,
        ageRange: '4-11',
        ward: 'Test Ward',
        constituency: 'Belfast North'
      };

      // Act
      const result = mapper.map(rawSchool);

      // Assert
      const metadata = result.additionalProperties?.metadata as Record<string, unknown>;
      expect(metadata?.managementType).toBe('Controlled');
      expect(metadata?.principal).toBe('John Smith');
      expect(metadata?.enrolment).toBe(250);
      expect(metadata?.ageRange).toBe('4-11');
      expect(metadata?.ward).toBe('Test Ward');
      expect(metadata?.constituency).toBe('Belfast North');
      expect(metadata?.sourceSystem).toBe('NI Education Department');
      expect(metadata?.lastUpdated).toBeDefined();
    });

    it('should handle missing optional fields gracefully', () => {
      // Arrange
      const minimalSchool: NISchoolRaw = {
        schoolName: 'Minimal School',
        schoolType: 'Primary',
        status: 'Open'
      };

      // Act
      const result = mapper.map(minimalSchool);

      // Assert
      expect(result.name).toBe('Minimal School');
      expect(result.additionalProperties?.category).toBe('Northern Ireland School');
      expect(result.additionalProperties?.subcategory).toBe('Primary School');
      expect(result.additionalProperties?.identifier).toBeUndefined();
      expect(result.location).toBeUndefined();
      expect(result.additionalProperties?.contact).toBeUndefined();
    });

    it('should set identifier from reference number if available', () => {
      // Arrange
      const rawSchool: NISchoolRaw = {
        schoolName: 'Test School',
        schoolType: 'Primary',
        status: 'Open',
        referenceNumber: 'NI-12345'
      };

      // Act
      const result = mapper.map(rawSchool);

      // Assert
      expect(result.additionalProperties?.identifier).toBe('NI-12345');
    });

    it('should trim and normalize whitespace in string fields', () => {
      // Arrange
      const rawSchool: NISchoolRaw = {
        schoolName: '  Test   School  ',
        schoolType: 'Primary',
        status: 'Open',
        address1: '  123   Main   Street  ',
        town: '  Belfast  '
      };

      // Act
      const result = mapper.map(rawSchool);

      // Assert
      expect(result.name).toBe('Test School');
      expect(result.location?.address).toBe('123 Main Street');
      expect(result.location?.region).toBe('Belfast');
    });

    it('should handle empty strings as undefined', () => {
      // Arrange
      const rawSchool: NISchoolRaw = {
        schoolName: 'Test School',
        schoolType: 'Primary',
        status: 'Open',
        address1: '',
        telephone: '',
        email: ''
      };

      // Act
      const result = mapper.map(rawSchool);

      // Assert
      expect(result.location).toBeUndefined();
      expect(result.contact).toBeUndefined();
    });

    it('should add processing timestamp to metadata', () => {
      // Arrange
      const rawSchool: NISchoolRaw = {
        schoolName: 'Test School',
        schoolType: 'Primary',
        status: 'Open'
      };

      // Act
      const before = new Date();
      const result = mapper.map(rawSchool);
      const after = new Date();

      // Assert
      const metadata = result.additionalProperties?.metadata as Record<string, unknown>;
      expect(metadata?.lastUpdated).toBeDefined();
      const timestamp = new Date(metadata!.lastUpdated as string);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('mapMany()', () => {
    it('should map multiple schools', () => {
      // Arrange
      const rawSchools: NISchoolRaw[] = [
        {
          schoolName: 'School 1',
          schoolType: 'Primary',
          status: 'Open'
        },
        {
          schoolName: 'School 2',
          schoolType: 'Post-Primary',
          status: 'Open'
        },
        {
          schoolName: 'School 3',
          schoolType: 'Special',
          status: 'Open'
        }
      ];

      // Act
      const results = mapper.mapMany(rawSchools);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].name).toBe('School 1');
      expect(results[0].additionalProperties?.subcategory).toBe('Primary School');
      expect(results[1].name).toBe('School 2');
      expect(results[1].additionalProperties?.subcategory).toBe('Post-Primary School');
      expect(results[2].name).toBe('School 3');
      expect(results[2].additionalProperties?.subcategory).toBe('Special School');
    });

    it('should handle empty array', () => {
      // Act
      const results = mapper.mapMany([]);

      // Assert
      expect(results).toEqual([]);
    });

    it('should skip invalid schools (defensive)', () => {
      // Arrange
      const rawSchools: unknown[] = [
        {
          schoolName: 'Valid School',
          schoolType: 'Primary',
          status: 'Open'
        },
        null,
        undefined,
        {
          schoolName: '',  // Invalid - empty name
          schoolType: 'Primary',
          status: 'Open'
        },
        {
          schoolName: 'Another Valid',
          schoolType: 'Primary',
          status: 'Open'
        }
      ];

      // Act
      const results = mapper.mapMany(rawSchools);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Valid School');
      expect(results[1].name).toBe('Another Valid');
    });
  });
});