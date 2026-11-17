/**
 * Diversity Selector Service
 * ===========================
 * Selects the best N questions from a ranked pool while enforcing:
 *   - Near-duplicate / similarity filtering
 *   - Card-type variety
 *   - Energy variety
 *   - Session-history penalty (avoid recently used)
 *   - Slideshow-level positioning (hook → closer)
 *
 * This is what turns "5 top-scored questions" into a "good set".
 */

import { rankingConfig } from '../config/rankingConfig.js';
import { cardSimilarity } from '../utils/similarity.js';

export class DiversitySelector {
  /**
   * Select the best diverse set from a ranked pool.
   * @param {Array} rankedCards - Cards with _score, sorted descending
   * @param {number} count - Number of questions to select (3–5)
   * @param {string[]} [sessionHistory=[]] - IDs of recently used questions
   * @returns {{ selected: Array, pool: Array }} Selected cards and full pool
   */
  select(rankedCards, count, sessionHistory = []) {
    if (rankedCards.length === 0) return { selected: [], pool: [] };

    const diversityConfig = rankingConfig.diversity;
    const slideshowConfig = rankingConfig.slideshow;
    const recentlyUsed = new Set(sessionHistory);

    // Create working copies with adjusted scores
    const candidates = rankedCards.map(card => ({
      ...card,
      _adjustedScore: card._score,
      _selected: false,
    }));

    // Penalize recently used questions
    for (const candidate of candidates) {
      if (recentlyUsed.has(candidate.id)) {
        candidate._adjustedScore *= (1 - diversityConfig.recentUsePenalty);
      }
    }

    const selected = [];
    const targetCount = Math.min(count, candidates.length);

    // Step 1: Select the HOOK (first question)
    // Prioritize: high shareability + scroll-stopping energy + high score
    const hookCandidates = candidates
      .filter(c => !c._selected)
      .map(c => {
        let hookScore = c._adjustedScore;
        const hookConfig = slideshowConfig.hookBoost;

        // Boost high-shareability cards
        if ((c.shareability || 0) >= hookConfig.shareabilityMin) {
          hookScore *= hookConfig.boostFactor;
        }

        // Boost preferred energies for hooks
        if (hookConfig.preferEnergy.includes(c.energy)) {
          hookScore *= 1.15;
        }

        return { ...c, _hookScore: hookScore };
      })
      .sort((a, b) => b._hookScore - a._hookScore);

    if (hookCandidates.length > 0) {
      const hook = hookCandidates[0];
      hook._selected = true;
      hook._position = 'hook';
      selected.push(hook);
      // Mark in original candidates
      const orig = candidates.find(c => c.id === hook.id);
      if (orig) orig._selected = true;
    }

    // Step 2: Select MIDDLE questions (greedy with diversity)
    const middleCount = targetCount - (targetCount >= 3 ? 2 : 1);
    for (let i = 0; i < middleCount; i++) {
      const next = this._selectNextDiverse(candidates, selected, diversityConfig);
      if (!next) break;
      next._position = 'middle';
      selected.push(next);
    }

    // Step 3: Select the CLOSER (last question)
    if (selected.length < targetCount) {
      const closerCandidates = candidates
        .filter(c => !c._selected)
        .map(c => {
          let closerScore = c._adjustedScore;
          const closerConfig = slideshowConfig.closerBoost;

          // Boost emotional/deep/romantic for closer
          if (closerConfig.preferEnergy.includes(c.energy)) {
            closerScore *= closerConfig.boostFactor;
          }

          // Boost high conversation depth for closer
          if (closerConfig.preferHighDepth && (c.conversation_depth || 0) >= 4) {
            closerScore *= 1.1;
          }

          // Still apply diversity penalty
          const maxSim = selected.length > 0
            ? Math.max(...selected.map(s => cardSimilarity(s, c)))
            : 0;
          closerScore -= maxSim * diversityConfig.similarityPenalty;

          return { ...c, _closerScore: closerScore };
        })
        .sort((a, b) => b._closerScore - a._closerScore);

      if (closerCandidates.length > 0) {
        const closer = closerCandidates[0];
        closer._selected = true;
        closer._position = 'closer';
        selected.push(closer);
        const orig = candidates.find(c => c.id === closer.id);
        if (orig) orig._selected = true;
      }
    }

    // Clean up internal scoring properties for output
    const cleanSelected = selected.map(card => {
      const { _adjustedScore, _selected, _hookScore, _closerScore, ...clean } = card;
      return clean;
    });

    return {
      selected: cleanSelected,
      pool: candidates.filter(c => !c._selected),
    };
  }

  /**
   * Find a replacement for a specific card in the current set.
   * @param {Array} currentSet - Currently selected cards
   * @param {string} replaceId - ID of the card to replace
   * @param {Array} pool - Remaining candidates from the ranked pool
   * @param {string[]} sessionHistory - Recently used IDs
   * @returns {Object|null} Replacement card, or null if none available
   */
  findReplacement(currentSet, replaceId, pool, sessionHistory = []) {
    const diversityConfig = rankingConfig.diversity;
    const remaining = currentSet.filter(c => c.id !== replaceId);
    const recentlyUsed = new Set(sessionHistory);

    // Score each pool candidate against the remaining set
    const scored = pool
      .filter(c => !currentSet.some(s => s.id === c.id))
      .map(c => {
        let score = c._score || 0;

        // Penalize recently used
        if (recentlyUsed.has(c.id)) {
          score *= (1 - diversityConfig.recentUsePenalty);
        }

        // Diversity penalty against remaining selected questions
        if (remaining.length > 0) {
          const maxSim = Math.max(...remaining.map(r => cardSimilarity(r, c)));
          score -= maxSim * diversityConfig.similarityPenalty;
        }

        return { ...c, _replacementScore: score };
      })
      .sort((a, b) => b._replacementScore - a._replacementScore);

    if (scored.length === 0) return null;

    const replacement = scored[0];
    const { _replacementScore, ...clean } = replacement;
    return clean;
  }

  /**
   * Greedy diversity-aware selection for middle positions.
   * @private
   */
  _selectNextDiverse(candidates, selected, diversityConfig) {
    const available = candidates.filter(c => !c._selected);
    if (available.length === 0) return null;

    let best = null;
    let bestScore = -Infinity;

    for (const candidate of available) {
      let score = candidate._adjustedScore;

      // Similarity penalty against all already-selected
      if (selected.length > 0) {
        const maxSim = Math.max(...selected.map(s => cardSimilarity(s, candidate)));

        // Hard reject if too similar
        if (maxSim > (1 - diversityConfig.minTokenDistance)) {
          score -= maxSim * diversityConfig.similarityPenalty * 2;
        } else {
          score -= maxSim * diversityConfig.similarityPenalty;
        }
      }

      // Card-type variety bonus
      if (diversityConfig.enforceCardTypeVariety) {
        const typesUsed = new Set(selected.map(s => s.card_type));
        if (!typesUsed.has(candidate.card_type)) {
          score += 0.08;
        }
      }

      // Energy variety bonus
      if (diversityConfig.enforceEnergyVariety) {
        const energiesUsed = new Set(selected.map(s => s.energy));
        if (!energiesUsed.has(candidate.energy)) {
          score += 0.06;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    if (best) {
      best._selected = true;
      const orig = candidates.find(c => c.id === best.id);
      if (orig) orig._selected = true;
    }

    return best;
  }
}
