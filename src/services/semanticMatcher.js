/**
 * Semantic Matcher Service
 * =========================
 * Provides semantic matching between user niche queries and questions.
 *
 * MVP: Enhanced keyword matching with concept expansion + synonym maps.
 * Designed as a swappable abstraction — replace this implementation with
 * embeddings or LLM-based matching without changing any other service.
 *
 * Interface contract:
 *   expandQuery(niche: string)  → Map<token, weight>
 *   scoreQuestion(questionText, expandedQuery) → number (0–1)
 *   inferEnergy(niche) → [{ energy, score }]
 *   inferDepth(niche) → 'deep' | 'light' | 'balanced'
 */

import { tokenize, ngrams, simpleStem } from '../utils/similarity.js';

/* ── Concept / Synonym Expansion Map ──────────────────────── */

const CONCEPT_MAP = {
  'funny':       ['humor', 'laugh', 'hilarious', 'comedy', 'joke', 'amusing', 'playful', 'silly', 'ridiculous', 'goofy', 'weird', 'crazy', 'absurd', 'cringe'],
  'annoying':    ['irritating', 'frustrating', 'pet peeve', 'bother', 'habit', 'quirk', 'nag', 'gross', 'messy', 'pettiest', 'petty', 'drives crazy'],
  'habit':       ['routine', 'behavior', 'pattern', 'always', 'tendency', 'quirk', 'trait', 'keeps doing', 'thing you do'],
  'love':        ['affection', 'care', 'adore', 'cherish', 'heart', 'devotion', 'feeling', 'emotion', 'romance', 'loved'],
  'appreciate':  ['grateful', 'thankful', 'value', 'recognize', 'acknowledge', 'gesture', 'notice', 'effort', 'feel loved'],
  'deep':        ['profound', 'meaningful', 'serious', 'soul', 'vulnerable', 'honest', 'raw', 'real', 'genuine', 'true'],
  'intimate':    ['close', 'personal', 'private', 'connection', 'touch', 'desire', 'passion', 'physical', 'attraction', 'attracted'],
  'future':      ['plan', 'dream', 'goal', 'someday', 'imagine', 'hope', 'aspire', 'want', 'grow old', 'years', 'ahead'],
  'argue':       ['fight', 'disagree', 'conflict', 'debate', 'bicker', 'clash', 'petty', 'argument', 'tension'],
  'secret':      ['hide', 'reveal', 'confess', 'admit', 'truth', 'honest', 'expose', 'never told', 'hidden'],
  'memory':      ['remember', 'moment', 'experience', 'nostalgia', 'special', 'think about', 'memorable', 'recall'],
  'date':        ['night out', 'outing', 'activity', 'together time', 'surprise', 'romantic evening', 'dinner'],
  'trust':       ['faith', 'rely', 'depend', 'honest', 'loyal', 'faithful', 'safe', 'secure'],
  'miss':        ['apart', 'distance', 'away', 'far', 'long distance', 'separated', 'lonely', 'without'],
  'first':       ['beginning', 'start', 'initial', 'early', 'new', 'original', 'impression', 'met'],
  'tease':       ['joke', 'playful', 'banter', 'mock', 'prank', 'mess with', 'roast', 'pick on'],
  'jealous':     ['envy', 'possessive', 'insecure', 'protective', 'territorial'],
  'comfortable': ['safe', 'secure', 'cozy', 'relaxed', 'easy', 'natural', 'effortless'],
  'passion':     ['fire', 'desire', 'intense', 'excitement', 'spark', 'chemistry', 'heat'],
  'vulnerable':  ['open', 'honest', 'exposed', 'raw', 'real', 'authentic', 'brave', 'afraid'],
  'surprise':    ['unexpected', 'spontaneous', 'random', 'shock', 'wow'],
  'communicate': ['talk', 'share', 'express', 'tell', 'say', 'discuss', 'conversation', 'hear', 'heard', 'listen'],
  'grow':        ['change', 'evolve', 'improve', 'develop', 'mature', 'learn', 'become', 'transform'],
  'fear':        ['afraid', 'scared', 'worry', 'anxious', 'nervous', 'terrified', 'concerned'],
  'dream':       ['wish', 'hope', 'want', 'imagine', 'fantasy', 'aspire', 'bucket list'],
  'feel':        ['emotion', 'sense', 'experience', 'vibe', 'mood', 'spirit'],
  'close':       ['near', 'together', 'bond', 'connected', 'tight', 'inseparable'],
  'travel':      ['adventure', 'trip', 'journey', 'explore', 'vacation', 'destination'],
  'home':        ['house', 'live', 'settle', 'nest', 'space', 'place'],
  'family':      ['kids', 'children', 'parents', 'baby', 'marriage', 'wedding'],
  'music':       ['song', 'theme', 'soundtrack', 'sing', 'dance'],
  'food':        ['eat', 'cook', 'dinner', 'restaurant', 'meal', 'taste', 'bite'],
  'laugh':       ['funny', 'humor', 'giggle', 'crack up', 'smile', 'joy', 'happy'],
  'cry':         ['tear', 'emotional', 'sad', 'moved', 'touched', 'upset'],
  'forgive':     ['sorry', 'apologize', 'let go', 'move on', 'accept'],
  'attract':     ['drawn', 'desire', 'want', 'chemistry', 'spark', 'sexy', 'hot', 'physically'],
  'support':     ['help', 'encourage', 'champion', 'back up', 'stand by', 'be there'],
  'expose':      ['reveal', 'show', 'uncover', 'truth', 'real', 'honest', 'admit', 'confess'],
  'closer':      ['bond', 'connect', 'deepen', 'strengthen', 'intimate', 'tight'],
  'late night':  ['midnight', 'bedtime', 'pillow talk', 'after dark', 'evening'],
  'nickname':    ['name', 'call', 'pet name', 'weird', 'goofy'],
  'blush':       ['shy', 'embarrassed', 'flattered', 'sweet', 'romantic'],
  'sacrifice':   ['give up', 'compromise', 'effort', 'selfless'],
  'theme song':  ['song', 'music', 'soundtrack', 'anthem'],
  'impression':  ['first', 'met', 'thought', 'initially', 'early'],
};

/* ── Energy Concept Mappings ──────────────────────────────── */

const ENERGY_CONCEPTS = {
  playful:   ['funny', 'laugh', 'tease', 'silly', 'goofy', 'ridiculous', 'chaos', 'prank', 'annoying', 'habit', 'quirk', 'petty', 'messy', 'weird', 'cringe', 'roast', 'nickname', 'joke', 'inside'],
  curious:   ['wonder', 'discover', 'learn', 'find out', 'explore', 'secret', 'reveal', 'first', 'memory', 'impression', 'different', 'notice', 'realize', 'change'],
  romantic:  ['love', 'heart', 'sweet', 'appreciate', 'gesture', 'feel loved', 'blush', 'date', 'beautiful', 'special', 'adore', 'butterflies', 'ordinary', 'moment'],
  emotional: ['feel', 'cry', 'deep', 'vulnerable', 'honest', 'raw', 'sacrifice', 'fear', 'hurt', 'forgive', 'understand', 'hear', 'heard', 'grew', 'hardest'],
  deep:      ['soul', 'meaning', 'truth', 'vulnerable', 'honest', 'fear', 'accept', 'real', 'profound', 'serious', 'never told', 'home', 'unspoken'],
  future:    ['dream', 'plan', 'goal', 'imagine', 'someday', 'hope', 'grow old', 'years', 'want', 'life', 'family', 'home', 'adventure', 'bucket list', 'morning', 'routine'],
  intimate:  ['close', 'desire', 'passion', 'touch', 'attract', 'physical', 'private', 'personal', 'connection', 'safe', 'cuddle', 'conversation', 'comfortable', 'desired'],
};

export class SemanticMatcher {
  constructor() {
    this.conceptMap = CONCEPT_MAP;
    this.energyConcepts = ENERGY_CONCEPTS;
    // Build a reverse index: synonym → [concept keys]
    this._reverseIndex = this._buildReverseIndex();
  }

  /** @private Build reverse lookup from synonym → concept keys */
  _buildReverseIndex() {
    const idx = new Map();
    for (const [concept, synonyms] of Object.entries(this.conceptMap)) {
      const conceptTokens = concept.split(/\s+/);
      for (const ct of conceptTokens) {
        if (!idx.has(ct)) idx.set(ct, new Set());
        idx.get(ct).add(concept);
      }
      for (const syn of synonyms) {
        const synTokens = syn.split(/\s+/);
        for (const st of synTokens) {
          if (!idx.has(st)) idx.set(st, new Set());
          idx.get(st).add(concept);
        }
      }
    }
    return idx;
  }

  /**
   * Expand a niche query into a weighted token map.
   * Direct tokens get weight 1.0, expanded concepts get 0.5–0.7.
   * @param {string} query - User's niche/topic input
   * @returns {Map<string, number>} token → weight
   */
  expandQuery(query) {
    if (!query || query.trim().length === 0) return new Map();

    const tokens = tokenize(query);
    const bigrams = ngrams(tokens, 2);
    const expanded = new Map();

    // Original tokens: full weight
    for (const token of tokens) {
      expanded.set(token, 1.0);
      expanded.set(simpleStem(token), Math.max(expanded.get(simpleStem(token)) || 0, 0.9));
    }

    // Bigrams: higher weight for phrase matching
    for (const bigram of bigrams) {
      expanded.set(bigram, 1.5);
    }

    // Concept expansion
    for (const token of tokens) {
      const stemmed = simpleStem(token);

      // Check direct reverse index
      const matchedConcepts = new Set();
      if (this._reverseIndex.has(token)) {
        this._reverseIndex.get(token).forEach(c => matchedConcepts.add(c));
      }
      if (this._reverseIndex.has(stemmed)) {
        this._reverseIndex.get(stemmed).forEach(c => matchedConcepts.add(c));
      }

      // Also fuzzy: check if token is a prefix/substring of any concept key
      for (const [concept] of Object.entries(this.conceptMap)) {
        const conceptTokens = concept.split(/\s+/);
        for (const ct of conceptTokens) {
          if (ct.length > 3 && token.length > 3) {
            if (ct.startsWith(token) || token.startsWith(ct)) {
              matchedConcepts.add(concept);
            }
          }
        }
      }

      // Expand all matched concepts
      for (const concept of matchedConcepts) {
        const synonyms = this.conceptMap[concept] || [];
        // Add concept tokens
        for (const ct of concept.split(/\s+/)) {
          if (ct.length > 1) {
            expanded.set(ct, Math.max(expanded.get(ct) || 0, 0.7));
          }
        }
        // Add synonym tokens
        for (const syn of synonyms) {
          for (const st of syn.split(/\s+/)) {
            if (st.length > 1) {
              expanded.set(st, Math.max(expanded.get(st) || 0, 0.5));
              expanded.set(simpleStem(st), Math.max(expanded.get(simpleStem(st)) || 0, 0.4));
            }
          }
        }
      }
    }

    return expanded;
  }

  /**
   * Score a question against an expanded query.
   * @param {string} questionText
   * @param {Map<string, number>} expandedQuery - From expandQuery()
   * @returns {number} 0–1 relevance score
   */
  scoreQuestion(questionText, expandedQuery) {
    if (!expandedQuery || expandedQuery.size === 0) return 0;

    const qTokens = tokenize(questionText);
    if (qTokens.length === 0) return 0;

    const qBigrams = ngrams(qTokens, 2);
    let totalScore = 0;
    let matchCount = 0;

    // Token-level matching
    for (const qToken of qTokens) {
      let bestMatch = 0;
      const qStem = simpleStem(qToken);

      for (const [queryToken, weight] of expandedQuery) {
        // Exact match
        if (queryToken === qToken || queryToken === qStem) {
          bestMatch = Math.max(bestMatch, weight * 1.0);
        }
        // Stem match
        else if (simpleStem(queryToken) === qStem && qStem.length > 2) {
          bestMatch = Math.max(bestMatch, weight * 0.8);
        }
        // Prefix match
        else if (queryToken.length > 3 && qToken.length > 3) {
          if (qToken.startsWith(queryToken) || queryToken.startsWith(qToken)) {
            bestMatch = Math.max(bestMatch, weight * 0.6);
          }
        }
      }

      if (bestMatch > 0) {
        totalScore += bestMatch;
        matchCount++;
      }
    }

    // Bigram matching (phrase-level bonus)
    for (const bigram of qBigrams) {
      if (expandedQuery.has(bigram)) {
        totalScore += expandedQuery.get(bigram) * 1.2;
        matchCount++;
      }
    }

    // Normalize
    const totalTokens = qTokens.length + qBigrams.length;
    const coverage = matchCount / totalTokens;
    const density = totalScore / totalTokens;

    // Combined: rewards both high match density and broad coverage
    return Math.min(1.0, (density * 0.65 + coverage * 0.35));
  }

  /**
   * Infer the expected energy profile from a niche query.
   * @param {string} query
   * @returns {{ energy: string, score: number }[]} Sorted by relevance
   */
  inferEnergy(query) {
    const tokens = tokenize(query);
    if (tokens.length === 0) return [];

    const energyScores = {};

    for (const [energy, concepts] of Object.entries(this.energyConcepts)) {
      let score = 0;
      for (const token of tokens) {
        for (const concept of concepts) {
          if (concept === token) {
            score += 1.0;
          } else if (concept.includes(token) || token.includes(concept)) {
            score += 0.5;
          } else if (simpleStem(concept) === simpleStem(token) && simpleStem(token).length > 2) {
            score += 0.4;
          }
        }
      }
      if (score > 0) energyScores[energy] = score;
    }

    return Object.entries(energyScores)
      .sort(([, a], [, b]) => b - a)
      .map(([energy, score]) => ({ energy, score }));
  }

  /**
   * Infer the desired conversation depth from the niche.
   * @param {string} query
   * @returns {'deep' | 'light' | 'balanced'}
   */
  inferDepth(query) {
    const tokens = tokenize(query);
    const deepKeywords = ['deep', 'serious', 'meaningful', 'profound', 'vulnerable', 'honest', 'raw', 'soul', 'hard', 'difficult', 'tough', 'real', 'emotional', 'heavy'];
    const lightKeywords = ['funny', 'fun', 'silly', 'playful', 'laugh', 'light', 'easy', 'simple', 'casual', 'goofy', 'ridiculous', 'chaos', 'weird', 'petty', 'annoying'];

    let deepScore = 0;
    let lightScore = 0;

    for (const token of tokens) {
      const stem = simpleStem(token);
      for (const d of deepKeywords) {
        if (d === token || d === stem || d.includes(token) || token.includes(d)) deepScore++;
      }
      for (const l of lightKeywords) {
        if (l === token || l === stem || l.includes(token) || token.includes(l)) lightScore++;
      }
    }

    if (deepScore > lightScore) return 'deep';
    if (lightScore > deepScore) return 'light';
    return 'balanced';
  }
}
