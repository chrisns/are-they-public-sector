// Search functionality module for UK Public Sector Organisations website

// Advanced search options for Fuse.js
const searchOptions = {
    // Fields to search
    keys: [
        {
            name: 'name',
            weight: 2.0 // Name has highest priority
        },
        {
            name: 'alternativeNames',
            weight: 1.5 // Alternative names have secondary priority
        },
        {
            name: 'classification',
            weight: 0.5
        },
        {
            name: 'additionalProperties.website',
            weight: 0.3
        }
    ],

    // Search configuration
    threshold: 0.3, // 0.0 = perfect match, 1.0 = match anything
    includeScore: true,
    includeMatches: true,
    useExtendedSearch: true,
    ignoreLocation: true, // Search anywhere in the string
    minMatchCharLength: 2,
    shouldSort: true,
    findAllMatches: false,

    // Performance optimization
    location: 0,
    distance: 100,
    maxPatternLength: 32
};

// Search helper functions
const SearchHelpers = {
    // Highlight search matches in text
    highlightMatches(text, searchTerm) {
        if (!searchTerm || searchTerm.length < 2) return text;

        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
    },

    // Parse advanced search syntax
    parseSearchQuery(query) {
        // Support for advanced search operators
        // "exact phrase" - exact match
        // type:nhs - filter by type
        // region:scotland - filter by region
        // status:active - filter by status

        const filters = {};
        let searchText = query;

        // Extract type filter
        const typeMatch = query.match(/type:(\S+)/i);
        if (typeMatch) {
            filters.type = typeMatch[1];
            searchText = searchText.replace(typeMatch[0], '').trim();
        }

        // Extract region filter
        const regionMatch = query.match(/region:(\S+)/i);
        if (regionMatch) {
            filters.region = regionMatch[1];
            searchText = searchText.replace(regionMatch[0], '').trim();
        }

        // Extract status filter
        const statusMatch = query.match(/status:(\S+)/i);
        if (statusMatch) {
            filters.status = statusMatch[1];
            searchText = searchText.replace(statusMatch[0], '').trim();
        }

        // Check for exact phrase search
        const exactMatch = searchText.match(/"([^"]+)"/);
        if (exactMatch) {
            filters.exact = exactMatch[1];
            searchText = searchText.replace(exactMatch[0], '').trim();
        }

        return {
            text: searchText,
            filters: filters
        };
    },

    // Build Fuse.js extended search query
    buildExtendedSearchQuery(parsedQuery) {
        const query = {
            $and: []
        };

        // Add text search
        if (parsedQuery.text) {
            query.$and.push({
                $or: [
                    { name: parsedQuery.text },
                    { alternativeNames: parsedQuery.text }
                ]
            });
        }

        // Add exact phrase search
        if (parsedQuery.filters.exact) {
            query.$and.push({
                name: `="${parsedQuery.filters.exact}"`
            });
        }

        return query.$and.length > 0 ? query : parsedQuery.text;
    },

    // Score and rank search results
    rankResults(results, searchTerm) {
        return results.map(result => {
            let score = result.score || 0;

            // Boost exact matches
            if (result.item.name.toLowerCase() === searchTerm.toLowerCase()) {
                score *= 0.1; // Lower score is better in Fuse.js
            }

            // Boost if search term is at the beginning
            if (result.item.name.toLowerCase().startsWith(searchTerm.toLowerCase())) {
                score *= 0.5;
            }

            return { ...result, score };
        }).sort((a, b) => a.score - b.score);
    },

    // Get search suggestions (autocomplete)
    getSuggestions(organisations, partial, limit = 10) {
        if (!partial || partial.length < 2) return [];

        const suggestions = [];
        const lowerPartial = partial.toLowerCase();

        for (const org of organisations) {
            if (suggestions.length >= limit) break;

            if (org.name.toLowerCase().includes(lowerPartial)) {
                suggestions.push({
                    value: org.name,
                    type: org.type,
                    id: org.id
                });
            }
        }

        return suggestions;
    },

    // Search within results (filter existing results)
    searchWithinResults(results, additionalTerm) {
        if (!additionalTerm) return results;

        return results.filter(org => {
            const searchableText = `${org.name} ${org.alternativeNames?.join(' ') || ''} ${org.classification || ''}`.toLowerCase();
            return searchableText.includes(additionalTerm.toLowerCase());
        });
    },

    // Export search results
    exportSearchResults(results, format = 'json') {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `search-results-${timestamp}`;

        if (format === 'json') {
            const dataStr = JSON.stringify(results, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            this.downloadFile(dataUri, `${filename}.json`);
        } else if (format === 'csv') {
            const csv = this.convertToCSV(results);
            const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
            this.downloadFile(dataUri, `${filename}.csv`);
        }
    },

    // Convert results to CSV
    convertToCSV(results) {
        const headers = ['ID', 'Name', 'Type', 'Classification', 'Status', 'Region', 'Data Quality'];
        const rows = results.map(org => [
            org.id,
            `"${org.name.replace(/"/g, '""')}"`,
            org.type,
            org.classification || '',
            org.status,
            org.region || '',
            Math.round(org.dataQuality.completeness * 100) + '%'
        ]);

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    },

    // Download file helper
    downloadFile(dataUri, filename) {
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', filename);
        linkElement.click();
    },

    // Search history management
    searchHistory: {
        key: 'ukpso-search-history',
        maxItems: 10,

        add(term) {
            let history = this.get();
            history = history.filter(item => item !== term);
            history.unshift(term);
            if (history.length > this.maxItems) {
                history = history.slice(0, this.maxItems);
            }
            localStorage.setItem(this.key, JSON.stringify(history));
        },

        get() {
            try {
                return JSON.parse(localStorage.getItem(this.key) || '[]');
            } catch {
                return [];
            }
        },

        clear() {
            localStorage.removeItem(this.key);
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { searchOptions, SearchHelpers };
}