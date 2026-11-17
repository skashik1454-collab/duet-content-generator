export class GeneratorForm {
  constructor(state, container) {
    this.state = state;
    this.container = container;
    this.onGenerateCallback = null;

    this.state.on(['categories', 'availableDecks', 'selectedCategory', 'isGenerating'], this.render.bind(this));
    this.render();
  }

  onGenerate(cb) {
    this.onGenerateCallback = cb;
  }

  render() {
    const { categories, availableDecks, selectedCategory, selectedDeck, selectedMode, contentFilter, niche, questionCount, isGenerating } = this.state.get();

    // If categories not loaded yet, don't render full form
    if (!categories || categories.length === 0) {
      this.container.innerHTML = `<div class="loading">Loading library...</div>`;
      return;
    }

    const catOptions = categories.map(c => `<option value="${c}" ${c === selectedCategory ? 'selected' : ''}>${c}</option>`).join('');
    const deckOptions = `<option value="all">All decks</option>` +
      (availableDecks || []).map(d => `<option value="${d}" ${d === selectedDeck ? 'selected' : ''}>${d}</option>`).join('');

    this.container.innerHTML = `
      <div class="form-grid">
        <div class="form-group">
          <label>Category</label>
          <select id="cat-select" ${isGenerating ? 'disabled' : ''}>
            ${catOptions}
          </select>
        </div>

        <div class="form-group">
          <label>Deck</label>
          <select id="deck-select" ${isGenerating ? 'disabled' : ''}>
            ${deckOptions}
          </select>
        </div>

        <div class="form-group">
          <label>Mode <span class="badge">Optional</span></label>
          <select id="mode-select" ${isGenerating ? 'disabled' : ''}>
            <option value="all" ${selectedMode === 'all' ? 'selected' : ''}>All</option>
            <option value="together" ${selectedMode === 'together' ? 'selected' : ''}>Together</option>
            <option value="long_distance" ${selectedMode === 'long_distance' ? 'selected' : ''}>Long Distance</option>
          </select>
        </div>

        <div class="form-group">
          <label>Content <span class="badge">Optional</span></label>
          <select id="content-select" ${isGenerating ? 'disabled' : ''}>
            <option value="all" ${contentFilter === 'all' ? 'selected' : ''}>All</option>
            <option value="free" ${contentFilter === 'free' ? 'selected' : ''}>Free only</option>
            <option value="premium" ${contentFilter === 'premium' ? 'selected' : ''}>Premium only</option>
          </select>
        </div>

        <div class="form-group span-full">
          <label>Specific niche / topic</label>
          <input type="text" id="niche-input" placeholder="e.g., funny questions about annoying couple habits" value="${niche}" ${isGenerating ? 'disabled' : ''} />
        </div>

        <div class="form-group">
          <label>Theme</label>
          <select id="theme-select" ${isGenerating ? 'disabled' : ''}>
            <option value="theme-1" ${(this.state.get().theme || 'theme-1') === 'theme-1' ? 'selected' : ''}>Theme 1 (Dark)</option>
            <option value="theme-2" ${this.state.get().theme === 'theme-2' ? 'selected' : ''}>Theme 2 (Maroon)</option>
          </select>
        </div>

        <div class="form-group">
          <label>Number of questions</label>
          <select id="count-select" ${isGenerating ? 'disabled' : ''}>
            <option value="3" ${questionCount === 3 ? 'selected' : ''}>3</option>
            <option value="4" ${questionCount === 4 ? 'selected' : ''}>4</option>
            <option value="5" ${questionCount === 5 ? 'selected' : ''}>5</option>
          </select>
        </div>
      </div>

      <div class="form-actions">
        <button id="generate-btn" class="btn btn-primary" ${isGenerating ? 'disabled' : ''}>
          ${isGenerating ? 'Generating...' : 'Generate Questions'}
        </button>
      </div>
    `;

    this._attachEvents();
  }

  _attachEvents() {
    const bindSelect = (id, stateKey, isNumber = false) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', (e) => {
          this.state.set({ [stateKey]: isNumber ? Number(e.target.value) : e.target.value });
        });
      }
    };

    bindSelect('cat-select', 'selectedCategory');
    bindSelect('deck-select', 'selectedDeck');
    bindSelect('mode-select', 'selectedMode');
    bindSelect('content-select', 'contentFilter');
    bindSelect('theme-select', 'theme');
    bindSelect('count-select', 'questionCount', true);

    const nicheInput = document.getElementById('niche-input');
    if (nicheInput) {
      nicheInput.addEventListener('input', (e) => {
        this.state.set({ niche: e.target.value });
      });
      // Generate on enter
      nicheInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && this.onGenerateCallback) {
          this.onGenerateCallback();
        }
      });
    }

    const genBtn = document.getElementById('generate-btn');
    if (genBtn) {
      genBtn.addEventListener('click', () => {
        if (this.onGenerateCallback) this.onGenerateCallback();
      });
    }
  }
}
