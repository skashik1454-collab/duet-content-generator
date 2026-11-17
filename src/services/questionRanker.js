/**
 * Question Ranker Service
 * ========================
 * Computes a composite score for each question based on:
 *   - Niche relevance (semantic match)
 *   - Shareability
 *   - Energy alignment
 *   - Card-type suitability
 *   - Conversation depth alignment
 *   - Content quality signals
 *
 * Uses weights from rankingConfig.js — all tuning happens there.
 */

import { rankingConfig } from '../config/rankingConfig.js';

export class QuestionRanker {
  /**
   * @param {import('./semanticMatcher.js').SemanticMatcher} semanticMatcher
   */
  constructor(semanticMatcher) {
    this.matcher = semanticMatcher;
  }

  /**
   * Rank an array of filtered cards.
   * @param {Array} cards - Pre-filtered cards
   * @param {Object} options
   * @param {string} options.niche - User's niche/topic input
   * @param {string} options.category - Selected category
   * @returns {Array} Cards with _score and _breakdown attached, sorted descending
   */
  rank(cards, options) {
    const { niche } = options;
    const weights = rankingConfig.weights;

    // Pre-compute niche analysis
    const expandedQuery = this.matcher.expandQuery(niche);
    const inferredEnergies = this.matcher.inferEnergy(niche);
    const inferredDepth = this.matcher.inferDepth(niche);
    const hasNiche = niche && niche.trim().length > 0;

    // Score each card
    const scored = cards.map(card => {
      const breakdown = {};

      // 1. Niche relevance
      if (hasNiche) {
        breakdown.nicheRelevance = this.matcher.scoreQuestion(card.question, expandedQuery);
      } else {
        // No niche → all cards get a neutral score
        breakdown.nicheRelevance = 0.5;
      }

      // 2. Shareability (normalize 1–10 → 0–1)
      breakdown.shareability = (card.shareability || 5) / 10;

      // 3. Energy match
      breakdown.energyMatch = this._scoreEnergyMatch(card.energy, inferredEnergies);

      // 4. Card-type suitability
      breakdown.cardTypeSuitability = this._scoreCardTypeSuitability(
        card.card_type,
        inferredEnergies,
        card.energy
      );

      // 5. Depth alignment
      breakdown.depthAlignment = this._scoreDepthAlignment(
        card.conversation_depth,
        inferredDepth
      );

      // 6. Content quality
      breakdown.contentQuality = this._scoreContentQuality(card);

      // Composite score
      const score =
        breakdown.nicheRelevance     * weights.nicheRelevance +
        breakdown.shareability       * weights.shareability +
        breakdown.energyMatch        * weights.energyMatch +
        breakdown.cardTypeSuitability * weights.cardTypeSuitability +
        breakdown.depthAlignment     * weights.depthAlignment +
        breakdown.contentQuality     * weights.contentQuality;

      return {
        ...card,
        _score: score,
        _breakdown: breakdown,
      };
    });

    // Sort descending by score
    scored.sort((a, b) => b._score - a._score);

    return scored;
  }

  /**
   * Score energy alignment.
   * @private
   */
  _scoreEnergyMatch(cardEnergy, inferredEnergies) {
    if (!inferredEnergies || inferredEnergies.length === 0) return 0.5;

    const match = inferredEnergies.find(e => e.energy === cardEnergy);
    if (match) {
      const rank = inferredEnergies.indexOf(match);
      return Math.max(0.3, 1.0 - rank * 0.2);
    }

    return 0.15;
  }

  /**
   * Score card-type suitability for the inferred energy.
   * @private
   */
  _scoreCardTypeSuitability(cardType, inferredEnergies, cardEnergy) {
    const config = rankingConfig.cardTypeSuitabilityMap;

    // Use the top inferred energy, or the card's own energy, or default
    let mapKey = 'default';
    if (inferredEnergies && inferredEnergies.length > 0) {
      mapKey = inferredEnergies[0].energy;
    } else if (cardEnergy) {
      mapKey = cardEnergy;
    }

    const suitabilityMap = config[mapKey] || config['default'];
    return suitabilityMap[cardType] ?? 0.5;
  }

  /**
   * Score conversation depth alignment with inferred depth.
   * @private
   */
  _scoreDepthAlignment(cardDepth, inferredDepth) {
    const depth = cardDepth || 3;

    switch (inferredDepth) {
      case 'light':
        // Prefer low depth (1–2), penalize high depth
        if (depth <= 2) return 1.0;
        if (depth <= 3) return 0.7;
        return Math.max(0.1, 1.0 - (depth - 2) * 0.2);

      case 'deep':
        // Prefer high depth (4–5), penalize low depth
        if (depth >= 4) return 1.0;
        if (depth >= 3) return 0.7;
        return Math.max(0.1, depth * 0.2);

      case 'balanced':
      default:
        // Slight preference for mid-range depth
        if (depth >= 2 && depth <= 4) return 0.9;
        return 0.6;
    }
  }

  /**
   * Score content quality for social-media suitability.
   * @private
   */
  _scoreContentQuality(card) {
    let score = 0.5;
    const cq = rankingConfig.contentQuality;

    // High shareability bonus
    if ((card.shareability || 0) >= cq.minShareability) {
      score += 0.2;
    }

    // Social-media friendly depth range
    const depth = card.conversation_depth || 3;
    if (depth >= cq.socialMediaFriendlyDepth.min &&
        depth <= cq.socialMediaFriendlyDepth.max) {
      score += 0.15;
    }

    // Interactive card types get a small bonus
    if (['Me / Them', 'This or That', 'Guess Their Answer'].includes(card.card_type)) {
      score += 0.1;
    }

    // Short, punchy questions are social-media friendly
    const wordCount = (card.question || '').split(/\s+/).length;
    if (wordCount >= 5 && wordCount <= 18) {
      score += 0.05;
    }

    return Math.min(1.0, score);
  }
}
