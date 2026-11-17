/**
 * Ranking Configuration
 * =====================
 * Central configuration for the question selection algorithm.
 * All ranking weights and thresholds are defined here.
 *
 * Adjust these values to tune selection quality.
 * Higher weight = more influence on the final score.
 */

export const rankingConfig = {

  /* ── Scoring Weights ────────────────────────────────────── */

  weights: {
    /** How closely the question matches the requested niche (0–1 normalized) */
    nicheRelevance:      0.35,

    /** The card's shareability score (from JSON metadata, 1–10) */
    shareability:        0.20,

    /** How well the card's energy matches the inferred niche energy */
    energyMatch:         0.15,

    /** Whether the card_type naturally fits the requested content angle */
    cardTypeSuitability: 0.10,

    /** How well conversation_depth aligns with the niche intent */
    depthAlignment:      0.10,

    /** Bonus for cards with high social-media content potential */
    contentQuality:      0.10,
  },

  /* ── Diversity & Similarity ────────────────────────────── */

  diversity: {
    /** Minimum Jaccard distance between any two selected questions (0–1).
     *  Higher = more diversity required. */
    minTokenDistance:       0.55,

    /** Penalty multiplier for similarity to already-selected questions */
    similarityPenalty:     1.5,

    /** Penalty multiplier for recently used questions (session history) */
    recentUsePenalty:      0.85,

    /** Whether to enforce card_type variety in a single set */
    enforceCardTypeVariety: true,

    /** Whether to enforce energy variety in a single set */
    enforceEnergyVariety:   true,
  },

  /* ── Slideshow Position Roles ──────────────────────────── */

  slideshow: {
    /** First question: strong hook / scroll-stopper */
    hookBoost: {
      shareabilityMin: 7,
      preferEnergy: ['playful', 'curious'],
      boostFactor: 1.3,
    },

    /** Last question: memorable closer */
    closerBoost: {
      preferEnergy: ['emotional', 'deep', 'romantic'],
      preferHighDepth: true,
      boostFactor: 1.2,
    },
  },

  /* ── Card-Type Suitability per Niche Intent ────────────── */

  cardTypeSuitabilityMap: {
    playful:   { 'Me / Them': 1.0, 'This or That': 0.9, 'Guess Their Answer': 0.8, 'Open Answer': 0.6, 'Yes / No': 0.7 },
    curious:   { 'Guess Their Answer': 1.0, 'Open Answer': 0.9, 'Me / Them': 0.7, 'This or That': 0.6, 'Yes / No': 0.5 },
    romantic:  { 'Open Answer': 1.0, 'Guess Their Answer': 0.8, 'This or That': 0.6, 'Yes / No': 0.5, 'Me / Them': 0.4 },
    emotional: { 'Open Answer': 1.0, 'Guess Their Answer': 0.7, 'Yes / No': 0.6, 'This or That': 0.4, 'Me / Them': 0.3 },
    deep:      { 'Open Answer': 1.0, 'Guess Their Answer': 0.7, 'Yes / No': 0.6, 'This or That': 0.3, 'Me / Them': 0.2 },
    future:    { 'Open Answer': 1.0, 'This or That': 0.8, 'Guess Their Answer': 0.7, 'Yes / No': 0.5, 'Me / Them': 0.4 },
    intimate:  { 'Open Answer': 1.0, 'This or That': 0.7, 'Guess Their Answer': 0.6, 'Yes / No': 0.5, 'Me / Them': 0.3 },
    default:   { 'Open Answer': 0.7, 'This or That': 0.7, 'Guess Their Answer': 0.7, 'Me / Them': 0.7, 'Yes / No': 0.7 },
  },

  /* ── Content Quality Signals ───────────────────────────── */

  contentQuality: {
    /** Cards with these traits get a quality bonus */
    highQualitySignals: [
      'recognizable couple situation',
      'triggers disagreement',
      'provokes laughter',
      'partner tagging potential',
    ],

    /** Minimum shareability to be considered "high quality" */
    minShareability: 6,

    /** Depth ranges that are generally social-media friendly */
    socialMediaFriendlyDepth: { min: 1, max: 4 },
  },

  /* ── Selection Constraints ─────────────────────────────── */

  selection: {
    /** Maximum number of questions per generation */
    maxQuestions: 5,

    /** Allowed question count options */
    questionCountOptions: [3, 4, 5],

    /** Minimum questions available before showing a warning */
    minPoolSize: 3,
  },
};
