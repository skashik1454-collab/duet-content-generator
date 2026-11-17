/**
 * Question Library Loader Service
 * ================================
 * Loads, validates, and indexes the question library from JSON.
 * Supports loading from URL (default) or from a user-uploaded file.
 *
 * This service is the single source of truth for library data.
 * All categories, decks, and card metadata are derived dynamically.
 */

export class QuestionLoader {
  constructor() {
    /** @type {Object|null} Raw library data */
    this.library = null;
    /** @type {Array} All card objects */
    this.cards = [];
    /** @type {string[]} Unique sorted category names */
    this.categories = [];
    /** @type {Object<string, string[]>} Decks indexed by category */
    this.decks = {};
    /** @type {Object|null} Library statistics */
    this.stats = null;
    /** @type {Set<string>} All unique energy values */
    this.energies = new Set();
    /** @type {Set<string>} All unique card types */
    this.cardTypes = new Set();
    /** @type {Set<string>} All unique modes */
    this.modes = new Set();
  }

  /**
   * Load library from a URL (default: /data/question-library.json).
   * @param {string} [url='/data/question-library.json']
   * @returns {Promise<Object>} Library stats
   */
  async loadFromUrl(url = '/data/question-library.json') {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: HTTP ${response.status}`);
      }
      const data = await response.json();
      return this._processLibrary(data);
    } catch (error) {
      throw new Error(`Unable to load question library. ${error.message}`);
    }
  }

  /**
   * Load library from a user-uploaded File object.
   * @param {File} file
   * @returns {Promise<Object>} Library stats
   */
  async loadFromFile(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      return this._processLibrary(data);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Unable to load question library. Check the JSON structure and try again.');
      }
      throw new Error(`Unable to load question library. ${error.message}`);
    }
  }

  /**
   * Validate and index the library data.
   * @private
   */
  _processLibrary(data) {
    this._validate(data);

    this.library = data;
    this.cards = data.cards;

    // Dynamically extract categories
    this.categories = [...new Set(this.cards.map(c => c.category))].sort();

    // Dynamically extract decks per category
    this.decks = {};
    for (const category of this.categories) {
      this.decks[category] = [...new Set(
        this.cards.filter(c => c.category === category).map(c => c.deck)
      )].sort();
    }

    // Index unique metadata values
    this.energies = new Set(this.cards.map(c => c.energy).filter(Boolean));
    this.cardTypes = new Set(this.cards.map(c => c.card_type).filter(Boolean));
    this.modes = new Set();
    for (const card of this.cards) {
      if (Array.isArray(card.mode_support)) {
        card.mode_support.forEach(m => this.modes.add(m));
      }
    }

    // Compute stats
    this.stats = {
      totalCards: this.cards.length,
      categories: this.categories.length,
      totalDecks: Object.values(this.decks).reduce((sum, d) => sum + d.length, 0),
      freeCards: this.cards.filter(c => c.free).length,
      premiumCards: this.cards.filter(c => !c.free).length,
      product: data.product || 'Unknown',
      version: data.version || 'Unknown',
    };

    return this.stats;
  }

  /**
   * Validate JSON structure.
   * @private
   */
  _validate(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid JSON: Expected an object at the root level.');
    }
    
    // Check if cards is nested differently, e.g., under data.data or similar, 
    // but based on prompt it should be at data.cards
    if (!data.cards && Array.isArray(data)) {
      // Sometimes users export a raw array instead of an object wrapper
      data.cards = data;
    }

    if (!Array.isArray(data.cards)) {
      throw new Error('Invalid library: Missing "cards" array. Ensure your JSON has a "cards" property containing the list of questions.');
    }
    
    if (data.cards.length === 0) {
      throw new Error('Invalid library: The "cards" array is empty.');
    }

    // Relaxed validation: Just make sure at least *some* data is present.
    // If a card is missing a field, we just log a warning instead of halting the entire upload.
    const expectedFields = ['id', 'category', 'deck', 'card_type', 'question'];
    let warnings = 0;
    
    for (let i = 0; i < data.cards.length; i++) {
      const card = data.cards[i];
      
      // Auto-fix some common structural issues if possible
      if (!card.category) card.category = 'UNCATEGORIZED';
      if (!card.deck) card.deck = 'Default Deck';
      if (!card.question && card.text) card.question = card.text; // Common alternate name
      
      for (const field of expectedFields) {
        if (!(field in card) || card[field] === undefined) {
          warnings++;
        }
      }
    }
    
    if (warnings > 0) {
      console.warn(`Library validation: Found ${warnings} instances of missing expected fields across the cards. The generator will still try to work.`);
    }
  }

  /** Get all categories. */
  getCategories() {
    return this.categories;
  }

  /** Get decks for a specific category. */
  getDecks(category) {
    return this.decks[category] || [];
  }

  /** Get all cards. */
  getCards() {
    return this.cards;
  }

  /** Get library stats. */
  getStats() {
    return this.stats;
  }

  /** Get the editorial direction metadata. */
  getEditorialDirection() {
    return this.library?.editorial_direction || null;
  }

  /** Get all unique modes found in the library. */
  getModes() {
    return [...this.modes];
  }
}
