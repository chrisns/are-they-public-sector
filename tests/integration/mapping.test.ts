/**
 * Integration Test: Field Mapping Between Sources
 * 
 * TDD APPROACH: This test is intentionally failing because:
 * - The services/orchestrator module doesn't exist yet
 * - The DataMappingService interface is not implemented
 * - The test defines expected field mapping behavior before implementation
 * 
 * This test covers FR-008 from the specification:
 * - Implement data mapping to reconcile different column headings and data structures
 * - Handle specific mappings like "Non-Institutional Unit name" → "Name"
 * - Include all source fields when mappings are unclear
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

// TDD: This import will fail because orchestrator doesn't exist yet
// This is intentional - the test is designed to fail until implementation
const { Orchestrator } = require('../../src/cli/orchestrator');

describe('Field Mapping Integration Tests', () => {
  let orchestrator;
  
  beforeEach(() => {
    // TDD: This will fail until Orchestrator class is implemented
    orchestrator = new Orchestrator();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('FR-008: Data Mapping Implementation', () => {
    it('should perform all specified field mappings correctly', async () => {
      // TDD: Tests acceptance scenario #4
      // Given: data from all three sources is collected
      // When: the system performs mapping
      // Then: it correctly maps specified fields according to FR-008
      
      const result = await orchestrator.performFieldMapping();
      
      expect(result.success).toBe(true);
      expect(result.mappedRecords).toBeDefined();
      expect(result.mappingConfiguration).toBeDefined();
      
      // Verify specific mappings from FR-008
      const config = result.mappingConfiguration;
      
      // ONS Non-Institutional Unit mappings
      expect(config.onsNonInstitutional['Non-Institutional Unit name']).toBe('name');
      expect(config.onsNonInstitutional['Sponsoring Entity']).toBe('controllingUnit');
      
      // Verify mapped records contain unified fields
      const mappedRecords = result.mappedRecords;
      expect(mappedRecords.length).toBeGreaterThan(0);
      
      mappedRecords.forEach(record => {
        expect(record.name).toBeDefined();
        if (record.sourceFields['Sponsoring Entity']) {
          expect(record.controllingUnit).toBeDefined();
        }
      });
    });

    it('should map GOV.UK API JSON fields to unified schema', async () => {
      // TDD: Test GOV.UK API field mapping
      // Given: GOV.UK API JSON data with its specific structure
      // When: mapping is applied
      // Then: JSON fields should be correctly mapped to unified fields
      
      const result = await orchestrator.performFieldMapping();
      
      const govUkRecords = result.mappedRecords.filter(
        record => record.sourceInfo.source === 'gov.uk-api'
      );
      
      expect(govUkRecords.length).toBeGreaterThan(0);
      
      govUkRecords.forEach(record => {
        // Essential fields should be mapped
        expect(record.name).toBeDefined();
        expect(record.name.length).toBeGreaterThan(0);
        
        // GOV.UK specific fields should be preserved
        expect(record.sourceFields).toBeDefined();
        
        // Type classification should be applied
        expect(record.type).toBeDefined();
        expect(['ministerial-department', 'executive-agency', 'ndpb', 'other-government-body'])
          .toContain(record.type);
      });
    });

    it('should map ONS Institutional Units tab fields correctly', async () => {
      // TDD: Test ONS Institutional Units mapping
      // Given: data from ONS "Organisation|Institutional Unit" tab
      // When: mapping is applied
      // Then: tab-specific fields should be mapped to unified schema
      
      const result = await orchestrator.performFieldMapping();
      
      const onsInstitutionalRecords = result.mappedRecords.filter(
        record => record.sourceInfo.source === 'ons-institutional-units'
      );
      
      expect(onsInstitutionalRecords.length).toBeGreaterThan(0);
      
      onsInstitutionalRecords.forEach(record => {
        // Basic fields should be mapped
        expect(record.name).toBeDefined();
        expect(record.type).toBeDefined();
        
        // ONS specific classifications should be preserved
        expect(record.sourceFields).toBeDefined();
        expect(record.onsClassification).toBeDefined();
        
        // Should maintain ONS institutional unit identifier
        expect(record.sourceFields.institutionalUnitId || record.sourceFields.onsCode).toBeDefined();
      });
    });

    it('should map ONS Non-Institutional Units tab fields correctly', async () => {
      // TDD: Test ONS Non-Institutional Units mapping
      // Given: data from ONS "Non-Institutional Units" tab
      // When: mapping is applied
      // Then: specific mappings from FR-008 should be applied
      
      const result = await orchestrator.performFieldMapping();
      
      const onsNonInstitutionalRecords = result.mappedRecords.filter(
        record => record.sourceInfo.source === 'ons-non-institutional-units'
      );
      
      expect(onsNonInstitutionalRecords.length).toBeGreaterThan(0);
      
      onsNonInstitutionalRecords.forEach(record => {
        // FR-008 specific mappings
        if (record.sourceFields['Non-Institutional Unit name']) {
          expect(record.name).toBe(record.sourceFields['Non-Institutional Unit name']);
        }
        
        if (record.sourceFields['Sponsoring Entity']) {
          expect(record.controllingUnit).toBe(record.sourceFields['Sponsoring Entity']);
        }
        
        // Should preserve original field names for traceability
        expect(record.sourceFields).toBeDefined();
        expect(Object.keys(record.sourceFields).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Unclear Mapping Handling', () => {
    it('should include all source fields when mappings are unclear', async () => {
      // TDD: Test FR-008 requirement for handling unclear mappings
      // Given: fields that don't have clear mappings
      // When: mapping is performed
      // Then: all source fields should be included for later reconciliation
      
      const result = await orchestrator.performFieldMapping();
      
      expect(result.unmappedFields).toBeDefined();
      expect(result.ambiguousFields).toBeDefined();
      
      // Check that records with unmapped fields retain all source data
      const recordsWithUnmappedFields = result.mappedRecords.filter(
        record => record.hasUnmappedFields
      );
      
      recordsWithUnmappedFields.forEach(record => {
        expect(record.sourceFields).toBeDefined();
        expect(Object.keys(record.sourceFields).length).toBeGreaterThan(0);
        
        // Should have metadata about what wasn't mapped
        expect(record.mappingMetadata).toBeDefined();
        expect(record.mappingMetadata.unmappedSourceFields).toBeDefined();
        expect(record.mappingMetadata.unmappedSourceFields.length).toBeGreaterThan(0);
      });
    });

    it('should flag ambiguous mappings for review', async () => {
      // TDD: Test identification of ambiguous mappings
      // Given: source fields that could map to multiple unified fields
      // When: mapping analysis is performed
      // Then: ambiguous cases should be flagged for manual review
      
      const result = await orchestrator.performFieldMapping();
      
      if (result.ambiguousFields.length > 0) {
        result.ambiguousFields.forEach(ambiguousField => {
          expect(ambiguousField.sourceField).toBeDefined();
          expect(ambiguousField.possibleMappings).toBeDefined();
          expect(ambiguousField.possibleMappings.length).toBeGreaterThanOrEqual(2);
          expect(ambiguousField.confidence).toBeDefined();
          expect(ambiguousField.confidence).toBeLessThan(0.8); // Should be low confidence
          expect(ambiguousField.requiresManualReview).toBe(true);
        });
      }
    });
  });

  describe('Cross-Source Field Reconciliation', () => {
    it('should handle equivalent fields across different sources', async () => {
      // TDD: Test reconciliation of equivalent fields from different sources
      // Given: similar fields with different names across sources
      // When: mapping is performed
      // Then: equivalent fields should be mapped to the same unified field
      
      const result = await orchestrator.performFieldMapping();
      
      // Check that equivalent concepts are mapped consistently
      const mappingConfig = result.mappingConfiguration;
      
      // Organization name variations should all map to 'name'
      const nameFieldMappings = Object.values(mappingConfig).flat()
        .filter((mapping: FieldMapping) => mapping.targetField === 'name');
      
      expect(nameFieldMappings.length).toBeGreaterThan(1); // Multiple sources should map to name
      
      nameFieldMappings.forEach(mapping => {
        expect(['name', 'title', 'organisation_name', 'Non-Institutional Unit name'])
          .toContain(mapping.sourceField.toLowerCase().replace(/[_\s-]/g, ''));
      });
    });

    it('should maintain field mapping consistency across all records', async () => {
      // TDD: Test consistency of field mappings
      // Given: multiple records from the same source
      // When: mapping is applied
      // Then: the same source fields should always map to the same unified fields
      
      const result = await orchestrator.performFieldMapping();
      
      // Group records by source
      const recordsBySource = result.mappedRecords.reduce((groups, record) => {
        const source = record.sourceInfo.source;
        if (!groups[source]) groups[source] = [];
        groups[source].push(record);
        return groups;
      }, {} as Record<string, UnifiedRecord[]>);
      
      Object.entries(recordsBySource).forEach(([source, records]) => {
        if (records.length > 1) {
          // All records from same source should use consistent mappings
          const firstRecord = records[0];
          const firstMappings = firstRecord.mappingMetadata.appliedMappings;
          
          records.slice(1).forEach(record => {
            expect(record.mappingMetadata.appliedMappings).toEqual(firstMappings);
          });
        }
      });
    });
  });

  describe('Data Type and Format Handling', () => {
    it('should handle date field transformations correctly', async () => {
      // TDD: Test date field mapping and normalization
      // Given: date fields in various formats across sources
      // When: mapping is performed
      // Then: dates should be normalized to consistent format
      
      const result = await orchestrator.performFieldMapping();
      
      const recordsWithDates = result.mappedRecords.filter(
        record => record.establishmentDate || record.lastUpdated
      );
      
      if (recordsWithDates.length > 0) {
        recordsWithDates.forEach(record => {
          if (record.establishmentDate) {
            // Should be valid ISO date string or Date object
            expect(() => new Date(record.establishmentDate)).not.toThrow();
            expect(new Date(record.establishmentDate).toString()).not.toBe('Invalid Date');
          }
          
          if (record.lastUpdated) {
            expect(() => new Date(record.lastUpdated)).not.toThrow();
            expect(new Date(record.lastUpdated).toString()).not.toBe('Invalid Date');
          }
        });
      }
    });

    it('should handle boolean field variations correctly', async () => {
      // TDD: Test boolean field normalization
      // Given: boolean fields represented in different ways (Y/N, true/false, 1/0)
      // When: mapping is performed
      // Then: boolean values should be normalized to consistent format
      
      const result = await orchestrator.performFieldMapping();
      
      const recordsWithBooleans = result.mappedRecords.filter(
        record => typeof record.isActive === 'boolean' || 
                  typeof record.isPublicFacing === 'boolean'
      );
      
      if (recordsWithBooleans.length > 0) {
        recordsWithBooleans.forEach(record => {
          if (record.hasOwnProperty('isActive')) {
            expect(typeof record.isActive).toBe('boolean');
          }
          if (record.hasOwnProperty('isPublicFacing')) {
            expect(typeof record.isPublicFacing).toBe('boolean');
          }
        });
      }
    });
  });

  describe('Mapping Quality and Validation', () => {
    it('should validate mapping completeness and accuracy', async () => {
      // TDD: Test mapping quality validation
      // Given: field mappings are applied
      // When: validation is performed
      // Then: mapping quality metrics should be reported
      
      const result = await orchestrator.performFieldMapping();
      
      expect(result.validationResults).toBeDefined();
      
      const validation = result.validationResults;
      expect(validation.totalSourceFields).toBeGreaterThan(0);
      expect(validation.mappedFields).toBeGreaterThanOrEqual(0);
      expect(validation.unmappedFields).toBeGreaterThanOrEqual(0);
      expect(validation.mappedFields + validation.unmappedFields).toBe(validation.totalSourceFields);
      expect(validation.mappingCompleteness).toBeGreaterThan(0.5); // At least 50% should be mapped
      expect(validation.mappingCompleteness).toBeLessThanOrEqual(1.0);
    });

    it('should track mapping provenance and transformation history', async () => {
      // TDD: Test mapping audit trail
      // Given: field transformations are applied
      // When: mapping is completed
      // Then: full transformation history should be maintained
      
      const result = await orchestrator.performFieldMapping();
      
      result.mappedRecords.forEach(record => {
        expect(record.transformationHistory).toBeDefined();
        
        if (record.transformationHistory.length > 0) {
          record.transformationHistory.forEach(transformation => {
            expect(transformation.sourceField).toBeDefined();
            expect(transformation.targetField).toBeDefined();
            expect(transformation.transformationType).toBeDefined();
            expect(transformation.appliedAt).toBeDefined();
            expect(['direct-copy', 'format-conversion', 'value-normalization', 'type-conversion'])
              .toContain(transformation.transformationType);
          });
        }
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and empty field values gracefully', async () => {
      // TDD: Test null/empty value handling
      // Given: source data with null, undefined, or empty field values
      // When: mapping is performed
      // Then: these values should be handled without causing errors
      
      const result = await orchestrator.performFieldMapping();
      
      expect(result.success).toBe(true);
      
      // Check that records with missing data are handled properly
      const recordsWithMissingData = result.mappedRecords.filter(
        record => record.dataQuality.hasMissingFields
      );
      
      recordsWithMissingData.forEach(record => {
        expect(record.dataQuality.missingFieldCount).toBeGreaterThan(0);
        expect(record.dataQuality.missingFields).toBeDefined();
        expect(Array.isArray(record.dataQuality.missingFields)).toBe(true);
      });
    });

    it('should handle special characters in field names and values', async () => {
      // TDD: Test special character handling
      // Given: field names or values with special characters
      // When: mapping is performed
      // Then: special characters should be preserved or properly escaped
      
      const result = await orchestrator.performFieldMapping();
      
      // Look for records with special characters
      const recordsWithSpecialChars = result.mappedRecords.filter(record =>
        Object.keys(record.sourceFields).some(key => /[^\w\s-]/.test(key)) ||
        Object.values(record.sourceFields).some(value => 
          typeof value === 'string' && /[^\w\s-.,()&']/.test(value)
        )
      );
      
      if (recordsWithSpecialChars.length > 0) {
        recordsWithSpecialChars.forEach(record => {
          // Should not have corrupted the data
          expect(record.name).toBeDefined();
          expect(record.name).not.toContain('\ufffd'); // No replacement characters
          
          // Source fields should be preserved
          expect(Object.keys(record.sourceFields).length).toBeGreaterThan(0);
        });
      }
    });

    it('should report mapping errors and continue processing', async () => {
      // TDD: Test error resilience in mapping
      // Given: some records that cause mapping errors
      // When: mapping is performed
      // Then: errors should be logged but processing should continue
      
      const result = await orchestrator.performFieldMapping();
      
      if (result.errors && result.errors.length > 0) {
        expect(result.success).toBe(true); // Should still succeed overall
        
        result.errors.forEach(error => {
          expect(error.recordId || error.sourceField).toBeDefined();
          expect(error.errorType).toBeDefined();
          expect(error.message).toBeDefined();
          expect(error.severity).toMatch(/^(warning|error|critical)$/);
        });
        
        // Should have successfully processed some records despite errors
        expect(result.mappedRecords.length).toBeGreaterThan(0);
      }
    });
  });
});