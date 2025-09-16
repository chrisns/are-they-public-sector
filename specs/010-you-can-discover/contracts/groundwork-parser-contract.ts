/**
 * Contract test for Groundwork Trusts Parser
 * This test MUST be written before implementation (TDD)
 */

import { GroundworkParser } from '../../src/services/groundwork-parser';
import type { GroundworkTrustRaw } from '../../src/models/groundwork-trust';

describe('GroundworkParser Contract', () => {
  let parser: GroundworkParser;

  beforeEach(() => {
    parser = new GroundworkParser();
  });

  describe('parse()', () => {
    it('should fetch and parse Groundwork Trusts from website', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(15); // At least 15 trusts expected
    });

    it('should extract trust names from dropdown options', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      const firstTrust = result[0];
      expect(firstTrust.name).toBeDefined();
      expect(typeof firstTrust.name).toBe('string');
      expect(firstTrust.name.length).toBeGreaterThan(0);
      expect(firstTrust.name).toContain('Groundwork');
    });

    it('should include known Groundwork Trusts', async () => {
      // Act
      const result = await parser.parse();
      const trustNames = result.map(t => t.name);

      // Assert - Check for some known trusts
      expect(trustNames).toContainEqual(expect.stringContaining('Yorkshire'));
      expect(trustNames).toContainEqual(expect.stringContaining('London'));
      expect(trustNames).toContainEqual(expect.stringContaining('Wales'));
    });

    it('should handle website unavailable with retry', async () => {
      // Arrange - Mock network failure
      jest.spyOn(parser as any, 'fetchHTML').mockRejectedValue(
        new Error('Network error')
      );

      // Act & Assert
      await expect(parser.parse()).rejects.toThrow('Failed to fetch Groundwork Trusts');
    });

    it('should handle HTML structure change', async () => {
      // Arrange - Mock unexpected HTML
      jest.spyOn(parser as any, 'fetchHTML').mockResolvedValue(
        '<html><body>No dropdown here</body></html>'
      );

      // Act & Assert
      await expect(parser.parse()).rejects.toThrow('Failed to extract');
    });
  });

  describe('fetchHTML()', () => {
    it('should fetch HTML from Groundwork website', async () => {
      // Act
      const html = await (parser as any).fetchHTML();

      // Assert
      expect(html).toBeDefined();
      expect(html).toContain('<!DOCTYPE');
      expect(html).toContain('gnm_button'); // Class for dropdown
    });
  });

  describe('parseHTML()', () => {
    it('should extract trust names from select options', () => {
      // Arrange
      const mockHtml = `
        <select class="gnm_button">
          <option value="">Select a region</option>
          <option>Groundwork Yorkshire</option>
          <option>Groundwork London</option>
        </select>
      `;

      // Act
      const result = (parser as any).parseHTML(mockHtml);

      // Assert
      expect(result).toHaveLength(2); // Excludes placeholder
      expect(result[0].name).toBe('Groundwork Yorkshire');
      expect(result[1].name).toBe('Groundwork London');
    });

    it('should filter out placeholder options', () => {
      // Arrange
      const mockHtml = `
        <select class="gnm_button">
          <option value="">Select a region</option>
          <option value="">Choose your area</option>
          <option>Groundwork Test</option>
        </select>
      `;

      // Act
      const result = (parser as any).parseHTML(mockHtml);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Groundwork Test');
    });
  });
});