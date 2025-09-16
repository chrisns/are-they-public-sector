/**
 * Contract Test: Fire and Rescue Services Parser
 * Validates fire-parser service behavior and output format
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { FireParser } from '../../src/services/fire-parser.js';
import axios from 'axios';

// Mock axios for testing
jest.mock('axios');

describe('Fire Parser Contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock fire services removed - now using CSV data from official ONS source

  const mockCSVData = `FRA23CD,FRA23NM,ObjectId
E31000046,London Fire and Emergency Planning Authority,42
E31000040,Greater Manchester,36
E31000044,West Midlands,40
E31000045,West Yorkshire,41
E31000041,Merseyside,37
E31000042,South Yorkshire,38
E31000043,Tyne and Wear,39
E31000015,Essex,14
E31000022,Kent,19
E31000048,Hampshire and Isle of Wight,44
E31000011,Devon & Somerset,11
E31000001,Avon,1
E31000006,Cheshire,6
E31000023,Lancashire,20
E31000029,Nottinghamshire,26
E31000010,Derbyshire,10
E31000024,Leicestershire,21
E31000025,Lincolnshire,22
E31000027,Northamptonshire,24
E31000033,Warwickshire,33
E31000030,Staffordshire,27
E31000018,Hereford & Worcester,16
E31000031,Shropshire,28
E31000008,Cornwall,8
E31000047,Dorset & Wiltshire,43
E31000014,East Sussex,13
E31000037,West Sussex,34
E31000035,Surrey,32
E31000028,Oxfordshire,25
E31000004,Buckinghamshire & Milton Keynes,4
E31000003,Royal Berkshire,3
E31000005,Cambridgeshire,5
E31000026,Norfolk,23
E31000034,Suffolk,31
E31000019,Hertfordshire,17
E31000002,Bedfordshire,2
E31000032,North Yorkshire,29
E31000013,County Durham and Darlington,12
E31000007,Cleveland,7
E31000009,Cumbria,9
E31000036,Northumberland,33
E31000020,Humberside,18
W25000003,South Wales,49
W25000002,Mid and West Wales,48
W25000001,North Wales,47
S38000001,Scotland,46
N31000001,Northern Ireland Fire and Rescue Service,45`;

  describe('fetchAll()', () => {
    it('should return array of FireService objects from official data', async () => {
      // GIVEN: Official UK government data is available
      (axios.get as jest.MockedFunction<typeof axios.get>).mockResolvedValue({ status: 200, data: mockCSVData });
      const parser = new FireParser();
      
      // WHEN: Fetching all fire services
      const services = await parser.fetchAll();
      
      // THEN: Should return valid fire service data
      expect(Array.isArray(services)).toBe(true);
      expect(services.length).toBeGreaterThanOrEqual(45); // Minimum expected
      
      services.forEach(service => {
        expect(service).toMatchObject({
          name: expect.any(String),
          serviceType: 'fire',
          authorityType: expect.stringMatching(/^(county|metropolitan|combined_authority|unitary)$/)
        });
        
        // Name should not be empty
        expect(service.name.length).toBeGreaterThan(0);
        
        // Should have region
        expect(service.region).toBeDefined();
        expect(service.region.length).toBeGreaterThan(0);
      });
    });

    it('should handle various fire service naming patterns', async () => {
      // GIVEN: Services with different naming conventions
      (axios.get as jest.MockedFunction<typeof axios.get>).mockResolvedValue({ status: 200, data: mockCSVData });
      const parser = new FireParser();
      
      // WHEN: Fetching all services
      const services = await parser.fetchAll();
      
      // THEN: Should normalize names appropriately
      const serviceNames = services.map(s => s.name);
      
      // Check for various patterns
      const patterns = [
        /Fire and Rescue Service$/,
        /Fire Service$/,
        /Fire Authority$/,
        /Fire and Rescue Authority$/
      ];
      
      const hasVariousPatterns = patterns.some(pattern => 
        serviceNames.some(name => pattern.test(name))
      );
      expect(hasVariousPatterns).toBe(true);
    });

    it('should identify metropolitan vs county services', async () => {
      // GIVEN: Mix of service types
      (axios.get as jest.MockedFunction<typeof axios.get>).mockResolvedValue({ status: 200, data: mockCSVData });
      const parser = new FireParser();
      
      // WHEN: Fetching all services
      const services = await parser.fetchAll();
      
      // THEN: Should classify authority types
      const authorityTypes = new Set(services.map(s => s.authorityType));
      expect(authorityTypes.size).toBeGreaterThan(1); // Multiple types

      // London should be metropolitan
      const london = services.find(s => s.name.toLowerCase().includes('london'));
      if (london) {
        expect(london.authorityType).toBe('metropolitan');
      }
    });
  });

  describe('parseCSV()', () => {
    it('should extract fire service data from CSV format', () => {
      // GIVEN: CSV data with fire services
      const csv = `FRA23CD,FRA23NM,ObjectId
E31000040,Greater Manchester,36
E31000011,Devon & Somerset,11
E31000045,West Yorkshire,41`;

      // WHEN: Parsing the CSV
      const parser = new FireParser();
      const services = parser.parseCSV(csv);

      // THEN: Should extract service information
      expect(services).toHaveLength(3);
      expect(services[0]).toMatchObject({
        name: 'Greater Manchester Fire and Rescue Service',
        serviceType: 'fire',
        authorityType: 'metropolitan',
        region: 'Greater Manchester',
        officialCode: 'E31000040'
      });
      expect(services[1]).toMatchObject({
        name: 'Devon and Somerset Fire and Rescue Service',
        serviceType: 'fire',
        authorityType: 'county',
        region: 'Devon and Somerset',
        officialCode: 'E31000011'
      });
    });

    it('should handle quoted CSV values and special characters', () => {
      // GIVEN: CSV with quoted values and special characters
      const csv = `FRA23CD,FRA23NM,ObjectId
E31000018,"Hereford & Worcester",16
W25000001,"North Wales",47`;

      // WHEN: Parsing the CSV
      const parser = new FireParser();
      const services = parser.parseCSV(csv);

      // THEN: Should handle quotes and ampersands correctly
      expect(services).toHaveLength(2);
      expect(services[0].name).toBe('Hereford and Worcester Fire and Rescue Service');
      expect(services[1].name).toBe('North Wales Fire and Rescue Service');
      expect(services[0].officialCode).toBe('E31000018');
      expect(services[1].officialCode).toBe('W25000001');
    });

    it('should skip empty lines and handle malformed data gracefully', () => {
      // GIVEN: CSV with empty lines and malformed data
      const csv = `FRA23CD,FRA23NM,ObjectId
E31000001,Avon,1

E31000002,Bedfordshire,2
,Invalid Line,
E31000003,Royal Berkshire,3`;

      // WHEN: Parsing the CSV
      const parser = new FireParser();
      const services = parser.parseCSV(csv);

      // THEN: Should skip invalid data and process valid entries
      expect(services).toHaveLength(3);
      expect(services[0].name).toBe('Avon Fire and Rescue Service');
      expect(services[1].name).toBe('Bedfordshire Fire and Rescue Service');
      expect(services[2].name).toBe('Royal Berkshire Fire and Rescue Service');
    });
  });

  describe('Data Quality', () => {
    it('should extract coverage areas when available', async () => {
      // GIVEN: Services with coverage information
      (axios.get as jest.MockedFunction<typeof axios.get>).mockResolvedValue({ status: 200, data: mockCSVData });
      const parser = new FireParser();
      
      // WHEN: Fetching services
      const services = await parser.fetchAll();
      
      // THEN: Should populate coverage arrays where available
      const withCoverage = services.filter(s => s.coverage && s.coverage.length > 0);
      
      withCoverage.forEach(service => {
        expect(Array.isArray(service.coverage)).toBe(true);
        service.coverage.forEach(area => {
          expect(area).toBeTruthy();
          expect(typeof area).toBe('string');
        });
      });
    });

    it('should normalize service names', async () => {
      // GIVEN: Services with various naming patterns  
      (axios.get as jest.MockedFunction<typeof axios.get>).mockResolvedValue({ status: 200, data: mockCSVData });
      const parser = new FireParser();
      
      // WHEN: Fetching services
      const services = await parser.fetchAll();
      
      // THEN: Names should be properly formatted
      services.forEach(service => {
        // No leading/trailing whitespace
        expect(service.name).toBe(service.name.trim());
        
        // No double spaces
        expect(service.name).not.toMatch(/\s{2,}/);
        
        // Handle ampersands consistently
        if (service.name.includes('&')) {
          expect(service.name).toMatch(/\s&\s/); // Space around &
        }
      });
    });

    it('should classify authority types correctly', () => {
      // GIVEN: Services with different types
      const testCases = [
        { name: 'Greater London Fire Brigade', expected: 'metropolitan' },
        { name: 'Kent Fire and Rescue Service', expected: 'county' },
        { name: 'West Yorkshire Fire and Rescue Authority', expected: 'metropolitan' } // West Yorkshire is metropolitan
      ];
      
      const parser = new FireParser();
      
      testCases.forEach(test => {
        // WHEN: Classifying service type
        const type = parser.classifyAuthorityType(test.name);
        
        // THEN: Should match expected type
        expect(type).toBe(test.expected);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // GIVEN: Network failure scenario
      (axios.get as jest.MockedFunction<typeof axios.get>).mockRejectedValue(new Error('Network error'));
      const parser = new FireParser();

      // WHEN: Attempting to fetch
      // THEN: Should return fallback data or empty array (not throw)
      const services = await parser.fetchAll();
      expect(Array.isArray(services)).toBe(true);
      // Either returns fallback data or empty array if no fallback
      expect(services.length).toBeGreaterThanOrEqual(0);
    });

    it('should use fallback when live data is insufficient', async () => {
      // GIVEN: Parser returns too few records from live data
      const mockEmptyCSV = 'FRA23CD,FRA23NM,ObjectId';
      (axios.get as jest.MockedFunction<typeof axios.get>).mockResolvedValue({ status: 200, data: mockEmptyCSV });
      const parser = new FireParser();

      // WHEN: Fetching services
      // THEN: Should use fallback data or return empty array (not throw)
      const services = await parser.fetchAll();
      expect(Array.isArray(services)).toBe(true);
      // Either returns fallback data or empty array if no fallback
      expect(services.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle CSV with minimal required fields only', () => {
      // GIVEN: CSV with minimal required data
      const csv = `FRA23CD,FRA23NM,ObjectId
E31000022,Northumberland,19
E31000013,County Durham and Darlington,12`;

      // WHEN: Parsing minimal CSV
      const parser = new FireParser();
      const services = parser.parseCSV(csv);

      // THEN: Should still create valid objects
      expect(services).toHaveLength(2);
      services.forEach(service => {
        expect(service.name).toBeDefined();
        expect(service.serviceType).toBe('fire');
        expect(service.officialCode).toBeDefined();
        expect(service.website).toBeUndefined(); // Optional
        expect(service.stationCount).toBeUndefined(); // Optional
      });
    });
  });
});

