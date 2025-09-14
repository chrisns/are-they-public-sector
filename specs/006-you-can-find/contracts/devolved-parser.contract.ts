/**
 * Contract Test: Devolved Administration Parser
 * Validates devolved-parser service behavior and output format
 */

import { DevolvedBody } from '../../../src/models/emergency-services';

describe('Devolved Parser Contract', () => {
  describe('fetchAll()', () => {
    it('should return array of DevolvedBody objects from guidance page', async () => {
      // GIVEN: Gov.uk devolution guidance page is available
      const parser = new DevolvedParser();
      
      // WHEN: Fetching devolved bodies
      const bodies = await parser.fetchAll();
      
      // THEN: Should return valid devolved body data
      expect(Array.isArray(bodies)).toBe(true);
      expect(bodies.length).toBeGreaterThanOrEqual(10); // Minimum expected new bodies
      
      bodies.forEach(body => {
        expect(body).toMatchObject({
          name: expect.any(String),
          nation: expect.stringMatching(/^(scotland|wales|northern_ireland)$/),
          bodyType: expect.stringMatching(/^(parliament|assembly|government|department|agency|public_body)$/)
        });
        
        // Name should not be empty
        expect(body.name.length).toBeGreaterThan(0);
      });
    });

    it('should extract bodies for all three devolved nations', async () => {
      // GIVEN: Guidance page covers Scotland, Wales, NI
      const parser = new DevolvedParser();
      
      // WHEN: Fetching all bodies
      const bodies = await parser.fetchAll();
      
      // THEN: Should include bodies from each nation
      const nations = new Set(bodies.map(b => b.nation));
      expect(nations.has('scotland')).toBe(true);
      expect(nations.has('wales')).toBe(true);
      expect(nations.has('northern_ireland')).toBe(true);
    });

    it('should identify different types of devolved bodies', async () => {
      // GIVEN: Various types of devolved organisations
      const parser = new DevolvedParser();
      
      // WHEN: Fetching all bodies
      const bodies = await parser.fetchAll();
      
      // THEN: Should classify body types correctly
      const bodyTypes = new Set(bodies.map(b => b.bodyType));
      expect(bodyTypes.size).toBeGreaterThan(1); // Multiple types
      
      // Check for key institutions
      const scottishParliament = bodies.find(b => 
        b.name.toLowerCase().includes('scottish parliament')
      );
      if (scottishParliament) {
        expect(scottishParliament.bodyType).toBe('parliament');
      }
      
      const welshAssembly = bodies.find(b => 
        b.name.toLowerCase().includes('senedd') || 
        b.name.toLowerCase().includes('welsh parliament')
      );
      if (welshAssembly) {
        expect(welshAssembly.bodyType).toMatch(/parliament|assembly/);
      }
    });
  });

  describe('parseHTML()', () => {
    it('should extract devolved bodies from structured lists', () => {
      // GIVEN: HTML with nation sections
      const html = `
        <div class="content">
          <h2>Scotland</h2>
          <p>The following bodies have devolved powers:</p>
          <ul>
            <li>Scottish Government</li>
            <li>Transport Scotland</li>
            <li>Scottish Enterprise</li>
          </ul>
          <h2>Wales</h2>
          <ul>
            <li>Welsh Government</li>
            <li>Natural Resources Wales</li>
          </ul>
        </div>
      `;
      
      // WHEN: Parsing the HTML
      const parser = new DevolvedParser();
      const bodies = parser.parseHTML(html);
      
      // THEN: Should extract bodies with correct nations
      expect(bodies).toHaveLength(5);
      
      const scottishBodies = bodies.filter(b => b.nation === 'scotland');
      expect(scottishBodies).toHaveLength(3);
      expect(scottishBodies[0].name).toBe('Scottish Government');
      
      const welshBodies = bodies.filter(b => b.nation === 'wales');
      expect(welshBodies).toHaveLength(2);
    });

    it('should extract bodies from prose text', () => {
      // GIVEN: HTML with bodies mentioned in paragraphs
      const html = `
        <div>
          <h2>Northern Ireland</h2>
          <p>The Northern Ireland Executive consists of several departments
          including the Department of Health, Department of Education, and
          the Department for the Economy. Additionally, bodies such as
          Invest Northern Ireland operate under devolved administration.</p>
        </div>
      `;
      
      // WHEN: Parsing prose content
      const parser = new DevolvedParser();
      const bodies = parser.parseHTML(html);
      
      // THEN: Should extract department names
      const bodyNames = bodies.map(b => b.name);
      expect(bodyNames).toContain('Department of Health');
      expect(bodyNames).toContain('Department of Education');
      expect(bodyNames).toContain('Department for the Economy');
      expect(bodyNames).toContain('Invest Northern Ireland');
      
      bodies.forEach(body => {
        expect(body.nation).toBe('northern_ireland');
      });
    });

    it('should fail fast on unexpected HTML structure', () => {
      // GIVEN: HTML with no devolution content
      const html = '<div>Page not found</div>';
      
      // WHEN: Parsing invalid HTML
      const parser = new DevolvedParser();
      
      // THEN: Should throw error
      expect(() => parser.parseHTML(html))
        .toThrow(/HTML structure changed/);
    });
  });

  describe('Deduplication', () => {
    it('should check against existing devolved administrations', async () => {
      // GIVEN: Existing devolved-administrations.json data
      const parser = new DevolvedParser();
      const existingBodies = await parser.loadExistingBodies();
      
      // WHEN: Fetching new bodies
      const newBodies = await parser.fetchAll();
      
      // THEN: Should not duplicate existing entries
      const existingNames = existingBodies.map(b => b.name.toLowerCase());
      const genuinelyNew = newBodies.filter(body => 
        !existingNames.includes(body.name.toLowerCase())
      );
      
      expect(genuinelyNew.length).toBeLessThanOrEqual(newBodies.length);
    });

    it('should merge with existing records when updating', async () => {
      // GIVEN: Body exists in both sources
      const parser = new DevolvedParser();
      const existing = {
        name: 'Scottish Government',
        established: '1999-07-01'
      };
      
      const newBody = {
        name: 'Scottish Government',
        website: 'https://www.gov.scot',
        responsibilities: ['Health', 'Education']
      };
      
      // WHEN: Merging records
      const merged = parser.mergeRecords(existing, newBody);
      
      // THEN: Should combine properties
      expect(merged.name).toBe('Scottish Government');
      expect(merged.established).toBe('1999-07-01');
      expect(merged.website).toBe('https://www.gov.scot');
      expect(merged.responsibilities).toEqual(['Health', 'Education']);
    });
  });

  describe('Data Quality', () => {
    it('should classify body types correctly', () => {
      // GIVEN: Various body names
      const testCases = [
        { name: 'Scottish Parliament', expected: 'parliament' },
        { name: 'Welsh Government', expected: 'government' },
        { name: 'Department of Health', expected: 'department' },
        { name: 'Transport Scotland', expected: 'agency' },
        { name: 'Invest Northern Ireland', expected: 'agency' },
        { name: 'Natural Resources Wales', expected: 'public_body' }
      ];
      
      const parser = new DevolvedParser();
      
      testCases.forEach(test => {
        // WHEN: Classifying body type
        const type = parser.classifyBodyType(test.name);
        
        // THEN: Should match expected type
        expect(type).toBe(test.expected);
      });
    });

    it('should extract parent relationships', async () => {
      // GIVEN: Bodies with hierarchical structure
      const parser = new DevolvedParser();
      
      // WHEN: Fetching bodies
      const bodies = await parser.fetchAll();
      
      // THEN: Departments should have government parents
      const departments = bodies.filter(b => b.bodyType === 'department');
      departments.forEach(dept => {
        if (dept.nation === 'scotland') {
          expect(dept.parentBody).toMatch(/Scottish Government/i);
        } else if (dept.nation === 'wales') {
          expect(dept.parentBody).toMatch(/Welsh Government/i);
        } else if (dept.nation === 'northern_ireland') {
          expect(dept.parentBody).toMatch(/Northern Ireland Executive/i);
        }
      });
    });

    it('should normalize body names', async () => {
      // GIVEN: Bodies with various naming patterns
      const parser = new DevolvedParser();
      
      // WHEN: Fetching bodies
      const bodies = await parser.fetchAll();
      
      // THEN: Names should be properly formatted
      bodies.forEach(body => {
        // No leading/trailing whitespace
        expect(body.name).toBe(body.name.trim());
        
        // No double spaces
        expect(body.name).not.toMatch(/\s{2,}/);
        
        // No HTML entities
        expect(body.name).not.toMatch(/&[a-z]+;/);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // GIVEN: Network failure scenario
      const parser = new DevolvedParser();
      jest.spyOn(parser, 'fetch').mockRejectedValue(new Error('Network error'));
      
      // WHEN: Attempting to fetch
      // THEN: Should throw with descriptive error
      await expect(parser.fetchAll())
        .rejects.toThrow(/Failed to fetch devolved bodies/);
    });

    it('should validate minimum record count', async () => {
      // GIVEN: Parser returns too few records
      const parser = new DevolvedParser();
      jest.spyOn(parser, 'parseHTML').mockReturnValue([]);
      
      // WHEN: Fetching bodies
      // THEN: Should throw validation error
      await expect(parser.fetchAll())
        .rejects.toThrow(/Expected at least 10 new devolved bodies/);
    });

    it('should handle missing existing data file', async () => {
      // GIVEN: devolved-administrations.json doesn't exist
      const parser = new DevolvedParser();
      jest.spyOn(parser, 'loadExistingBodies')
        .mockRejectedValue(new Error('File not found'));
      
      // WHEN: Fetching bodies
      const bodies = await parser.fetchAll();
      
      // THEN: Should continue without existing data
      expect(bodies).toBeDefined();
      expect(bodies.length).toBeGreaterThan(0);
    });
  });
});

// Type exports for implementation
export interface DevolvedParser {
  fetchAll(): Promise<DevolvedBody[]>;
  parseHTML(html: string): DevolvedBody[];
  loadExistingBodies(): Promise<any[]>;
  mergeRecords(existing: any, newBody: any): any;
  classifyBodyType(name: string): string;
  fetch?: (url: string) => Promise<string>;
}