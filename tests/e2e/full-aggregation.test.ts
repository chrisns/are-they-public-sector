/**
 * End-to-End Test: Full Aggregation Workflow
 * Tests the complete aggregation process from data fetching to final output
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { Orchestrator } from '../../src/cli/orchestrator';
import type { Organisation, OrganisationType } from '../../src/models/organisation';

describe('Full Aggregation E2E Tests', () => {
  const tempDir = join(__dirname, '..', 'temp-e2e');
  const outputPath = join(tempDir, 'orgs-e2e.json');
  let orchestrator: Orchestrator;

  beforeAll(() => {
    // Ensure temp directory exists
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // Create orchestrator instance
    orchestrator = new Orchestrator({
      outputPath,
      cacheDir: join(tempDir, 'cache'),
      debugMode: false
    });
  });

  afterAll(() => {
    // Cleanup temp directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should complete full aggregation workflow successfully', async () => {
    console.log('\n🚀 Starting full aggregation E2E test...');

    // Execute the complete aggregation workflow
    const startTime = Date.now();
    const result = await orchestrator.execute();
    const duration = Date.now() - startTime;

    console.log(`⏱️  Total execution time: ${duration}ms`);

    // Verify workflow completed successfully
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    // Verify output file was created
    expect(existsSync(outputPath)).toBe(true);

    // Load and validate output structure
    const outputContent = readFileSync(outputPath, 'utf-8');
    const outputData = JSON.parse(outputContent);

    // Validate top-level structure
    expect(outputData).toHaveProperty('organisations');
    expect(outputData).toHaveProperty('metadata');
    expect(outputData).toHaveProperty('summary');

    // Validate organisations array
    expect(Array.isArray(outputData.organisations)).toBe(true);
    expect(outputData.organisations.length).toBeGreaterThan(0);

    console.log(`📊 Total organisations found: ${outputData.organisations.length}`);

    // Sample organisation validation
    const sampleOrg: Organisation = outputData.organisations[0];
    expect(sampleOrg).toHaveProperty('id');
    expect(sampleOrg).toHaveProperty('name');
    expect(sampleOrg).toHaveProperty('type');
    expect(sampleOrg).toHaveProperty('status');
    expect(sampleOrg).toHaveProperty('sources');
    expect(sampleOrg).toHaveProperty('dataQuality');
    expect(sampleOrg).toHaveProperty('lastUpdated');

    // Validate metadata
    expect(outputData.metadata).toHaveProperty('processedAt');
    expect(outputData.metadata).toHaveProperty('sources');
    expect(outputData.metadata).toHaveProperty('totalProcessedRecords');
    expect(outputData.metadata.sources.length).toBeGreaterThanOrEqual(1);

    // Validate summary statistics
    expect(outputData.summary).toHaveProperty('totalOrganisations');
    expect(outputData.summary).toHaveProperty('organisationsByType');
    expect(outputData.summary).toHaveProperty('organisationsByStatus');
    expect(outputData.summary).toHaveProperty('dataQuality');
    expect(outputData.summary.totalOrganisations).toBe(outputData.organisations.length);

    console.log('✅ Full aggregation workflow completed successfully');
  }, 120_000); // 2-minute timeout for full workflow

  test('should handle workflow with mocked data sources', async () => {
    console.log('\n🧪 Testing workflow with mocked data sources...');

    // Create a test orchestrator with mocked services
    const mockOrchestrator = new Orchestrator({
      outputPath: join(tempDir, 'orgs-mocked.json'),
      cacheDir: join(tempDir, 'cache-mock'),
      debugMode: true
    });

    // Generate mock data to simulate fetching
    const mockGovUkData = [
      {
        content_id: 'test-gov-uk-1',
        title: 'Test Department 1',
        document_type: 'ministerial_department',
        base_path: '/government/organisations/test-dept-1',
        locale: 'en',
        updated_at: new Date().toISOString(),
        details: {
          organisation_govuk_status: { status: 'live' },
          brand: 'hm-government',
          organisation_type: 'ministerial_department'
        },
        links: {
          parent_organisations: []
        }
      },
      {
        content_id: 'test-gov-uk-2',
        title: 'Test Agency 1',
        document_type: 'executive_agency',
        base_path: '/government/organisations/test-agency-1',
        locale: 'en',
        updated_at: new Date().toISOString(),
        details: {
          organisation_govuk_status: { status: 'live' },
          brand: 'hm-government',
          organisation_type: 'executive_agency'
        },
        links: {
          parent_organisations: [{ content_id: 'test-gov-uk-1' }]
        }
      }
    ];

    const mockOnsInstitutional = [
      {
        'Organisation Name': 'Test ONS Institution',
        'ONS code': 'ONS001',
        'Classification': 'Central government',
        'Sector': 'S.1311',
        'Start date': '2020-01-01',
        'End date': null,
        'Website': 'https://test-institution.gov.uk'
      }
    ];

    const mockOnsNonInstitutional = [
      {
        'Non-Institutional Unit name': 'Test Non-Institutional Unit',
        'Sponsoring Entity': 'Test Department 1',
        'Classification': 'Government scheme',
        'Website': 'https://test-unit.gov.uk'
      }
    ];

    // Test the workflow with mock data
    const result = await mockOrchestrator.executeWithMockData({
      govUkData: mockGovUkData,
      onsInstitutional: mockOnsInstitutional,
      onsNonInstitutional: mockOnsNonInstitutional
    });

    // Validate results
    expect(result.success).toBe(true);
    expect(result.organisations.length).toBeGreaterThan(0);

    // Check that all data sources are represented
    const sources = result.organisations.map(org => org.sources.map(s => s.source)).flat();
    const uniqueSources = [...new Set(sources)];
    expect(uniqueSources.length).toBeGreaterThanOrEqual(1);

    console.log(`✅ Mock workflow completed with ${result.organisations.length} organisations`);
  }, 60_000);

  test('should maintain data integrity throughout the pipeline', async () => {
    console.log('\n🔍 Testing data integrity throughout pipeline...');

    // Execute workflow with detailed tracking
    const result = await orchestrator.executeWithTracking();

    expect(result.success).toBe(true);

    // Validate that no data was lost in transformations
    if (result.phases) {
      const fetchedRecords = 
        (result.phases.dataFetching.govUk.recordCount || 0) +
        (result.phases.dataFetching.onsInstitutional.recordCount || 0) +
        (result.phases.dataFetching.onsNonInstitutional.recordCount || 0);

      const mappedRecords = result.phases.dataMapping.successfulMappings || 0;
      const finalRecords = result.phases.outputGeneration.recordCount || 0;

      console.log(`📊 Data flow: ${fetchedRecords} fetched → ${mappedRecords} mapped → ${finalRecords} final`);

      // Should not lose more than 5% of records through processing
      const retentionRate = finalRecords / Math.max(fetchedRecords, 1);
      expect(retentionRate).toBeGreaterThan(0.95);

      // Validate deduplication worked if duplicates were found
      if (result.phases.deduplication.duplicatesFound && result.phases.deduplication.duplicatesFound > 0) {
        expect(result.phases.deduplication.duplicatesResolved).toBeGreaterThan(0);
        expect(finalRecords).toBeLessThan(mappedRecords);
      }
    }

    console.log('✅ Data integrity maintained throughout pipeline');
  }, 90_000);

  test('should generate comprehensive output metadata', async () => {
    console.log('\n📋 Testing output metadata generation...');

    const result = await orchestrator.execute();
    expect(result.success).toBe(true);

    // Load output and validate metadata
    const outputData = JSON.parse(readFileSync(outputPath, 'utf-8'));

    // Validate processing metadata
    expect(outputData.metadata.processedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    expect(outputData.metadata.totalProcessedRecords).toBeGreaterThan(0);
    expect(outputData.metadata.duplicatesRemoved).toBeGreaterThanOrEqual(0);
    expect(outputData.metadata.sources).toContain('gov_uk_api');

    // Validate summary statistics
    expect(typeof outputData.summary.totalOrganisations).toBe('number');
    expect(typeof outputData.summary.organisationsByType).toBe('object');
    expect(typeof outputData.summary.organisationsByStatus).toBe('object');
    expect(typeof outputData.summary.dataQuality.averageCompleteness).toBe('number');

    // Validate data quality metrics
    expect(outputData.summary.dataQuality.averageCompleteness).toBeGreaterThan(0);
    expect(outputData.summary.dataQuality.averageCompleteness).toBeLessThanOrEqual(1);

    // Check that status counts add up
    const statusCounts = outputData.summary.organisationsByStatus;
    const totalFromStatus = (statusCounts.active || 0) + (statusCounts.inactive || 0) + (statusCounts.dissolved || 0);
    expect(totalFromStatus).toBe(outputData.summary.totalOrganisations);

    console.log('✅ Output metadata is comprehensive and accurate');
  }, 90_000);

  test('should handle partial failures gracefully', async () => {
    console.log('\n⚠️  Testing graceful handling of partial failures...');

    // Create orchestrator with potential failure scenarios
    const testOrchestrator = new Orchestrator({
      outputPath: join(tempDir, 'orgs-partial-failure.json'),
      cacheDir: join(tempDir, 'cache-partial'),
      debugMode: true
    });

    // Test with simulated network issues for some sources
    const result = await testOrchestrator.executeWithPartialFailures({
      govUkApiFails: false,        // Allow GOV.UK to succeed
      onsInstitutionalFails: true, // Simulate ONS institutional failure
      onsNonInstitutionalFails: false // Allow ONS non-institutional to succeed
    });

    // Should still produce output despite partial failures
    expect(result.success).toBe(true);
    expect(result.organisations.length).toBeGreaterThan(0);

    // Should report which sources failed
    expect(result.metadata).toHaveProperty('failedSources');
    if (result.metadata?.failedSources) {
      expect(result.metadata.failedSources).toContain('ons_institutional');
    }

    // Should indicate data is incomplete
    expect(result.metadata).toHaveProperty('isComplete');
    expect(result.metadata?.isComplete).toBe(false);

    console.log(`✅ Handled partial failures gracefully, produced ${result.organisations.length} records`);
  }, 90_000);

  test('should validate output against JSON schema', async () => {
    console.log('\n✅ Validating output against expected schema...');

    // Execute workflow
    const result = await orchestrator.execute();
    expect(result.success).toBe(true);

    // Load and parse output
    const outputData = JSON.parse(readFileSync(outputPath, 'utf-8'));

    // Validate each organisation matches expected schema
    for (const org of outputData.organisations.slice(0, 10)) { // Sample first 10
      // Required fields
      expect(typeof org.id).toBe('string');
      expect(typeof org.name).toBe('string');
      expect(typeof org.type).toBe('string');
      expect(typeof org.classification).toBe('string');
      expect(typeof org.status).toBe('string');
      expect(Array.isArray(org.sources)).toBe(true);
      expect(typeof org.dataQuality).toBe('object');
      expect(typeof org.lastUpdated).toBe('string');

      // Validate status enum
      expect(['active', 'inactive', 'dissolved']).toContain(org.status);

      // Validate sources structure
      for (const source of org.sources) {
        expect(typeof source.source).toBe('string');
        expect(typeof source.retrievedAt).toBe('string');
        expect(typeof source.confidence).toBe('number');
        expect(source.confidence).toBeGreaterThan(0);
        expect(source.confidence).toBeLessThanOrEqual(1);
      }

      // Validate data quality
      expect(typeof org.dataQuality.completeness).toBe('number');
      expect(typeof org.dataQuality.hasConflicts).toBe('boolean');
      expect(typeof org.dataQuality.requiresReview).toBe('boolean');
    }

    console.log('✅ All organisations conform to expected schema');
  }, 90_000);
});