/**
 * Contract Test: Fire and Rescue Services Parser
 * Validates fire-parser service behavior and output format
 */

import { FireService } from '../../../src/models/emergency-services';

describe('Fire Parser Contract', () => {
  describe('fetchAll()', () => {
    it('should return array of FireService objects from NFCC page', async () => {
      // GIVEN: NFCC fire services page is available
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
        website: 'www.manchesterfire.gov.uk'
      });
    });

    it('should extract fire service data from list format', () => {
      // GIVEN: HTML list structure
      const html = `
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
      `;
      
      // WHEN: Parsing the HTML
      const parser = new FireParser();
      const services = parser.parseHTML(html);
      
      // THEN: Should extract service information
      expect(services).toHaveLength(2);
      expect(services[0].name).toBe('West Yorkshire Fire and Rescue Authority');
      expect(services[1].region).toBe('Scotland');
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
        { name: 'West Yorkshire Fire and Rescue Authority', expected: 'combined_authority' }
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
      const parser = new FireParser();
      jest.spyOn(parser, 'fetch').mockRejectedValue(new Error('Network error'));
      
      // WHEN: Attempting to fetch
      // THEN: Should throw with descriptive error
      await expect(parser.fetchAll())
        .rejects.toThrow(/Failed to fetch fire services/);
    });

    it('should validate minimum record count', async () => {
      // GIVEN: Parser returns too few records
      const parser = new FireParser();
      jest.spyOn(parser, 'parseHTML').mockReturnValue([]);
      
      // WHEN: Fetching services
      // THEN: Should throw validation error
      await expect(parser.fetchAll())
        .rejects.toThrow(/Expected at least 45 fire services/);
    });

    it('should handle missing optional fields', () => {
      // GIVEN: HTML with minimal information
      const html = `
        <ul>
          <li>Northumberland Fire and Rescue Service</li>
          <li>Durham and Darlington Fire and Rescue Service</li>
        </ul>
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

// Type exports for implementation
export interface FireParser {
  fetchAll(): Promise<FireService[]>;
  parseHTML(html: string): FireService[];
  classifyAuthorityType(name: string): string;
  fetch?: (url: string) => Promise<string>;
}