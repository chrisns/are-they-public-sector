/**
 * Contract Test: Fire and Rescue Services Parser
 * Validates fire-parser service behavior and output format
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { FireService } from '../../src/models/emergency-services.js';
import { FireParser } from '../../src/services/fire-parser.js';
import axios from 'axios';

// Mock axios for testing
jest.mock('axios');

describe('Fire Parser Contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockFireServices = [
    'London Fire Brigade', 'Greater Manchester Fire and Rescue Service',
    'West Midlands Fire Service', 'West Yorkshire Fire and Rescue Service',
    'Merseyside Fire and Rescue Service', 'South Yorkshire Fire and Rescue',
    'Tyne and Wear Fire and Rescue Service', 'Essex County Fire and Rescue Service',
    'Kent Fire and Rescue Service', 'Hampshire and Isle of Wight Fire and Rescue Service',
    'Devon & Somerset Fire and Rescue Service', 'Avon Fire & Rescue Service',
    'Cheshire Fire and Rescue Service', 'Lancashire Fire and Rescue Service',
    'Nottinghamshire Fire and Rescue Service', 'Derbyshire Fire & Rescue Service',
    'Leicestershire Fire and Rescue Service', 'Lincolnshire Fire and Rescue',
    'Northamptonshire Fire and Rescue Service', 'Warwickshire Fire and Rescue Service',
    'Staffordshire Fire and Rescue Service', 'West Mercia Fire Service',
    'Hereford & Worcester Fire and Rescue Service', 'Shropshire Fire and Rescue Service',
    'Cornwall Fire and Rescue Service', 'Dorset & Wiltshire Fire and Rescue Service',
    'East Sussex Fire and Rescue Service', 'West Sussex Fire & Rescue Service',
    'Surrey Fire and Rescue Service', 'Oxfordshire Fire and Rescue Service',
    'Buckinghamshire Fire and Rescue Service', 'Berkshire Fire and Rescue Service',
    'Cambridgeshire Fire and Rescue Service', 'Norfolk Fire and Rescue Service',
    'Suffolk Fire and Rescue Service', 'Hertfordshire Fire and Rescue Service',
    'Bedfordshire Fire and Rescue Service', 'North Yorkshire Fire and Rescue Service',
    'Durham and Darlington Fire and Rescue Service', 'Cleveland Fire Brigade',
    'Cumbria Fire and Rescue Service', 'Northumberland Fire and Rescue Service',
    'Humberside Fire and Rescue Service', 'South Wales Fire and Rescue Service',
    'Mid and West Wales Fire and Rescue Service', 'North Wales Fire and Rescue Service',
    'Scottish Fire and Rescue Service', 'Northern Ireland Fire and Rescue Service'
  ];

  const mockNFCCHTML = `
    <table class="fire-services">
      ${mockFireServices.map(service => `
        <tr>
          <td>${service}</td>
          <td>${service.replace(/Fire.*$/i, '').trim()}</td>
          <td>www.${service.toLowerCase().replace(/ /g, '').substring(0, 10)}.gov.uk</td>
        </tr>
      `).join('')}
    </table>
  `;

  describe('fetchAll()', () => {
    it('should return array of FireService objects from NFCC page', async () => {
      // GIVEN: NFCC fire services page is available
      (axios.get as jest.MockedFunction<typeof axios.get>).mockResolvedValue({ data: mockNFCCHTML });
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
      (axios.get as jest.MockedFunction<typeof axios.get>).mockResolvedValue({ data: mockNFCCHTML });
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
      (axios.get as jest.MockedFunction<typeof axios.get>).mockResolvedValue({ data: mockNFCCHTML });
      const parser = new FireParser();
      
      // WHEN: Fetching all services
      const services = await parser.fetchAll();
      
      // THEN: Should classify authority types
      const authorityTypes = new Set(services.map(s => s.authorityType));
      expect(authorityTypes.size).toBeGreaterThan(1); // Multiple types
      
      // Check for specific known services
      const serviceNames = services.map(s => s.name.toLowerCase());
      
      // London should be metropolitan
      const london = services.find(s => s.name.toLowerCase().includes('london'));
      if (london) {
        expect(london.authorityType).toBe('metropolitan');
      }
    });
  });

  describe('parseHTML()', () => {
    it('should extract fire service data from table format', () => {
      // GIVEN: HTML table structure
      const html = `
        <div class="content">
          <h1>Fire and Rescue Services</h1>
          <p>This page contains information about fire and rescue services across the UK.</p>
          <table class="fire-services">
            <tr>
              <td>Greater Manchester Fire and Rescue Service</td>
              <td>Greater Manchester</td>
              <td>www.manchesterfire.gov.uk</td>
            </tr>
            <tr>
              <td>Devon & Somerset Fire and Rescue Service</td>
              <td>Devon and Somerset</td>
              <td>www.dsfire.gov.uk</td>
            </tr>
          </table>
        </div>
      `;
      
      // WHEN: Parsing the HTML
      const parser = new FireParser();
      const services = parser.parseHTML(html);
      
      // THEN: Should extract service information
      expect(services).toHaveLength(2);
      expect(services[0]).toMatchObject({
        name: 'Greater Manchester Fire and Rescue Service',
        serviceType: 'fire',
        region: 'Greater Manchester',
        website: 'https://www.manchesterfire.gov.uk'
      });
    });

    it('should extract fire service data from list format', () => {
      // GIVEN: HTML list structure
      const html = `
        <div class="content">
          <h1>Fire Services Directory</h1>
          <p>Find information about fire and rescue services in your area. This directory includes contact details and coverage areas.</p>
          <div class="services-list">
            <article>
              <h3>West Yorkshire Fire and Rescue Authority</h3>
              <p>Region: West Yorkshire</p>
              <p>Website: <a href="https://www.westyorksfire.gov.uk">Visit</a></p>
            </article>
            <article>
              <h3>Scottish Fire and Rescue Service</h3>
              <p>Region: Scotland</p>
            </article>
          </div>
        </div>
      `;
      
      // WHEN: Parsing the HTML
      const parser = new FireParser();
      const services = parser.parseHTML(html);
      
      // THEN: Should extract service information
      expect(services).toHaveLength(2);
      expect(services[0].name).toBe('West Yorkshire Fire and Rescue Authority');
      expect(services[1].name).toBe('Scottish Fire and Rescue Service');
      expect(services[1].region).toBeTruthy(); // Region should be present
    });

    it('should fail fast on unexpected HTML structure', () => {
      // GIVEN: HTML with missing expected elements
      const html = '<div>No fire services found</div>';
      
      // WHEN: Parsing invalid HTML
      const parser = new FireParser();
      
      // THEN: Should throw error
      expect(() => parser.parseHTML(html))
        .toThrow(/HTML structure changed/);
    });
  });

  describe('Data Quality', () => {
    it('should extract coverage areas when available', async () => {
      // GIVEN: Services with coverage information
      (axios.get as jest.MockedFunction<typeof axios.get>).mockResolvedValue({ data: mockNFCCHTML });
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
      (axios.get as jest.MockedFunction<typeof axios.get>).mockResolvedValue({ data: mockNFCCHTML });
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
      // THEN: Should throw with descriptive error
      await expect(parser.fetchAll())
        .rejects.toThrow(/Failed to fetch fire services/);
    });

    it('should validate minimum record count', async () => {
      // GIVEN: Parser returns too few records
      const mockEmptyHTML = '<table class="fire-services"></table>';
      (axios.get as jest.MockedFunction<typeof axios.get>).mockResolvedValue({ data: mockEmptyHTML });
      const parser = new FireParser();
      
      // WHEN: Fetching services
      // THEN: Should throw validation error
      await expect(parser.fetchAll())
        .rejects.toThrow();
    });

    it('should handle missing optional fields', () => {
      // GIVEN: HTML with minimal information
      const html = `
        <div class="content">
          <h1>Fire Services</h1>
          <p>Emergency fire and rescue services are available throughout the region. Contact your local service for more information.</p>
          <ul>
            <li>Northumberland Fire and Rescue Service</li>
            <li>Durham and Darlington Fire and Rescue Service</li>
          </ul>
        </div>
      `;
      
      // WHEN: Parsing minimal HTML
      const parser = new FireParser();
      const services = parser.parseHTML(html);
      
      // THEN: Should still create valid objects
      expect(services).toHaveLength(2);
      services.forEach(service => {
        expect(service.name).toBeDefined();
        expect(service.serviceType).toBe('fire');
        expect(service.website).toBeUndefined(); // Optional
        expect(service.stationCount).toBeUndefined(); // Optional
      });
    });
  });
});

