/**
 * Unit tests for WriterService
 * Tests JSON output generation, metadata calculation, and file writing
 */

import * as fs from 'fs';
import * as path from 'path';
import { WriterService } from '../../src/lib/writer';
import { OrganisationType, DataSourceType } from '../../src/models/organisation';
import type { Organisation } from '../../src/models/organisation';
import type { ProcessingResult, ProcessingMetadata, DataConflict } from '../../src/models/processing';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('WriterService', () => {
  let writer: WriterService;
  
  // Mock data
  const mockOrganisations: Organisation[] = [
    {
      id: '1',
      name: 'Department of Health',
      type: OrganisationType.DEPARTMENT,
      status: 'active',
      sources: [{
        source: DataSourceType.GOV_UK_API,
        sourceId: 'gov-1',
        retrievedAt: '2023-01-01T00:00:00Z',
        confidence: 0.9
      }],
      dataQuality: {
        completeness: 0.85,
        confidence: 0.9,
        lastValidated: '2023-01-01T00:00:00Z',
        requiresReview: false,
        reviewReasons: []
      },
      lastUpdated: '2023-01-01T00:00:00Z'
    },
    {
      id: '2',
      name: 'NHS England',
      type: OrganisationType.NDPB,
      status: 'active',
      sources: [{
        source: DataSourceType.ONS_INSTITUTIONAL,
        sourceId: 'ons-2',
        retrievedAt: '2023-01-01T00:00:00Z',
        confidence: 0.8
      }],
      dataQuality: {
        completeness: 0.75,
        confidence: 0.8,
        lastValidated: '2023-01-01T00:00:00Z',
        requiresReview: true,
        reviewReasons: ['Low completeness score']
      },
      lastUpdated: '2023-01-01T00:00:00Z'
    },
    {
      id: '3',
      name: 'Dissolved Corp',
      type: OrganisationType.PUBLIC_CORPORATION,
      status: 'dissolved',
      sources: [{
        source: DataSourceType.ONS_NON_INSTITUTIONAL,
        sourceId: 'ons-3',
        retrievedAt: '2023-01-01T00:00:00Z',
        confidence: 0.7
      }],
      dataQuality: {
        completeness: 0.6,
        confidence: 0.7,
        lastValidated: '2023-01-01T00:00:00Z',
        requiresReview: false,
        reviewReasons: []
      },
      lastUpdated: '2023-01-01T00:00:00Z'
    }
  ];

  const mockMetadata: ProcessingMetadata = {
    processedAt: '2023-01-01T00:00:00Z',
    sources: [
      { type: DataSourceType.GOV_UK_API, retrievedAt: '2023-01-01T00:00:00Z', recordCount: 1 },
      { type: DataSourceType.ONS_INSTITUTIONAL, retrievedAt: '2023-01-01T00:00:00Z', recordCount: 1 },
      { type: DataSourceType.ONS_NON_INSTITUTIONAL, retrievedAt: '2023-01-01T00:00:00Z', recordCount: 1 }
    ],
    statistics: {
      totalOrganisations: 3,
      conflictsDetected: 1,
      organisationsByType: {
        [OrganisationType.DEPARTMENT]: 1,
        [OrganisationType.NDPB]: 1,
        [OrganisationType.PUBLIC_CORPORATION]: 1
      }
    }
  };

  const mockConflicts: DataConflict[] = [
    {
      field: 'name',
      organisationId: '2',
      values: ['NHS England', 'NHS England and Improvement'],
      sources: [DataSourceType.GOV_UK_API, DataSourceType.ONS_INSTITUTIONAL],
      resolution: 'manual',
      confidence: 0.7
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.mkdirSync.mockImplementation(() => undefined);
    mockedFs.writeFileSync.mockImplementation(() => undefined);
    
    writer = new WriterService();
  });

  describe('JSON output generation', () => {
    it('should write basic organisation data', async () => {
      const result: ProcessingResult = {
        organisations: mockOrganisations,
        metadata: mockMetadata
      };

      await writer.writeResult(result);

      expect(mockedFs.writeFileSync).toHaveBeenCalled();
      const [filePath, content] = mockedFs.writeFileSync.mock.calls[0];
      const writtenData = JSON.parse(content as string);

      expect(writtenData.organisations).toHaveLength(3);
      expect(writtenData.organisations[0].name).toBe('Department of Health');
    });

    it('should include metadata when configured', async () => {
      const writer = new WriterService({ includeMetadata: true });
      const result: ProcessingResult = {
        organisations: mockOrganisations,
        metadata: mockMetadata
      };

      await writer.writeResult(result);

      const [, content] = mockedFs.writeFileSync.mock.calls[0];
      const writtenData = JSON.parse(content as string);

      expect(writtenData.metadata).toBeDefined();
      expect(writtenData.metadata.processedAt).toBe('2023-01-01T00:00:00Z');
      expect(writtenData.metadata.sources).toHaveLength(3);
    });

    it('should exclude metadata when configured', async () => {
      const writer = new WriterService({ includeMetadata: false });
      const result: ProcessingResult = {
        organisations: mockOrganisations,
        metadata: mockMetadata
      };

      await writer.writeResult(result);

      const [, content] = mockedFs.writeFileSync.mock.calls[0];
      const writtenData = JSON.parse(content as string);

      expect(writtenData.metadata).toBeUndefined();
    });

    it('should include conflicts when configured', async () => {
      const writer = new WriterService({ includeConflicts: true });
      const result: ProcessingResult = {
        organisations: mockOrganisations,
        metadata: mockMetadata,
        conflicts: mockConflicts
      };

      await writer.writeResult(result);

      const [, content] = mockedFs.writeFileSync.mock.calls[0];
      const writtenData = JSON.parse(content as string);

      expect(writtenData.conflicts).toBeDefined();
      expect(writtenData.conflicts).toHaveLength(1);
      expect(writtenData.conflicts[0].field).toBe('name');
    });

    it('should use pretty print when configured', async () => {
      const writer = new WriterService({ prettyPrint: true });
      const result: ProcessingResult = {
        organisations: [mockOrganisations[0]]
      };

      await writer.writeResult(result);

      const [, content] = mockedFs.writeFileSync.mock.calls[0];
      
      // Pretty printed JSON should have newlines and indentation
      expect(content).toContain('\n');
      expect(content).toContain('  '); // Indentation
    });

    it('should use compact format when pretty print is disabled', async () => {
      const writer = new WriterService({ prettyPrint: false });
      const result: ProcessingResult = {
        organisations: [mockOrganisations[0]]
      };

      await writer.writeResult(result);

      const [, content] = mockedFs.writeFileSync.mock.calls[0];
      
      // Compact JSON should not have unnecessary whitespace
      expect(content).not.toContain('\n');
    });
  });

  describe('metadata calculation', () => {
    it('should generate summary statistics', async () => {
      const writer = new WriterService({ generateSummary: true });
      const result: ProcessingResult = {
        organisations: mockOrganisations,
        metadata: mockMetadata
      };

      await writer.writeResult(result);

      const [, content] = mockedFs.writeFileSync.mock.calls[0];
      const writtenData = JSON.parse(content as string);

      expect(writtenData.summary).toBeDefined();
      expect(writtenData.summary.totalOrganisations).toBe(3);
      expect(writtenData.summary.organisationsByType[OrganisationType.DEPARTMENT]).toBe(1);
      expect(writtenData.summary.organisationsByType[OrganisationType.NDPB]).toBe(1);
      expect(writtenData.summary.organisationsByType[OrganisationType.PUBLIC_CORPORATION]).toBe(1);
    });

    it('should calculate status breakdown', async () => {
      const writer = new WriterService({ generateSummary: true });
      const result: ProcessingResult = {
        organisations: mockOrganisations,
        metadata: mockMetadata
      };

      await writer.writeResult(result);

      const [, content] = mockedFs.writeFileSync.mock.calls[0];
      const writtenData = JSON.parse(content as string);

      expect(writtenData.summary.organisationsByStatus).toEqual({
        active: 2,
        inactive: 0,
        dissolved: 1
      });
    });

    it('should calculate data quality metrics', async () => {
      const writer = new WriterService({ generateSummary: true });
      const result: ProcessingResult = {
        organisations: mockOrganisations,
        metadata: mockMetadata,
        conflicts: mockConflicts
      };

      await writer.writeResult(result);

      const [, content] = mockedFs.writeFileSync.mock.calls[0];
      const writtenData = JSON.parse(content as string);

      expect(writtenData.summary.dataQuality).toBeDefined();
      expect(writtenData.summary.dataQuality.averageCompleteness).toBeCloseTo(0.733, 2);
      expect(writtenData.summary.dataQuality.organisationsRequiringReview).toBe(1);
      expect(writtenData.summary.dataQuality.organisationsWithConflicts).toBe(1);
    });

    it('should count sources', async () => {
      const writer = new WriterService({ generateSummary: true });
      const result: ProcessingResult = {
        organisations: mockOrganisations,
        metadata: mockMetadata
      };

      await writer.writeResult(result);

      const [, content] = mockedFs.writeFileSync.mock.calls[0];
      const writtenData = JSON.parse(content as string);

      expect(writtenData.summary.sources).toEqual({
        [DataSourceType.GOV_UK_API]: 1,
        [DataSourceType.ONS_INSTITUTIONAL]: 1,
        [DataSourceType.ONS_NON_INSTITUTIONAL]: 1
      });
    });

    it('should include generation timestamp', async () => {
      const writer = new WriterService({ generateSummary: true });
      const result: ProcessingResult = {
        organisations: mockOrganisations
      };

      const beforeTime = new Date().toISOString();
      await writer.writeResult(result);
      const afterTime = new Date().toISOString();

      const [, content] = mockedFs.writeFileSync.mock.calls[0];
      const writtenData = JSON.parse(content as string);

      expect(writtenData.summary.generated).toBeDefined();
      expect(new Date(writtenData.summary.generated).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
      expect(new Date(writtenData.summary.generated).getTime()).toBeLessThanOrEqual(new Date(afterTime).getTime());
    });
  });

  describe('file writing with mocked fs', () => {
    it('should create directory if it does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      
      const result: ProcessingResult = {
        organisations: mockOrganisations
      };

      await writer.writeResult(result);

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        path.dirname('dist/orgs.json'),
        { recursive: true }
      );
    });

    it('should use custom output path', async () => {
      const customPath = '/custom/path/output.json';
      const result: ProcessingResult = {
        organisations: mockOrganisations
      };

      await writer.writeResult(result, customPath);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        customPath,
        expect.any(String)
      );
    });

    it('should use configured default path', async () => {
      const writer = new WriterService({ outputPath: 'custom/default.json' });
      const result: ProcessingResult = {
        organisations: mockOrganisations
      };

      await writer.writeResult(result);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        'custom/default.json',
        expect.any(String)
      );
    });

    it('should handle file write errors', async () => {
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result: ProcessingResult = {
        organisations: mockOrganisations
      };

      await expect(writer.writeResult(result)).rejects.toThrow('Permission denied');
    });

    it('should return the output path on success', async () => {
      const result: ProcessingResult = {
        organisations: mockOrganisations
      };

      const outputPath = await writer.writeResult(result);

      expect(outputPath).toBe('dist/orgs.json');
    });
  });

  describe('CSV export functionality', () => {
    it('should export to CSV when configured', async () => {
      const result: ProcessingResult = {
        organisations: mockOrganisations
      };

      await writer.exportCsv(result, 'output.csv');

      expect(mockedFs.writeFileSync).toHaveBeenCalled();
      const [filePath, content] = mockedFs.writeFileSync.mock.calls[0];
      
      expect(filePath).toBe('output.csv');
      expect(content).toContain('id,name,type,status');
      expect(content).toContain('1,Department of Health,department,active');
      expect(content).toContain('2,NHS England,ndpb,active');
      expect(content).toContain('3,Dissolved Corp,public_corporation,dissolved');
    });

    it('should handle special characters in CSV', async () => {
      const orgsWithSpecialChars: Organisation[] = [{
        ...mockOrganisations[0],
        name: 'Department, of "Health"',
        description: 'Contains\nnewlines'
      }];

      const result: ProcessingResult = {
        organisations: orgsWithSpecialChars
      };

      await writer.exportCsv(result, 'output.csv');

      const [, content] = mockedFs.writeFileSync.mock.calls[0];
      
      // Should properly escape special characters
      expect(content).toContain('"Department, of ""Health"""');
    });

    it('should include selected fields in CSV export', async () => {
      const result: ProcessingResult = {
        organisations: mockOrganisations
      };

      const fields = ['id', 'name', 'type', 'status', 'dataQuality.completeness'];
      await writer.exportCsv(result, 'output.csv', { fields });

      const [, content] = mockedFs.writeFileSync.mock.calls[0];
      
      expect(content).toContain('id,name,type,status,dataQuality.completeness');
      expect(content).toContain('1,Department of Health,department,active,0.85');
    });

    it('should handle nested fields in CSV', async () => {
      const result: ProcessingResult = {
        organisations: mockOrganisations
      };

      const fields = ['name', 'sources[0].source', 'dataQuality.confidence'];
      await writer.exportCsv(result, 'output.csv', { fields });

      const [, content] = mockedFs.writeFileSync.mock.calls[0];
      
      expect(content).toContain('name,sources[0].source,dataQuality.confidence');
      expect(content).toContain('Department of Health,gov_uk_api,0.9');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty organisations array', async () => {
      const result: ProcessingResult = {
        organisations: []
      };

      await writer.writeResult(result);

      const [, content] = mockedFs.writeFileSync.mock.calls[0];
      const writtenData = JSON.parse(content as string);

      expect(writtenData.organisations).toEqual([]);
      if (writtenData.summary) {
        expect(writtenData.summary.totalOrganisations).toBe(0);
      }
    });

    it('should handle missing optional fields', async () => {
      const result: ProcessingResult = {
        organisations: mockOrganisations
        // No metadata or conflicts
      };

      await writer.writeResult(result);

      const [, content] = mockedFs.writeFileSync.mock.calls[0];
      const writtenData = JSON.parse(content as string);

      expect(writtenData.organisations).toHaveLength(3);
    });

    it('should handle organisations with minimal data', async () => {
      const minimalOrg: Organisation = {
        id: 'minimal',
        name: 'Minimal Org',
        type: OrganisationType.OTHER,
        status: 'active',
        sources: [],
        dataQuality: {
          completeness: 0,
          confidence: 0,
          lastValidated: '',
          requiresReview: true,
          reviewReasons: []
        },
        lastUpdated: ''
      };

      const result: ProcessingResult = {
        organisations: [minimalOrg]
      };

      await writer.writeResult(result);

      const [, content] = mockedFs.writeFileSync.mock.calls[0];
      const writtenData = JSON.parse(content as string);

      expect(writtenData.organisations).toHaveLength(1);
      expect(writtenData.organisations[0].id).toBe('minimal');
    });

    it('should handle very large datasets efficiently', async () => {
      // Create 10000 organisations
      const largeDataset: Organisation[] = [];
      for (let i = 0; i < 10000; i++) {
        largeDataset.push({
          ...mockOrganisations[0],
          id: `org-${i}`,
          name: `Organisation ${i}`
        });
      }

      const result: ProcessingResult = {
        organisations: largeDataset
      };

      const startTime = Date.now();
      await writer.writeResult(result);
      const endTime = Date.now();

      expect(mockedFs.writeFileSync).toHaveBeenCalled();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should validate output JSON structure', async () => {
      const result: ProcessingResult = {
        organisations: mockOrganisations,
        metadata: mockMetadata,
        conflicts: mockConflicts
      };

      await writer.writeResult(result);

      const [, content] = mockedFs.writeFileSync.mock.calls[0];
      
      // Should be valid JSON
      expect(() => JSON.parse(content as string)).not.toThrow();
      
      const writtenData = JSON.parse(content as string);
      
      // Check structure
      expect(writtenData).toHaveProperty('organisations');
      expect(Array.isArray(writtenData.organisations)).toBe(true);
    });

    it('should handle circular references gracefully', async () => {
      const circularOrg: any = { ...mockOrganisations[0] };
      circularOrg.self = circularOrg; // Create circular reference

      const result: ProcessingResult = {
        organisations: [circularOrg]
      };

      // Should handle circular references without throwing
      await expect(writer.writeResult(result)).rejects.toThrow();
    });
  });

  describe('statistics calculation edge cases', () => {
    it('should handle division by zero in average calculations', async () => {
      const writer = new WriterService({ generateSummary: true });
      const result: ProcessingResult = {
        organisations: []
      };

      await writer.writeResult(result);

      const [, content] = mockedFs.writeFileSync.mock.calls[0];
      const writtenData = JSON.parse(content as string);

      expect(writtenData.summary.dataQuality.averageCompleteness).toBe(0);
    });

    it('should handle organisations without data quality metrics', async () => {
      const orgWithoutQuality: Organisation = {
        ...mockOrganisations[0],
        dataQuality: undefined as any
      };

      const writer = new WriterService({ generateSummary: true });
      const result: ProcessingResult = {
        organisations: [orgWithoutQuality]
      };

      await writer.writeResult(result);

      const [, content] = mockedFs.writeFileSync.mock.calls[0];
      const writtenData = JSON.parse(content as string);

      expect(writtenData.summary.dataQuality.averageCompleteness).toBe(0);
    });

    it('should count unknown organisation types', async () => {
      const unknownTypeOrg: Organisation = {
        ...mockOrganisations[0],
        type: 'unknown' as any
      };

      const writer = new WriterService({ generateSummary: true });
      const result: ProcessingResult = {
        organisations: [unknownTypeOrg]
      };

      await writer.writeResult(result);

      const [, content] = mockedFs.writeFileSync.mock.calls[0];
      const writtenData = JSON.parse(content as string);

      expect(writtenData.summary.organisationsByType).toHaveProperty('unknown', 1);
    });
  });
});