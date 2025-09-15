/**
 * Integration tests for Northern Ireland Schools
 * Tests the end-to-end flow of fetching, parsing, and mapping NI schools data
 */

import { NISchoolsParser } from '../../src/services/ni-schools-parser';
import { NISchoolsMapper } from '../../src/services/mappers/ni-schools-mapper';
import { Organisation } from '../../src/models/organisation';

describe('NI Schools Integration', () => {
  let parser: NISchoolsParser;
  let mapper: NISchoolsMapper;

  beforeEach(() => {
    parser = new NISchoolsParser();
    mapper = new NISchoolsMapper();
  });

  describe('End-to-end flow', () => {
    it('should fetch, parse, and map NI schools data', async () => {
      // Act
      const rawSchools = await parser.parse();
      const organisations = mapper.mapMany(rawSchools);

      // Assert
      expect(organisations).toBeDefined();
      expect(Array.isArray(organisations)).toBe(true);
      expect(organisations.length).toBeGreaterThan(1000);
      expect(organisations.length).toBeLessThan(1300);

      // Check first organisation has correct structure
      const firstOrg = organisations[0];
      expect(firstOrg.name).toBeDefined();
      expect(firstOrg.category).toBe('Northern Ireland School');
      expect(firstOrg.subcategory).toMatch(/School$/);
    }, 60000); // 60 second timeout for network request

    it('should produce valid Organisation objects', async () => {
      // Act
      const rawSchools = await parser.parse();
      const organisations = mapper.mapMany(rawSchools);

      // Assert - validate Organisation structure
      organisations.forEach(org => {
        // Required fields
        expect(org.name).toBeDefined();
        expect(typeof org.name).toBe('string');
        expect(org.name.length).toBeGreaterThan(0);

        expect(org.category).toBe('Northern Ireland School');
        expect(org.subcategory).toBeDefined();
        expect(['Primary School', 'Post-Primary School', 'Special School', 'Nursery School', 'Other School'])
          .toContain(org.subcategory);

        // Optional fields should have correct types if present
        if (org.identifier) {
          expect(typeof org.identifier).toBe('string');
        }

        if (org.location) {
          if (org.location.address) expect(typeof org.location.address).toBe('string');
          if (org.location.town) expect(typeof org.location.town).toBe('string');
          if (org.location.postcode) expect(typeof org.location.postcode).toBe('string');
        }

        if (org.contact) {
          if (org.contact.telephone) expect(typeof org.contact.telephone).toBe('string');
          if (org.contact.email) expect(typeof org.contact.email).toBe('string');
          if (org.contact.website) expect(typeof org.contact.website).toBe('string');
        }

        if (org.metadata) {
          expect(org.metadata.sourceSystem).toBe('NI Education Department');
          expect(org.metadata.lastUpdated).toBeDefined();
        }
      });
    }, 60000);

    it('should include various school types', async () => {
      // Act
      const rawSchools = await parser.parse();
      const organisations = mapper.mapMany(rawSchools);

      // Assert - check for presence of different school types
      const subcategories = [...new Set(organisations.map(org => org.subcategory))];

      expect(subcategories.length).toBeGreaterThan(1);
      expect(subcategories).toContain('Primary School');

      // Log distribution for debugging
      const distribution = subcategories.map(cat => ({
        type: cat,
        count: organisations.filter(org => org.subcategory === cat).length
      }));
      console.log('School type distribution:', distribution);
    }, 60000);

    it('should handle location data correctly', async () => {
      // Act
      const rawSchools = await parser.parse();
      const organisations = mapper.mapMany(rawSchools);

      // Assert - check that most schools have location data
      const withLocation = organisations.filter(org => org.location !== undefined);
      const locationRate = (withLocation.length / organisations.length) * 100;

      expect(locationRate).toBeGreaterThan(80); // Expect >80% to have location data

      // Check some have postcodes
      const withPostcode = organisations.filter(org => org.location?.postcode);
      expect(withPostcode.length).toBeGreaterThan(0);
    }, 60000);

    it('should preserve metadata information', async () => {
      // Act
      const rawSchools = await parser.parse();
      const organisations = mapper.mapMany(rawSchools);

      // Assert - check metadata preservation
      const withMetadata = organisations.filter(org => org.metadata);
      expect(withMetadata.length).toBe(organisations.length); // All should have metadata

      // Check for management types
      const withManagementType = organisations.filter(org => org.metadata?.managementType);
      expect(withManagementType.length).toBeGreaterThan(0);

      // Sample some management types
      const managementTypes = [...new Set(withManagementType.map(org => org.metadata!.managementType))];
      console.log('Management types found:', managementTypes);
    }, 60000);
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      // Arrange - mock network error
      jest.spyOn(parser as any, 'fetchPage').mockRejectedValue(
        new Error('Network error: ECONNREFUSED')
      );

      // Act & Assert
      await expect(parser.parse()).rejects.toThrow(/Network error/);
    });

    it('should handle malformed data gracefully', async () => {
      // Arrange - mock malformed Excel data
      jest.spyOn(parser as any, 'fetchPage').mockResolvedValue(`
        <html>
          <input id="__VIEWSTATE" value="test" />
          <input id="__EVENTVALIDATION" value="test" />
        </html>
      `);
      jest.spyOn(parser as any, 'fetchExcelData').mockResolvedValue(
        Buffer.from('Invalid Excel content')
      );

      // Act & Assert
      await expect(parser.parse()).rejects.toThrow();
    });

    it('should validate count and fail if outside tolerance', async () => {
      // Arrange - mock too few schools
      const mockSchools = Array(500).fill(null).map((_, i) => ({
        schoolName: `School ${i}`,
        schoolType: 'Primary',
        status: 'Open'
      }));

      jest.spyOn(parser as any, 'fetchPage').mockResolvedValue(`
        <html>
          <input id="__VIEWSTATE" value="test" />
          <input id="__EVENTVALIDATION" value="test" />
        </html>
      `);
      jest.spyOn(parser as any, 'fetchExcelData').mockResolvedValue(Buffer.from('mock'));
      jest.spyOn(parser as any, 'parseExcel').mockResolvedValue(mockSchools);

      // Act & Assert
      await expect(parser.parse()).rejects.toThrow(/count/i);
    });
  });

  describe('Performance', () => {
    it('should complete parsing within reasonable time', async () => {
      // Act
      const startTime = Date.now();
      const rawSchools = await parser.parse();
      const organisations = mapper.mapMany(rawSchools);
      const endTime = Date.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

      console.log(`Processed ${organisations.length} schools in ${duration}ms`);
    }, 35000);

    it('should handle large datasets efficiently', async () => {
      // Arrange - mock large dataset
      const largeDataset = Array(2000).fill(null).map((_, i) => ({
        schoolName: `School ${i}`,
        schoolType: i % 4 === 0 ? 'Primary' : i % 4 === 1 ? 'Post-Primary' : i % 4 === 2 ? 'Special' : 'Nursery',
        status: 'Open',
        address1: `${i} Main Street`,
        town: 'Belfast',
        postcode: `BT${i % 100} ${Math.floor(i / 100)}AA`
      }));

      // Act
      const startTime = Date.now();
      const organisations = mapper.mapMany(largeDataset);
      const endTime = Date.now();

      // Assert
      expect(organisations).toHaveLength(2000);
      expect(endTime - startTime).toBeLessThan(1000); // Mapping should be fast
    });
  });
});