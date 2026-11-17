/**
 * Main Application Orchestrator
 * =============================
 * Wires up state, services, and UI components.
 */

import './index.css';
import { AppState } from './state/AppState.js';
import { QuestionLoader } from './services/questionLoader.js';
import { QuestionFilter } from './services/questionFilter.js';
import { SemanticMatcher } from './services/semanticMatcher.js';
import { QuestionRanker } from './services/questionRanker.js';
import { DiversitySelector } from './services/diversitySelector.js';
import { CardRenderer } from './services/cardRenderer.js';
import { PngExporter } from './services/pngExporter.js';

import { GeneratorForm } from './components/GeneratorForm.js';
import { QuestionResults } from './components/QuestionResults.js';

class App {
  constructor() {
    this.state = new AppState();

    // Initialize Services
    this.loader = new QuestionLoader();
    this.filter = new QuestionFilter();
    this.matcher = new SemanticMatcher();
    this.ranker = new QuestionRanker(this.matcher);
    this.diversity = new DiversitySelector();
    this.renderer = new CardRenderer();
    this.exporter = new PngExporter();

    // Initialize UI Components
    this.formComponent = new GeneratorForm(this.state, document.getElementById('generator-form'));
    this.resultsComponent = new QuestionResults(
      this.state,
      document.getElementById('question-results'),
      this.renderer,
      this.exporter,
      this._handleReplace.bind(this),
      this._handleRegenerate.bind(this)
    );

    // Bind events
    this.state.on('selectedCategory', this._onCategoryChange.bind(this));
    this.formComponent.onGenerate(this._generate.bind(this));

    this._setupUploadModal();
  }

  async init() {
    try {
      this._updateLibraryStatus('Loading default library...');
      const stats = await this.loader.loadFromUrl();
      this._onLibraryLoaded(stats, false); // Initial load, no flash
    } catch (e) {
      console.error(e);
      this._updateLibraryStatus('Failed to load default library.', true);
      document.getElementById('upload-modal').hidden = false; // Force upload if default fails
    }
  }

  _onLibraryLoaded(stats, showFeedback = true) {
    const categories = this.loader.getCategories();
    const firstCategory = categories[0] || null;
    
    this.state.set({
      libraryLoaded: true,
      stats: stats,
      categories: categories,
      allCards: this.loader.getCards(),
      selectedCategory: firstCategory,
      availableDecks: firstCategory ? this.loader.getDecks(firstCategory) : [],
      selectedDeck: 'all',
      generatedSet: null // Clear current results to reflect new library
    });
    
    this._updateLibraryStatus(`${stats.totalCards} cards loaded`);
    
    if (showFeedback) {
      document.getElementById('upload-modal').hidden = true;
      
      // Optional: Give a small visual feedback on the main form
      const btn = document.getElementById('generate-btn');
      if (btn) {
        const orig = btn.innerText;
        btn.innerText = 'Library Updated!';
        setTimeout(() => { if (btn.innerText === 'Library Updated!') btn.innerText = orig; }, 2000);
      }
    }
  }

  _onCategoryChange(state) {
    const { selectedCategory } = state;
    if (!selectedCategory) return;
    const decks = this.loader.getDecks(selectedCategory);
    this.state.set({
      availableDecks: decks,
      selectedDeck: 'all' // Reset deck on category change
    });
  }

  _generate() {
    const { allCards, selectedCategory, selectedDeck, selectedMode, contentFilter, niche, questionCount, sessionHistory } = this.state.get();

    if (!selectedCategory) {
      alert("Please select a category.");
      return;
    }

    this.state.set({ isGenerating: true, error: null });

    try {
      // 1. Filter
      const filtered = this.filter.filter(allCards, {
        category: selectedCategory,
        deck: selectedDeck,
        mode: selectedMode,
        contentFilter: contentFilter
      });

      if (filtered.length === 0) {
        throw new Error(`No cards found matching the current filters.`);
      }

      // 2. Rank
      const ranked = this.ranker.rank(filtered, { niche, category: selectedCategory });

      // 3. Select Diverse Set
      const { selected, pool } = this.diversity.select(ranked, questionCount, sessionHistory);

      if (selected.length === 0) {
        throw new Error(`Failed to select a diverse set. Try a broader niche.`);
      }

      if (selected.length < questionCount) {
        console.warn(`Only found ${selected.length} suitable questions instead of ${questionCount}.`);
      }

      // 4. Update State
      this.state.set({
        generatedSet: { cards: selected, meta: { niche, category: selectedCategory } },
        lastRankedPool: pool,
        isGenerating: false
      });

      // 5. Update session history
      this.state.addToHistory(selected.map(c => c.id));

    } catch (e) {
      console.error(e);
      this.state.set({ isGenerating: false, error: e.message });
    }
  }

  _handleReplace(cardId) {
    const { generatedSet, lastRankedPool, sessionHistory } = this.state.get();
    if (!generatedSet) return;

    const replacement = this.diversity.findReplacement(generatedSet.cards, cardId, lastRankedPool, sessionHistory);

    if (replacement) {
      // Update set
      const newCards = generatedSet.cards.map(c => c.id === cardId ? replacement : c);
      // Remove used candidate from pool
      const newPool = lastRankedPool.filter(c => c.id !== replacement.id);

      this.state.set({
        generatedSet: { ...generatedSet, cards: newCards },
        lastRankedPool: newPool
      });
      this.state.addToHistory([replacement.id]);
    } else {
      alert("No suitable replacement found in the remaining pool for this niche.");
    }
  }

  _handleRegenerate() {
    // Simply re-run generate. Session history will ensure variety.
    this._generate();
  }

  _setupUploadModal() {
    const modal = document.getElementById('upload-modal');
    const cancelBtn = document.getElementById('upload-cancel');
    const fileInput = document.getElementById('file-input');
    const uploadZone = document.getElementById('upload-zone');
    const errorMsg = document.getElementById('upload-error');
    const statusContainer = document.getElementById('library-status');

    // Click status to open modal
    statusContainer.addEventListener('click', () => {
      modal.hidden = false;
      errorMsg.hidden = true;
    });

    cancelBtn.addEventListener('click', () => modal.hidden = true);

    const handleFile = async (file) => {
      if (!file) return;
      errorMsg.hidden = true;
      try {
        const stats = await this.loader.loadFromFile(file);
        this._onLibraryLoaded(stats);
      } catch (e) {
        errorMsg.textContent = e.message;
        errorMsg.hidden = false;
        console.error("Library load error:", e);
      } finally {
        // Reset file input so the exact same file can be re-uploaded if edited
        if (fileInput) fileInput.value = '';
      }
    };

    fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
      }
    });
  }

  _updateLibraryStatus(text, isError = false) {
    const el = document.getElementById('library-status');
    el.textContent = text;
    el.className = `library-status ${isError ? 'error' : 'success'}`;
  }
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
