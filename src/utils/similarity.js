/**
 * Text Similarity Utilities
 * =========================
 * Token-level and set-level similarity functions used by
 * the diversity selector and semantic matcher.
 */

const STOPWORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','could','should','may','might','can','to','of',
  'in','for','on','with','at','by','from','up','about','into','over','after','and',
  'but','or','not','so','yet','both','each','every','all','any','few','more','most',
  'other','some','no','only','own','same','than','too','very','just','because','as',
  'until','while','that','which','who','this','these','those','i','me','my','we',
  'our','you','your','he','him','his','she','her','it','its','they','them','their',
  'what','when','where','why','how','questions','question','couples','couple',
  'partner','relationship','ask','make','makes','would','one','us','if',
]);

/**
 * Tokenize text into meaningful lowercase words, removing stop words.
 * @param {string} text
 * @returns {string[]}
 */
export function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Generate n-grams from a token array.
 * @param {string[]} tokens
 * @param {number} n
 * @returns {string[]}
 */
export function ngrams(tokens, n) {
  const result = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    result.push(tokens.slice(i, i + n).join(' '));
  }
  return result;
}

/**
 * Jaccard similarity between two token sets.
 * @param {Set<string>|string[]} a
 * @param {Set<string>|string[]} b
 * @returns {number} 0–1
 */
export function jaccardSimilarity(a, b) {
  const setA = a instanceof Set ? a : new Set(a);
  const setB = b instanceof Set ? b : new Set(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Compute a combined similarity score between two cards.
 * Considers both text similarity and metadata overlap.
 * @param {{ question: string, card_type: string, energy: string }} cardA
 * @param {{ question: string, card_type: string, energy: string }} cardB
 * @returns {number} 0–1 (higher = more similar)
 */
export function cardSimilarity(cardA, cardB) {
  const tokensA = tokenize(cardA.question);
  const tokensB = tokenize(cardB.question);

  const textSim = jaccardSimilarity(tokensA, tokensB);

  // Metadata similarity
  const sameType = cardA.card_type === cardB.card_type ? 0.15 : 0;
  const sameEnergy = cardA.energy === cardB.energy ? 0.10 : 0;
  const sameDeck = cardA.deck === cardB.deck ? 0.05 : 0;

  // Also check bigram overlap for phrase-level similarity
  const bigramsA = ngrams(tokensA, 2);
  const bigramsB = ngrams(tokensB, 2);
  const bigramSim = bigramsA.length > 0 && bigramsB.length > 0
    ? jaccardSimilarity(bigramsA, bigramsB)
    : 0;

  return (textSim * 0.50) + (bigramSim * 0.20) + sameType + sameEnergy + sameDeck;
}

/**
 * Simple stem reduction: strips common English suffixes.
 * Not a full stemmer — just enough for matching.
 * @param {string} word
 * @returns {string}
 */
export function simpleStem(word) {
  if (word.length < 4) return word;
  return word
    .replace(/ing$/, '')
    .replace(/tion$/, 't')
    .replace(/sion$/, 's')
    .replace(/ness$/, '')
    .replace(/ment$/, '')
    .replace(/able$/, '')
    .replace(/ible$/, '')
    .replace(/ful$/, '')
    .replace(/less$/, '')
    .replace(/ous$/, '')
    .replace(/ive$/, '')
    .replace(/ly$/, '')
    .replace(/ed$/, '')
    .replace(/er$/, '')
    .replace(/es$/, '')
    .replace(/s$/, '');
}
