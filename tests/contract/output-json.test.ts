/**
 * TDD CONTRACT TEST: JSON Output Structure Contract
 * 
 * This test is designed to FAIL initially since the WriterService doesn't exist yet.
 * This follows Test-Driven Development (TDD) principles where we write failing tests first
 * that define the contract, then implement the services to make them pass.
 * 
 * Expected failure: Module not found error for '../../src/services/WriterService.js'
 */
import { describe, it, expect } from '@jest/globals';
import { WriterService } from '../../src/services/WriterService';
import * as outputContract from '../../specs/001-aggregator-of-data/contracts/output-contract.json';

describe('Output JSON Contract', () => {
  let writerService: WriterService;

  beforeEach(() => {
    // This will fail because WriterService doesn't exist yet
    writerService = new WriterService();
  });

  it('should generate JSON that matches the output contract structure', async () => {
    // This test will fail because the WriterService doesn't exist
    const result = await writerService.generateOutput();
    
    // Verify the result is an object
    expect(typeof result).toBe('object');
    expect(result).not.toBeNull();
    
    // Verify required top-level properties exist
    expect(result).toHaveProperty('organisations');
    expect(result).toHaveProperty('metadata');
    
    // Verify organisations is an array
    expect(Array.isArray(result.organisations)).toBe(true);
    
    // Verify metadata is an object
    expect(typeof result.metadata).toBe('object');
    expect(result.metadata).not.toBeNull();
  });

  it('should have organisations with required fields', async () => {
    const result = await writerService.generateOutput();
    
    // If there are organisations, each should have required fields
    if (result.organisations.length > 0) {
      const org = result.organisations[0];
      
      // Check required fields as defined in contract
      expect(org).toHaveProperty('id');
      expect(org).toHaveProperty('name');
      expect(org).toHaveProperty('type');
      expect(org).toHaveProperty('status');
      expect(org).toHaveProperty('sources');
      
      // Verify field types
      expect(typeof org.id).toBe('string');
      expect(typeof org.name).toBe('string');
      expect(typeof org.type).toBe('string');
      expect(typeof org.status).toBe('string');
      expect(Array.isArray(org.sources)).toBe(true);
      
      // Verify type is one of the allowed enum values
      const allowedTypes = [
        'ministerial_department',
        'executive_agency',
        'local_authority',
        'nhs_trust',
        'nhs_foundation_trust',
        'non_departmental_public_body',
        'executive_ndpb',
        'advisory_ndpb',
        'tribunal_ndpb',
        'public_corporation',
        'devolved_administration',
        'other'
      ];
      expect(allowedTypes).toContain(org.type);
      
      // Verify status is one of the allowed enum values
      const allowedStatuses = ['active', 'inactive', 'dissolved'];
      expect(allowedStatuses).toContain(org.status);
      
      // Verify sources array has at least one item and each has required fields
      expect(org.sources.length).toBeGreaterThan(0);
      const source = org.sources[0];
      expect(source).toHaveProperty('source');
      expect(source).toHaveProperty('retrievedAt');
      expect(typeof source.source).toBe('string');
      expect(typeof source.retrievedAt).toBe('string');
      
      // Verify source is one of the allowed enum values
      const allowedSources = ['gov_uk_api', 'ons_institutional_unit', 'ons_non_institutional_unit'];
      expect(allowedSources).toContain(source.source);
    }
  });

  it('should have metadata with required fields', async () => {
    const result = await writerService.generateOutput();
    
    const metadata = result.metadata;
    
    // Check required metadata fields as defined in contract
    expect(metadata).toHaveProperty('processedAt');
    expect(metadata).toHaveProperty('sources');
    expect(metadata).toHaveProperty('statistics');
    
    // Verify field types
    expect(typeof metadata.processedAt).toBe('string');
    expect(Array.isArray(metadata.sources)).toBe(true);
    expect(typeof metadata.statistics).toBe('object');
    expect(metadata.statistics).not.toBeNull();
    
    // Verify statistics required fields
    const stats = metadata.statistics;
    expect(stats).toHaveProperty('totalOrganisations');
    expect(stats).toHaveProperty('duplicatesFound');
    expect(stats).toHaveProperty('conflictsDetected');
    
    expect(typeof stats.totalOrganisations).toBe('number');
    expect(typeof stats.duplicatesFound).toBe('number');
    expect(typeof stats.conflictsDetected).toBe('number');
    
    // Verify metadata sources array structure if not empty
    if (metadata.sources.length > 0) {
      const metaSource = metadata.sources[0];
      expect(metaSource).toHaveProperty('source');
      expect(metaSource).toHaveProperty('recordCount');
      expect(metaSource).toHaveProperty('retrievedAt');
      
      expect(typeof metaSource.source).toBe('string');
      expect(typeof metaSource.recordCount).toBe('number');
      expect(typeof metaSource.retrievedAt).toBe('string');
      
      // Verify source is one of the allowed enum values
      const allowedSources = ['gov_uk_api', 'ons_institutional_unit', 'ons_non_institutional_unit'];
      expect(allowedSources).toContain(metaSource.source);
    }
  });

  it('should match the complete JSON schema from the contract', async () => {
    const result = await writerService.generateOutput();
    
    // This is a comprehensive test that would validate against the full JSON schema
    // For now, we'll just verify the basic structure matches what's expected
    
    // The contract specifies the schema structure - we should validate against it
    const schema = outputContract.schema;
    
    // Verify the result has the required properties from the schema
    expect(typeof result).toBe(schema.type);
    
    schema.required.forEach((prop: string) => {
      expect(result).toHaveProperty(prop);
    });
    
    // Verify organisations array structure matches schema
    if (result.organisations.length > 0) {
      const org = result.organisations[0];
      const orgSchema = schema.properties.organisations.items;
      
      orgSchema.required.forEach((prop: string) => {
        expect(org).toHaveProperty(prop);
      });
    }
    
    // Verify metadata structure matches schema
    const metadataSchema = schema.properties.metadata;
    metadataSchema.required.forEach((prop: string) => {
      expect(result.metadata).toHaveProperty(prop);
    });
  });
});