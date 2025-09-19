// Main application controller for UK Public Sector Organisations website

function app() {
    return {
        // Data properties
        organisations: [],
        filteredOrganisations: [],
        paginatedOrganisations: [],
        metadata: null,

        // UI state
        loading: true,
        loadingProgress: '0',
        error: null,
        selectedOrg: null,

        // Search and filter state
        searchTerm: '',
        selectedType: '',
        selectedLocation: '',
        fuse: null, // Fuse.js instance

        // Pagination state
        currentPage: 1,
        itemsPerPage: 50,
        totalPages: 1,

        // Statistics
        totalOrganisations: 0,
        organisationTypes: [],
        typeBreakdown: {},
        fileSizeMB: '0',

        // Initialize the application
        async init() {
            try {
                await this.loadData();
                this.setupSearch();
                this.calculateStatistics();
                this.applyFilters();
            } catch (err) {
                console.error('Initialization error:', err);
                this.error = err.message || 'Failed to initialize application';
                this.loading = false;
            }
        },

        // Load data from JSON file
        async loadData() {
            try {
                // Load metadata first if available
                try {
                    const metaResponse = await fetch('data/metadata.json');
                    if (metaResponse.ok) {
                        this.metadata = await metaResponse.json();
                        this.fileSizeMB = ((this.metadata.fileSize || 0) / (1024 * 1024)).toFixed(2);
                    }
                } catch (metaErr) {
                    console.warn('Metadata not available:', metaErr);
                }

                // Load main data
                const response = await fetch('data/orgs.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                // Get response size for progress tracking
                const contentLength = response.headers.get('content-length');
                if (contentLength) {
                    const total = parseInt(contentLength, 10);
                    const reader = response.body.getReader();
                    let receivedLength = 0;
                    let chunks = [];

                    while(true) {
                        const {done, value} = await reader.read();

                        if (done) break;

                        chunks.push(value);
                        receivedLength += value.length;

                        // Update progress
                        const progress = Math.round((receivedLength / total) * 100);
                        this.loadingProgress = `${progress}%`;
                    }

                    // Combine chunks and parse JSON
                    const chunksAll = new Uint8Array(receivedLength);
                    let position = 0;
                    for(let chunk of chunks) {
                        chunksAll.set(chunk, position);
                        position += chunk.length;
                    }

                    const text = new TextDecoder("utf-8").decode(chunksAll);
                    const data = JSON.parse(text);

                    this.organisations = data.organisations || [];

                    // Update metadata if it's in the data
                    if (data.metadata && !this.metadata) {
                        this.metadata = data.metadata;
                    }
                } else {
                    // Fallback for servers that don't send content-length
                    const data = await response.json();
                    this.organisations = data.organisations || [];

                    if (data.metadata && !this.metadata) {
                        this.metadata = data.metadata;
                    }
                }

                this.totalOrganisations = this.organisations.length;
                this.loading = false;

                console.log(`Loaded ${this.totalOrganisations} organisations`);

            } catch (err) {
                console.error('Error loading data:', err);
                this.error = `Failed to load data: ${err.message}`;
                this.loading = false;
                throw err;
            }
        },

        // Setup Fuse.js search index
        setupSearch() {
            const options = {
                keys: ['name', 'alternativeNames'],
                threshold: 0.3, // Fuzzy matching threshold
                includeScore: true,
                useExtendedSearch: true,
                ignoreLocation: true, // Search anywhere in the string
                minMatchCharLength: 2
            };

            this.fuse = new Fuse(this.organisations, options);
            console.log('Search index created');
        },

        // Calculate statistics
        calculateStatistics() {
            // Get unique organisation types
            const types = new Set();
            const typeCount = {};

            this.organisations.forEach(org => {
                if (org.type) {
                    types.add(org.type);
                    typeCount[org.type] = (typeCount[org.type] || 0) + 1;
                }
            });

            this.organisationTypes = Array.from(types).sort();
            this.typeBreakdown = typeCount;

            // Calculate file size if not from metadata
            if (!this.fileSizeMB || this.fileSizeMB === '0') {
                // Estimate based on data
                const jsonString = JSON.stringify(this.organisations);
                const sizeInBytes = new Blob([jsonString]).size;
                this.fileSizeMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
            }
        },

        // Perform search using Fuse.js
        performSearch() {
            if (!this.searchTerm.trim()) {
                this.applyFilters();
                return;
            }

            const results = this.fuse.search(this.searchTerm);
            const searchedOrgs = results.map(result => result.item);

            // Apply other filters to search results
            this.filteredOrganisations = this.applyTypeAndLocationFilters(searchedOrgs);
            this.updatePagination();
        },

        // Apply filters
        applyFilters() {
            let filtered = [...this.organisations];

            // Apply search if present
            if (this.searchTerm.trim()) {
                const results = this.fuse.search(this.searchTerm);
                filtered = results.map(result => result.item);
            }

            // Apply type and location filters
            filtered = this.applyTypeAndLocationFilters(filtered);

            this.filteredOrganisations = filtered;
            this.updatePagination();
        },

        // Apply type and location filters to a list
        applyTypeAndLocationFilters(orgs) {
            let filtered = orgs;

            // Filter by type
            if (this.selectedType) {
                filtered = filtered.filter(org => org.type === this.selectedType);
            }

            // Filter by location
            if (this.selectedLocation) {
                filtered = filtered.filter(org => org.region === this.selectedLocation);
            }

            return filtered;
        },

        // Update pagination
        updatePagination() {
            this.totalPages = Math.ceil(this.filteredOrganisations.length / this.itemsPerPage);
            this.currentPage = 1;
            this.paginateResults();
        },

        // Paginate results
        paginateResults() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            this.paginatedOrganisations = this.filteredOrganisations.slice(start, end);
        },

        // Navigation methods
        previousPage() {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.paginateResults();
            }
        },

        nextPage() {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.paginateResults();
            }
        },

        // Show organisation details
        showDetails(org) {
            this.selectedOrg = org;
        },

        // Download organisation data as JSON
        downloadOrgData(org) {
            const dataStr = JSON.stringify(org, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

            const exportName = `${org.id || 'organisation'}.json`;

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportName);
            linkElement.click();
        },

        // Format functions
        formatType(type) {
            if (!type) return 'Unknown';
            return type.split('_').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        },

        formatDate(dateStr) {
            if (!dateStr) return 'Unknown';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-GB', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        formatPropertyKey(key) {
            return key.split(/(?=[A-Z])/).join(' ').replace(/_/g, ' ')
                .split(' ').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
        },

        getStatusClass(status) {
            switch(status) {
                case 'active': return 'status-active';
                case 'inactive': return 'status-inactive';
                case 'dissolved': return 'status-dissolved';
                default: return 'text-gray-500';
            }
        }
    };
}