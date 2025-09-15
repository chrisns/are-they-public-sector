import { describe, it, expect, beforeAll } from '@jest/globals';
import { DevolvedAdminParser } from '../../src/services/devolved-admin-parser.js';
import { DevolvedAdminMapper } from '../../src/services/mappers/devolved-admin-mapper.js';
import type { DevolvedAdmin } from '../../src/models/devolved-admin.js';
import type { Organisation } from '../../src/models/organisation.js';
import { OrganisationType, DataSourceType } from '../../src/models/organisation.js';

describe('Devolved Admin Aggregation Integration Tests', () => {
  let parser: DevolvedAdminParser;
  let mapper: DevolvedAdminMapper;
  let entities: DevolvedAdmin[];
  let organisations: Organisation[];

  beforeAll(async () => {
    parser = new DevolvedAdminParser();
    mapper = new DevolvedAdminMapper();
    
    // Fetch all entities
    entities = await parser.fetchAll();
    
    // Map to organisations
    organisations = mapper.mapMultiple(entities);
  });

  describe('Full Aggregation Flow', () => {
    it('should aggregate all devolved administration entities', () => {
      expect(entities).toBeDefined();
      expect(entities.length).toBeGreaterThan(20); // We have at least 20 entities
      expect(organisations).toBeDefined();
      expect(organisations.length).toBe(entities.length);
    });

    it('should map all entities to organisations', () => {
      organisations.forEach((org, index) => {
        const entity = entities[index];
        
        expect(org.id).toBe(`devolved-${entity.id}`);
        expect(org.name).toBe(entity.name);
        expect(org.status).toBe('active');
        
        if (entity.website) {
          expect(org.website).toBe(entity.website);
        }
      });
    });

    it('should correctly classify organisation types', () => {
      const mappedParliaments = organisations.filter(
        o => entities.find(e => `devolved-${e.id}` === o.id)?.type === 'parliament'
      );

      mappedParliaments.forEach(org => {
        expect(org.type).toBe(OrganisationType.LEGISLATIVE_BODY);
      });

      const mappedDepartments = organisations.filter(
        o => entities.find(e => `devolved-${e.id}` === o.id)?.type === 'department'
      );

      mappedDepartments.forEach(org => {
        expect(org.type).toBe(OrganisationType.MINISTERIAL_DEPARTMENT);
      });
    });

    it('should set correct location by administration', () => {
      const scottishOrgs = organisations.filter(
        o => entities.find(e => `devolved-${e.id}` === o.id)?.administration === 'scotland'
      );
      
      scottishOrgs.forEach(org => {
        expect(org.location.country).toBe('Scotland');
      });
      
      const welshOrgs = organisations.filter(
        o => entities.find(e => `devolved-${e.id}` === o.id)?.administration === 'wales'
      );
      
      welshOrgs.forEach(org => {
        expect(org.location.country).toBe('Wales');
      });
      
      const niOrgs = organisations.filter(
        o => entities.find(e => `devolved-${e.id}` === o.id)?.administration === 'northern_ireland'
      );
      
      niOrgs.forEach(org => {
        expect(org.location.country).toBe('Northern Ireland');
      });
    });
  });

  describe('Data Quality', () => {
    it('should have complete data for all organisations', () => {
      organisations.forEach(org => {
        expect(org.dataQuality).toBeDefined();
        expect(org.dataQuality.completeness).toBeGreaterThanOrEqual(0);
        expect(org.dataQuality.completeness).toBeLessThanOrEqual(1);
        expect(org.dataQuality.hasConflicts).toBe(false);
        expect(org.dataQuality.requiresReview).toBe(false);
      });
    });

    it('should have source references', () => {
      organisations.forEach(org => {
        expect(org.sources).toBeDefined();
        expect(org.sources.length).toBe(1);
        expect(org.sources[0].source).toBe(DataSourceType.MANUAL);
        expect(org.sources[0].confidence).toBe(1.0);
      });
    });

    it('should preserve additional properties', () => {
      organisations.forEach((org, index) => {
        const entity = entities[index];
        
        expect(org.additionalProperties).toBeDefined();
        expect(org.additionalProperties.entityType).toBe(entity.type);
        expect(org.additionalProperties.administration).toBe(entity.administration);
        
        if (entity.responsibilities) {
          expect(org.additionalProperties.responsibilities).toEqual(entity.responsibilities);
        }
        
        if (entity.alternativeNames) {
          expect(org.additionalProperties.alternativeNames).toEqual(entity.alternativeNames);
        }
      });
    });
  });

  describe('Hierarchy Validation', () => {
    it('should maintain parent-child relationships', () => {
      const hierarchy = parser.buildHierarchy(entities);
      
      // Check that parent IDs reference valid entities
      const entityIds = new Set(entities.map(e => e.id));
      
      entities.forEach(entity => {
        if (entity.parentId) {
          expect(entityIds.has(entity.parentId)).toBe(true);
        }
      });
      
      // Check hierarchy structure
      expect(hierarchy.has('root')).toBe(true);
      
      // Parliaments and governments should be at root level
      const rootEntities = hierarchy.get('root') || [];
      const rootTypes = rootEntities.map(e => e.type);
      
      expect(rootTypes).toContain('parliament');
      expect(rootTypes).toContain('government');
    });

    it('should have departments under governments', () => {
      const niExecutive = entities.find(e => e.id === 'ni-executive');
      const niDepartments = entities.filter(
        e => e.parentId === 'ni-executive' && e.type === 'department'
      );
      
      expect(niExecutive).toBeDefined();
      expect(niDepartments.length).toBe(9); // 9 NI departments
    });
  });

  describe('Specific Entity Checks', () => {
    it('should have all three parliaments', () => {
      const parliaments = entities.filter(e => e.type === 'parliament');
      
      expect(parliaments).toHaveLength(3);
      
      const parliamentNames = parliaments.map(p => p.name);
      expect(parliamentNames).toContain('Scottish Parliament');
      expect(parliamentNames).toContain('Senedd Cymru / Welsh Parliament');
      expect(parliamentNames).toContain('Northern Ireland Assembly');
    });

    it('should have Northern Ireland departments', () => {
      const niDepts = entities.filter(
        e => e.administration === 'northern_ireland' && e.type === 'department'
      );
      
      expect(niDepts).toHaveLength(9);
      
      const deptNames = niDepts.map(d => d.name);
      expect(deptNames).toContain('The Executive Office');
      expect(deptNames).toContain('Department of Health');
      expect(deptNames).toContain('Department of Education');
      expect(deptNames).toContain('Department of Justice');
    });

    it('should have Scottish directorates', () => {
      const scotDirectorates = entities.filter(
        e => e.administration === 'scotland' && e.type === 'directorate'
      );
      
      expect(scotDirectorates.length).toBeGreaterThan(0);
      
      const directorateNames = scotDirectorates.map(d => d.name);
      expect(directorateNames).toContain('Marine Directorate');
      expect(directorateNames).toContain('Legal Services');
    });

    it('should have Welsh government groups', () => {
      const welshGroups = entities.filter(
        e => e.administration === 'wales' && e.type === 'department'
      );
      
      expect(welshGroups.length).toBeGreaterThan(0);
      
      const groupNames = welshGroups.map(g => g.name);
      expect(groupNames).toContain('Health and Social Services Group');
      expect(groupNames).toContain('Education and Public Services Group');
    });
  });

  describe('Subcategory Assignment', () => {
    it('should assign appropriate subcategories', () => {
      organisations.forEach((org, index) => {
        const entity = entities[index];
        
        expect(org.additionalProperties.subcategory).toBeDefined();
        
        if (entity.responsibilities?.some(r => r.toLowerCase().includes('health'))) {
          expect(org.additionalProperties.subcategory).toBe('Health and Social Care');
        }
        
        if (entity.responsibilities?.some(r => r.toLowerCase().includes('education'))) {
          expect(org.additionalProperties.subcategory).toBe('Education and Skills');
        }
        
        if (entity.type === 'parliament') {
          expect(org.additionalProperties.subcategory).toBe('Legislative Body');
        }
      });
    });
  });

  describe('Alternative Names', () => {
    it('should preserve alternative names', () => {
      const senedd = entities.find(e => e.id === 'wales-senedd');
      expect(senedd?.alternativeNames).toContain('Senedd');
      expect(senedd?.alternativeNames).toContain('Welsh Parliament');
      
      const mappedSenedd = organisations.find(o => o.id === 'devolved-wales-senedd');
      expect(mappedSenedd?.additionalProperties.alternativeNames).toContain('Senedd');
      expect(mappedSenedd?.additionalProperties.alternativeNames).toContain('Welsh Parliament');
    });
  });

  describe('Performance', () => {
    it('should complete aggregation quickly', async () => {
      const startTime = Date.now();
      const result = await parser.aggregate();
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(100); // Should be very fast with static data
      expect(result.entities.length).toBeGreaterThan(0);
    });
  });
});