/**
 * rep+ Filters
 * Search and filter requests
 */

const Filters = {
  // Search in request
  searchRequest(request, query, isRegex = false) {
    if (!query) return true;

    try {
      const searchIn = [
        request.url,
        request.method,
        JSON.stringify(request.headers),
        request.body || ''
      ].join(' ').toLowerCase();

      if (isRegex) {
        const regex = new RegExp(query, 'i');
        return regex.test(searchIn);
      } else {
        return searchIn.includes(query.toLowerCase());
      }
    } catch (e) {
      console.error('Search error:', e);
      return false;
    }
  },

  // Filter by method
  filterByMethod(requests, method) {
    if (method === 'all') return requests;
    return requests.filter(req => req.method === method);
  },

  // Filter starred requests
  filterStarred(requests) {
    return requests.filter(req => req.starred);
  },

  // Apply all filters
  applyFilters(requests, { query, isRegex, method, starredOnly }) {
    let filtered = [...requests];

    // Filter by method
    if (method && method !== 'all') {
      filtered = this.filterByMethod(filtered, method);
    }

    // Filter starred
    if (starredOnly) {
      filtered = this.filterStarred(filtered);
    }

    // Search
    if (query) {
      filtered = filtered.filter(req => this.searchRequest(req, query, isRegex));
    }

    return filtered;
  },

  // Sort requests
  sortRequests(requests, sortBy = 'time', order = 'desc') {
    return [...requests].sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'time':
          aVal = a.timestamp;
          bVal = b.timestamp;
          break;
        case 'status':
          aVal = a.response?.status || 0;
          bVal = b.response?.status || 0;
          break;
        case 'size':
          aVal = a.response?.size || 0;
          bVal = b.response?.size || 0;
          break;
        case 'url':
          aVal = a.url;
          bVal = b.url;
          break;
        default:
          return 0;
      }

      if (order === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }
};

window.Filters = Filters;
