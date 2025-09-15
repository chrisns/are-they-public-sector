/**
 * Contract tests for CollegesParser service
 * These tests define the expected behavior and must be written BEFORE implementation
 */

import { CollegesParser } from '../../../src/services/colleges-parser';
import { College, CollegesResult } from '../../../src/models/college';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

describe('CollegesParser Contract', () => {
  let parser: CollegesParser;

  beforeEach(() => {
    parser = new CollegesParser();
  });

  describe('Webpage Fetching', () => {
    it('should fetch the AoC colleges webpage', async () => {
      const result = await parser.fetchWebpage();

      expect(result).toBeDefined();
      expect(result.html).toContain('colleges');
      expect(result.url).toBe('https://www.aoc.co.uk/about/list-of-colleges-in-the-uk');
    });

    it('should fail-fast if webpage is unavailable', async () => {
      // Mock network failure
      jest.spyOn(axios, 'get').mockRejectedValue(new Error('Network error'));

      await expect(parser.fetchWebpage()).rejects.toThrow('Failed to fetch AoC webpage');
    });
  });

  describe('PDF Link Extraction', () => {
    it('should extract PDF links for Scotland, Wales, and Northern Ireland', async () => {
      const mockHtml = fs.readFileSync(
        path.join(__dirname, '../mocks/aoc-webpage.html'),
        'utf-8'
      );

      const links = await parser.extractPdfLinks(mockHtml);

      expect(links).toHaveProperty('scotland');
      expect(links).toHaveProperty('wales');
      expect(links).toHaveProperty('northernIreland');
      expect(links.scotland).toMatch(/\.pdf$/);
      expect(links.wales).toMatch(/\.pdf$/);
      expect(links.northernIreland).toMatch(/\.pdf$/);
    });

    it('should fail-fast if PDF links cannot be found', async () => {
      const invalidHtml = '<html><body>No PDFs here</body></html>';

      await expect(parser.extractPdfLinks(invalidHtml)).rejects.toThrow(
        'Failed to extract PDF links from webpage'
      );
    });
  });

  describe('College Count Extraction', () => {
    it('should extract college counts from webpage', async () => {
      const mockHtml = fs.readFileSync(
        path.join(__dirname, '../mocks/aoc-webpage.html'),
        'utf-8'
      );

      const counts = await parser.extractCounts(mockHtml);

      expect(counts).toHaveProperty('scotland');
      expect(counts).toHaveProperty('wales');
      expect(counts).toHaveProperty('northernIreland');
      expect(counts.scotland).toBeGreaterThan(0);
      expect(counts.wales).toBeGreaterThan(0);
      expect(counts.northernIreland).toBeGreaterThan(0);
    });
  });

  describe('PDF Parsing', () => {
    it('should parse college names from Scotland PDF', async () => {
      const mockPdf = fs.readFileSync(
        path.join(__dirname, '../mocks/scotland-colleges.pdf')
      );

      const colleges = await parser.parsePdf(mockPdf, 'Scotland');

      expect(colleges).toBeInstanceOf(Array);
      expect(colleges.length).toBeGreaterThan(0);
      expect(colleges[0]).toHaveProperty('name');
      expect(colleges[0]).toHaveProperty('region', 'Scotland');
    });

    it('should parse college names from Wales PDF', async () => {
      const mockPdf = fs.readFileSync(
        path.join(__dirname, '../mocks/wales-colleges.pdf')
      );

      const colleges = await parser.parsePdf(mockPdf, 'Wales');

      expect(colleges).toBeInstanceOf(Array);
      expect(colleges.length).toBeGreaterThan(0);
      expect(colleges[0].region).toBe('Wales');
    });

    it('should parse college names from Northern Ireland PDF', async () => {
      const mockPdf = fs.readFileSync(
        path.join(__dirname, '../mocks/ni-colleges.pdf')
      );

      const colleges = await parser.parsePdf(mockPdf, 'Northern Ireland');

      expect(colleges).toBeInstanceOf(Array);
      expect(colleges.length).toBeGreaterThan(0);
      expect(colleges[0].region).toBe('Northern Ireland');
    });

    it('should fail-fast if PDF format is invalid', async () => {
      const invalidPdf = Buffer.from('Not a PDF');

      await expect(parser.parsePdf(invalidPdf, 'Scotland')).rejects.toThrow(
        'Failed to parse PDF'
      );
    });
  });

  describe('Count Validation', () => {
    it('should validate parsed counts match webpage counts', async () => {
      const webpageCounts = { scotland: 26, wales: 13, northernIreland: 6 };
      const parsedCounts = { scotland: 26, wales: 13, northernIreland: 6 };

      const result = parser.validateCounts(webpageCounts, parsedCounts);

      expect(result.scotlandMatch).toBe(true);
      expect(result.walesMatch).toBe(true);
      expect(result.northernIrelandMatch).toBe(true);
    });

    it('should fail validation if counts do not match', async () => {
      const webpageCounts = { scotland: 26, wales: 13, northernIreland: 6 };
      const parsedCounts = { scotland: 25, wales: 13, northernIreland: 6 };

      expect(() => parser.validateCounts(webpageCounts, parsedCounts)).toThrow(
        'College count mismatch for Scotland: expected 26, got 25'
      );
    });
  });

  describe('Full Aggregation', () => {
    it('should successfully aggregate all colleges', async () => {
      const result: CollegesResult = await parser.aggregate();

      expect(result).toHaveProperty('colleges');
      expect(result).toHaveProperty('metadata');
      expect(result.colleges).toBeInstanceOf(Array);
      expect(result.colleges.length).toBeGreaterThan(0);

      // Check metadata
      expect(result.metadata.source).toBe('aoc.co.uk');
      expect(result.metadata.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.metadata.counts.total).toBe(result.colleges.length);

      // Check validation passed
      expect(result.metadata.validation.scotlandMatch).toBe(true);
      expect(result.metadata.validation.walesMatch).toBe(true);
      expect(result.metadata.validation.northernIrelandMatch).toBe(true);

      // Check all colleges have required fields
      result.colleges.forEach(college => {
        expect(college.name).toBeTruthy();
        expect(['Scotland', 'Wales', 'Northern Ireland']).toContain(college.region);
        expect(college.source).toMatch(/\.pdf$/);
        expect(college.fetchedAt).toBeTruthy();
      });
    });

    it('should fail-fast on any error during aggregation', async () => {
      // Mock webpage fetch failure
      jest.spyOn(axios, 'get').mockRejectedValue(new Error('Network error'));

      await expect(parser.aggregate()).rejects.toThrow();
    });
  });
});

describe('CollegesMapper Contract', () => {
  it('should map College to Organisation', () => {
    const college: College = {
      name: 'Test College',
      region: 'Scotland',
      source: 'https://example.com/scotland.pdf',
      fetchedAt: '2025-01-15T10:00:00Z'
    };

    const mapper = new CollegesMapper();
    const org = mapper.mapToOrganisation(college);

    expect(org.name).toBe('Test College');
    expect(org.type).toBe('college');
    expect(org.subType).toBe('further-education');
    expect(org.metadata.region).toBe('Scotland');
    expect(org.metadata.country).toBe('Scotland');
  });
});