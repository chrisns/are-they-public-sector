/**
 * Integration Test: Emergency Services Aggregation
 * Tests the complete flow of aggregating police, fire, and additional devolved bodies
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { PoliceParser } from '../../src/services/police-parser';
import { FireParser } from '../../src/services/fire-parser';
import { DevolvedExtraParser } from '../../src/services/devolved-extra-parser';
import { PoliceMapper } from '../../src/services/mappers/police-mapper';
import { FireMapper } from '../../src/services/mappers/fire-mapper';
import { DevolvedExtraMapper } from '../../src/services/mappers/devolved-extra-mapper';
import { OrganisationType, DataSourceType } from '../../src/models/organisation';
import axios from 'axios';

describe('Emergency Services Integration', () => {
  // Mock HTML responses
  const mockPoliceHTML = `
    <div class="police-forces">
      <h2>England</h2>
      <ul>
        <li><a href="/met">Metropolitan Police Service</a></li>
        <li><a href="/gmp">Greater Manchester Police</a></li>
      </ul>
      <h2>Special Forces</h2>
      <ul>
        <li><a href="/btp">British Transport Police</a></li>
      </ul>
    </div>
  `;

  const mockFireHTML = `
    <table class="fire-services">
      <tr>
        <td>London Fire Brigade</td>
        <td>Greater London</td>
        <td>www.london-fire.gov.uk</td>
      </tr>
      <tr>
        <td>Greater Manchester Fire and Rescue Service</td>
        <td>Greater Manchester</td>
        <td>www.manchesterfire.gov.uk</td>
      </tr>
    </table>
  `;

  const mockDevolvedHTML = `
    <div>
      <h2>Scotland</h2>
      <ul>
        <li>Scottish Environment Protection Agency</li>
        <li>Skills Development Scotland</li>
      </ul>
      <h2>Wales</h2>
      <ul>
        <li>Welsh Revenue Authority</li>
      </ul>
    </div>
  `;

  beforeAll(() => {
    // Mock axios for all tests
    jest.spyOn(axios, 'get').mockImplementation(async (url: string) => {
      if (url.includes('police.uk')) {
        return { data: mockPoliceHTML };
      }
      if (url.includes('nfcc.org.uk')) {
        return { data: mockFireHTML };
      }
      if (url.includes('gov.uk/guidance')) {
        return { data: mockDevolvedHTML };
      }
      throw new Error('Unknown URL');
    });
  });

  describe('Police Forces Aggregation', () => {
    it('should fetch and map UK police forces', async () => {
      const parser = new PoliceParser();
      const mapper = new PoliceMapper();
      
      const forces = await parser.fetchAll();
      expect(forces.length).toBeGreaterThan(0);
      
      const organisations = forces.map(force => mapper.mapToOrganisation(force));
      
      organisations.forEach(org => {
        expect(org.type).toBe(OrganisationType.EMERGENCY_SERVICE);
        expect(org.sources[0].source).toBe(DataSourceType.POLICE_UK);
        expect(org.additionalProperties?.serviceType).toBe('police');
      });
    });

    it('should classify force types correctly', async () => {
      const parser = new PoliceParser();
      const forces = await parser.fetchAll();
      
      const territorial = forces.filter(f => f.forceType === 'territorial');
      const special = forces.filter(f => f.forceType === 'special');
      
      expect(territorial.length).toBeGreaterThan(0);
      expect(special.length).toBeGreaterThan(0);
    });
  });

  describe('Fire Services Aggregation', () => {
    it('should fetch and map fire services', async () => {
      const parser = new FireParser();
      const mapper = new FireMapper();
      
      const services = await parser.fetchAll();
      expect(services.length).toBeGreaterThan(0);
      
      const organisations = services.map(service => mapper.mapToOrganisation(service));
      
      organisations.forEach(org => {
        expect(org.type).toBe(OrganisationType.EMERGENCY_SERVICE);
        expect(org.sources[0].source).toBe(DataSourceType.NFCC);
        expect(org.additionalProperties?.serviceType).toBe('fire');
      });
    });

    it('should identify authority types', async () => {
      const parser = new FireParser();
      const services = await parser.fetchAll();
      
      const london = services.find(s => s.name.includes('London'));
      if (london) {
        expect(london.authorityType).toBe('metropolitan');
      }
    });
  });

  describe('Additional Devolved Bodies', () => {
    it('should fetch new devolved bodies not in existing data', async () => {
      const parser = new DevolvedExtraParser();
      const mapper = new DevolvedExtraMapper();
      
      const bodies = await parser.fetchAll();
      expect(bodies.length).toBeGreaterThan(0);
      
      const organisations = bodies.map(body => mapper.mapToOrganisation(body));
      
      organisations.forEach(org => {
        expect(org.type).toBe(OrganisationType.DEVOLVED_ADMINISTRATION);
        expect(org.sources[0].source).toBe(DataSourceType.GOV_UK_GUIDANCE);
      });
    });

    it('should classify by nation correctly', async () => {
      const parser = new DevolvedExtraParser();
      const bodies = await parser.fetchAll();
      
      const scottish = bodies.filter(b => b.nation === 'scotland');
      const welsh = bodies.filter(b => b.nation === 'wales');
      
      expect(scottish.length).toBeGreaterThan(0);
      expect(welsh.length).toBeGreaterThan(0);
    });
  });

  describe('Combined Aggregation', () => {
    it('should aggregate all emergency services', async () => {
      const policeParser = new PoliceParser();
      const fireParser = new FireParser();
      const devolvedParser = new DevolvedExtraParser();
      
      const [police, fire, devolved] = await Promise.all([
        policeParser.fetchAll(),
        fireParser.fetchAll(),
        devolvedParser.fetchAll()
      ]);
      
      expect(police.length).toBeGreaterThan(0);
      expect(fire.length).toBeGreaterThan(0);
      expect(devolved.length).toBeGreaterThan(0);
      
      const total = police.length + fire.length + devolved.length;
      expect(total).toBeGreaterThan(5); // At least some of each type
    });
  });
});