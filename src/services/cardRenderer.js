/**
 * Card Renderer Service
 * ===================================
 * Renders the production Duet card HTML for preview and export.
 * Theme 1: Original app-style layout with header, progress, footer
 * Theme 2: Standalone slide design — maroon bg with centered cream card
 */

export class CardRenderer {
  constructor() {
    this._injectStyles();
  }

  /**
   * Render a question object into a DOM node.
   * @param {Object} cardData - The full question object from JSON
   * @param {number} index - The index of the card in the generated set
   * @param {number} total - Total cards in the set
   * @param {string} theme - 'theme-1' or 'theme-2'
   * @returns {HTMLElement} The rendered card element
   */
  renderCard(cardData, index = 0, total = 5, theme = 'theme-1') {
    if (theme === 'theme-2') {
      return this._renderTheme2Card(cardData, index, total);
    }
    return this._renderTheme1Card(cardData, index, total);
  }

  /**
   * Theme 1 — Original app-like layout (Dark Blue/Purple vibe)
   */
  _renderTheme1Card(cardData, index, total) {
    const container = document.createElement('div');
    container.className = 'duet-card-wrapper theme-1';
    container.dataset.cardId = cardData.id;
    container.style.width = '1080px';
    container.style.height = '1620px';
    container.style.position = 'relative';

    const questionHtml = cardData.card_type === 'This or That'
      ? this._formatThisOrThatQuestion(cardData.question)
      : this._formatQuestion(cardData.question);

    const qLen = cardData.question ? cardData.question.length : 0;
    let fontSizeStyle = '';
    if (qLen > 70) {
      fontSizeStyle = 'style="font-size: 52px; line-height: 1.24;"';
    } else if (qLen > 45) {
      fontSizeStyle = 'style="font-size: 60px; line-height: 1.22;"';
    }

    // Map answer option text to image file names
    const answerImageMap = {
      'Beach Vacation': '/images/beach_vacation.png',
      'Beach vacation': '/images/beach_vacation.png',
      'beach vacation': '/images/beach_vacation.png',
      'Mountain Getaway': '/images/mountain_getaway.png',
      'Mountain getaway': '/images/mountain_getaway.png',
      'mountain getaway': '/images/mountain_getaway.png',
    };

    let answersHtml = '';
    if (cardData.answer_options && Array.isArray(cardData.answer_options) && cardData.answer_options.length > 0) {
      if (cardData.answer_options.length === 2) {
        const opt1 = cardData.answer_options[0];
        const opt2 = cardData.answer_options[1];
        const img1 = answerImageMap[opt1];
        const img2 = answerImageMap[opt2];

        if (img1 && img2) {
          // Image-based options (tilted cards)
          answersHtml = `
            <div class="answers answers-image" role="group" aria-label="Choose your answer">
              <div class="answer-image-card tilt-left">
                <div class="answer-image-frame">
                  <img src="${img1}" alt="${this._escape(opt1)}" />
                </div>
                <span class="answer-image-label">${this._escape(opt1)}</span>
              </div>
              <span class="or-circle">or</span>
              <div class="answer-image-card tilt-right">
                <div class="answer-image-frame">
                  <img src="${img2}" alt="${this._escape(opt2)}" />
                </div>
                <span class="answer-image-label">${this._escape(opt2)}</span>
              </div>
            </div>
          `;
        } else {
          // Fallback to text buttons
          answersHtml = `
            <div class="answers" role="group" aria-label="Choose your answer">
              <button class="answer" type="button">${this._escape(opt1)}</button>
              <span class="or">or</span>
              <button class="answer" type="button">${this._escape(opt2)}</button>
            </div>
          `;
        }
      } else {
        answersHtml = `
          <div class="answers" role="group" style="justify-content: center; gap: 20px;">
            ${cardData.answer_options.map(opt => `<button class="answer" type="button">${this._escape(opt)}</button>`).join('')}
          </div>
        `;
      }
    }

    const heartPath = `M16 29C13.2 25.8 2 18.1 2 10.1 2 5.2 5.4 2 9.6 2 12.4 2 14.7 3.5 16 5.8 17.3 3.5 19.6 2 22.4 2 26.6 2 30 5.2 30 10.1 30 18.1 18.8 25.8 16 29Z`;
    const sparklePath = `M14 0 17.8 12.8 28 17 17.8 20.2 14 34 10.2 20.2 0 17 10.2 12.8Z`;

    const labelText = cardData.card_type
      ? cardData.card_type.toUpperCase()
      : (cardData.deck ? cardData.deck.toUpperCase() : 'DUET');

    container.innerHTML = `
      <main class="screen" aria-label="Together Mode question screen">
        <header class="header">
          <button class="round-button" type="button" aria-label="Favorites">
            <svg class="favorite-icon" viewBox="0 0 32 32" aria-hidden="true">
              <path fill="currentColor" d="${heartPath}" />
            </svg>
          </button>
          <h1>
            ${this._escape(cardData.deck || 'Together Mode')}
            <svg class="title-heart" viewBox="0 0 32 32" aria-hidden="true">
              <path fill="currentColor" d="${heartPath}" />
            </svg>
          </h1>
          <button class="round-button" type="button" aria-label="More options">
            <svg class="more-icon" viewBox="0 0 42 14" aria-hidden="true">
              <g fill="currentColor">
                <circle cx="7" cy="7" r="3.6"></circle>
                <circle cx="21" cy="7" r="3.6"></circle>
                <circle cx="35" cy="7" r="3.6"></circle>
              </g>
            </svg>
          </button>
        </header>

        <div class="progress" aria-hidden="true">
          ${Array.from({ length: total }).map((_, i) => `<span class="${i <= index ? 'active' : ''}"></span>`).join('')}
        </div>

        <p class="question-count">${index + 1} of ${total}</p>

        <section class="question-card" aria-labelledby="question">
          <div class="icon-section">
            <img src="/Icon.png" class="cards-icon-img" alt="Cards" />
            <p class="icon-label">${this._escape(labelText)}</p>
          </div>

          <svg class="sparkle sparkle-one" viewBox="0 0 28 34" aria-hidden="true">
            <path fill="currentColor" d="${sparklePath}" />
          </svg>
          <svg class="sparkle sparkle-two" viewBox="0 0 28 34" aria-hidden="true">
            <path fill="currentColor" d="${sparklePath}" />
          </svg>
          <svg class="sparkle sparkle-three" viewBox="0 0 28 34" aria-hidden="true">
            <path fill="currentColor" d="${sparklePath}" />
          </svg>
          <svg class="sparkle sparkle-four" viewBox="0 0 28 34" aria-hidden="true">
            <path fill="currentColor" d="${sparklePath}" />
          </svg>

          <h2 class="question" id="question" ${fontSizeStyle}>
            ${questionHtml}
          </h2>

          <div class="heart-divider" aria-hidden="true">
            <svg viewBox="0 0 32 32"><path fill="currentColor" d="${heartPath}" /></svg>
          </div>

          ${answersHtml}

          <div class="tip-section">
            <span class="tip-icon">💡</span>
            <span class="tip-text">Tip: There are no right or wrong answers!</span>
          </div>

          <svg class="sparkle sparkle-bottom" viewBox="0 0 28 34" aria-hidden="true">
            <path fill="currentColor" d="${sparklePath}" />
          </svg>
        </section>

        <footer class="footer">
          <button class="navigation previous" type="button" aria-label="Previous question">
            <svg viewBox="0 0 26 38" aria-hidden="true"><path d="M18 5 5 19 18 33"></path></svg>
          </button>
          <div class="footer-message">
            <svg class="footer-heart" viewBox="0 0 32 32" aria-hidden="true">
              <path fill="currentColor" d="${heartPath}" />
            </svg>
            <p>Made for two.</p>
          </div>
          <button class="navigation next" type="button" aria-label="Next question">
            <svg viewBox="0 0 26 38" aria-hidden="true"><path d="M8 5 21 19 8 33"></path></svg>
          </button>
        </footer>
      </main>
    `;

    return container;
  }

  _renderTheme2Card(cardData, index, total) {
    const container = document.createElement('div');
    container.className = 'duet-card-wrapper theme-2';
    container.dataset.cardId = cardData.id;
    container.style.width = '1080px';
    container.style.height = '1620px';
    container.style.position = 'relative';

    const questionHtml = this._formatQuestionTheme2(cardData.question);

    let answersHtml = '';
    if (cardData.answer_options && Array.isArray(cardData.answer_options)) {
      if (cardData.answer_options.length === 2) {
        answersHtml = `
          <div class="t2-answers">
            <div class="t2-answer-btn">${this._escape(cardData.answer_options[0])}</div>
            <div class="t2-answer-sep">&mdash;&nbsp;&nbsp;or&nbsp;&nbsp;&mdash;</div>
            <div class="t2-answer-btn">${this._escape(cardData.answer_options[1])}</div>
          </div>
        `;
      } else {
        answersHtml = `
          <div class="t2-answers t2-answers-multi">
            ${cardData.answer_options.map(opt => `<div class="t2-answer-btn">${this._escape(opt)}</div>`).join('')}
          </div>
        `;
      }
    }

    // Uses text characters instead of SVG — html2canvas renders these reliably
    container.innerHTML = `
      <div class="t2-screen">
        <div class="t2-card">
          <div class="t2-sparkles">
            <span class="t2-sparkle t2-sparkle--1">✦</span>
            <span class="t2-sparkle t2-sparkle--2">✦</span>
            <span class="t2-sparkle t2-sparkle--3">✦</span>
            <span class="t2-sparkle t2-sparkle--4">✧</span>
          </div>
          <div class="t2-inner">
            <img src="/Icon.png" class="t2-icon-img" alt="Cards" />
            <p class="t2-question">${questionHtml}</p>
            <div class="t2-divider">
              <span class="t2-divider-heart">♥</span>
            </div>
            ${answersHtml}
          </div>
          <span class="t2-bottom-sparkle">✦</span>
        </div>
      </div>
    `;

    return container;
  }

  /**
   * Format question for Theme 2: last word(s) get keyword styling (inline).
   * Matches the reference: keyword is inline <span>, not block-level.
   */
  _formatQuestionTheme2(text) {
    if (!text) return '';
    const words = text.split(' ');

    if (words.length <= 2) {
      return `<span class="t2-keyword">${this._escape(text)}</span>`;
    }

    // Last 1-2 words get keyword styling
    let kwCount = 1;
    if (words[words.length - 1].length <= 4 && words.length >= 4) {
      kwCount = 2;
    }

    const kwWords = words.splice(-kwCount);
    const mainText = this._escape(words.join(' '));
    const kwText = `<span class="t2-keyword">${this._escape(kwWords.join(' '))}</span>`;

    return `${mainText} ${kwText}`;
  }

  /**
   * Smartly format a question string into spans and em.
   * e.g., "Who's more likely to start a deep conversation?"
   * -> <span>Who's more likely</span><span>to start a deep</span><em>conversation?</em>
   */
  _formatQuestion(text) {
    if (!text) return '';
    const words = text.split(' ');

    if (words.length <= 3) {
      return `<em>${this._escape(text)}</em>`;
    }

    // Usually want the last 1 or 2 words in <em>
    let emCount = 1;
    if (words[words.length - 1].length <= 4 && words.length >= 4) {
      emCount = 2;
    }

    const emWords = words.splice(-emCount);
    const mainText = this._escape(words.join(' '));
    const emHtml = `<em>${this._escape(emWords.join(' '))}</em>`;

    return `${mainText} ${emHtml}`;
  }

  /**
   * Format "X or Y?" style questions: split on " or " and highlight "or" in accent.
   * e.g., "Beach vacation or mountain getaway?" → 
   *   <span>Beach vacation</span> <em>or</em> <span>mountain getaway?</span>
   */
  _formatThisOrThatQuestion(text) {
    if (!text) return '';
    const orIndex = text.toLowerCase().indexOf(' or ');
    if (orIndex === -1) return this._formatQuestion(text);

    const before = text.substring(0, orIndex).trim();
    const after = text.substring(orIndex + 4).trim();

    return `<span>${this._escape(before)}</span> <em>or</em> <span>${this._escape(after)}</span>`;
  }

  _chunkWords(words, size) {
    const chunks = [];
    for (let i = 0; i < words.length; i += size) {
      chunks.push(words.slice(i, i + size));
    }
    return chunks;
  }

  _escape(str) {
    return str.replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  _injectStyles() {
    // Always replace styles to ensure HMR picks up changes
    let style = document.getElementById('duet-card-styles');
    if (!style) {
      style = document.createElement('style');
      style.id = 'duet-card-styles';
      document.head.appendChild(style);
    }
    style.innerHTML = `
      /* ============================================================
         SHARED RESETS
         ============================================================ */
      .duet-card-wrapper {
        box-sizing: border-box;
      }
      .duet-card-wrapper * {
        box-sizing: border-box;
      }
      .duet-card-wrapper button {
        font: inherit;
        color: inherit;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        background: transparent;
        border: none;
      }
      .duet-card-wrapper .svg-definitions {
        position: absolute;
        width: 0;
        height: 0;
        overflow: hidden;
      }

      /* ============================================================
         THEME 1 — Original app-like layout (Dark Blue/Purple)
         ============================================================ */

      /* Base screen */
      .duet-card-wrapper.theme-1 .screen {
        position: absolute;
        inset: 0;
        overflow: hidden;
        color: #fff1e8;
        background:
          radial-gradient(ellipse at 50% 47%, rgba(80, 57, 144, 0.3), transparent 65%),
          linear-gradient(115deg, #1e2030, #2b2f45 53%, #181a26);
      }

      .duet-card-wrapper.theme-1 .round-button {
        background: linear-gradient(145deg, rgba(40, 42, 60, 0.64), rgba(50, 52, 75, 0.65));
        box-shadow: inset 0 0 19px rgba(30, 32, 45, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.05);
        padding: 0;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        width: 92px;
        height: 94px;
        border-radius: 50%;
      }
      .duet-card-wrapper.theme-1 .progress span { background: #151722; }
      .duet-card-wrapper.theme-1 .progress span.active,
      .duet-card-wrapper.theme-1 .progress span:last-child { background: #8b80cf; }
      .duet-card-wrapper.theme-1 .question-count { color: #8b80cf; }
      .duet-card-wrapper.theme-1 .question em {
        color: #5142a6;
        font-style: normal;
        font-weight: 700;
      }
      .duet-card-wrapper.theme-1 .navigation {
        border-color: rgba(139, 128, 207, 0.39);
        background: radial-gradient(circle at 50% 55%, rgba(60, 55, 90, 0.3), rgba(45, 40, 70, 0.51));
      }
      .duet-card-wrapper.theme-1 .footer-heart { color: #8b80cf; }

      /* Theme 1 shared layout elements */
      .duet-card-wrapper.theme-1 .header {
        position: absolute;
        left: 118px;
        right: 114px;
        top: 100px;
        height: 94px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .duet-card-wrapper.theme-1 .favorite-icon { width: 36px; height: 36px; }
      .duet-card-wrapper.theme-1 .header h1 {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 44px;
        line-height: 1;
        font-weight: 400;
        letter-spacing: -1px;
      }
      .duet-card-wrapper.theme-1 .title-heart { width: 33px; height: 33px; }
      .duet-card-wrapper.theme-1 .more-icon { width: 44px; height: 15px; }

      .duet-card-wrapper.theme-1 .progress {
        position: absolute;
        top: 249px;
        left: 331px;
        width: 422px;
        display: flex;
        justify-content: space-between;
      }
      .duet-card-wrapper.theme-1 .progress span {
        width: 68px;
        height: 11px;
        border-radius: 999px;
        box-shadow: inset 0 1px 2px rgba(0,0,0, 0.25), 0 1px 2px rgba(255,255,255, 0.12);
      }

      .duet-card-wrapper.theme-1 .question-count {
        position: absolute;
        top: 297px;
        left: 0;
        width: 100%;
        margin: 0;
        text-align: center;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 33px;
        line-height: 1.2;
      }

      .duet-card-wrapper.theme-1 .question-card {
        position: absolute;
        left: 177px;
        top: 400px;
        width: 725px;
        height: 928px;
        overflow: hidden;
        border-radius: 70px;
        border: 2px solid rgba(255, 255, 250, 0.95);
        background: #fff3ec;
        box-shadow:
          0 28px 36px rgba(41, 9, 17, 0.28),
          0 6px 10px rgba(60, 13, 26, 0.14);
      }

      /* Icon section: image + label */
      .duet-card-wrapper.theme-1 .icon-section {
        position: absolute;
        top: 45px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        z-index: 2;
      }

      .duet-card-wrapper.theme-1 .cards-icon-img {
        width: 108px;
        height: auto;
        object-fit: contain;
      }

      .duet-card-wrapper.theme-1 .icon-label {
        margin: 0;
        font-family: 'Montserrat', Arial, Helvetica, sans-serif;
        font-size: 26px;
        font-weight: 700;
        letter-spacing: 2px;
        color: #6a1830;
        text-transform: uppercase;
      }

      .duet-card-wrapper.theme-1 .sparkle {
        position: absolute;
        color: #d09d74;
      }
      .duet-card-wrapper.theme-1 .sparkle-one { left: 14%; top: 15%; width: 36px; height: 42px; }
      .duet-card-wrapper.theme-1 .sparkle-two { left: 21%; top: 21%; width: 32px; height: 38px; }
      .duet-card-wrapper.theme-1 .sparkle-three { right: 19%; top: 20%; width: 32px; height: 38px; }
      .duet-card-wrapper.theme-1 .sparkle-four { right: 14%; top: 24%; width: 24px; height: 28px; }
      .duet-card-wrapper.theme-1 .sparkle-bottom { left: 48%; bottom: 35px; width: 36px; height: 42px; }

      /* Tip section */
      .duet-card-wrapper.theme-1 .tip-section {
        position: absolute;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 12px;
        background: rgba(255, 245, 240, 0.9);
        padding: 16px 32px;
        border-radius: 80px;
        white-space: nowrap;
        z-index: 2;
      }

      .duet-card-wrapper.theme-1 .tip-icon {
        font-size: 32px;
        line-height: 1;
      }

      .duet-card-wrapper.theme-1 .tip-text {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 24px;
        color: #5a3a3a;
        font-weight: 400;
      }

      .duet-card-wrapper.theme-1 .question {
        position: absolute;
        top: 24%;
        left: 6%;
        width: 88%;
        margin: 0;
        color: #191918;
        text-align: center;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 68px;
        font-weight: 700;
        line-height: 1.22;
        letter-spacing: 0;
        z-index: 2;
        word-break: normal;
        overflow-wrap: break-word;
      }
      .duet-card-wrapper.theme-1 .question > span {
        display: inline;
      }
      .duet-card-wrapper.theme-1 .question em {
        display: inline;
        font-style: normal;
        font-weight: 700;
        letter-spacing: 0;
      }

      .duet-card-wrapper.theme-1 .heart-divider {
        position: absolute;
        left: 20%;
        right: 20%;
        top: 61%;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 18px;
        color: #84213c;
        z-index: 2;
      }
      .duet-card-wrapper.theme-1 .heart-divider::before,
      .duet-card-wrapper.theme-1 .heart-divider::after {
        content: "";
        flex: 1;
        height: 1px;
      }
      .duet-card-wrapper.theme-1 .heart-divider::before { background: linear-gradient(to right, transparent, #9a5260); }
      .duet-card-wrapper.theme-1 .heart-divider::after { background: linear-gradient(to left, transparent, #9a5260); }
      .duet-card-wrapper.theme-1 .heart-divider svg { width: 28px; height: 28px; }

      .duet-card-wrapper.theme-1 .answers {
        position: absolute;
        top: 67%;
        left: 8%;
        right: 8%;
        height: 18%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 24px;
        font-family: Arial, Helvetica, sans-serif;
        z-index: 2;
      }

      /* Image-based answers layout */
      .duet-card-wrapper.theme-1 .answers.answers-image {
        position: absolute;
        top: 62%;
        left: 5%;
        right: 5%;
        height: 34%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0;
      }

      .duet-card-wrapper.theme-1 .answer-image-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        flex: 0 0 auto;
      }

      .duet-card-wrapper.theme-1 .answer-image-card.tilt-left {
        transform: rotate(-6deg);
      }

      .duet-card-wrapper.theme-1 .answer-image-card.tilt-right {
        transform: rotate(6deg);
      }

      .duet-card-wrapper.theme-1 .answer-image-frame {
        width: 238px;
        height: 216px;
        border-radius: 24px;
        overflow: hidden;
        border: 6px solid #ffffff;
        box-shadow:
          0 15px 32px rgba(120, 50, 60, 0.18),
          0 5px 11px rgba(60, 13, 26, 0.1);
        background: #fff;
      }

      .duet-card-wrapper.theme-1 .answer-image-frame img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .duet-card-wrapper.theme-1 .answer-image-label {
        font-family: 'Montserrat', Arial, Helvetica, sans-serif;
        font-size: 30px;
        font-weight: 600;
        color: #7d233d;
        text-align: center;
        white-space: nowrap;
      }

      /* "or" circle between image options */
      .duet-card-wrapper.theme-1 .or-circle {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 76px;
        height: 76px;
        border-radius: 50%;
        background: rgba(255, 240, 235, 0.9);
        color: #7d233d;
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 32px;
        font-weight: 400;
        font-style: italic;
        flex-shrink: 0;
        margin: 0 10px;
        align-self: center;
        margin-top: -40px;
      }

      .duet-card-wrapper.theme-1 .answer {
        min-width: 180px;
        padding: 36px 48px;
        border-radius: 36px;
        border: 1px solid rgba(255, 255, 255, 0.95);
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(145deg, rgba(255, 252, 248, 0.45), rgba(255, 247, 241, 0.55));
        color: #7d233d;
        font-size: 40px;
        font-weight: 600;
        box-shadow: 0 15px 32px rgba(120, 50, 60, 0.2), 0 5px 11px rgba(60, 13, 26, 0.1);
      }
      .duet-card-wrapper.theme-1 .or {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 20px;
        color: #827975;
        font-size: 30px;
        font-weight: 400;
      }
      .duet-card-wrapper.theme-1 .or::before,
      .duet-card-wrapper.theme-1 .or::after {
        content: "";
        display: block;
        width: 28px;
        height: 1px;
        background: #a99b93;
      }

      .duet-card-wrapper.theme-1 .footer {
        position: absolute;
        left: 141px;
        right: 142px;
        top: 1400px;
        height: 120px;
      }
      .duet-card-wrapper.theme-1 .navigation {
        position: absolute;
        top: 0;
        width: 100px;
        height: 100px;
        padding: 0;
        display: grid;
        place-items: center;
        border-radius: 50%;
        color: #f9e9df;
        box-shadow: inset 0 1px 4px rgba(245, 170, 187, 0.05);
      }
      .duet-card-wrapper.theme-1 .previous { left: 0; }
      .duet-card-wrapper.theme-1 .next { right: 0; }
      .duet-card-wrapper.theme-1 .navigation svg {
        width: 28px;
        height: 42px;
        fill: none;
        stroke: currentColor;
        stroke-width: 4.5;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .duet-card-wrapper.theme-1 .footer-message {
        position: absolute;
        top: 6px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        white-space: nowrap;
      }
      .duet-card-wrapper.theme-1 .footer-heart {
        width: 50px;
        height: 50px;
      }
      .duet-card-wrapper.theme-1 .footer-message p {
        margin: 22px 0 0;
        color: #d5adb0;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 26px;
        font-weight: 400;
        line-height: 1.2;
      }


      /* ============================================================
         THEME 2 — Standalone Slide (Maroon + Cream Card)
         Exact match to the provided reference design.
         ============================================================ */

      .duet-card-wrapper.theme-2 .t2-screen {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background:
          linear-gradient(145deg, rgba(255, 255, 255, 0.06), transparent 32%),
          linear-gradient(160deg, #601c2c, #501321 65%, #591726);
      }

      /* The cream card */
      .duet-card-wrapper.theme-2 .t2-card {
        position: absolute;
        z-index: 2;
        left: 12%;
        right: 12%;
        top: 13.5%;
        bottom: 13.5%;
        border-radius: 48px;
        border: none;
        background: #fff4ee;
        box-shadow:
          0 45px 90px rgba(40, 0, 15, 0.28),
          0 8px 23px rgba(40, 0, 15, 0.12);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 100px 60px 80px;
        overflow: hidden;
      }

      /* ---- Sparkles overlay ---- */
      .duet-card-wrapper.theme-2 .t2-sparkles {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 3;
      }

      .duet-card-wrapper.theme-2 .t2-sparkle {
        position: absolute;
        color: #C69F70;
        line-height: 1;
        opacity: 1;
      }

      /* Top-left small */
      .duet-card-wrapper.theme-2 .t2-sparkle--1 {
        top: 10%;
        left: 17%;
        font-size: 32px;
      }
      /* Bottom-left near icon */
      .duet-card-wrapper.theme-2 .t2-sparkle--2 {
        top: 20%;
        left: 23%;
        font-size: 46px;
      }
      /* Top-right medium */
      .duet-card-wrapper.theme-2 .t2-sparkle--3 {
        top: 14%;
        right: 18%;
        font-size: 38px;
      }
      /* Far-right small */
      .duet-card-wrapper.theme-2 .t2-sparkle--4 {
        top: 21%;
        right: 14%;
        font-size: 26px;
      }

      /* ---- Card inner content ---- */
      .duet-card-wrapper.theme-2 .t2-inner {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 30px;
        z-index: 2;
      }

      /* ---- Playing cards icon (image) ---- */
      .duet-card-wrapper.theme-2 .t2-icon-img {
        width: 240px;
        height: auto;
        margin-bottom: 12px;
        object-fit: contain;
      }

      /* ---- Question text ---- */
      .duet-card-wrapper.theme-2 .t2-question {
        font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
        font-size: 74px;
        line-height: 1.18;
        color: #111111;
        text-align: center;
        padding-inline: 20px;
        letter-spacing: -0.5px;
        font-weight: 500;
        margin: 0;
        max-width: 830px;
      }

      .duet-card-wrapper.theme-2 .t2-keyword {
        color: #7A2E3A;
        font-style: italic;
        font-weight: 600;
      }

      /* ---- Heart divider ---- */
      .duet-card-wrapper.theme-2 .t2-divider {
        width: 75%;
        max-width: 600px;
        display: flex;
        align-items: center;
        gap: 30px;
        margin-block: 16px;
        color: #7A2E3A;
      }

      .duet-card-wrapper.theme-2 .t2-divider::before,
      .duet-card-wrapper.theme-2 .t2-divider::after {
        content: "";
        height: 3px;
        flex: 1;
        background: linear-gradient(90deg, transparent, rgba(199, 130, 142, 0.9), transparent);
      }

      .duet-card-wrapper.theme-2 .t2-divider-heart {
        color: #7A2E3A;
        font-size: 52px;
        opacity: 1;
        line-height: 1;
      }

      /* ---- Answer buttons ---- */
      .duet-card-wrapper.theme-2 .t2-answers {
        display: flex;
        align-items: center;
        gap: 40px;
        margin-top: 16px;
      }

      .duet-card-wrapper.theme-2 .t2-answers-multi {
        gap: 20px;
        flex-wrap: wrap;
        justify-content: center;
      }

      .duet-card-wrapper.theme-2 .t2-answer-btn {
        width: 220px;
        height: 220px;
        border: 1px solid #ffffff;
        border-radius: 42px;
        background-color: #FDF6F3;
        color: #7A2E3A;
        font-family: 'Montserrat', 'Inter', system-ui, sans-serif;
        font-size: 34px;
        font-weight: 600;
        letter-spacing: 0.04em;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        box-shadow: 0 6px 20px rgba(122, 46, 58, 0.08);
      }

      /* "or" separator */
      .duet-card-wrapper.theme-2 .t2-answer-sep {
        font-size: 36px;
        color: #111111;
        display: flex;
        align-items: center;
        font-family: 'Montserrat', 'Inter', system-ui, sans-serif;
        font-weight: 400;
        letter-spacing: -0.02em;
      }

      /* ---- Bottom sparkle (absolutely positioned near card bottom) ---- */
      .duet-card-wrapper.theme-2 .t2-bottom-sparkle {
        position: absolute;
        bottom: 5%;
        left: 50%;
        transform: translateX(-50%);
        color: #C69F70;
        font-size: 38px;
        opacity: 1;
        line-height: 1;
        z-index: 2;
      }
    `;
  }
}
