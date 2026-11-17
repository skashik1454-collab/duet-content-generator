/**
 * Question Filter Service
 * ========================
 * Pure filtering layer: narrows the full card set by category, deck, mode,
 * and free/premium status before any scoring or ranking occurs.
 */

export class QuestionFilter {
  /**
   * Filter cards based on the provided options.
   * @param {Array} cards - Full card array from the library
   * @param {Object} options
   * @param {string}  options.category      - Required category name
   * @param {string}  [options.deck='all']  - Deck name or 'all'
   * @param {string}  [options.mode='all']  - Mode filter: 'all', 'together', 'long_distance'
   * @param {string}  [options.contentFilter='all'] - 'all', 'free', 'premium'
   * @returns {Array} Filtered cards
   */
  filter(cards, options) {
    let filtered = cards;

    // Category filter (required)
    if (options.category) {
      filtered = filtered.filter(c =>
        c.category.toUpperCase() === options.category.toUpperCase()
      );
    }

    // Deck filter (optional)
    if (options.deck && options.deck !== 'all') {
      filtered = filtered.filter(c => c.deck === options.deck);
    }

    // Mode filter (optional)
    if (options.mode && options.mode !== 'all') {
      filtered = filtered.filter(c =>
        Array.isArray(c.mode_support) && c.mode_support.includes(options.mode)
      );
    }

    // Free / Premium filter (optional)
    if (options.contentFilter === 'free') {
      filtered = filtered.filter(c => c.free === true);
    } else if (options.contentFilter === 'premium') {
      filtered = filtered.filter(c => c.free === false);
    }

    return filtered;
  }
}
