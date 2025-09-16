# Implementation Tasks: UK Courts and Tribunals Data Integration

**Feature**: UK Courts and Tribunals Data Integration
**Branch**: `009-english-courts-can`
**Dependencies**: axios, cheerio, csv-parse

## Execution Order

Tasks are numbered and grouped by phase. Tasks marked [P] can execute in parallel within their group.

---

## Phase 1: Contract Tests (TDD - Must Fail First)

### T001: Create English Courts parser contract test [P]
**File**: `tests/contract/english-courts-parser.contract.test.ts`
- Copy from `specs/009-english-courts-can/contracts/english-courts-parser-contract.ts`
- Ensure test imports from non-existent parser (will fail)
- Test CSV fetching, parsing, and data extraction
- Run: `pnpm test english-courts-parser.contract` (must fail)

### T002: Create NI Courts parser contract test [P]
**File**: `tests/contract/ni-courts-parser.contract.test.ts`
- Copy from `specs/009-english-courts-can/contracts/ni-courts-parser-contract.ts`
- Test HTML fetching and parsing
- Test court name extraction from list
- Run: `pnpm test ni-courts-parser.contract` (must fail)

### T003: Create Scottish Courts parser contract test [P]
**File**: `tests/contract/scottish-courts-parser.contract.test.ts`
- Copy from `specs/009-english-courts-can/contracts/scottish-courts-parser-contract.ts`
- Test API/fallback data retrieval
- Test handling of unavailable source
- Run: `pnpm test scottish-courts-parser.contract` (must fail)

### T004: Create Courts mapper contract test [P]
**File**: `tests/contract/courts-mapper.contract.test.ts`
- Copy from `specs/009-english-courts-can/contracts/courts-mapper-contract.ts`
- Test Court to Organisation mapping
- Test jurisdiction and status mapping
- Run: `pnpm test courts-mapper.contract` (must fail)

**Parallel Execution Example**:
```bash
# Run all contract tests in parallel
Task "Run contract test T001" && \
Task "Run contract test T002" && \
Task "Run contract test T003" && \
Task "Run contract test T004"
```

---

## Phase 2: Data Models

### T005: Create Court model and enums [P]
**File**: `src/models/court.ts`
```typescript
export interface Court {
  name: string;
  slug?: string;
  identifier?: string;
  type: CourtType[];
  jurisdiction: Jurisdiction;
  status: CourtStatus;
  location?: CourtLocation;
  contact?: CourtContact;
  areasOfLaw?: string[];
  services?: string[];
  sourceSystem: string;
  lastUpdated: string;
}

export enum CourtType {
  CROWN_COURT = "Crown Court",
  MAGISTRATES_COURT = "Magistrates' Court",
  COUNTY_COURT = "County Court",
  // ... all types from data-model.md
}

export enum Jurisdiction {
  ENGLAND_WALES = "England & Wales",
  NORTHERN_IRELAND = "Northern Ireland",
  SCOTLAND = "Scotland"
}

export enum CourtStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  UNKNOWN = "unknown"
}
```

### T006: Create Court location and contact interfaces [P]
**File**: `src/models/court.ts` (append to existing)
```typescript
export interface CourtLocation {
  addressLines?: string[];
  town?: string;
  county?: string;
  postcode?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  fullAddress?: string;
}

export interface CourtContact {
  telephone?: string;
  fax?: string;
  email?: string;
  website?: string;
  dxNumber?: string;
  textphone?: string;
}

// Raw data interfaces
export interface EnglishCourtRaw {
  name: string;
  lat?: string;
  lon?: string;
  // ... fields from data-model.md
}

export interface NICourtRaw {
  name: string;
  nodeId?: string;
  // ... fields from data-model.md
}

export interface ScottishCourtRaw {
  name: string;
  type?: string;
  // ... fields from data-model.md
}
```

---

## Phase 3: Parser Implementations

### T007: Implement English Courts CSV parser
**File**: `src/services/english-courts-parser.ts`
```typescript
import axios from 'axios';
import { parse } from 'csv-parse/sync';
import type { EnglishCourtRaw } from '../models/court.js';

export class EnglishCourtsParser {
  private readonly csvUrl = 'https://factprod.blob.core.windows.net/csv/courts-and-tribunals-data.csv';

  async parse(): Promise<EnglishCourtRaw[]> {
    const csv = await this.fetchCSV();
    return this.parseCSV(csv);
  }

  private async fetchCSV(): Promise<string> {
    const response = await axios.get(this.csvUrl);
    return response.data;
  }

  private parseCSV(csv: string): EnglishCourtRaw[] {
    return parse(csv, {
      columns: true,
      skip_empty_lines: true
    });
  }

  getMapper() {
    // Return mapper instance for contract test
  }
}
```
- Implement CSV fetching with axios
- Parse CSV with csv-parse
- Handle missing fields gracefully
- Run: `pnpm test english-courts-parser.contract` (should pass)

### T008: Implement NI Courts HTML parser
**File**: `src/services/ni-courts-parser.ts`
```typescript
import axios from 'axios';
import * as cheerio from 'cheerio';
import type { NICourtRaw } from '../models/court.js';

export class NICourtsParser {
  private readonly url = 'https://www.nidirect.gov.uk/contacts/northern-ireland-courts-and-tribunals-service';

  async parse(): Promise<NICourtRaw[]> {
    const html = await this.fetchHTML();
    return this.parseHTML(html);
  }

  private async fetchHTML(): Promise<string> {
    const response = await axios.get(this.url);
    return response.data;
  }

  private parseHTML(html: string): NICourtRaw[] {
    const $ = cheerio.load(html);
    const courts: NICourtRaw[] = [];

    $('ul li a[href^="/node/"]').each((_, element) => {
      const $el = $(element);
      courts.push({
        name: $el.text().trim(),
        nodeId: $el.attr('href')?.replace('/node/', '')
      });
    });

    if (courts.length === 0) {
      throw new Error('No courts found in HTML');
    }

    return courts;
  }

  getMapper() {
    // Return mapper instance for contract test
  }
}
```
- Fetch HTML from NI website
- Parse with cheerio
- Extract court names and node IDs
- Run: `pnpm test ni-courts-parser.contract` (should pass)

### T009: Implement Scottish Courts parser with fallback
**File**: `src/services/scottish-courts-parser.ts`
```typescript
import axios from 'axios';
import type { ScottishCourtRaw } from '../models/court.js';

export class ScottishCourtsParser {
  private lastError?: string;

  async parse(): Promise<ScottishCourtRaw[]> {
    try {
      return await this.fetchData();
    } catch (error) {
      this.lastError = error.message;
      console.warn('Using fallback data for Scottish courts:', error.message);
      return this.getFallbackData();
    }
  }

  private async fetchData(): Promise<ScottishCourtRaw[]> {
    // Attempt to fetch from API if available
    throw new Error('API unavailable - using fallback');
  }

  getFallbackData(): ScottishCourtRaw[] {
    return [
      { name: 'Edinburgh Sheriff Court', type: 'Sheriff Court' },
      { name: 'Glasgow Sheriff Court', type: 'Sheriff Court' },
      { name: 'Court of Session', type: 'Court of Session' },
      { name: 'High Court of Justiciary', type: 'High Court of Justiciary' },
      // Add more major Scottish courts
    ];
  }

  getLastError(): string | undefined {
    return this.lastError;
  }

  getMapper() {
    // Return mapper instance for contract test
  }
}
```
- Attempt to fetch from API
- Fall back to static data if unavailable
- Log warnings when using fallback
- Run: `pnpm test scottish-courts-parser.contract` (should pass)

---

## Phase 4: Mapper Implementation

### T010: Implement Courts to Organisation mapper
**File**: `src/services/mappers/courts-mapper.ts`
```typescript
import type { Court } from '../../models/court.js';
import type { Organisation } from '../../models/organisation.js';
import { OrganisationType } from '../../models/organisation.js';

export class CourtsMapper {
  map(court: Court): Organisation {
    if (!court.name || court.name.trim() === '') {
      throw new Error('Invalid court: missing name');
    }

    return {
      id: this.generateId(court),
      name: court.name,
      type: OrganisationType.JUDICIAL_BODY,
      classification: court.type[0] || 'Court',
      status: court.status === 'inactive' ? 'inactive' : 'active',
      location: this.mapLocation(court.location),
      sources: [{
        source: this.mapDataSource(court.sourceSystem),
        retrievedAt: court.lastUpdated,
        confidence: 1.0
      }],
      lastUpdated: court.lastUpdated,
      dataQuality: {
        completeness: this.calculateCompleteness(court),
        hasConflicts: false,
        requiresReview: false
      },
      additionalProperties: {
        courtTypes: court.type,
        jurisdiction: court.jurisdiction,
        areasOfLaw: court.areasOfLaw,
        services: court.services,
        contact: court.contact,
        identifier: court.identifier,
        slug: court.slug,
        sourceSystem: court.sourceSystem
      }
    };
  }

  mapMany(courts: Court[]): Organisation[] {
    return courts
      .filter(court => court.name && court.name.trim() !== '')
      .map(court => this.map(court));
  }

  private generateId(court: Court): string {
    // Generate unique ID
  }

  private mapLocation(location?: CourtLocation): OrganisationLocation | undefined {
    // Map court location to org location
  }

  private mapDataSource(source: string): DataSourceType {
    // Map source system to enum
  }

  private calculateCompleteness(court: Court): number {
    // Calculate data completeness score
  }
}
```
- Map Court entity to Organisation model
- Preserve all metadata in additionalProperties
- Handle different jurisdictions
- Run: `pnpm test courts-mapper.contract` (should pass)

---

## Phase 5: Integration Tests

### T011: Create English Courts integration test [P]
**File**: `tests/integration/english-courts.integration.test.ts`
```typescript
import { EnglishCourtsParser } from '../../src/services/english-courts-parser';
import { CourtsMapper } from '../../src/services/mappers/courts-mapper';

describe('English Courts Integration', () => {
  it('should fetch and map English courts to organisations', async () => {
    const parser = new EnglishCourtsParser();
    const mapper = new CourtsMapper();

    const rawCourts = await parser.parse();
    const courts = parser.mapToCourtModel(rawCourts);
    const organisations = mapper.mapMany(courts);

    expect(organisations.length).toBeGreaterThan(100);
    expect(organisations[0].type).toBe('JUDICIAL_BODY');
  }, 30000);
});
```

### T012: Create NI Courts integration test [P]
**File**: `tests/integration/ni-courts.integration.test.ts`
```typescript
import { NICourtsParser } from '../../src/services/ni-courts-parser';
import { CourtsMapper } from '../../src/services/mappers/courts-mapper';

describe('NI Courts Integration', () => {
  it('should fetch and map NI courts to organisations', async () => {
    const parser = new NICourtsParser();
    const mapper = new CourtsMapper();

    const rawCourts = await parser.parse();
    const courts = parser.mapToCourtModel(rawCourts);
    const organisations = mapper.mapMany(courts);

    expect(organisations.length).toBeGreaterThan(10);
    expect(organisations.every(org =>
      org.additionalProperties.jurisdiction === 'Northern Ireland'
    )).toBe(true);
  }, 30000);
});
```

### T013: Create Scottish Courts integration test [P]
**File**: `tests/integration/scottish-courts.integration.test.ts`
```typescript
import { ScottishCourtsParser } from '../../src/services/scottish-courts-parser';
import { CourtsMapper } from '../../src/services/mappers/courts-mapper';

describe('Scottish Courts Integration', () => {
  it('should fetch or use fallback for Scottish courts', async () => {
    const parser = new ScottishCourtsParser();
    const mapper = new CourtsMapper();

    const rawCourts = await parser.parse();
    const courts = parser.mapToCourtModel(rawCourts);
    const organisations = mapper.mapMany(courts);

    expect(organisations.length).toBeGreaterThan(0);
    if (parser.getLastError()) {
      console.log('Used fallback data:', parser.getLastError());
    }
  }, 30000);
});
```

### T014: Create full courts integration test
**File**: `tests/integration/courts.integration.test.ts`
```typescript
describe('Full Courts Integration', () => {
  it('should aggregate courts from all jurisdictions', async () => {
    // Test all three parsers together
    // Verify no deduplication (FR-020)
    // Verify all courts mapped to organisations
  }, 60000);
});
```

---

## Phase 6: Orchestrator Integration

### T015: Integrate courts into orchestrator
**File**: `src/cli/orchestrator.ts`
```typescript
// Add imports
import { EnglishCourtsParser } from '../services/english-courts-parser.js';
import { NICourtsParser } from '../services/ni-courts-parser.js';
import { ScottishCourtsParser } from '../services/scottish-courts-parser.js';
import { CourtsMapper } from '../services/mappers/courts-mapper.js';

// Add method
async fetchCourtsData(): Promise<DataFetchResult> {
  this.logger.subsection('Fetching UK Courts and Tribunals');

  const allCourts = [];

  // Fetch English/Welsh courts
  try {
    const englishParser = new EnglishCourtsParser();
    const englishCourts = await englishParser.parse();
    allCourts.push(...englishCourts);
    this.logger.success(`Fetched ${englishCourts.length} English/Welsh courts`);
  } catch (error) {
    this.logger.error('Failed to fetch English courts:', error);
  }

  // Fetch NI courts
  try {
    const niParser = new NICourtsParser();
    const niCourts = await niParser.parse();
    allCourts.push(...niCourts);
    this.logger.success(`Fetched ${niCourts.length} NI courts`);
  } catch (error) {
    this.logger.error('Failed to fetch NI courts:', error);
  }

  // Fetch Scottish courts
  try {
    const scottishParser = new ScottishCourtsParser();
    const scottishCourts = await scottishParser.parse();
    allCourts.push(...scottishCourts);
    this.logger.success(`Fetched ${scottishCourts.length} Scottish courts`);
  } catch (error) {
    this.logger.error('Failed to fetch Scottish courts:', error);
  }

  // Map to organisations
  const mapper = new CourtsMapper();
  const organisations = mapper.mapMany(allCourts);

  return {
    success: true,
    organisations,
    metadata: {
      source: 'UK Courts',
      fetchedAt: new Date().toISOString(),
      recordCount: organisations.length
    }
  };
}

// Add to performCompleteAggregation()
if (!sourceFilter || sourceFilter === 'courts') {
  const courtsResult = await this.fetchCourtsData();
  if (courtsResult.success && courtsResult.organisations) {
    allOrganisations.push(...courtsResult.organisations);
    sources.push('uk-courts');
    this.logger.success(`Added ${courtsResult.organisations.length} UK Courts`);
  }
}
```

---

## Phase 7: CLI Commands

### T016: Add CLI command for English courts [P]
**File**: `src/services/english-courts-parser.ts` (append)
```typescript
// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const parser = new EnglishCourtsParser();
  parser.parse()
    .then(courts => {
      console.log(`Fetched ${courts.length} English/Welsh courts`);
      console.log(JSON.stringify(courts.slice(0, 3), null, 2));
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}
```

### T017: Add CLI command for NI courts [P]
**File**: `src/services/ni-courts-parser.ts` (append)
```typescript
// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const parser = new NICourtsParser();
  parser.parse()
    .then(courts => {
      console.log(`Fetched ${courts.length} NI courts`);
      console.log(JSON.stringify(courts, null, 2));
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}
```

### T018: Add CLI command for Scottish courts [P]
**File**: `src/services/scottish-courts-parser.ts` (append)
```typescript
// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const parser = new ScottishCourtsParser();
  parser.parse()
    .then(courts => {
      console.log(`Fetched ${courts.length} Scottish courts`);
      if (parser.getLastError()) {
        console.warn('Note: Using fallback data');
      }
      console.log(JSON.stringify(courts.slice(0, 3), null, 2));
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}
```

---

## Phase 8: Documentation and Validation

### T019: Add parser methods to map raw data to Court model
**Files**: Each parser needs a `mapToCourtModel` method
- `src/services/english-courts-parser.ts`: Add method to convert EnglishCourtRaw to Court
- `src/services/ni-courts-parser.ts`: Add method to convert NICourtRaw to Court
- `src/services/scottish-courts-parser.ts`: Add method to convert ScottishCourtRaw to Court

### T020: Run full test suite and validate
**Commands**:
```bash
# Run all tests
pnpm test courts

# Run integration test
pnpm test courts.integration

# Test via CLI
npx tsx src/cli/index.ts --source courts

# Validate output
cat output/organisations.json | jq '.[] | select(.type == "JUDICIAL_BODY") | .name' | wc -l
```

---

## Parallel Execution Guidance

### Phase 1 (T001-T004): All contract tests can run in parallel
```bash
Task "Create contract test T001" & \
Task "Create contract test T002" & \
Task "Create contract test T003" & \
Task "Create contract test T004" & \
wait
```

### Phase 2 (T005-T006): Model creation can be parallel
```bash
Task "Create Court model T005" & \
Task "Create interfaces T006" & \
wait
```

### Phase 3 (T007-T009): Parser implementations after models
```bash
# After Phase 2 completes
Task "Implement English parser T007" & \
Task "Implement NI parser T008" & \
Task "Implement Scottish parser T009" & \
wait
```

### Phase 5 (T011-T013): Integration tests can be parallel
```bash
Task "English integration test T011" & \
Task "NI integration test T012" & \
Task "Scottish integration test T013" & \
wait
```

### Phase 7 (T016-T018): CLI commands can be parallel
```bash
Task "English CLI T016" & \
Task "NI CLI T017" & \
Task "Scottish CLI T018" & \
wait
```

---

## Dependencies

- **T001-T004**: Independent (contract tests)
- **T005-T006**: Independent (models)
- **T007-T009**: Depend on T005-T006 (need models)
- **T010**: Depends on T005-T006 (needs Court model)
- **T011-T014**: Depend on T007-T010 (need implementations)
- **T015**: Depends on T007-T010 (orchestrator needs parsers)
- **T016-T018**: Depend on T007-T009 (CLI needs parsers)
- **T019**: Depends on T007-T009 (extends parsers)
- **T020**: Depends on all previous tasks

---

## Success Criteria

✅ All contract tests pass
✅ English/Welsh CSV successfully parsed (300+ courts)
✅ NI courts extracted from HTML (20-30 courts)
✅ Scottish courts retrieved or fallback used
✅ All courts mapped to Organisation model
✅ No deduplication between sources (FR-020)
✅ Integration with orchestrator complete
✅ CLI commands functional for testing