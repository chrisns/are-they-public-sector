# 🇬🇧 UK Public Sector Organisation Aggregator

**The most comprehensive, open-source dataset of UK public sector organisations ever assembled!**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Coverage](https://img.shields.io/badge/Coverage-80%25%2B-brightgreen)](https://jestjs.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)
[![Data](https://img.shields.io/badge/Organisations-59%2C977-orange)](dist/orgs.json)
[![Sources](https://img.shields.io/badge/Data%20Sources-30-purple)](docs/data-sources.md)

A powerful TypeScript CLI tool that aggregates UK public sector organisation data from **30+ government sources** into a unified JSON format. This tool brings together data from diverse sources, creating a comprehensive dataset of **59,977 organisations** including schools, NHS trusts, local authorities, police forces, fire services, courts, community councils, and all UK government departments.

## 🚀 Why This Matters

Finding comprehensive, machine-readable data about UK public sector organisations is surprisingly difficult. Different government departments publish data in different formats, on different websites, with different schemas. This tool solves that problem by:

- **Unifying disparate data sources** into a single, consistent schema
- **Enriching data** with cross-references and additional metadata
- **Making data accessible** in a simple JSON format for analysis and integration
- **Updating automatically** with GitHub Actions running nightly

Perfect for researchers, journalists, developers, and anyone working with UK public sector data!

## ✨ Features

### 🎯 Comprehensive Data Coverage - 59,977 Organisations

| Category | Count | Sources |
|----------|-------|---------|
| **Education** | ~30,000+ | GIAS schools, FE colleges, NI schools |
| **Local Government** | ~2,700+ | English unitary/districts, Welsh/Scottish councils, community councils |
| **Healthcare** | ~230+ | NHS Trusts, ICBs, NI Health Trusts, Healthwatch |
| **Emergency Services** | ~95+ | Police forces, Fire services |
| **Government** | ~10,300+ | Departments, agencies, NDPBs, devolved bodies |
| **Other Public Bodies** | ~16,600+ | Courts, ports, research councils, national parks |

### 🛠 Technical Excellence
- **Multi-Source Aggregation**: Seamlessly combines JSON APIs, CSV files, Excel downloads, HTML scraping, and PDF parsing
- **Data Quality Scoring**: Automatic assessment of data completeness and reliability
- **Stream Processing**: Handles massive datasets (70MB+ output) efficiently
- **Robust Error Recovery**: Exponential backoff, retry mechanisms, and graceful failure handling
- **80%+ Test Coverage**: Comprehensive testing with unit, integration, and contract tests
- **TypeScript First**: Full type safety and excellent IDE support
- **In-Memory Processing**: No temporary files, everything processed on-demand

## 📊 Data Sources (30 Total)

### Core Government Sources
- **GOV.UK API** - Central government departments, agencies, NDPBs
- **ONS Public Sector Classification** - ~10,000 institutional and non-institutional units
- **GIAS (Get Information About Schools)** - All UK schools via CSV download
- **Northern Ireland Schools** - Separate NI schools dataset

### Healthcare
- **NHS Provider Directory** - English NHS Trusts and Foundation Trusts
- **Integrated Care Boards** - English health system ICBs
- **NHS Scotland Boards** - Scottish health boards
- **NI Health & Social Care Trusts** - Northern Ireland health trusts
- **Local Healthwatch** - Patient advocacy organisations
- **NHS Charities** - Associated charitable organisations

### Local Government
- **English Unitary Authorities** - ONS dataset of unitary councils
- **Districts of England** - District councils from ONS
- **Welsh Unitary Authorities** - 22 Welsh councils
- **DEFRA Local Authorities** - Comprehensive LA listing from UK-AIR
- **Welsh Community Councils** - ~1,100 community councils
- **Scottish Community Councils** - ~1,200 community councils
- **National Park Authorities** - UK national park bodies

### Emergency Services
- **Police Forces** - All UK territorial and special police forces
- **Fire Services** - All UK fire and rescue services

### Justice System
- **UK Courts** - Courts and tribunals across the UK

### Devolved Administrations
- **Devolved Administrations** - Scottish Parliament, Welsh Senedd, NI Assembly
- **Scottish Government Organisations** - Scottish government bodies
- **Welsh Government Bodies** - Additional Welsh public bodies
- **NI Government Departments** - Northern Ireland departments

### Other Public Bodies
- **UK Research Councils** - UKRI research councils
- **Northern Ireland Trust Ports** - NI port authorities
- **Scottish Regional Transport Partnerships** - Transport Scotland RTPs
- **Further Education Colleges** - FE colleges from Scotland, Wales, NI
- **Groundwork Trusts** - Environmental regeneration trusts

## 🚦 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Installation
```bash
# Clone the repository
git clone https://github.com/chrisns/are-they-public-sector.git
cd are-they-public-sector

# Install dependencies
pnpm install

# Run the aggregator!
pnpm run compile
```

The aggregator will fetch all data sources and generate a comprehensive `dist/orgs.json` file (~70MB).

### Selective Source Aggregation
```bash
# Aggregate only schools (quick, ~2 minutes)
pnpm run compile -- --source schools

# Aggregate only NHS organisations
pnpm run compile -- --source nhs

# Aggregate only local authorities
pnpm run compile -- --source defra

# See orchestrator.ts for all 30 source identifiers
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
    "processedAt": "2025-01-19T10:30:00Z",
    "totalRecords": 59977,
    "sources": ["gias", "nhs_provider_directory", "defra_uk_air", "gov_uk_api", "ons", ...]
  },
  "summary": {
    "totalOrganisations": 59977,
    "organisationsByType": {
      "educational_institution": 28500,
      "local_authority": 408,
      "nhs_trust": 150,
      "police_force": 45,
      "fire_service": 50,
      ...
    }
  }
}
```

## 🏗 Architecture

The project follows clean architecture principles with clear separation of concerns:

```text
src/
├── cli/                    # Command-line interface
│   ├── index.ts           # Entry point with file size reporting
│   ├── orchestrator.ts    # Workflow coordination (30 sources)
│   └── logger.ts          # Beautiful console output
├── services/              # Core business logic
│   ├── fetcher.ts         # HTTP/file fetching with in-memory processing
│   ├── parser.ts          # Excel/JSON parsing (accepts buffers)
│   ├── parser-simple.ts   # CSV and simple parsing
│   └── fetchers/          # Individual source fetchers (30 files)
│       ├── gias-csv-fetcher.ts
│       ├── welsh-councils-fetcher.ts
│       ├── scottish-councils-fetcher.ts
│       ├── ni-health-trusts-fetcher.ts
│       └── ... (26 more fetchers)
├── models/                # TypeScript interfaces
│   ├── organisation.ts    # Core data model with OrganisationType enum
│   ├── school.ts         # Schools model
│   ├── nhs.ts            # NHS model
│   └── ... (additional models)
└── lib/                   # Utilities
    └── writer.ts         # JSON output writer
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
pnpm test courts

# Type checking
pnpm run lint
```

### Test Structure
- **Contract Tests**: Validate external API contracts and data formats
- **Integration Tests**: Test complete workflows and component interactions
- **Unit Tests**: Test individual functions and classes

## 🤝 Contributing

We welcome contributions! This is an open-source project that benefits everyone working with UK public sector data.

### How to Contribute

1. **Report Issues**: Found a bug or have a feature request? [Open an issue](https://github.com/chrisns/are-they-public-sector/issues)
2. **Submit PRs**: Fork the repo, create a feature branch, and submit a pull request
3. **Add Data Sources**: Know of another public sector data source? Let's add it!
4. **Improve Documentation**: Help make the project more accessible

### Development Guidelines

1. **Follow TDD**: Write tests first (RED-GREEN-Refactor)
2. **Maintain Coverage**: Keep test coverage above 80%
3. **Use TypeScript**: Ensure full type safety
4. **Document Changes**: Update README and inline documentation
5. **No File Persistence**: Process everything in memory

## 🚀 Roadmap

- [x] Core aggregation of 30 data sources
- [x] In-memory processing without temporary files
- [ ] GitHub Actions for automated updates
- [ ] Web interface for searching and exploring data
- [ ] API endpoint for querying the dataset
- [ ] Data quality improvements and validation
- [ ] Additional data sources

## 📈 Performance

The aggregator is optimized for large-scale data processing:

- **Memory Efficient**: In-memory buffer processing without temporary files
- **Fast Processing**: 59,977 records in under 60 seconds
- **Parallel Fetching**: Concurrent data source retrieval
- **Smart Retries**: Exponential backoff for failed requests
- **Large Output**: Generates ~70MB JSON file

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
- And 23 other data sources (see [docs/data-sources.md](docs/data-sources.md) for full list)

## 💬 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/chrisns/are-they-public-sector/issues)
- **Discussions**: [GitHub Discussions](https://github.com/chrisns/are-they-public-sector/discussions)

---

**Built with ❤️ for the UK open data community**

*Making UK public sector data accessible, one organisation at a time*