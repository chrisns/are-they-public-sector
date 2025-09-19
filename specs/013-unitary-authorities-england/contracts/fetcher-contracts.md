# Fetcher Service Contracts

## Base Fetcher Contract
All fetchers must implement this interface:

```typescript
interface Fetcher<T> {
  fetch(): Promise<FetcherResponse<T>>;
  readonly source: DataSource;
  readonly url: string;
}
```

## 1. English Unitary Authorities Fetcher

**Service**: `EnglishUnitaryAuthoritiesFetcher`
**URL**: Dynamic (extracted from ONS page)

### Contract
```typescript
class EnglishUnitaryAuthoritiesFetcher implements Fetcher<UnitaryAuthorityData> {
  source = DataSource.ONS;
  url = 'https://www.ons.gov.uk/aboutus/transparencyandgovernance/freedomofinformationfoi/alistofunitaryauthoritiesinenglandwithageographicalmap';

  async fetch(): Promise<FetcherResponse<UnitaryAuthorityData>>;
}
```

### Expected Response
```json
{
  "success": true,
  "data": [
    {
      "name": "Birmingham City Council",
      "code": "E08000025",
      "region": "England"
    }
  ],
  "source": "ons",
  "timestamp": "2025-01-18T10:00:00Z",
  "metadata": {
    "dynamicUrl": "https://www.ons.gov.uk/file?uri=/.../.csv",
    "totalRecords": 59
  }
}
```

## 2. Districts of England Fetcher

**Service**: `DistrictsOfEnglandFetcher`
**URL**: `https://en.wikipedia.org/wiki/Districts_of_England`

### Contract
```typescript
class DistrictsOfEnglandFetcher implements Fetcher<DistrictCouncilData> {
  source = DataSource.WIKIPEDIA;
  url = 'https://en.wikipedia.org/wiki/Districts_of_England';

  async fetch(): Promise<FetcherResponse<DistrictCouncilData>>;
}
```

### Expected Response
```json
{
  "success": true,
  "data": [
    {
      "name": "Adur",
      "county": "West Sussex",
      "type": "District"
    }
  ],
  "source": "wikipedia",
  "timestamp": "2025-01-18T10:00:00Z",
  "metadata": {
    "totalRecords": 164
  }
}
```

## 3. National Park Authorities Fetcher

**Service**: `NationalParkAuthoritiesFetcher`
**URL**: `https://nationalparksengland.org.uk/our-members`

### Contract
```typescript
class NationalParkAuthoritiesFetcher implements Fetcher<Organisation> {
  source = DataSource.NATIONAL_PARKS_ENGLAND;
  url = 'https://nationalparksengland.org.uk/our-members';

  async fetch(): Promise<FetcherResponse<Organisation>>;
}
```

## 4. Integrated Care Boards Fetcher

**Service**: `IntegratedCareBoardsFetcher`
**URL**: `https://www.nhs.uk/nhs-services/find-your-local-integrated-care-board/`

### Contract
```typescript
class IntegratedCareBoardsFetcher implements Fetcher<HealthOrganisationData> {
  source = DataSource.NHS;
  url = 'https://www.nhs.uk/nhs-services/find-your-local-integrated-care-board/';

  async fetch(): Promise<FetcherResponse<HealthOrganisationData>>;
}
```

## 5. Local Healthwatch Fetcher (Paginated)

**Service**: `LocalHealthwatchFetcher`
**URL**: `https://www.healthwatch.co.uk/your-local-healthwatch/list`

### Contract
```typescript
class LocalHealthwatchFetcher implements Fetcher<HealthOrganisationData> {
  source = DataSource.HEALTHWATCH;
  url = 'https://www.healthwatch.co.uk/your-local-healthwatch/list';

  async fetch(): Promise<FetcherResponse<HealthOrganisationData>>;
  private async fetchPage(page: number): Promise<PaginatedResponse<HealthOrganisationData>>;
}
```

### Expected Paginated Response
```json
{
  "success": true,
  "data": [...],
  "source": "healthwatch",
  "hasNextPage": true,
  "currentPage": 1,
  "totalPages": 10,
  "metadata": {
    "pagesProcessed": 1
  }
}
```

## 6. Scottish Government Organisations Fetcher

**Service**: `ScottishGovernmentOrgsFetcher`
**URL**: `https://www.mygov.scot/organisations`

### Contract
```typescript
class ScottishGovernmentOrgsFetcher implements Fetcher<Organisation> {
  source = DataSource.MYGOV_SCOT;
  url = 'https://www.mygov.scot/organisations';

  async fetch(): Promise<FetcherResponse<Organisation>>;
}
```

## 7. NHS Scotland Health Boards Fetcher

**Service**: `NHSScotlandBoardsFetcher`
**URL**: `https://www.scot.nhs.uk/organisations/`

### Contract
```typescript
class NHSScotlandBoardsFetcher implements Fetcher<HealthOrganisationData> {
  source = DataSource.NHS_SCOTLAND;
  url = 'https://www.scot.nhs.uk/organisations/';

  async fetch(): Promise<FetcherResponse<HealthOrganisationData>>;
}
```

## 8. Scottish Regional Transport Partnerships Fetcher

**Service**: `ScottishRTPsFetcher`
**URL**: `https://www.transport.gov.scot/our-approach/strategy/regional-transport-partnerships/`

### Contract
```typescript
class ScottishRTPsFetcher implements Fetcher<TransportPartnershipData> {
  source = DataSource.TRANSPORT_SCOTLAND;
  url = 'https://www.transport.gov.scot/our-approach/strategy/regional-transport-partnerships/';

  async fetch(): Promise<FetcherResponse<TransportPartnershipData>>;
}
```

## 9. Welsh Unitary Authorities Fetcher

**Service**: `WelshUnitaryAuthoritiesFetcher`
**URL**: `https://law.gov.wales/local-government-bodies`

### Contract
```typescript
class WelshUnitaryAuthoritiesFetcher implements Fetcher<UnitaryAuthorityData> {
  source = DataSource.LAW_GOV_WALES;
  url = 'https://law.gov.wales/local-government-bodies';

  async fetch(): Promise<FetcherResponse<UnitaryAuthorityData>>;
}
```

## 10. Northern Ireland Trust Ports Fetcher

**Service**: `NITrustPortsFetcher`
**URL**: `https://www.infrastructure-ni.gov.uk/articles/gateways-sea-ports`

### Contract
```typescript
class NITrustPortsFetcher implements Fetcher<Organisation> {
  source = DataSource.INFRASTRUCTURE_NI;
  url = 'https://www.infrastructure-ni.gov.uk/articles/gateways-sea-ports';

  async fetch(): Promise<FetcherResponse<Organisation>>;
}
```

## 11. Northern Ireland Government Departments Fetcher

**Service**: `NIGovernmentDeptsFetcher`
**URL**: `https://www.northernireland.gov.uk/topics/government-departments`

### Contract
```typescript
class NIGovernmentDeptsFetcher implements Fetcher<GovernmentDepartmentData> {
  source = DataSource.NI_GOVERNMENT;
  url = 'https://www.northernireland.gov.uk/topics/government-departments';

  async fetch(): Promise<FetcherResponse<GovernmentDepartmentData>>;
}
```

## 12. UK Research Councils Fetcher

**Service**: `UKResearchCouncilsFetcher`
**URL**: `https://www.ukri.org/councils/`

### Contract
```typescript
class UKResearchCouncilsFetcher implements Fetcher<ResearchCouncilData> {
  source = DataSource.UKRI;
  url = 'https://www.ukri.org/councils/';

  async fetch(): Promise<FetcherResponse<ResearchCouncilData>>;
}
```

## Error Handling Contract

All fetchers must handle errors consistently:

```typescript
interface FetcherError {
  success: false;
  error: string;
  source: DataSource;
  timestamp: Date;
  retryAttempts?: number;
  lastError?: Error;
}
```

## Retry Contract

All fetchers must implement exponential backoff:

```typescript
interface RetryConfig {
  maxAttempts: 3;
  backoffMs: [1000, 2000, 4000];
}
```