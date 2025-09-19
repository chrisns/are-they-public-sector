/**
 * Data source identifiers for UK Government Organisation Data Sources
 */
export enum DataSource {
  // English sources
  ONS = 'ons',
  WIKIPEDIA = 'wikipedia',
  NATIONAL_PARKS_ENGLAND = 'national_parks_england',
  NHS = 'nhs',
  HEALTHWATCH = 'healthwatch',

  // Scottish sources
  MYGOV_SCOT = 'mygov_scot',
  NHS_SCOTLAND = 'nhs_scotland',
  TRANSPORT_SCOTLAND = 'transport_scotland',

  // Welsh sources
  LAW_GOV_WALES = 'law_gov_wales',

  // Northern Ireland sources
  INFRASTRUCTURE_NI = 'infrastructure_ni',
  NI_GOVERNMENT = 'ni_government',

  // UK-wide sources
  UKRI = 'ukri'
}

/**
 * Maps DataSource to corresponding DataSourceType for integration
 */
export function mapToDataSourceType(source: DataSource): string {
  // Map new sources to existing DataSourceType or create custom mapping
  const mapping: Record<DataSource, string> = {
    [DataSource.ONS]: 'ons_unitary_authorities',
    [DataSource.WIKIPEDIA]: 'wikipedia_districts',
    [DataSource.NATIONAL_PARKS_ENGLAND]: 'national_parks',
    [DataSource.NHS]: 'nhs_integrated_care_boards',
    [DataSource.HEALTHWATCH]: 'local_healthwatch',
    [DataSource.MYGOV_SCOT]: 'scottish_government',
    [DataSource.NHS_SCOTLAND]: 'nhs_scotland',
    [DataSource.TRANSPORT_SCOTLAND]: 'scottish_transport',
    [DataSource.LAW_GOV_WALES]: 'welsh_government',
    [DataSource.INFRASTRUCTURE_NI]: 'ni_infrastructure',
    [DataSource.NI_GOVERNMENT]: 'ni_government',
    [DataSource.UKRI]: 'uk_research_councils'
  };

  return mapping[source] || source;
}