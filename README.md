# 🇬🇧 UK Public Sector Organisation Aggregator

**The most comprehensive, open-source dataset of UK public sector organisations ever assembled!**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Coverage](https://img.shields.io/badge/Coverage-80%25%2B-brightgreen)](https://jestjs.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

A powerful TypeScript CLI tool that aggregates UK public sector organisation data from multiple government sources into a unified, deduplicated JSON format. This tool brings together data from **14 different sources**, including over **30,000 schools**, **400+ local authorities**, **200+ NHS trusts**, **45+ police forces**, **50+ fire services**, **43 further education colleges**, **2,300+ community councils**, and all UK government departments and devolved administrations.

## 🚀 Why This Matters

Finding comprehensive, machine-readable data about UK public sector organisations is surprisingly difficult. Different government departments publish data in different formats, on different websites, with different schemas. This tool solves that problem by:

- **Unifying disparate data sources** into a single, consistent schema
- **Deduplicating organisations** that appear in multiple sources
- **Enriching data** with cross-references and additional metadata
- **Making data accessible** in a simple JSON format for analysis and integration

Perfect for researchers, journalists, developers, and anyone working with UK public sector data!

## ✨ Features

### 🎯 Comprehensive Data Coverage
- **30,000+ Schools** - Every UK school from GIAS (Get Information About Schools)
- **400+ Local Authorities** - All councils including County, District, Borough, City, and Unitary
- **215+ NHS Organisations** - All NHS Trusts and Foundation Trusts
- **45+ Police Forces** - All UK territorial, special, and crown dependency police forces
- **50+ Fire Services** - All UK fire and rescue services
- **300+ Government Bodies** - Departments, agencies, NDPBs from GOV.UK API
- **10,000+ Public Sector Units** - From ONS Public Sector Classification Guide
- **27 Devolved Entities** - Scottish Parliament, Welsh Senedd, NI Assembly and departments
- **Additional Devolved Bodies** - Scottish, Welsh, and NI agencies not in core data
- **43 Further Education Colleges** - FE colleges from Scotland, Wales, and Northern Ireland
- **1,100+ Welsh Community Councils** - All community councils in Wales
- **1,200+ Scottish Community Councils** - Active community councils in Scotland
- **6 NI Health & Social Care Trusts** - Northern Ireland health service organisations

### 🛠 Technical Excellence
- **Multi-Source Aggregation**: Seamlessly combines JSON APIs, Excel files, HTML scraping, and static data
- **Intelligent Deduplication**: Advanced fuzzy matching to identify and merge duplicate records
- **Data Quality Scoring**: Automatic assessment of data completeness and reliability
- **Stream Processing**: Handles massive datasets (100k+ records) efficiently
- **Robust Error Recovery**: Exponential backoff, retry mechanisms, and graceful failure handling
- **80%+ Test Coverage**: Comprehensive testing with unit, integration, and performance tests
- **TypeScript First**: Full type safety and excellent IDE support

## 📊 Data Sources

| Source | Records | Type | Description |
|--------|---------|------|-------------|
| **GIAS Schools** | ~30,000 | API/JSON | All UK schools with full details including location, type, status |
| **DEFRA Local Authorities** | ~408 | HTML | All UK local government bodies scraped from UK-AIR |
| **NHS Provider Directory** | ~215 | HTML | NHS Trusts and Foundation Trusts from england.nhs.uk |
| **Police Forces** | ~45 | HTML | All UK police forces from police.uk |
| **Fire Services** | ~50 | HTML | All UK fire and rescue services from NFCC |
| **GOV.UK API** | ~300 | JSON | Central government departments, agencies, NDPBs |
| **ONS Classification** | ~10,000 | Excel | Comprehensive public sector classification guide |
| **Devolved Administrations** | 27 | Static | Scottish, Welsh, NI parliaments and departments |
| **Additional Devolved Bodies** | ~15 | HTML | Scottish, Welsh, NI agencies from gov.uk guidance |
| **FE Colleges** | 43 | PDF/HTML | Further Education colleges from AoC website |
| **Welsh Community Councils** | ~1,100 | HTML | Community councils from Wikipedia |
| **Scottish Community Councils** | ~1,200 | HTML | Active community councils from Wikipedia |
| **NI Health & Social Care Trusts** | 6 | HTML | Health trusts from NI Direct |

## 🚦 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/are-they-public-sector2.git
cd are-they-public-sector2

# Install dependencies
pnpm install

# Run the aggregator!
pnpm run compile
```

The aggregator will fetch all data sources and generate a comprehensive `dist/orgs.json` file (typically 50MB+).

### Selective Source Aggregation
```bash
# Aggregate only schools (quick, ~2 minutes)
pnpm run compile -- --source schools

# Aggregate only NHS organisations
pnpm run compile -- --source nhs-provider-directory

# Aggregate only devolved administrations
pnpm run compile -- --source devolved

# Aggregate only police forces
pnpm run compile -- --source police

# Aggregate only fire services
pnpm run compile -- --source fire

# Aggregate additional devolved bodies
pnpm run compile -- --source devolved-extra

# Aggregate Further Education colleges
pnpm run compile -- --source colleges
```

## 📁 Output Format

The tool generates a structured JSON file with comprehensive organisation data:

```json
{
  "organisations": [
    {
      "id": "gias-100001",
      "name": "Example Primary School",
      "type": "educational_institution",
      "classification": "Primary Education",
      "status": "active",
      "location": {
        "address": "123 School Lane, London SW1A 1AA",
        "country": "United Kingdom"
      },
      "sources": [{
        "source": "gias",
        "sourceId": "100001",
        "confidence": 1.0
      }],
      "dataQuality": {
        "completeness": 0.89,
        "hasConflicts": false
      },
      "additionalProperties": {
        "urn": 100001,
        "phaseType": "Primary, Academy",
        "localAuthority": "Westminster"
      }
    }
  ],
  "metadata": {
    "processedAt": "2025-01-13T10:30:00Z",
    "totalRecords": 42000,
    "sources": ["gias", "nhs_provider_directory", "defra_uk_air", "gov_uk_api", "ons", "manual"]
  },
  "summary": {
    "totalOrganisations": 42000,
    "organisationsByType": {
      "educational_institution": 28500,
      "academy_trust": 1500,
      "local_authority": 408,
      "nhs_trust": 150,
      "nhs_foundation_trust": 65,
      "ministerial_department": 50,
      "executive_agency": 120
    }
  }
}
```

## 🏗 Architecture

The project follows clean architecture principles with clear separation of concerns:

```text
src/
├── cli/                    # Command-line interface
│   ├── index.ts           # Entry point
│   ├── orchestrator.ts    # Workflow coordination
│   └── logger.ts          # Beautiful console output
├── services/              # Core business logic
│   ├── fetcher.ts         # HTTP/file fetching
│   ├── parser.ts          # Excel/JSON parsing
│   ├── schools-parser.ts  # GIAS schools aggregation
│   ├── nhs-parser.ts      # NHS HTML scraping
│   ├── local-authority-parser.ts  # LA HTML scraping
│   ├── police-parser.ts   # Police forces HTML scraping
│   ├── fire-parser.ts     # Fire services HTML scraping
│   ├── devolved-admin-parser.ts   # Devolved administrations
│   ├── devolved-extra-parser.ts   # Additional devolved bodies
│   └── mappers/           # Data transformation
├── models/                # TypeScript interfaces
│   ├── organisation.ts    # Core data model
│   ├── school.ts         # Schools model
│   ├── nhs.ts            # NHS model
│   ├── emergency-services.ts # Police, Fire, Devolved models
│   └── devolved-admin.ts # Devolved model
└── data/                  # Static data files
    └── devolved-administrations.json
```

## 🧪 Testing

We follow Test-Driven Development (TDD) with comprehensive test coverage:

```bash
# Run all tests
pnpm test

# Run with coverage report
pnpm coverage

# Run specific test suites
pnpm test schools
pnpm test nhs
pnpm test devolved

# Run performance tests
pnpm test -- --testNamePattern="Performance"
```

### Test Structure
- **Contract Tests**: Validate external API contracts and data formats
- **Integration Tests**: Test complete workflows and component interactions
- **Unit Tests**: Test individual functions and classes
- **Performance Tests**: Validate memory usage and processing speed

## 🤝 Contributing

We welcome contributions! This is an open-source project that benefits everyone working with UK public sector data.

### How to Contribute

1. **Report Issues**: Found a bug or have a feature request? [Open an issue](https://github.com/yourusername/are-they-public-sector2/issues)
2. **Submit PRs**: Fork the repo, create a feature branch, and submit a pull request
3. **Add Data Sources**: Know of another public sector data source? Let's add it!
4. **Improve Documentation**: Help make the project more accessible

### Development Guidelines

1. **Follow TDD**: Write tests first (RED-GREEN-Refactor)
2. **Maintain Coverage**: Keep test coverage above 80%
3. **Use TypeScript**: Ensure full type safety
4. **Document Changes**: Update README and inline documentation

### Areas for Contribution

- 🏴󐁧󐁢󐁳󐁣󐁴󐁿 **Scottish Local Authorities**: Add Scotland's 32 councils
- 🏴󐁧󐁢󐁷󐁬󐁳󐁿 **Welsh Local Authorities**: Add Wales' 22 councils  
- 🇮🇪 **Northern Ireland Councils**: Add NI's 11 councils
- 🏛 **Quangos & Arms-Length Bodies**: Expand coverage of public bodies
- 🎓 **Universities**: Add UK higher education institutions
- 📊 **Data Enrichment**: Add websites, social media, contact details

|
## 🚀 Roadmap

- [x] Add remaining UK local authorities (Scotland, Wales, NI)
- [x] Include universities and higher education institutions
- [x] Add police forces and fire services (✅ Complete)
- [x] Implement real-time update mechanism
- [ ] Create web API for querying the dataset
- [ ] Build visualisation dashboard

## 📈 Performance

The aggregator is optimized for large-scale data processing:

- **Memory Efficient**: Stream processing prevents memory exhaustion
- **Fast Processing**: 100k+ records in under 60 seconds
- **Parallel Fetching**: Concurrent data source retrieval
- **Smart Caching**: Reduces API calls and network traffic

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details. Use this data freely for any purpose!

## 🙏 Acknowledgments

This project wouldn't be possible without the open data published by:
- [GOV.UK](https://www.gov.uk/) - Government departments and agencies
- [ONS](https://www.ons.gov.uk/) - Public sector classification
- [NHS England](https://www.england.nhs.uk/) - NHS provider data
- [DEFRA](https://uk-air.defra.gov.uk/) - Local authority listings
- [Get Information About Schools](https://get-information-schools.service.gov.uk/) - Schools data
- [Police.uk](https://www.police.uk/) - UK police forces directory
- [NFCC](https://www.nationalfirechiefs.org.uk/) - National Fire Chiefs Council
- [GOV.UK Guidance](https://www.gov.uk/guidance/) - Devolved administration bodies

## 💬 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/yourusername/are-they-public-sector2/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/are-they-public-sector2/discussions)

---

**Built with ❤️ for the UK open data community**

*Making UK public sector data accessible, one organisation at a time*