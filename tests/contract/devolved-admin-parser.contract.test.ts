import { describe, it, expect, beforeEach } from '@jest/globals';
import { DevolvedAdminParser } from '../../src/services/devolved-admin-parser.js';
import { DevolvedNation } from '../../src/models/devolved-admin.js';

describe('DevolvedAdminParser Contract Tests', () => {
  let parser: DevolvedAdminParser;

  beforeEach(() => {
    parser = new DevolvedAdminParser();
  });

  describe('fetchAll', () => {
    it('should return array of devolved admin entities', async () => {
      const entities = await parser.fetchAll();
      
      expect(Array.isArray(entities)).toBe(true);
      expect(entities.length).toBeGreaterThan(0);
    });

    it('should return entities with required fields', async () => {
      const entities = await parser.fetchAll();
      
      entities.forEach(entity => {
        expect(entity).toHaveProperty('id');
        expect(entity).toHaveProperty('name');
        expect(entity).toHaveProperty('type');
        expect(entity).toHaveProperty('administration');
        
        expect(typeof entity.id).toBe('string');
        expect(typeof entity.name).toBe('string');
        expect(typeof entity.type).toBe('string');
        expect(typeof entity.administration).toBe('string');
      });
    });

    it('should filter agencies when option is false', async () => {
      const allEntities = await parser.fetchAll();
      const withoutAgencies = await parser.fetchAll({ 
        includeAgencies: false 
      });
      
      const agenciesInAll = allEntities.filter(e => e.type === 'agency');
      const agenciesInFiltered = withoutAgencies.filter(e => e.type === 'agency');
      
      expect(agenciesInAll.length).toBeGreaterThan(0);
      expect(agenciesInFiltered.length).toBe(0);
    });

    it('should include all three administrations', async () => {
      const entities = await parser.fetchAll();
      
      const scotland = entities.filter(e => e.administration === 'scotland');
      const wales = entities.filter(e => e.administration === 'wales');
      const ni = entities.filter(e => e.administration === 'northern_ireland');
      
      expect(scotland.length).toBeGreaterThan(0);
      expect(wales.length).toBeGreaterThan(0);
      expect(ni.length).toBeGreaterThan(0);
    });
  });

  describe('parseEntities', () => {
    it('should validate and parse valid entities', () => {
      const validData = [
        {
          id: 'test-1',
          name: 'Test Department',
          type: 'department',
          administration: 'scotland'
        }
      ];
      
      const parsed = parser.parseEntities(validData);
      
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('test-1');
    });

    it('should filter out invalid entities', () => {
      const mixedData = [
        {
          id: 'valid-1',
          name: 'Valid Entity',
          type: 'department',
          administration: 'scotland'
        },
        {
          // Missing required fields
          name: 'Invalid Entity'
        },
        {
          id: 'invalid-2',
          name: 'Bad Admin',
          type: 'department',
          administration: 'invalid' // Invalid administration
        }
      ];
      
      const parsed = parser.parseEntities(mixedData);
      
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('valid-1');
    });
  });

  describe('getByAdministration', () => {
    it('should return only Scottish entities', async () => {
      const scottish = await parser.getByAdministration(DevolvedNation.SCOTLAND);

      expect(scottish.length).toBeGreaterThan(0);
      scottish.forEach(entity => {
        expect(entity.administration).toBe('scotland');
      });
    });

    it('should return only Welsh entities', async () => {
      const welsh = await parser.getByAdministration(DevolvedNation.WALES);

      expect(welsh.length).toBeGreaterThan(0);
      welsh.forEach(entity => {
        expect(entity.administration).toBe('wales');
      });
    });

    it('should return only Northern Ireland entities', async () => {
      const ni = await parser.getByAdministration(DevolvedNation.NORTHERN_IRELAND);

      expect(ni.length).toBeGreaterThan(0);
      ni.forEach(entity => {
        expect(entity.administration).toBe('northern_ireland');
      });
    });
  });

  describe('getByType', () => {
    it('should return entities of specified type', async () => {
      const departments = await parser.getByType('department');
      
      expect(departments.length).toBeGreaterThan(0);
      departments.forEach(entity => {
        expect(entity.type).toBe('department');
      });
    });

    it('should return parliaments', async () => {
      const parliaments = await parser.getByType('parliament');
      
      expect(parliaments.length).toBe(3); // One for each administration
      expect(parliaments.map(p => p.administration).sort()).toEqual([
        'northern_ireland',
        'scotland',
        'wales'
      ]);
    });
  });

  describe('buildHierarchy', () => {
    it('should build hierarchy map', async () => {
      const entities = await parser.fetchAll();
      const hierarchy = parser.buildHierarchy(entities);
      
      expect(hierarchy instanceof Map).toBe(true);
      
      // Root level entities (no parent)
      expect(hierarchy.has('root')).toBe(true);
      const rootEntities = hierarchy.get('root');
      expect(rootEntities?.length).toBeGreaterThan(0);
      
      // Check some entities have children
      const hasChildren = Array.from(hierarchy.keys()).filter(
        key => key !== 'root'
      );
      expect(hasChildren.length).toBeGreaterThan(0);
    });
  });

  describe('aggregate', () => {
    it('should return response with entities and metadata', async () => {
      const response = await parser.aggregate();
      
      expect(response).toHaveProperty('entities');
      expect(response).toHaveProperty('metadata');
      
      expect(Array.isArray(response.entities)).toBe(true);
      expect(response.entities.length).toBeGreaterThan(0);
    });

    it('should include accurate metadata', async () => {
      const response = await parser.aggregate();
      const { metadata } = response;
      
      expect(metadata.source).toBe('Static JSON (manually curated)');
      expect(metadata.fetchedAt).toBeDefined();
      expect(metadata.totalCount).toBe(response.entities.length);
      
      expect(metadata.byAdministration).toBeDefined();
      expect(metadata.byAdministration.scotland).toBeGreaterThan(0);
      expect(metadata.byAdministration.wales).toBeGreaterThan(0);
      expect(metadata.byAdministration.northern_ireland).toBeGreaterThan(0);
      
      expect(metadata.byType).toBeDefined();
      expect(Object.keys(metadata.byType).length).toBeGreaterThan(0);
    });

    it('should calculate counts correctly', async () => {
      const response = await parser.aggregate();
      const { entities, metadata } = response;
      
      // Verify administration counts
      const scotlandCount = entities.filter(
        e => e.administration === 'scotland'
      ).length;
      const walesCount = entities.filter(
        e => e.administration === 'wales'
      ).length;
      const niCount = entities.filter(
        e => e.administration === 'northern_ireland'
      ).length;
      
      expect(metadata.byAdministration.scotland).toBe(scotlandCount);
      expect(metadata.byAdministration.wales).toBe(walesCount);
      expect(metadata.byAdministration.northern_ireland).toBe(niCount);
      
      // Verify type counts
      Object.entries(metadata.byType).forEach(([type, count]) => {
        const actualCount = entities.filter(e => e.type === type).length;
        expect(count).toBe(actualCount);
      });
    });
  });

  describe('Data Integrity', () => {
    it('should have unique IDs', async () => {
      const entities = await parser.fetchAll();
      const ids = entities.map(e => e.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid parent references', async () => {
      const entities = await parser.fetchAll();
      const ids = new Set(entities.map(e => e.id));
      
      entities.forEach(entity => {
        if (entity.parentId) {
          expect(ids.has(entity.parentId)).toBe(true);
        }
      });
    });

    it('should have valid administration values', async () => {
      const entities = await parser.fetchAll();
      const validAdmins = ['scotland', 'wales', 'northern_ireland'];
      
      entities.forEach(entity => {
        expect(validAdmins).toContain(entity.administration);
      });
    });

    it('should have valid type values', async () => {
      const entities = await parser.fetchAll();
      const validTypes = [
        'parliament', 
        'government', 
        'department', 
        'directorate', 
        'agency', 
        'public_body'
      ];
      
      entities.forEach(entity => {
        expect(validTypes).toContain(entity.type);
      });
    });
  });
});