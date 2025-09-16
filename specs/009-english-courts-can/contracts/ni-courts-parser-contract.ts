/**
 * Contract tests for Northern Ireland Courts Parser
 * These tests define the expected behavior and must fail initially (TDD)
 */

import { NICourtsParser } from '../../../src/services/ni-courts-parser';
import type { Court } from '../../../src/models/court';

describe('NICourtsParser Contract', () => {
  let parser: NICourtsParser;

  beforeEach(() => {
    parser = new NICourtsParser();
  });

  describe('parse()', () => {
    it('should fetch and parse NI courts from the webpage', async () => {
      // Arrange
      const expectedUrl = 'https://www.nidirect.gov.uk/contacts/northern-ireland-courts-and-tribunals-service';

      // Act
      const result = await parser.parse();

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(10); // Expect at least 10 NI courts
      expect(result.length).toBeLessThan(50); // But not more than 50
    });

    it('should extract court names from HTML list', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      const firstCourt = result[0];
      expect(firstCourt.name).toBeDefined();
      expect(typeof firstCourt.name).toBe('string');
      expect(firstCourt.name.length).toBeGreaterThan(0);
    });

    it('should extract node IDs from href attributes', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      const courtsWithNodeIds = result.filter(c => c.nodeId);
      expect(courtsWithNodeIds.length).toBeGreaterThan(0);

      const court = courtsWithNodeIds[0];
      expect(court.nodeId).toMatch(/^\d+$/); // Should be numeric
    });

    it('should include known NI courts', async () => {
      // Act
      const result = await parser.parse();
      const courtNames = result.map(c => c.name);

      // Assert - Check for some known NI courts
      expect(courtNames).toContain('Antrim');
      expect(courtNames).toContain('Belfast');
      expect(courtNames).toContain('Londonderry');
    });

    it('should handle HTML parsing correctly', async () => {
      // Arrange
      const mockHtml = `
        <html>
          <body>
            <ul>
              <li><a href="/node/123">Test Court 1</a></li>
              <li><a href="/node/456">Test Court 2</a></li>
            </ul>
          </body>
        </html>
      `;
      jest.spyOn(parser as any, 'fetchHTML').mockResolvedValue(mockHtml);

      // Act
      const result = await parser.parse();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Test Court 1');
      expect(result[0].nodeId).toBe('123');
      expect(result[1].name).toBe('Test Court 2');
      expect(result[1].nodeId).toBe('456');
    });

    it('should fail fast on network error', async () => {
      // Arrange
      jest.spyOn(parser as any, 'fetchHTML').mockRejectedValue(
        new Error('Network error')
      );

      // Act & Assert
      await expect(parser.parse()).rejects.toThrow('Network error');
    });

    it('should fail fast on invalid HTML structure', async () => {
      // Arrange
      const invalidHtml = '<html><body>No courts here</body></html>';
      jest.spyOn(parser as any, 'fetchHTML').mockResolvedValue(invalidHtml);

      // Act & Assert
      await expect(parser.parse()).rejects.toThrow(/No courts found/i);
    });

    it('should handle courts without node IDs', async () => {
      // Arrange
      const mockHtml = `
        <ul>
          <li><a href="/node/123">Court With ID</a></li>
          <li>Court Without Link</li>
        </ul>
      `;
      jest.spyOn(parser as any, 'fetchHTML').mockResolvedValue(mockHtml);

      // Act
      const result = await parser.parse();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].nodeId).toBe('123');
      expect(result[1].nodeId).toBeUndefined();
    });
  });

  describe('mapping to Court model', () => {
    it('should map raw NI court data to Court entities', async () => {
      // Arrange
      const mapper = parser.getMapper();
      const rawCourt = {
        name: 'Belfast',
        nodeId: '123',
        address: 'Laganside Courts, Oxford Street, Belfast',
        telephone: '028 9032 8594'
      };

      // Act
      const court = mapper.map(rawCourt);

      // Assert
      expect(court.name).toBe('Belfast');
      expect(court.identifier).toBe('123');
      expect(court.jurisdiction).toBe('Northern Ireland');
      expect(court.status).toBe('active'); // Assume active by default
      expect(court.location).toBeDefined();
      expect(court.location.fullAddress).toContain('Oxford Street');
      expect(court.contact).toBeDefined();
      expect(court.contact.telephone).toBe('028 9032 8594');
    });

    it('should handle minimal data gracefully', async () => {
      // Arrange
      const mapper = parser.getMapper();
      const rawCourt = {
        name: 'Test Court'
      };

      // Act
      const court = mapper.map(rawCourt);

      // Assert
      expect(court.name).toBe('Test Court');
      expect(court.jurisdiction).toBe('Northern Ireland');
      expect(court.status).toBe('active');
      expect(court.identifier).toBeUndefined();
      expect(court.location).toBeUndefined();
      expect(court.contact).toBeUndefined();
    });
  });
});