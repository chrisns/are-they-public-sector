/**
 * Integration Test: Complete Aggregation Flow
 * 
 * TDD APPROACH: This test is intentionally failing because:
 * - The services/orchestrator module doesn't exist yet
 * - The test describes the expected behavior before implementation
 * - Helps define the interface and requirements for the orchestrator
 * 
 * This test covers the complete end-to-end aggregation workflow as specified
 * in specs/001-aggregator-of-data/spec.md acceptance scenarios.
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

// TDD: This import will fail because orchestrator doesn't exist yet
// This is intentional - the test is designed to fail until implementation
const { Orchestrator } = require('../../src/cli/orchestrator');

describe('Complete Aggregation Flow Integration Tests', () => {
  let orchestrator;
  
  beforeEach(() => {
    // TDD: This will fail until Orchestrator class is implemented
    orchestrator = new Orchestrator();
  });

  afterEach(() => {
    // Clean up any test artifacts
    jest.clearAllMocks();
  });

  describe('FR-001: Data Source Aggregation', () => {
    it('should successfully aggregate data from all three primary sources', async () => {
      // TDD: Tests acceptance scenario #1 and #6
      // Given: All three data sources are available
      // When: The system performs complete aggregation
      // Then: It should return aggregated data from all sources
      
      const result = await orchestrator.performCompleteAggregation();
      
      expect(result.success).toBe(true);
      expect(result.sources).toHaveLength(3);
      expect(result.sources).toContain('gov.uk-api');
      expect(result.sources).toContain('ons-institutional-units');
      expect(result.sources).toContain('ons-non-institutional-units');
      expect(result.organisations.length).toBeGreaterThan(0);
      expect(result.totalRecords).toBeGreaterThan(1000); // FR-011: Handle tens of thousands
    });

    it('should fetch GOV.UK organisations data successfully', async () => {
      // TDD: Tests acceptance scenario #1
      // Given: the GOV.UK API endpoint exists
      // When: the system fetches the organisations data
      // Then: it successfully parses the JSON and extracts all organisation records
      
      const result = await orchestrator.fetchGovUkData();
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data.organisations)).toBe(true);
      expect(result.data.organisations.length).toBeGreaterThan(0);
      expect(result.metadata.source).toBe('https://www.gov.uk/api/content/government/organisations');
      expect(result.metadata.fetchedAt).toBeDefined();
    });

    it('should dynamically fetch and process ONS classification guide', async () => {
      // TDD: Tests acceptance scenarios #2 and #3, FR-009
      // Given: the ONS classification guide page exists
      // When: the system scrapes the HTML and processes the Excel file
      // Then: it extracts data from both required tabs
      
      const result = await orchestrator.fetchOnsData();
      
      expect(result.success).toBe(true);
      expect(result.institutionalUnits).toBeDefined();
      expect(result.nonInstitutionalUnits).toBeDefined();
      expect(result.institutionalUnits.length).toBeGreaterThan(0);
      expect(result.nonInstitutionalUnits.length).toBeGreaterThan(0);
      expect(result.metadata.excelUrl).toContain('/methodology/');
      expect(result.metadata.excelUrl).toContain('.xlsx');
      expect(result.metadata.dynamicallyResolved).toBe(true);
    });
  });

  describe('FR-002: Output Generation', () => {
    it('should generate a valid consolidated JSON file', async () => {
      // TDD: Tests acceptance scenario #6
      // Given: all data is processed
      // When: the system generates output
      // Then: it produces a valid JSON file containing all aggregated organisation data
      
      const result = await orchestrator.generateConsolidatedOutput();
      
      expect(result.success).toBe(true);
      expect(result.outputPath).toMatch(/\.json$/);
      expect(result.recordCount).toBeGreaterThan(0);
      expect(result.validation.isValidJson).toBe(true);
      expect(result.validation.hasRequiredFields).toBe(true);
      
      // Verify the output contains expected structure
      expect(result.preview.metadata).toBeDefined();
      expect(result.preview.metadata.generatedAt).toBeDefined();
      expect(result.preview.metadata.sources).toHaveLength(3);
      expect(result.preview.organisations).toBeDefined();
      expect(Array.isArray(result.preview.organisations)).toBe(true);
    });
  });

  describe('FR-003: Organisation Classification', () => {
    it('should categorise organisations by type', async () => {
      // TDD: Test organisation categorisation functionality
      // Given: organisations from multiple sources
      // When: categorisation is applied
      // Then: each organisation should have a proper type classification
      
      const result = await orchestrator.performCompleteAggregation();
      const organisations = result.organisations;
      
      const expectedTypes = [
        'central-government',
        'local-authority', 
        'nhs',
        'executive-agency',
        'ndpb',
        'ministerial-department'
      ];
      
      const foundTypes = new Set(organisations.map(org => org.type));
      
      expect(organisations.every(org => org.type)).toBe(true);
      expect(foundTypes.size).toBeGreaterThan(3); // Should have variety of types
      expect([...foundTypes].some(type => expectedTypes.includes(type))).toBe(true);
    });
  });

  describe('FR-005: Data Provenance Tracking', () => {
    it('should maintain provenance information for all data', async () => {
      // TDD: Test data provenance tracking
      // Given: data from multiple sources
      // When: aggregation is performed
      // Then: each piece of data should track its source and date
      
      const result = await orchestrator.performCompleteAggregation();
      const organisations = result.organisations;
      
      organisations.forEach(org => {
        expect(org.provenance).toBeDefined();
        expect(org.provenance.sources).toBeDefined();
        expect(org.provenance.sources.length).toBeGreaterThan(0);
        expect(org.provenance.lastUpdated).toBeDefined();
        expect(org.provenance.primarySource).toBeDefined();
        
        org.provenance.sources.forEach(source => {
          expect(source.name).toBeDefined();
          expect(source.fetchedAt).toBeDefined();
          expect(['gov.uk-api', 'ons-institutional-units', 'ons-non-institutional-units'])
            .toContain(source.name);
        });
      });
    });
  });

  describe('FR-011: Scale Requirements', () => {
    it('should handle tens of thousands to low hundreds of thousands of records', async () => {
      // TDD: Test scale requirements
      // Given: large datasets from all sources
      // When: complete aggregation is performed
      // Then: system should handle the expected scale without issues
      
      const startTime = Date.now();
      const result = await orchestrator.performCompleteAggregation();
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(result.success).toBe(true);
      expect(result.totalRecords).toBeGreaterThan(10000); // Tens of thousands
      expect(result.totalRecords).toBeLessThan(500000); // Low hundreds of thousands
      expect(processingTime).toBeLessThan(300000); // Should complete within 5 minutes
      expect(result.performance.memoryUsed).toBeDefined();
      expect(result.performance.peakMemoryMB).toBeLessThan(2048); // Should not exceed 2GB
    });
  });

  describe('Integration Workflow', () => {
    it('should execute the complete workflow end-to-end', async () => {
      // TDD: Test the complete integration workflow
      // This test represents the full user journey described in the spec
      
      const workflow = await orchestrator.executeCompleteWorkflow();
      
      // Step 1: Data fetching phase
      expect(workflow.phases.dataFetching.govUk.success).toBe(true);
      expect(workflow.phases.dataFetching.onsInstitutional.success).toBe(true);
      expect(workflow.phases.dataFetching.onsNonInstitutional.success).toBe(true);
      
      // Step 2: Data mapping phase
      expect(workflow.phases.dataMapping.success).toBe(true);
      expect(workflow.phases.dataMapping.mappedFields).toBeGreaterThan(5);
      
      // Step 3: Deduplication phase
      expect(workflow.phases.deduplication.success).toBe(true);
      expect(workflow.phases.deduplication.duplicatesFound).toBeGreaterThan(0);
      expect(workflow.phases.deduplication.duplicatesResolved).toBe(workflow.phases.deduplication.duplicatesFound);
      
      // Step 4: Output generation phase
      expect(workflow.phases.outputGeneration.success).toBe(true);
      expect(workflow.phases.outputGeneration.filePath).toBeDefined();
      expect(workflow.phases.outputGeneration.recordCount).toBeGreaterThan(0);
      
      // Overall workflow success
      expect(workflow.success).toBe(true);
      expect(workflow.completedAt).toBeDefined();
      expect(workflow.totalDurationMs).toBeGreaterThan(0);
    });
  });
});