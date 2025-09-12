/**
 * Integration Test: Data Deduplication Logic
 * 
 * TDD APPROACH: This test is intentionally failing because:
 * - The services/orchestrator module doesn't exist yet
 * - The DeduplicationService interface is not implemented
 * - The test defines expected deduplication behavior before implementation
 * 
 * This test covers FR-004, FR-006, and FR-007 from the specification:
 * - Maintain unique identifiers to prevent duplicates
 * - Validate and deduplicate organisation records across different data sources
 * - Flag organisations with incomplete or conflicting data for review
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

// TDD: This import will fail because orchestrator doesn't exist yet
// This is intentional - the test is designed to fail until implementation
const { Orchestrator } = require('../../src/cli/orchestrator');

describe('Data Deduplication Integration Tests', () => {
  let orchestrator;
  
  beforeEach(() => {
    // TDD: This will fail until Orchestrator class is implemented
    orchestrator = new Orchestrator();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('FR-004: Unique Identifier Maintenance', () => {
    it('should maintain unique identifiers for each organisation', async () => {
      // TDD: Test unique identifier generation and maintenance
      // Given: organisations from multiple sources with potential duplicates
      // When: deduplication is performed
      // Then: each organisation should have a unique identifier
      
      const result = await orchestrator.performDeduplication();
      
      expect(result.success).toBe(true);
      expect(result.uniqueOrganisations).toBeDefined();
      
      const ids = result.uniqueOrganisations.map(org => org.id);
      const uniqueIds = new Set(ids);
      
      // Every organisation should have a unique ID
      expect(ids.length).toBe(uniqueIds.size);
      
      // IDs should be properly formatted
      ids.forEach(id => {
        expect(id).toMatch(/^[a-zA-Z0-9-_]+$/); // Should be alphanumeric with hyphens/underscores
        expect(id.length).toBeGreaterThan(5); // Should be meaningful length
      });
    });

    it('should generate consistent identifiers for the same organisation across runs', async () => {
      // TDD: Test identifier consistency
      // Given: the same source data
      // When: deduplication is run multiple times
      // Then: the same organisations should get the same identifiers
      
      const firstRun = await orchestrator.performDeduplication();
      const secondRun = await orchestrator.performDeduplication();
      
      expect(firstRun.uniqueOrganisations.length).toBe(secondRun.uniqueOrganisations.length);
      
      // Sort by ID to compare
      const firstIds = firstRun.uniqueOrganisations.sort((a, b) => a.id.localeCompare(b.id));
      const secondIds = secondRun.uniqueOrganisations.sort((a, b) => a.id.localeCompare(b.id));
      
      firstIds.forEach((org, index) => {
        expect(org.id).toBe(secondIds[index].id);
        expect(org.name).toBe(secondIds[index].name);
      });
    });
  });

  describe('FR-006: Cross-Source Deduplication', () => {
    it('should identify and merge duplicate organisations across data sources', async () => {
      // TDD: Tests acceptance scenario #5
      // Given: duplicate organisations exist across sources
      // When: the system deduplicates
      // Then: it maintains a single record per organisation with provenance tracking
      
      const result = await orchestrator.performDeduplication();
      
      expect(result.success).toBe(true);
      expect(result.duplicatesFound).toBeGreaterThan(0);
      expect(result.duplicatesResolved).toBe(result.duplicatesFound);
      
      // Check that merged records maintain provenance from all sources
      const mergedOrganisations = result.uniqueOrganisations.filter(
        org => org.provenance.sources.length > 1
      );
      
      expect(mergedOrganisations.length).toBeGreaterThan(0);
      
      mergedOrganisations.forEach(org => {
        expect(org.provenance.sources.length).toBeGreaterThan(1);
        expect(org.provenance.primarySource).toBeDefined();
        expect(org.provenance.mergedFrom).toBeDefined();
        expect(org.provenance.mergedFrom!.length).toBeGreaterThan(0);
      });
    });

    it('should detect duplicates based on multiple matching criteria', async () => {
      // TDD: Test sophisticated duplicate detection
      // Given: organisations with similar but not identical data
      // When: deduplication algorithm is applied
      // Then: it should detect duplicates using fuzzy matching and multiple criteria
      
      const result = await orchestrator.performDeduplication();
      const duplicateAnalysis = result.duplicateAnalysis;
      
      expect(duplicateAnalysis).toBeDefined();
      expect(duplicateAnalysis.exactNameMatches).toBeGreaterThanOrEqual(0);
      expect(duplicateAnalysis.fuzzyNameMatches).toBeGreaterThanOrEqual(0);
      expect(duplicateAnalysis.identifierMatches).toBeGreaterThanOrEqual(0);
      expect(duplicateAnalysis.locationMatches).toBeGreaterThanOrEqual(0);
      
      // Should have used multiple criteria
      const totalMatches = duplicateAnalysis.exactNameMatches + 
                           duplicateAnalysis.fuzzyNameMatches + 
                           duplicateAnalysis.identifierMatches + 
                           duplicateAnalysis.locationMatches;
      expect(totalMatches).toBe(result.duplicatesFound);
    });

    it('should preserve the most complete record when merging duplicates', async () => {
      // TDD: Test merge logic quality
      // Given: duplicate records with different levels of completeness
      // When: merging occurs
      // Then: the most complete and recent data should be preserved
      
      const result = await orchestrator.performDeduplication();
      const mergedOrganisations = result.uniqueOrganisations.filter(
        org => org.provenance.sources.length > 1
      );
      
      mergedOrganisations.forEach(org => {
        // Should have comprehensive data
        expect(org.name).toBeDefined();
        expect(org.name.length).toBeGreaterThan(0);
        expect(org.type).toBeDefined();
        
        // Should indicate which fields came from which sources
        expect(org.fieldProvenance).toBeDefined();
        
        Object.entries(org.fieldProvenance).forEach(([field, source]) => {
          expect(typeof source).toBe('string');
          expect(['gov.uk-api', 'ons-institutional-units', 'ons-non-institutional-units'])
            .toContain(source);
        });
      });
    });
  });

  describe('FR-007: Conflict Detection and Flagging', () => {
    it('should identify organisations with conflicting data across sources', async () => {
      // TDD: Test conflict detection
      // Given: organisations that exist in multiple sources with different data
      // When: deduplication is performed
      // Then: conflicts should be identified and flagged for review
      
      const result = await orchestrator.performDeduplication();
      
      expect(result.conflicts).toBeDefined();
      expect(Array.isArray(result.conflicts)).toBe(true);
      
      if (result.conflicts.length > 0) {
        result.conflicts.forEach((conflict: DataConflict) => {
          expect(conflict.organisationId).toBeDefined();
          expect(conflict.field).toBeDefined();
          expect(conflict.values).toBeDefined();
          expect(conflict.values.length).toBeGreaterThanOrEqual(2);
          expect(conflict.sources).toBeDefined();
          expect(conflict.sources.length).toBe(conflict.values.length);
          expect(conflict.severity).toMatch(/^(low|medium|high)$/);
          expect(conflict.requiresManualReview).toBeDefined();
        });
      }
    });

    it('should flag organisations with incomplete data', async () => {
      // TDD: Test incomplete data flagging
      // Given: organisations with missing critical fields
      // When: validation is performed
      // Then: incomplete organisations should be flagged for review
      
      const result = await orchestrator.performDeduplication();
      
      expect(result.incompleteRecords).toBeDefined();
      expect(Array.isArray(result.incompleteRecords)).toBe(true);
      
      result.incompleteRecords.forEach(record => {
        expect(record.organisationId).toBeDefined();
        expect(record.missingFields).toBeDefined();
        expect(record.missingFields.length).toBeGreaterThan(0);
        expect(record.completenessScore).toBeGreaterThanOrEqual(0);
        expect(record.completenessScore).toBeLessThanOrEqual(100);
        expect(record.priority).toMatch(/^(low|medium|high)$/);
      });
    });

    it('should provide conflict resolution recommendations', async () => {
      // TDD: Test conflict resolution logic
      // Given: conflicting data across sources
      // When: conflict analysis is performed
      // Then: system should provide resolution recommendations
      
      const result = await orchestrator.performDeduplication();
      
      if (result.conflicts.length > 0) {
        result.conflicts.forEach(conflict => {
          expect(conflict.resolution).toBeDefined();
          expect(conflict.resolution.recommendedValue).toBeDefined();
          expect(conflict.resolution.confidence).toBeGreaterThanOrEqual(0);
          expect(conflict.resolution.confidence).toBeLessThanOrEqual(100);
          expect(conflict.resolution.reasoning).toBeDefined();
          expect(typeof conflict.resolution.reasoning).toBe('string');
        });
      }
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle special characters and encoding issues in organisation names', async () => {
      // TDD: Test handling of special characters (edge case from spec)
      // Given: organisation names with special characters or encoding issues
      // When: deduplication is performed
      // Then: system should handle them gracefully without corruption
      
      const result = await orchestrator.performDeduplication();
      
      // Check for organisations with special characters
      const orgsWithSpecialChars = result.uniqueOrganisations.filter(org =>
        /[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ&'"°£€]/.test(org.name)
      );
      
      if (orgsWithSpecialChars.length > 0) {
        orgsWithSpecialChars.forEach(org => {
          // Name should be properly encoded and readable
          expect(org.name).toBeDefined();
          expect(org.name.length).toBeGreaterThan(0);
          expect(org.name).not.toContain('\ufffd'); // No replacement characters
          expect(org.name).not.toContain('?'); // No question mark replacements
        });
      }
    });

    it('should handle organisations with identical names but different contexts', async () => {
      // TDD: Test disambiguation of organisations with same names
      // Given: multiple organisations with identical or very similar names
      // When: deduplication is performed
      // Then: system should distinguish between genuinely different organisations
      
      const result = await orchestrator.performDeduplication();
      
      // Group organisations by name
      const nameGroups = result.uniqueOrganisations.reduce((groups, org) => {
        const name = org.name.toLowerCase().trim();
        if (!groups[name]) groups[name] = [];
        groups[name].push(org);
        return groups;
      }, {} as Record<string, OrganisationRecord[]>);
      
      // Find groups with multiple organisations
      const duplicateNameGroups = Object.entries(nameGroups)
        .filter(([_, orgs]) => orgs.length > 1);
      
      if (duplicateNameGroups.length > 0) {
        duplicateNameGroups.forEach(([name, orgs]) => {
          // Should have different distinguishing information
          orgs.forEach(org => {
            expect(org.distinguishingInfo).toBeDefined();
            // Could be location, parent organisation, type, etc.
            expect(
              org.distinguishingInfo.location ||
              org.distinguishingInfo.parentOrganisation ||
              org.distinguishingInfo.specificType
            ).toBeDefined();
          });
        });
      }
    });

    it('should maintain referential integrity in hierarchical relationships', async () => {
      // TDD: Test parent-child relationship consistency during deduplication
      // Given: organisations with parent-child relationships
      // When: deduplication is performed
      // Then: relationships should remain consistent and valid
      
      const result = await orchestrator.performDeduplication();
      
      const orgsWithParents = result.uniqueOrganisations.filter(org => org.parentOrganisation);
      
      if (orgsWithParents.length > 0) {
        const organisationIds = new Set(result.uniqueOrganisations.map(org => org.id));
        
        orgsWithParents.forEach(org => {
          // Parent should exist in the final dataset
          expect(organisationIds.has(org.parentOrganisation!)).toBe(true);
          
          // Should not have circular references
          expect(org.parentOrganisation).not.toBe(org.id);
        });
      }
    });
  });

  describe('Performance and Scale', () => {
    it('should perform deduplication efficiently at scale', async () => {
      // TDD: Test deduplication performance requirements
      // Given: large dataset requiring deduplication
      // When: deduplication is performed
      // Then: it should complete within reasonable time and memory constraints
      
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;
      
      const result = await orchestrator.performDeduplication();
      
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      const processingTime = endTime - startTime;
      const memoryIncrease = endMemory - startMemory;
      
      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(120000); // Should complete within 2 minutes
      expect(memoryIncrease).toBeLessThan(512 * 1024 * 1024); // Should not use more than 512MB additional memory
      
      // Performance metrics should be tracked
      expect(result.performance).toBeDefined();
      expect(result.performance.processingTimeMs).toBe(processingTime);
      expect(result.performance.recordsProcessed).toBeGreaterThan(0);
      expect(result.performance.recordsPerSecond).toBeGreaterThan(0);
    });
  });
});