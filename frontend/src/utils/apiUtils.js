/**
 * Utility functions for API responses and data handling
 */

/**
 * Extracts a user-friendly error message from an API error object.
 * @param {Object} error - The axios error object
 * @param {string} fallback - Fallback message if extraction fails
 * @returns {string} extracted message
 */
export const getApiErrorMessage = (error, fallback = 'An unexpected error occurred') => {
  const data = error?.response?.data;
  if (!data) return error.message || fallback;
  if (typeof data === 'string') return data;
  if (data.message) return data.message;
  if (data.error) return data.error;
  if (data.detail) return data.detail;
  
  // DRF field errors often look like { "field_name": ["Error message"] }
  try {
    const firstKey = Object.keys(data)[0];
    const val = data[firstKey];
    if (Array.isArray(val)) return `${firstKey}: ${val[0]}`;
    if (typeof val === 'string') return `${firstKey}: ${val}`;
  } catch {
    // ignore
  }
  
  return fallback;
};

/**
 * Parses various list response formats into a standard array.
 * @param {any} payload - The raw API response data
 * @returns {Array} parsed list
 */
export const parseListResponse = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  
  // Handle case where it might be nested under a plural key
  const keys = Object.keys(payload || {});
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  
  return [];
};

/**
 * Filters a list based on a search term across multiple fields.
 * @param {Array} list - The items to filter
 * @param {string} term - Search term
 * @param {Array<string>} fields - Field names to check
 * @returns {Array} filtered list
 */
export const filterBySearch = (list, term, fields = []) => {
  if (!term || !list) return list;
  const t = term.toLowerCase();
  return list.filter(item => 
    fields.some(field => {
      const val = item[field];
      return val && String(val).toLowerCase().includes(t);
    })
  );
};
