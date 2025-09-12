/**
 * Unit tests for DeduplicatorService
 * Tests exact/fuzzy matching, conflict detection, and provenance tracking
 */

import { DeduplicatorService } from '../../src/services/deduplicator';
import { OrganisationType, DataSourceType } from '../../src/models/organisation';
import type { Organisation, DataSourceReference } from '../../src/models/organisation';
import type { DataConflict } from '../../src/models/processing';

// Mock crypto for UUID generation
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-' + Math.random().toString(36).substr(2, 9))
}));

describe('DeduplicatorService', () => {
  let deduplicator: DeduplicatorService;

  beforeEach(() => {
    jest.clearAllMocks();
    deduplicator = new DeduplicatorService();
  });

  // Helper function to create test organisations
  const createTestOrganisation = (
    id: string,
    name: string,
    source: DataSourceType = DataSourceType.GOV_UK_API,
    additionalProps: Partial<Organisation> = {}
  ): Organisation => ({
    id,
    name,
    type: OrganisationType.DEPARTMENT,
    status: 'active',
    sources: [{
      source,
      sourceId: `${source}-${id}`,
      retrievedAt: new Date().toISOString(),
      confidence: 0.8
    }],
    dataQuality: {
      completeness: 0.8,
      confidence: 0.8,
      lastValidated: new Date().toISOString(),
      requiresReview: false,
      reviewReasons: []
    },
    lastUpdated: new Date().toISOString(),
    ...additionalProps
  });

  describe('exact match deduplication', () => {
    it('should detect exact name matches', () => {
      const organisations: Organisation[] = [
        createTestOrganisation('1', 'Department of Health'),
        createTestOrganisation('2', 'Department of Health'),
        createTestOrganisation('3', 'Department of Education')
      ];

      const result = deduplicator.deduplicate(organisations);

      expect(result.organisations).toHaveLength(2);
      expect(result.mergedRecords).toHaveLength(1);
      expect(result.mergedRecords[0].mergedIds).toContain('1');
      expect(result.mergedRecords[0].mergedIds).toContain('2');
    });

    it('should detect exact identifier matches', () => {
      const organisations: Organisation[] = [
        createTestOrganisation('1', 'NHS England', DataSourceType.GOV_UK_API, {
          identifiers: { govUkId: 'nhs-england' }
        }),
        createTestOrganisation('2', 'NHS England and Improvement', DataSourceType.ONS_INSTITUTIONAL, {
          identifiers: { govUkId: 'nhs-england' }
        }),
        createTestOrganisation('3', 'Other Org')
      ];

      const result = deduplicator.deduplicate(organisations);

      expect(result.organisations).toHaveLength(2);
      const mergedOrg = result.organisations.find(o => o.name.includes('NHS'));
      expect(mergedOrg?.sources).toHaveLength(2);
    });

    it('should match on multiple exact fields', () => {
      const organisations: Organisation[] = [
        createTestOrganisation('1', 'Test Org', DataSourceType.GOV_UK_API, {
          identifiers: { govUkId: 'test-org', companiesHouseNumber: '12345678' }
        }),
        createTestOrganisation('2', 'Test Org', DataSourceType.ONS_INSTITUTIONAL, {
          identifiers: { govUkId: 'test-org', companiesHouseNumber: '12345678' }
        })
      ];

      const result = deduplicator.deduplicate(organisations);

      expect(result.organisations).toHaveLength(1);
      expect(result.mergedRecords).toHaveLength(1);
    });

    it('should preserve all source references when merging', () => {
      const organisations: Organisation[] = [
        createTestOrganisation('1', 'Merged Org', DataSourceType.GOV_UK_API),
        createTestOrganisation('2', 'Merged Org', DataSourceType.ONS_INSTITUTIONAL),
        createTestOrganisation('3', 'Merged Org', DataSourceType.ONS_NON_INSTITUTIONAL)
      ];

      const result = deduplicator.deduplicate(organisations);

      expect(result.organisations).toHaveLength(1);
      const mergedOrg = result.organisations[0];
      expect(mergedOrg.sources).toHaveLength(3);
      expect(mergedOrg.sources.map(s => s.source)).toEqual([
        DataSourceType.GOV_UK_API,
        DataSourceType.ONS_INSTITUTIONAL,
        DataSourceType.ONS_NON_INSTITUTIONAL
      ]);
    });
  });

  describe('fuzzy match deduplication', () => {
    it('should detect similar names above threshold', () => {
      const organisations: Organisation[] = [
        createTestOrganisation('1', 'Department of Health and Social Care'),
        createTestOrganisation('2', 'Department of Health & Social Care'),
        createTestOrganisation('3', 'Completely Different Organisation')
      ];

      const result = deduplicator.deduplicate(organisations);

      expect(result.organisations).toHaveLength(2);
      expect(result.mergedRecords).toHaveLength(1);
    });

    it('should detect abbreviations and acronyms', () => {
      const organisations: Organisation[] = [
        createTestOrganisation('1', 'NHS England', DataSourceType.GOV_UK_API, {
          alternativeNames: ['NHSE']
        }),
        createTestOrganisation('2', 'NHSE', DataSourceType.ONS_INSTITUTIONAL),
        createTestOrganisation('3', 'National Health Service England')
      ];

      const result = deduplicator.deduplicate(organisations);

      // Should merge NHS England and NHSE due to alternative names
      expect(result.organisations.length).toBeLessThanOrEqual(2);
    });

    it('should not merge dissimilar organisations below threshold', () => {
      const organisations: Organisation[] = [
        createTestOrganisation('1', 'Department of Health'),
        createTestOrganisation('2', 'Department of Education'),
        createTestOrganisation('3', 'Department of Transport')
      ];

      const result = deduplicator.deduplicate(organisations);

      expect(result.organisations).toHaveLength(3);
      expect(result.mergedRecords).toHaveLength(0);
    });

    it('should calculate similarity scores correctly', () => {
      const deduplicator = new DeduplicatorService({ similarityThreshold: 0.8 });
      
      const organisations: Organisation[] = [
        createTestOrganisation('1', 'Test Organisation'),
        createTestOrganisation('2', 'Test Organization'), // US spelling
        createTestOrganisation('3', 'Test Org'),
        createTestOrganisation('4', 'Different Org')
      ];

      const result = deduplicator.deduplicate(organisations);

      // Should merge "Test Organisation" and "Test Organization" (high similarity)
      // but not "Test Org" (lower similarity)
      expect(result.organisations.length).toBeGreaterThanOrEqual(2);
      expect(result.organisations.length).toBeLessThanOrEqual(3);
    });

    it('should respect custom similarity threshold', () => {
      const strictDeduplicator = new DeduplicatorService({ similarityThreshold: 0.95 });
      const lenientDeduplicator = new DeduplicatorService({ similarityThreshold: 0.6 });
      
      const organisations: Organisation[] = [
        createTestOrganisation('1', 'Department of Health'),
        createTestOrganisation('2', 'Dept of Health'),
        createTestOrganisation('3', 'Health Department')
      ];

      const strictResult = strictDeduplicator.deduplicate([...organisations]);
      const lenientResult = lenientDeduplicator.deduplicate([...organisations]);

      expect(strictResult.organisations.length).toBeGreaterThan(lenientResult.organisations.length);
    });
  });

  describe('conflict detection', () => {
    it('should detect conflicting field values', () => {
      const organisations: Organisation[] = [
        createTestOrganisation('1', 'Conflicting Org', DataSourceType.GOV_UK_API, {
          type: OrganisationType.DEPARTMENT,
          status: 'active'
        }),
        createTestOrganisation('2', 'Conflicting Org', DataSourceType.ONS_INSTITUTIONAL, {
          type: OrganisationType.NDPB,
          status: 'inactive'
        })
      ];

      const result = deduplicator.deduplicate(organisations);

      expect(result.conflicts).toBeDefined();
      expect(result.conflicts).toHaveLength(2); // One for type, one for status
      
      const typeConflict = result.conflicts?.find(c => c.field === 'type');
      expect(typeConflict).toBeDefined();
      expect(typeConflict?.values).toContain(OrganisationType.DEPARTMENT);
      expect(typeConflict?.values).toContain(OrganisationType.NDPB);
    });

    it('should track sources of conflicting values', () => {
      const organisations: Organisation[] = [
        createTestOrganisation('1', 'Test Org', DataSourceType.GOV_UK_API, {
          establishedDate: '2020-01-01'
        }),
        createTestOrganisation('2', 'Test Org', DataSourceType.ONS_INSTITUTIONAL, {
          establishedDate: '2020-06-01'
        })
      ];

      const result = deduplicator.deduplicate(organisations);

      const dateConflict = result.conflicts?.find(c => c.field === 'establishedDate');
      expect(dateConflict).toBeDefined();
      expect(dateConflict?.sources).toContain(DataSourceType.GOV_UK_API);
      expect(dateConflict?.sources).toContain(DataSourceType.ONS_INSTITUTIONAL);
    });

    it('should not flag non-conflicting differences', () => {
      const organisations: Organisation[] = [
        createTestOrganisation('1', 'Test Org', DataSourceType.GOV_UK_API, {
          description: 'Description from GOV.UK'
        }),
        createTestOrganisation('2', 'Test Org', DataSourceType.ONS_INSTITUTIONAL, {
          description: undefined // No description from ONS
        })
      ];

      const result = deduplicator.deduplicate(organisations);

      // Should merge without conflicts (one source has data, other doesn't)
      expect(result.organisations).toHaveLength(1);
      expect(result.conflicts).toHaveLength(0);
      expect(result.organisations[0].description).toBe('Description from GOV.UK');
    });
  });

  describe('conflict resolution strategies', () => {
    it('should use newest data when configured', () => {
      const deduplicator = new DeduplicatorService({ 
        conflictResolutionStrategy: 'newest' 
      });

      const organisations: Organisation[] = [
        createTestOrganisation('1', 'Test Org', DataSourceType.GOV_UK_API, {
          status: 'active',
          lastUpdated: '2023-01-01T00:00:00Z'
        }),
        createTestOrganisation('2', 'Test Org', DataSourceType.ONS_INSTITUTIONAL, {
          status: 'inactive',
          lastUpdated: '2023-06-01T00:00:00Z'
        })
      ];

      const result = deduplicator.deduplicate(organisations);

      expect(result.organisations).toHaveLength(1);
      expect(result.organisations[0].status).toBe('inactive'); // Newer data
    });

    it('should use highest confidence when configured', () => {
      const deduplicator = new DeduplicatorService({ 
        conflictResolutionStrategy: 'highest_confidence' 
      });

      const organisations: Organisation[] = [
        createTestOrganisation('1', 'Test Org', DataSourceType.GOV_UK_API, {
          type: OrganisationType.DEPARTMENT,
          dataQuality: { confidence: 0.6, completeness: 0.8, lastValidated: '', requiresReview: false, reviewReasons: [] }
        }),
        createTestOrganisation('2', 'Test Org', DataSourceType.ONS_INSTITUTIONAL, {
          type: OrganisationType.NDPB,
          dataQuality: { confidence: 0.9, completeness: 0.7, lastValidated: '', requiresReview: false, reviewReasons: [] }
        })
      ];

      const result = deduplicator.deduplicate(organisations);

      expect(result.organisations).toHaveLength(1);
      expect(result.organisations[0].type).toBe(OrganisationType.NDPB); // Higher confidence
    });

    it('should use most complete data when configured', () => {
      const deduplicator = new DeduplicatorService({ 
        conflictResolutionStrategy: 'most_complete' 
      });

      const organisations: Organisation[] = [
        createTestOrganisation('1', 'Test Org', DataSourceType.GOV_UK_API, {
          description: 'Brief description',
          dataQuality: { completeness: 0.5, confidence: 0.8, lastValidated: '', requiresReview: false, reviewReasons: [] }
        }),
        createTestOrganisation('2', 'Test Org', DataSourceType.ONS_INSTITUTIONAL, {
          description: 'Much more detailed and comprehensive description of the organisation',
          dataQuality: { completeness: 0.9, confidence: 0.8, lastValidated: '', requiresReview: false, reviewReasons: [] }
        })
      ];

      const result = deduplicator.deduplicate(organisations);

      expect(result.organisations).toHaveLength(1);
      expect(result.organisations[0].description).toContain('comprehensive'); // More complete data
    });

    it('should flag for manual review when configured', () => {
      const deduplicator = new DeduplicatorService({ 
        conflictResolutionStrategy: 'manual' 
      });

      const organisations: Organisation[] = [
        createTestOrganisation('1', 'Test Org', DataSourceType.GOV_UK_API, {
          type: OrganisationType.DEPARTMENT
        }),
        createTestOrganisation('2', 'Test Org', DataSourceType.ONS_INSTITUTIONAL, {
          type: OrganisationType.NDPB
        })
      ];

      const result = deduplicator.deduplicate(organisations);

      expect(result.organisations).toHaveLength(1);
      expect(result.organisations[0].dataQuality?.requiresReview).toBe(true);
      expect(result.organisations[0].dataQuality?.reviewReasons).toContain('Data conflicts require manual review');
    });
  });

  describe('provenance tracking', () => {
    it('should track provenance when enabled', () => {
      const deduplicator = new DeduplicatorService({ 
        trackProvenance: true 
      });

      const organisations: Organisation[] = [
        createTestOrganisation('1', 'Tracked Org', DataSourceType.GOV_UK_API, {
          description: 'Original description'
        }),
        createTestOrganisation('2', 'Tracked Org', DataSourceType.ONS_INSTITUTIONAL, {
          description: 'Updated description'
        })
      ];

      const result = deduplicator.deduplicate(organisations);

      expect(result.organisations).toHaveLength(1);
      const mergedOrg = result.organisations[0];
      expect(mergedOrg.provenance).toBeDefined();
      expect(mergedOrg.provenance?.originalIds).toContain('1');
      expect(mergedOrg.provenance?.originalIds).toContain('2');
      expect(mergedOrg.provenance?.mergeDate).toBeDefined();
      expect(mergedOrg.provenance?.mergeMethod).toBe('exact_match');
    });

    it('should record merge method in provenance', () => {
      const deduplicator = new DeduplicatorService({ 
        trackProvenance: true,
        similarityThreshold: 0.7
      });

      const organisations: Organisation[] = [
        createTestOrganisation('1', 'Department of Health'),
        createTestOrganisation('2', 'Dept. of Health') // Fuzzy match
      ];

      const result = deduplicator.deduplicate(organisations);

      expect(result.organisations[0].provenance?.mergeMethod).toBe('fuzzy_match');
    });

    it('should not track provenance when disabled', () => {
      const deduplicator = new DeduplicatorService({ 
        trackProvenance: false 
      });

      const organisations: Organisation[] = [
        createTestOrganisation('1', 'Test Org'),
        createTestOrganisation('2', 'Test Org')
      ];

      const result = deduplicator.deduplicate(organisations);

      expect(result.organisations[0].provenance).toBeUndefined();
    });
  });

  describe('complex deduplication scenarios', () => {
    it('should handle transitive duplicates', () => {
      const organisations: Organisation[] = [
        createTestOrganisation('1', 'Organisation A', DataSourceType.GOV_UK_API, {
          identifiers: { govUkId: 'org-a' }
        }),
        createTestOrganisation('2', 'Organisation B', DataSourceType.ONS_INSTITUTIONAL, {
          identifiers: { govUkId: 'org-a', onsId: 'org-b' }
        }),
        createTestOrganisation('3', 'Organisation C', DataSourceType.ONS_NON_INSTITUTIONAL, {
          identifiers: { onsId: 'org-b' }
        })
      ];

      const result = deduplicator.deduplicate(organisations);

      // All three should be merged due to transitive relationships
      expect(result.organisations).toHaveLength(1);
      expect(result.organisations[0].sources).toHaveLength(3);
    });

    it('should handle multiple duplicate clusters', () => {
      const organisations: Organisation[] = [
        // Cluster 1
        createTestOrganisation('1', 'Health Org'),
        createTestOrganisation('2', 'Health Org'),
        // Cluster 2
        createTestOrganisation('3', 'Education Org'),
        createTestOrganisation('4', 'Education Org'),
        // Unique
        createTestOrganisation('5', 'Transport Org')
      ];

      const result = deduplicator.deduplicate(organisations);

      expect(result.organisations).toHaveLength(3);
      expect(result.mergedRecords).toHaveLength(2);
    });

    it('should preserve the most comprehensive data during merge', () => {
      const organisations: Organisation[] = [
        createTestOrganisation('1', 'Test Org', DataSourceType.GOV_UK_API, {
          description: 'Short description',
          website: 'https://example.org',
          email: undefined
        }),
        createTestOrganisation('2', 'Test Org', DataSourceType.ONS_INSTITUTIONAL, {
          description: undefined,
          website: undefined,
          email: 'contact@example.org'
        })
      ];

      const result = deduplicator.deduplicate(organisations);

      const merged = result.organisations[0];
      expect(merged.description).toBe('Short description');
      expect(merged.website).toBe('https://example.org');
      expect(merged.email).toBe('contact@example.org');
    });

    it('should handle organisations with no common fields gracefully', () => {
      const organisations: Organisation[] = [
        createTestOrganisation('1', 'Org One'),
        createTestOrganisation('2', 'Org Two'),
        createTestOrganisation('3', 'Org Three')
      ];

      const result = deduplicator.deduplicate(organisations);

      expect(result.organisations).toHaveLength(3);
      expect(result.mergedRecords).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe('performance and edge cases', () => {
    it('should handle empty input', () => {
      const result = deduplicator.deduplicate([]);

      expect(result.organisations).toEqual([]);
      expect(result.mergedRecords).toEqual([]);
      expect(result.conflicts).toEqual([]);
    });

    it('should handle single organisation', () => {
      const org = createTestOrganisation('1', 'Single Org');
      const result = deduplicator.deduplicate([org]);

      expect(result.organisations).toEqual([org]);
      expect(result.mergedRecords).toEqual([]);
    });

    it('should handle large numbers of duplicates efficiently', () => {
      const organisations: Organisation[] = [];
      
      // Create 100 duplicates of the same org
      for (let i = 0; i < 100; i++) {
        organisations.push(createTestOrganisation(i.toString(), 'Duplicate Org'));
      }

      const startTime = Date.now();
      const result = deduplicator.deduplicate(organisations);
      const endTime = Date.now();

      expect(result.organisations).toHaveLength(1);
      expect(result.mergedRecords).toHaveLength(1);
      expect(result.mergedRecords[0].mergedIds).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle special characters in organisation names', () => {
      const organisations: Organisation[] = [
        createTestOrganisation('1', 'Test & Co. Ltd.'),
        createTestOrganisation('2', 'Test & Co. Ltd.'),
        createTestOrganisation('3', 'Test and Co. Ltd.')
      ];

      const result = deduplicator.deduplicate(organisations);

      // First two should definitely match (exact), third might match depending on fuzzy logic
      expect(result.organisations.length).toBeLessThanOrEqual(2);
    });

    it('should handle case-insensitive matching', () => {
      const organisations: Organisation[] = [
        createTestOrganisation('1', 'DEPARTMENT OF HEALTH'),
        createTestOrganisation('2', 'Department of Health'),
        createTestOrganisation('3', 'department of health')
      ];

      const result = deduplicator.deduplicate(organisations);

      expect(result.organisations).toHaveLength(1);
      expect(result.mergedRecords).toHaveLength(1);
      expect(result.mergedRecords[0].mergedIds).toHaveLength(3);
    });
  });
});