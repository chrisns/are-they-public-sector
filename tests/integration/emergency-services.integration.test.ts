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

  // Fire services now use CSV data from official API, not HTML scraping

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
        return { status: 200, data: mockPoliceHTML };
      }
      if (url.includes('hub.arcgis.com')) {
        // Mock the official fire services CSV data with enough entries to pass validation
        const mockFireCSV = `FRA23CD,FRA23NM,ObjectId
E06000032,London Fire and Emergency Planning Authority,1
E10000002,Buckinghamshire & Milton Keynes,2
E10000003,Cambridgeshire,3
E10000006,Cumbria,4
E10000007,Derbyshire,5
E10000008,Devon & Somerset,6
E10000009,Dorset & Wiltshire,7
E10000011,East Sussex,8
E10000012,Essex,9
E10000013,Gloucestershire,10
E10000015,Hertfordshire,11
E10000016,Kent,12
E10000017,Lancashire,13
E10000018,Leicestershire,14
E10000019,Lincolnshire,15
E10000020,Norfolk,16
E10000021,Northamptonshire,17
E10000023,North Yorkshire,18
E10000024,Nottinghamshire,19
E10000025,Oxfordshire,20
E10000027,Somerset,21
E10000028,Staffordshire,22
E10000029,Suffolk,23
E10000030,Surrey,24
E10000031,Warwickshire,25
E10000032,West Sussex,26
E11000007,Greater Manchester,27
E11000001,Merseyside,28
E11000003,South Yorkshire,29
E11000005,Tyne and Wear,30
E11000002,West Midlands,31
E11000006,West Yorkshire,32
W15000001,South Wales,33
W15000002,Mid and West Wales,34
W15000003,North Wales,35
S15000001,Scotland,36
N09000001,Northern Ireland,37
E06000001,Avon,38
E06000002,Bedfordshire,39
E06000003,Royal Berkshire,40
E06000004,Cheshire,41
E06000005,Cleveland,42`;
        return { status: 200, data: mockFireCSV };
      }
      if (url.includes('gov.uk/guidance')) {
        return { status: 200, data: mockDevolvedHTML };
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