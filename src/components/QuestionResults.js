import { cardFilename, batchFilename } from '../utils/filenameUtils.js';

export class QuestionResults {
  /**
   * @param {import('../state/AppState.js').AppState} state
   * @param {HTMLElement} container
   * @param {import('../services/cardRenderer.js').CardRenderer} renderer
   * @param {import('../services/pngExporter.js').PngExporter} exporter
   * @param {Function} onReplace
   * @param {Function} onRegenerate
   */
  constructor(state, container, renderer, exporter, onReplace, onRegenerate) {
    this.state = state;
    this.container = container;
    this.renderer = renderer;
    this.exporter = exporter;
    this.onReplace = onReplace;
    this.onRegenerate = onRegenerate;
    this.renderContainer = document.getElementById('render-container');

    this.state.on(['generatedSet', 'error', 'isGenerating', 'theme'], this.render.bind(this));
  }

  render() {
    const { generatedSet, error, isGenerating } = this.state.get();

    if (error) {
      this.container.innerHTML = `
        <div class="results-error">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          ${error}
        </div>
      `;
      return;
    }

    if (isGenerating && !generatedSet) {
      this.container.innerHTML = `<div class="loading">Analyzing and ranking questions...</div>`;
      return;
    }

    if (!generatedSet) {
      this.container.innerHTML = ``;
      return;
    }

    const { cards, meta } = generatedSet;

    // Build the header
    let html = `
      <div class="results-header">
        <h2>Generated Set</h2>
        <div class="results-meta">
          <span class="badge">Category: ${meta.category}</span>
          ${meta.niche ? `<span class="badge">Niche: ${meta.niche}</span>` : ''}
          <span class="badge">Questions: ${cards.length}</span>
        </div>
      </div>
      <div class="cards-grid">
    `;

    // Build each card item
    cards.forEach((card, index) => {
      html += `
        <div class="card-item" data-id="${card.id}" data-index="${index}">
          <div class="card-header">
            <h3>Question ${index + 1}</h3>
            <div class="card-badges">
              <span class="badge badge-outline" title="Deck">${card.deck}</span>
              <span class="badge badge-outline" title="Type">${card.card_type}</span>
              <span class="badge badge-outline" title="Energy">${card.energy}</span>
            </div>
          </div>
          
          <div class="card-preview-container" id="preview-wrapper-${card.id}">
             <!-- Renderer injects here -->
          </div>

          <div class="card-actions">
            <button class="btn btn-secondary btn-sm replace-btn" data-id="${card.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M2.13 15.57a10 10 0 1 0 3.84-10.36L2 7"/>
              </svg>
              Replace
            </button>
            <button class="btn btn-secondary btn-sm download-single-btn" data-id="${card.id}" data-index="${index}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download PNG
            </button>
          </div>
        </div>
      `;
    });

    html += `
      </div>
      <div class="results-actions">
        <button id="regenerate-btn" class="btn btn-secondary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          Regenerate Set
        </button>
        <button id="download-all-btn" class="btn btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download All PNGs
        </button>
      </div>
    `;

    this.container.innerHTML = html;

    // Inject rendered cards into preview wrappers
    const theme = this.state.get().theme || 'theme-1';
    cards.forEach((card, index) => {
      const wrapper = document.getElementById(`preview-wrapper-${card.id}`);
      if (wrapper) {
        // Clone for preview so it can scale down
        const node = this.renderer.renderCard(card, index, cards.length, theme);

        // Wrap it in a scaler div so the 1080x1620 card fits in the preview UI
        const scaler = document.createElement('div');
        scaler.className = 'card-preview-scaler';
        scaler.appendChild(node);
        wrapper.appendChild(scaler);

        const w = wrapper.clientWidth;
        if (w > 0) {
          scaler.style.transform = `scale(${w / 1080})`;
        }
      }
    });

    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    this._resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const scaler = entry.target.querySelector('.card-preview-scaler');
        if (scaler && entry.contentRect.width > 0) {
          scaler.style.transform = `scale(${entry.contentRect.width / 1080})`;
        }
      }
    });
    this.container.querySelectorAll('.card-preview-container').forEach(el => {
      this._resizeObserver.observe(el);
    });

    this._attachEvents();
  }

  _attachEvents() {
    // Replace buttons
    this.container.querySelectorAll('.replace-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.onReplace(id);
      });
    });

    // Single download buttons
    this.container.querySelectorAll('.download-single-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const index = parseInt(e.currentTarget.dataset.index, 10);
        await this._exportCard(id, index);
      });
    });

    // Regenerate
    const regenBtn = document.getElementById('regenerate-btn');
    if (regenBtn) {
      regenBtn.addEventListener('click', () => this.onRegenerate());
    }

    // Download All
    const dlAllBtn = document.getElementById('download-all-btn');
    if (dlAllBtn) {
      dlAllBtn.addEventListener('click', async () => {
        const { generatedSet } = this.state.get();
        if (!generatedSet) return;

        const originalText = dlAllBtn.innerHTML;
        dlAllBtn.innerHTML = 'Exporting...';
        dlAllBtn.disabled = true;

        try {
          for (let i = 0; i < generatedSet.cards.length; i++) {
            await this._exportCard(generatedSet.cards[i].id, i);
            // tiny delay to prevent browser locking completely
            await new Promise(r => setTimeout(r, 100));
          }
        } finally {
          dlAllBtn.innerHTML = originalText;
          dlAllBtn.disabled = false;
        }
      });
    }
  }

  /**
   * Render and export a specific card at full scale.
   * @private
   */
  async _exportCard(cardId, index) {
    const { generatedSet, meta } = this.state.get();
    const theme = this.state.get().theme || 'theme-1';
    if (!generatedSet) return;

    const card = generatedSet.cards.find(c => c.id === cardId);
    if (!card) return;

    // 1. Render a fresh DOM node for export
    const exportNode = this.renderer.renderCard(card, index, generatedSet.cards.length, theme);

    // 2. Append to the off-screen render container
    // This ensures it renders at true 1080x1620 without CSS transform scaling interference
    this.renderContainer.innerHTML = '';
    this.renderContainer.appendChild(exportNode);

    try {
      // 3. Export via html2canvas
      const blob = await this.exporter.exportNodeToBlob(exportNode);

      // 4. Download
      const cat = generatedSet.meta.category || 'card';
      const filename = cardFilename(cat, index);
      this.exporter.downloadBlob(blob, filename);

    } catch (e) {
      console.error('Export failed:', e);
      alert('Failed to export PNG. See console for details.');
    } finally {
      this.renderContainer.innerHTML = '';
    }
  }
}
