/**
 * AppState — Simple reactive state management.
 * Components subscribe to state changes and re-render when relevant state updates.
 */

export class AppState {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();

    /** @type {Object} */
    this._state = {
      // Library
      libraryLoaded: false,
      stats: null,
      categories: [],
      allCards: [],

      // Form
      selectedCategory: null,
      availableDecks: [],
      selectedDeck: 'all',
      selectedMode: 'all',
      contentFilter: 'all',
      niche: '',
      questionCount: 5,

      // Results
      generatedSet: null,        // { cards: [], meta: {} }
      lastRankedPool: [],        // Full ranked list for replacements
      sessionHistory: [],        // IDs of recently used questions

      // UI
      isGenerating: false,
      error: null,
    };
  }

  /** Get the full state or a specific key. */
  get(key) {
    if (key) return this._state[key];
    return { ...this._state };
  }

  /** Update one or more state keys and notify listeners. */
  set(updates) {
    const changedKeys = [];
    for (const [key, value] of Object.entries(updates)) {
      if (this._state[key] !== value) {
        this._state[key] = value;
        changedKeys.push(key);
      }
    }
    if (changedKeys.length > 0) {
      this._notify(changedKeys);
    }
  }

  /** Subscribe to changes on specific keys. */
  on(keys, callback) {
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const key of keyList) {
      if (!this._listeners.has(key)) {
        this._listeners.set(key, new Set());
      }
      this._listeners.get(key).add(callback);
    }
    // Return an unsubscribe function
    return () => {
      for (const key of keyList) {
        this._listeners.get(key)?.delete(callback);
      }
    };
  }

  /** Subscribe to any state change. */
  onAny(callback) {
    if (!this._listeners.has('*')) {
      this._listeners.set('*', new Set());
    }
    this._listeners.get('*').add(callback);
    return () => this._listeners.get('*')?.delete(callback);
  }

  /** Add question IDs to session history. */
  addToHistory(ids) {
    const history = [...this._state.sessionHistory, ...ids];
    this.set({ sessionHistory: history });
  }

  /** Clear session history (e.g., when category changes). */
  clearHistory() {
    this.set({ sessionHistory: [] });
  }

  /** @private */
  _notify(changedKeys) {
    const notified = new Set();
    for (const key of changedKeys) {
      const listeners = this._listeners.get(key);
      if (listeners) {
        for (const fn of listeners) {
          if (!notified.has(fn)) {
            notified.add(fn);
            fn(this._state, changedKeys);
          }
        }
      }
    }
    // Wildcard listeners
    const wildcardListeners = this._listeners.get('*');
    if (wildcardListeners) {
      for (const fn of wildcardListeners) {
        if (!notified.has(fn)) {
          fn(this._state, changedKeys);
        }
      }
    }
  }
}
