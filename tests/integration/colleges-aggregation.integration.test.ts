/**
 * Integration test for UK Colleges aggregation
 */

import { CollegesParser } from '../../src/services/colleges-parser.js';
import { CollegesMapper } from '../../src/services/mappers/colleges-mapper.js';
import { Organisation } from '../../src/models/organisation.js';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Skip these tests in CI/local as they require network access
const describeIfNetwork = process.env.TEST_NETWORK ? describe : describe.skip;

describeIfNetwork('Colleges Aggregation Integration', () => {
  let parser: CollegesParser;
  let mapper: CollegesMapper;

  beforeEach(() => {
    parser = new CollegesParser();
    mapper = new CollegesMapper();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete aggregation flow', () => {
    it('should fetch, parse, and map all UK colleges', async () => {
      // Mock the webpage HTML
      const mockHtml = fs.readFileSync(
        path.join(process.cwd(), 'tests/mocks/aoc-webpage.html'),
        'utf-8'
      );

      // Mock axios for webpage and PDF fetching
      jest.spyOn(axios, 'get').mockImplementation((url: string) => {
        if (url.includes('aoc.co.uk') && !url.includes('.pdf')) {
          return Promise.resolve({
            data: mockHtml,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {}
          });
        }
        // Mock PDF downloads
        if (url.includes('scotland')) {
          return Promise.resolve({
            data: Buffer.from(fs.readFileSync(
              path.join(process.cwd(), 'tests/mocks/scotland-colleges.txt'),
              'utf-8'
            )),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {}
          });
        }
        if (url.includes('wales')) {
          return Promise.resolve({
            data: Buffer.from(fs.readFileSync(
              path.join(process.cwd(), 'tests/mocks/wales-colleges.txt'),
              'utf-8'
            )),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {}
          });
        }
        if (url.includes('ni') || url.includes('northern')) {
          return Promise.resolve({
            data: Buffer.from(fs.readFileSync(
              path.join(process.cwd(), 'tests/mocks/ni-colleges.txt'),
              'utf-8'
            )),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {}
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      // Execute full aggregation
      const result = await parser.aggregate();

      // Verify aggregation results
      expect(result.colleges).toHaveLength(43); // 24 + 13 + 6
      expect(result.metadata.counts.scotland).toBe(24);
      expect(result.metadata.counts.wales).toBe(13);
      expect(result.metadata.counts.northernIreland).toBe(6);
      expect(result.metadata.counts.total).toBe(43);

      // Map to organisations
      const organisations: Organisation[] = result.colleges.map(college =>
        mapper.mapToOrganisation(college)
      );

      // Verify mapping
      expect(organisations).toHaveLength(43);

      // Check Scotland colleges
      const scotlandOrgs = organisations.filter(org =>
        org.location?.region === 'Scotland'
      );
      expect(scotlandOrgs).toHaveLength(24);
      expect(scotlandOrgs[0].type).toBe('educational_institution');
      expect(scotlandOrgs[0].classification).toBe('Further Education College');

      // Check Wales colleges
      const walesOrgs = organisations.filter(org =>
        org.location?.region === 'Wales'
      );
      expect(walesOrgs).toHaveLength(13);

      // Check Northern Ireland colleges
      const niOrgs = organisations.filter(org =>
        org.location?.region === 'Northern Ireland'
      );
      expect(niOrgs).toHaveLength(6);

      // Verify all organisations have required fields
      organisations.forEach(org => {
        expect(org.id).toBeTruthy();
        expect(org.name).toBeTruthy();
        expect(org.type).toBe('educational_institution');
        expect(org.classification).toBe('Further Education College');
        expect(org.location?.region).toBeTruthy();
        expect(org.sources[0]?.url).toMatch(/\.pdf$/);
        expect(org.lastUpdated).toBeTruthy();
      });
    });

    it('should handle network failures gracefully', async () => {
      // Mock network failure
      jest.spyOn(axios, 'get').mockRejectedValue(new Error('Network timeout'));

      // Expect aggregation to fail fast
      await expect(parser.aggregate()).rejects.toThrow('Failed to fetch AoC webpage');
    });

    it('should validate counts and fail on mismatch', async () => {
      const mockHtml = fs.readFileSync(
        path.join(process.cwd(), 'tests/mocks/aoc-webpage.html'),
        'utf-8'
      );

      // Mock with incorrect college count
      jest.spyOn(axios, 'get').mockImplementation((url: string) => {
        if (url.includes('aoc.co.uk') && !url.includes('.pdf')) {
          return Promise.resolve({
            data: mockHtml,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {}
          });
        }
        if (url.includes('scotland')) {
          // Return fewer colleges than expected
          return Promise.resolve({
            data: Buffer.from('Scotland Colleges\n\n1. Aberdeen College\n2. Ayrshire College'),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {}
          });
        }
        if (url.includes('wales')) {
          return Promise.resolve({
            data: Buffer.from(fs.readFileSync(
              path.join(process.cwd(), 'tests/mocks/wales-colleges.txt'),
              'utf-8'
            )),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {}
          });
        }
        if (url.includes('ni') || url.includes('northern')) {
          return Promise.resolve({
            data: Buffer.from(fs.readFileSync(
              path.join(process.cwd(), 'tests/mocks/ni-colleges.txt'),
              'utf-8'
            )),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {}
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      // Expect validation to fail
      await expect(parser.aggregate()).rejects.toThrow('College count mismatch');
    });
  });

  describe('Performance requirements', () => {
    it('should complete aggregation within 30 seconds', async () => {
      const mockHtml = fs.readFileSync(
        path.join(process.cwd(), 'tests/mocks/aoc-webpage.html'),
        'utf-8'
      );

      // Mock fast responses
      jest.spyOn(axios, 'get').mockImplementation((url: string) => {
        if (url.includes('aoc.co.uk') && !url.includes('.pdf')) {
          return Promise.resolve({
            data: mockHtml,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {}
          });
        }
        // Return mock PDF data for PDF URLs
        if (url.includes('scotland')) {
          return Promise.resolve({
            data: Buffer.from(fs.readFileSync(
              path.join(process.cwd(), 'tests/mocks/scotland-colleges.txt'),
              'utf-8'
            )),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {}
          });
        }
        if (url.includes('wales')) {
          return Promise.resolve({
            data: Buffer.from(fs.readFileSync(
              path.join(process.cwd(), 'tests/mocks/wales-colleges.txt'),
              'utf-8'
            )),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {}
          });
        }
        if (url.includes('ni') || url.includes('northern')) {
          return Promise.resolve({
            data: Buffer.from(fs.readFileSync(
              path.join(process.cwd(), 'tests/mocks/ni-colleges.txt'),
              'utf-8'
            )),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {}
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const startTime = Date.now();
      await parser.aggregate();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(30000); // 30 seconds
    });
  });
});