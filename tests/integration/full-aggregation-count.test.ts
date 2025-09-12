/**
 * Integration test for complete aggregation
 * Verifies the aggregator returns the correct total number of organizations
 * 
 * Actual counts as of test creation:
 * - GOV.UK API: 1235 organizations
 * - ONS Excel: 1610 organizations (869 Central Gov + 741 Local Gov)
 * - Total expected: ~2845 organizations (may have some duplicates)
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { Orchestrator } from '../../src/cli/orchestrator';
import * as fs from 'fs';
import * as path from 'path';

describe('Full Aggregation Count Integration Test', () => {
  const outputPath = path.join(process.cwd(), 'test-output.json');
  
  afterAll(() => {
    // Clean up test output
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
  });
  
  test('aggregator should return expected total organization count', async () => {
    const orchestrator = new Orchestrator();
    
    // Run the full aggregation
    await orchestrator.run({
      skipGovUk: false,
      skipOns: false,
      outputPath: outputPath
    });
    
    // Read and parse the output
    const outputContent = fs.readFileSync(outputPath, 'utf-8');
    const output = JSON.parse(outputContent);
    
    // Verify structure
    expect(output).toHaveProperty('metadata');
    expect(output.metadata).toHaveProperty('statistics');
    expect(output.metadata.statistics).toHaveProperty('totalOrganisations');
    expect(output).toHaveProperty('organisations');
    expect(Array.isArray(output.organisations)).toBe(true);
    
    // Verify counts
    const totalOrgs = output.metadata.statistics.totalOrganisations;
    console.log(`Total organizations aggregated: ${totalOrgs}`);
    
    // We expect around 2800-2900 organizations
    // (1235 from GOV.UK + 1610 from ONS = 2845, but may vary slightly)
    expect(totalOrgs).toBeGreaterThan(2700);
    expect(totalOrgs).toBeLessThan(3000);
    
    // Verify we have data from both sources
    const sources = output.metadata.sources;
    expect(sources).toHaveProperty('govUk');
    expect(sources).toHaveProperty('ons');
    
    // GOV.UK should have ~1235 orgs
    if (sources.govUk) {
      expect(sources.govUk.recordCount).toBeGreaterThan(1200);
      expect(sources.govUk.recordCount).toBeLessThan(1300);
    }
    
    // ONS should have ~1610 orgs  
    if (sources.ons) {
      expect(sources.ons.recordCount).toBeGreaterThan(1500);
      expect(sources.ons.recordCount).toBeLessThan(1700);
    }
    
    // Verify data quality
    expect(output.metadata.statistics.conflictsDetected).toBeDefined();
    expect(output.metadata.statistics.conflictsDetected).toBeGreaterThanOrEqual(0);
  }, 60000); // 60 second timeout for full aggregation
});