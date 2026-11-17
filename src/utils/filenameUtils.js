/**
 * Filename Utilities
 * ==================
 * Helpers for generating safe, consistent filenames for PNG export.
 */

/**
 * Sanitize a string for use in filenames.
 * Lowercases, replaces spaces/special chars with dashes, collapses runs.
 * @param {string} str
 * @returns {string}
 */
export function sanitize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * Generate a PNG filename for a Duet card.
 * Format: duet-{category}-{number}.png
 * @param {string} category
 * @param {number} index  0-based index
 * @returns {string}
 */
export function cardFilename(category, index) {
  const cat = sanitize(category);
  const num = String(index + 1).padStart(2, '0');
  return `duet-${cat}-${num}.png`;
}

/**
 * Generate a ZIP filename for a batch download.
 * Format: duet-{category}-{timestamp}.zip
 * @param {string} category
 * @returns {string}
 */
export function batchFilename(category) {
  const cat = sanitize(category);
  const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  return `duet-${cat}-${ts}.zip`;
}
