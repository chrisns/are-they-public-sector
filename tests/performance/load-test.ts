/**
 * Performance load tests for UK Public Sector Organisation Aggregator
 * Tests processing of 100k+ mock organisation records
 */

import { Organisation, OrganisationType, DataSourceType } from '../../src/models/organisation';
import { Deduplicator } from '../../src/services/deduplicator';
import { Writer } from '../../src/lib/writer';
import fs from 'fs';
import path from 'path';

describe('Load Test - Performance Metrics', () => {
  const tempDir = path.join(__dirname, '..', 'temp');
  
  beforeAll(() => {
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup temp files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  /**
   * Generates mock organisation records for load testing
   */
  function generateMockOrganisations(count: number): Organisation[] {
    const organisations: Organisation[] = [];
    const types = Object.values(OrganisationType);
    const regions = ['England', 'Scotland', 'Wales', 'Northern Ireland'];
    
    for (let i = 0; i < count; i++) {
      organisations.push({
        id: `org-${i.toString().padStart(6, '0')}`,
        name: `Test Organisation ${i}`,
        alternativeNames: i % 3 === 0 ? [`Alt Name ${i}`] : undefined,
        type: types[i % types.length],
        classification: `Classification ${i % 10}`,
        parentOrganisation: i > 0 && i % 5 === 0 ? `org-${(i - 1).toString().padStart(6, '0')}` : undefined,
        controllingUnit: i % 7 === 0 ? `control-unit-${i % 20}` : undefined,
        status: i % 10 === 0 ? 'inactive' : 'active',
        establishmentDate: new Date(2000 + (i % 24), (i % 12), 1).toISOString().split('T')[0],
        location: {
          address: `${i} Test Street, Test City`,
          region: regions[i % regions.length],
          country: 'United Kingdom'
        },
        sources: [{
          source: DataSourceType.GOV_UK_API,
          sourceId: `gov-${i}`,
          retrievedAt: new Date().toISOString(),
          confidence: 0.8 + (i % 20) / 100
        }],
        lastUpdated: new Date().toISOString(),
        dataQuality: {
          completeness: 0.7 + (i % 30) / 100,
          hasConflicts: i % 50 === 0,
          requiresReview: i % 100 === 0
        },
        additionalProperties: {
          testField: `value-${i}`,
          metadata: { generated: true, index: i }
        }
      });
    }
    
    return organisations;
  }

  /**
   * Measures memory usage in MB
   */
  function getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100;
  }

  test('should handle 100k organisations efficiently', async () => {
    const recordCount = 100_000;
    console.log(`\n🚀 Starting load test with ${recordCount.toLocaleString()} records`);
    
    // Memory baseline
    const initialMemory = getMemoryUsage();
    console.log(`📊 Initial memory usage: ${initialMemory} MB`);
    
    // Generation phase
    const startGeneration = Date.now();
    const organisations = generateMockOrganisations(recordCount);
    const generationTime = Date.now() - startGeneration;
    const memoryAfterGeneration = getMemoryUsage();
    
    console.log(`✅ Generated ${organisations.length.toLocaleString()} records in ${generationTime}ms`);
    console.log(`📊 Memory after generation: ${memoryAfterGeneration} MB (+${memoryAfterGeneration - initialMemory} MB)`);
    
    expect(organisations.length).toBe(recordCount);
    
    // Deduplication phase
    const startDedup = Date.now();
    const deduplicator = new Deduplicator();
    const dedupedOrganisations = await deduplicator.deduplicate(organisations);
    const dedupTime = Date.now() - startDedup;
    const memoryAfterDedup = getMemoryUsage();
    
    console.log(`✅ Deduplication completed in ${dedupTime}ms`);
    console.log(`📊 Memory after deduplication: ${memoryAfterDedup} MB`);
    console.log(`🔄 Processed ${organisations.length.toLocaleString()} → ${dedupedOrganisations.length.toLocaleString()} records`);
    
    // Write phase
    const outputPath = path.join(tempDir, 'load-test-output.json');
    const startWrite = Date.now();
    const writer = new Writer();
    await writer.writeOrganisations(dedupedOrganisations, outputPath);
    const writeTime = Date.now() - startWrite;
    const memoryAfterWrite = getMemoryUsage();
    
    console.log(`✅ Write completed in ${writeTime}ms`);
    console.log(`📊 Memory after write: ${memoryAfterWrite} MB`);
    
    // Verify file was created and has correct size
    expect(fs.existsSync(outputPath)).toBe(true);
    const stats = fs.statSync(outputPath);
    const fileSizeMB = Math.round(stats.size / 1024 / 1024 * 100) / 100;
    console.log(`📄 Output file size: ${fileSizeMB} MB`);
    
    // Performance assertions
    const totalTime = generationTime + dedupTime + writeTime;
    console.log(`\n⚡ Performance Summary:`);
    console.log(`   Total processing time: ${totalTime}ms`);
    console.log(`   Records per second: ${Math.round(recordCount / (totalTime / 1000)).toLocaleString()}`);
    console.log(`   Memory peak: ${Math.max(memoryAfterGeneration, memoryAfterDedup, memoryAfterWrite)} MB`);
    console.log(`   Memory efficiency: ${Math.round(recordCount / memoryAfterWrite)} records/MB`);
    
    // Performance thresholds
    expect(totalTime).toBeLessThan(60_000); // Should complete within 60 seconds
    expect(memoryAfterWrite).toBeLessThan(1000); // Should use less than 1GB memory
    expect(dedupedOrganisations.length).toBeGreaterThan(0);
    
    // Cleanup
    fs.unlinkSync(outputPath);
  }, 120_000); // 2-minute timeout

  test('should process data in streaming fashion for memory efficiency', async () => {
    const batchSize = 10_000;
    const totalBatches = 5;
    
    console.log(`\n🔄 Testing streaming processing with ${totalBatches} batches of ${batchSize.toLocaleString()} records each`);
    
    const initialMemory = getMemoryUsage();
    let maxMemory = initialMemory;
    const batchTimes: number[] = [];
    
    const deduplicator = new Deduplicator();
    let processedCount = 0;
    
    for (let batch = 0; batch < totalBatches; batch++) {
      const startBatch = Date.now();
      
      // Generate batch
      const batchOrganisations = generateMockOrganisations(batchSize);
      
      // Process batch
      const dedupedBatch = await deduplicator.deduplicate(batchOrganisations);
      processedCount += dedupedBatch.length;
      
      const batchTime = Date.now() - startBatch;
      batchTimes.push(batchTime);
      
      const currentMemory = getMemoryUsage();
      maxMemory = Math.max(maxMemory, currentMemory);
      
      console.log(`   Batch ${batch + 1}/${totalBatches}: ${batchTime}ms, ${currentMemory} MB`);
    }
    
    const averageBatchTime = batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length;
    
    console.log(`\n⚡ Streaming Performance Summary:`);
    console.log(`   Total records processed: ${processedCount.toLocaleString()}`);
    console.log(`   Average batch time: ${Math.round(averageBatchTime)}ms`);
    console.log(`   Peak memory usage: ${maxMemory} MB`);
    console.log(`   Memory growth: +${maxMemory - initialMemory} MB`);
    
    // Streaming should maintain reasonable memory usage
    expect(maxMemory - initialMemory).toBeLessThan(200); // Memory growth should be limited
    expect(averageBatchTime).toBeLessThan(5000); // Each batch should process quickly
  });

  test('should handle edge cases gracefully', async () => {
    console.log(`\n🧪 Testing edge cases and error conditions`);
    
    const deduplicator = new Deduplicator();
    
    // Empty array
    const emptyResult = await deduplicator.deduplicate([]);
    expect(emptyResult).toEqual([]);
    
    // Single record
    const singleOrg = generateMockOrganisations(1);
    const singleResult = await deduplicator.deduplicate(singleOrg);
    expect(singleResult.length).toBe(1);
    
    // Records with missing fields
    const incompleteOrg: Partial<Organisation> = {
      id: 'incomplete-1',
      name: 'Incomplete Org',
      type: OrganisationType.OTHER,
      classification: 'Test',
      status: 'active',
      sources: [{
        source: DataSourceType.GOV_UK_API,
        retrievedAt: new Date().toISOString(),
        confidence: 0.5
      }],
      lastUpdated: new Date().toISOString(),
      dataQuality: {
        completeness: 0.3,
        hasConflicts: false,
        requiresReview: true,
        reviewReasons: ['Incomplete data']
      }
    };
    
    const incompleteResult = await deduplicator.deduplicate([incompleteOrg as Organisation]);
    expect(incompleteResult.length).toBe(1);
    
    console.log(`✅ All edge cases handled successfully`);
  });
});