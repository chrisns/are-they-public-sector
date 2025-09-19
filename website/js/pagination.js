// Pagination functionality module for UK Public Sector Organisations website

const Pagination = {
    // Default configuration
    config: {
        itemsPerPage: 50,
        pageSizeOptions: [10, 25, 50, 100, 250],
        maxPageButtons: 7, // Maximum number of page buttons to show
        showFirstLast: true, // Show first/last page buttons
        showInfo: true, // Show "Showing X-Y of Z results"
        scrollToTop: true // Scroll to top when page changes
    },

    // Calculate pagination data
    calculate(totalItems, currentPage, itemsPerPage) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

        const startIndex = (validCurrentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

        return {
            currentPage: validCurrentPage,
            totalPages: totalPages,
            totalItems: totalItems,
            itemsPerPage: itemsPerPage,
            startIndex: startIndex,
            endIndex: endIndex,
            startItem: startIndex + 1,
            endItem: endIndex,
            hasPrevious: validCurrentPage > 1,
            hasNext: validCurrentPage < totalPages
        };
    },

    // Get items for current page
    getPageItems(items, pageInfo) {
        return items.slice(pageInfo.startIndex, pageInfo.endIndex);
    },

    // Generate page numbers to display
    getPageNumbers(currentPage, totalPages, maxButtons = 7) {
        if (totalPages <= maxButtons) {
            // Show all pages
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const pages = [];
        const halfButtons = Math.floor(maxButtons / 2);

        if (currentPage <= halfButtons) {
            // Show first pages
            for (let i = 1; i < maxButtons - 1; i++) {
                pages.push(i);
            }
            pages.push('...');
            pages.push(totalPages);
        } else if (currentPage >= totalPages - halfButtons + 1) {
            // Show last pages
            pages.push(1);
            pages.push('...');
            for (let i = totalPages - maxButtons + 3; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Show pages around current
            pages.push(1);
            pages.push('...');
            for (let i = currentPage - halfButtons + 2; i <= currentPage + halfButtons - 2; i++) {
                pages.push(i);
            }
            pages.push('...');
            pages.push(totalPages);
        }

        return pages;
    },

    // Navigate to specific page
    goToPage(pageNumber, pageInfo) {
        if (pageNumber < 1 || pageNumber > pageInfo.totalPages) {
            return pageInfo.currentPage;
        }

        if (this.config.scrollToTop) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        return pageNumber;
    },

    // Navigate to next page
    nextPage(pageInfo) {
        return this.goToPage(pageInfo.currentPage + 1, pageInfo);
    },

    // Navigate to previous page
    previousPage(pageInfo) {
        return this.goToPage(pageInfo.currentPage - 1, pageInfo);
    },

    // Navigate to first page
    firstPage() {
        if (this.config.scrollToTop) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return 1;
    },

    // Navigate to last page
    lastPage(pageInfo) {
        if (this.config.scrollToTop) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return pageInfo.totalPages;
    },

    // Jump to page by input
    jumpToPage(pageInput, pageInfo) {
        const pageNumber = parseInt(pageInput, 10);
        if (isNaN(pageNumber)) {
            return pageInfo.currentPage;
        }
        return this.goToPage(pageNumber, pageInfo);
    },

    // Change items per page
    changePageSize(newSize, pageInfo) {
        const newPageInfo = this.calculate(
            pageInfo.totalItems,
            1, // Reset to first page
            newSize
        );
        return newPageInfo;
    },

    // Generate pagination summary text
    getSummaryText(pageInfo) {
        if (pageInfo.totalItems === 0) {
            return 'No items to display';
        }

        return `Showing ${pageInfo.startItem.toLocaleString()} to ${pageInfo.endItem.toLocaleString()} of ${pageInfo.totalItems.toLocaleString()} items`;
    },

    // Save pagination preferences
    savePreferences(itemsPerPage) {
        try {
            localStorage.setItem('ukpso-pagination-size', itemsPerPage.toString());
        } catch (e) {
            console.warn('Failed to save pagination preferences:', e);
        }
    },

    // Load pagination preferences
    loadPreferences() {
        try {
            const saved = localStorage.getItem('ukpso-pagination-size');
            return saved ? parseInt(saved, 10) : this.config.itemsPerPage;
        } catch (e) {
            console.warn('Failed to load pagination preferences:', e);
            return this.config.itemsPerPage;
        }
    },

    // Virtual scrolling support for large datasets
    virtualScroll: {
        // Calculate visible items for virtual scrolling
        getVisibleItems(items, scrollTop, containerHeight, itemHeight) {
            const startIndex = Math.floor(scrollTop / itemHeight);
            const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);

            const visibleItems = items.slice(startIndex, endIndex);

            return {
                items: visibleItems,
                offsetY: startIndex * itemHeight,
                totalHeight: items.length * itemHeight,
                startIndex: startIndex,
                endIndex: endIndex
            };
        },

        // Calculate item height dynamically
        calculateItemHeight(container) {
            const testItem = container.querySelector('.org-card');
            return testItem ? testItem.offsetHeight : 80; // Default height
        }
    },

    // Keyboard navigation support
    keyboard: {
        // Handle keyboard events
        handleKeyEvent(event, pageInfo, callbacks) {
            switch(event.key) {
                case 'ArrowLeft':
                    if (event.ctrlKey || event.metaKey) {
                        callbacks.firstPage();
                    } else {
                        callbacks.previousPage();
                    }
                    event.preventDefault();
                    break;

                case 'ArrowRight':
                    if (event.ctrlKey || event.metaKey) {
                        callbacks.lastPage();
                    } else {
                        callbacks.nextPage();
                    }
                    event.preventDefault();
                    break;

                case 'Home':
                    callbacks.firstPage();
                    event.preventDefault();
                    break;

                case 'End':
                    callbacks.lastPage();
                    event.preventDefault();
                    break;

                default:
                    // Handle number keys 1-9
                    if (event.key >= '1' && event.key <= '9') {
                        const pageNum = parseInt(event.key, 10);
                        if (pageNum <= pageInfo.totalPages) {
                            callbacks.goToPage(pageNum);
                            event.preventDefault();
                        }
                    }
            }
        },

        // Setup keyboard navigation
        setup(container, pageInfo, callbacks) {
            container.addEventListener('keydown', (event) => {
                this.handleKeyEvent(event, pageInfo, callbacks);
            });
        }
    },

    // Generate accessible ARIA labels
    getAriaLabels(pageInfo) {
        return {
            navigation: 'Pagination Navigation',
            previousPage: `Go to previous page (${pageInfo.currentPage - 1})`,
            nextPage: `Go to next page (${pageInfo.currentPage + 1})`,
            firstPage: 'Go to first page',
            lastPage: `Go to last page (${pageInfo.totalPages})`,
            currentPage: `Current page, page ${pageInfo.currentPage}`,
            pageButton: (pageNum) => `Go to page ${pageNum}`,
            pageSize: 'Items per page',
            jumpToPage: 'Jump to page'
        };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Pagination;
}