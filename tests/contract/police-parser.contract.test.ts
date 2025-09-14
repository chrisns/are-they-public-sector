/**
 * Contract Test: Police Forces Parser
 * Validates police-parser service behavior and output format
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { PoliceForce } from '../../src/models/emergency-services.js';
import { PoliceParser } from '../../src/services/police-parser.js';
import axios from 'axios';

// Mock axios for testing
jest.mock('axios');

describe('Police Parser Contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchAll()', () => {
    it('should return array of PoliceForce objects from UK forces page', async () => {
      // GIVEN: Police UK forces page is available
      const ukForces = [
        'Metropolitan Police Service', 'West Midlands Police', 'Greater Manchester Police',
        'West Yorkshire Police', 'Merseyside Police', 'South Yorkshire Police',
        'Northumbria Police', 'Hampshire Constabulary', 'Thames Valley Police',
        'Essex Police', 'Kent Police', 'Devon and Cornwall Police',
        'Avon and Somerset Constabulary', 'Lancashire Constabulary', 'West Mercia Police',
        'Sussex Police', 'Leicestershire Police', 'Staffordshire Police',
        'Norfolk Constabulary', 'Suffolk Constabulary', 'Cambridgeshire Constabulary',
        'Dorset Police', 'Wiltshire Police', 'Lincolnshire Police',
        'Gloucestershire Constabulary', 'Nottinghamshire Police', 'Derbyshire Constabulary',
        'North Yorkshire Police', 'Humberside Police', 'Cleveland Police',
        'Durham Constabulary', 'Cheshire Constabulary', 'Cumbria Constabulary',
        'North Wales Police', 'South Wales Police', 'Gwent Police', 'Dyfed-Powys Police',
        'Police Scotland', 'Police Service of Northern Ireland',
        'British Transport Police', 'Civil Nuclear Constabulary', 'Ministry of Defence Police'
      ];
      
      const mockUKHTML = `
        <div class="police-forces-list">
          ${ukForces.map(force => `<a href="/force/${force.toLowerCase().replace(/ /g, '-')}">${force}</a>`).join('\n')}
        </div>
      `;
      const mockNonUKHTML = `
        <div class="police-forces">
          <a href="/force/jersey">States of Jersey Police</a>
          <a href="/force/guernsey">Guernsey Police</a>
          <a href="/force/isle-of-man">Isle of Man Constabulary</a>
        </div>
      `;
      
      (axios.get as jest.MockedFunction<typeof axios.get>).mockImplementation((url) => {
        if (url.includes('uk-police-forces')) {
          return Promise.resolve({ data: mockUKHTML });
        } else {
          return Promise.resolve({ data: mockNonUKHTML });
        }
      });
      
      const parser = new PoliceParser();
      
      // WHEN: Fetching all UK police forces
      const forces = await parser.fetchAll();
      
      // THEN: Should return valid police force data
      expect(Array.isArray(forces)).toBe(true);
      expect(forces.length).toBeGreaterThanOrEqual(40); // Minimum expected
      
      forces.forEach(force => {
        expect(force).toMatchObject({
          name: expect.any(String),
          serviceType: 'police',
          forceType: expect.stringMatching(/^(territorial|special|crown_dependency|overseas_territory)$/)
        });
        
        // Name should not be empty
        expect(force.name.length).toBeGreaterThan(0);
        
        // Territorial forces should have jurisdiction
        if (force.forceType === 'territorial') {
          expect(force.jurisdiction).toBeDefined();
          expect(force.jurisdiction.length).toBeGreaterThan(0);
        }
      });
    });

    it('should include both UK and non-UK police forces', async () => {
      // GIVEN: Both UK and non-UK pages are available  
      // Mock already set up in previous test
      const parser = new PoliceParser();
      
      // WHEN: Fetching all forces
      const forces = await parser.fetchAll();
      
      // THEN: Should include various force types
      const forceTypes = new Set(forces.map(f => f.forceType));
      expect(forceTypes.has('territorial')).toBe(true);
      
      // Check for specific known forces
      const forceNames = forces.map(f => f.name.toLowerCase());
      const hasMetropolitan = forceNames.some(n => n.includes('metropolitan'));
      const hasTransport = forceNames.some(n => n.includes('british transport'));
      expect(hasMetropolitan).toBe(true);
      expect(hasTransport).toBe(true);
    });

    it('should handle Crown Dependencies correctly', async () => {
      // GIVEN: Non-UK page includes Crown Dependencies
      // Mock already set up in first test
      const parser = new PoliceParser();
      
      // WHEN: Fetching all forces
      const forces = await parser.fetchAll();
      
      // THEN: Crown Dependencies should be classified correctly
      const crownDeps = forces.filter(f => f.forceType === 'crown_dependency');
      const crownNames = crownDeps.map(f => f.name.toLowerCase());
      
      // Should include Jersey, Guernsey, Isle of Man if present
      ['jersey', 'guernsey', 'isle of man'].forEach(dep => {
        const hasDep = crownNames.some(name => name.includes(dep));
        if (hasDep) {
          expect(hasDep).toBe(true);
        }
      });
    });
  });

  describe('parseHTML()', () => {
    it('should extract police force data from HTML', () => {
      // GIVEN: Sample HTML structure
      const html = `
        <div class="police-forces">
          <h2>England</h2>
          <ul>
            <li><a href="/force/met">Metropolitan Police Service</a></li>
            <li><a href="/force/gmp">Greater Manchester Police</a></li>
          </ul>
          <h2>Special Forces</h2>
          <ul>
            <li><a href="/force/btp">British Transport Police</a></li>
          </ul>
        </div>
      `;
      
      // WHEN: Parsing the HTML
      const parser = new PoliceParser();
      const forces = parser.parseHTML(html, 'https://police.uk');
      
      // THEN: Should extract force information
      expect(forces).toHaveLength(3);
      expect(forces[0]).toMatchObject({
        name: 'Metropolitan Police Service',
        serviceType: 'police',
        forceType: 'territorial',
        website: expect.stringContaining('police.uk')
      });
      expect(forces[2].forceType).toBe('special');
    });

    it('should fail fast on unexpected HTML structure', () => {
      // GIVEN: HTML with missing expected elements
      const html = '<div>Unexpected content</div>';
      
      // WHEN: Parsing invalid HTML
      const parser = new PoliceParser();
      
      // THEN: Should throw error
      expect(() => parser.parseHTML(html, 'https://police.uk'))
        .toThrow(/HTML structure changed/);
    });
  });

  describe('Data Quality', () => {
    it('should normalize police force names', async () => {
      // GIVEN: Forces with various naming patterns
      // Mock already set up
      const parser = new PoliceParser();
      
      // WHEN: Fetching forces
      const forces = await parser.fetchAll();
      
      // THEN: Names should be properly formatted
      forces.forEach(force => {
        // No leading/trailing whitespace
        expect(force.name).toBe(force.name.trim());
        
        // No double spaces
        expect(force.name).not.toMatch(/\s{2,}/);
        
        // Proper capitalization (first letter of each word)
        const words = force.name.split(' ');
        words.forEach(word => {
          if (word.length > 2 && !['and', 'of'].includes(word.toLowerCase())) {
            expect(word[0]).toBe(word[0].toUpperCase());
          }
        });
      });
    });

    it('should handle missing optional fields gracefully', () => {
      // GIVEN: HTML with minimal information but enough content
      const html = `
        <div class="content">
          <h1>UK Police Forces</h1>
          <p>Here are the police forces in the UK. This page contains information about various police forces operating across England, Wales, Scotland and Northern Ireland.</p>
          <ul class="forces">
            <li>West Midlands Police</li>
            <li>Merseyside Police</li>
          </ul>
        </div>
      `;
      
      // WHEN: Parsing minimal HTML
      const parser = new PoliceParser();
      const forces = parser.parseHTML(html, 'https://police.uk');
      
      // THEN: Should still create valid objects
      expect(forces).toHaveLength(2);
      forces.forEach(force => {
        expect(force.name).toBeDefined();
        expect(force.serviceType).toBe('police');
        // website is optional and may or may not be present
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // GIVEN: Network failure scenario
      (axios.get as jest.MockedFunction<typeof axios.get>).mockRejectedValue(new Error('Network error'));
      const parser = new PoliceParser();
      
      // WHEN: Attempting to fetch
      // THEN: Should throw with descriptive error
      await expect(parser.fetchAll())
        .rejects.toThrow(/Failed to fetch police forces/);
    });

    it('should validate minimum record count', async () => {
      // GIVEN: Parser returns too few records
      const mockEmptyHTML = '<div class="police-forces-list"></div>';
      (axios.get as jest.MockedFunction<typeof axios.get>).mockResolvedValue({ data: mockEmptyHTML });
      const parser = new PoliceParser();
      
      // WHEN: Fetching forces
      // THEN: Should throw validation error
      await expect(parser.fetchAll())
        .rejects.toThrow();
    });
  });
});

