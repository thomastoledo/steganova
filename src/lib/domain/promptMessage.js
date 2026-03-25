export const DEFAULT_ARTWORK_WIDTH = 1600;
export const DEFAULT_ARTWORK_HEIGHT = 1120;

const RGB_CHANNELS = 3;
const STEGO_HEADER_BYTES = 8;
const textEncoder = new TextEncoder();

export const MAX_PROMPT_CHARACTERS =
  Math.floor((DEFAULT_ARTWORK_WIDTH * DEFAULT_ARTWORK_HEIGHT * RGB_CHANNELS) / 8) - STEGO_HEADER_BYTES;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "our",
  "that",
  "the",
  "their",
  "there",
  "they",
  "this",
  "to",
  "was",
  "we",
  "with",
  "you",
  "your",
]);

export function countCharacters(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim().length;
}

export function createPromptMessage(text) {
  const sourceText = String(text ?? "");
  const normalizedText = sourceText.replace(/\s+/g, " ").trim();
  const payloadBytes = textEncoder.encode(normalizedText).length;
  const words = normalizedText.length === 0 ? [] : normalizedText.split(" ");
  const cleanedWords = words.map(cleanToken).filter(Boolean);
  const uniqueWords = new Set(cleanedWords);
  const totalLetters = cleanedWords.reduce((count, word) => count + word.length, 0);
  const vowelCount = cleanedWords.join("").match(/[aeiouy]/gi)?.length ?? 0;

  return {
    text: sourceText,
    normalizedText,
    characterCount: normalizedText.length,
    payloadBytes,
    remainingCharacters: MAX_PROMPT_CHARACTERS - payloadBytes,
    wordCount: words.length,
    isEmpty: normalizedText.length === 0,
    isWithinLimit: payloadBytes <= MAX_PROMPT_CHARACTERS,
    focusTokens: buildFocusTokens(cleanedWords),
    cadence: {
      averageWordLength: cleanedWords.length === 0 ? 0 : totalLetters / cleanedWords.length,
      uniqueRatio: cleanedWords.length === 0 ? 0 : uniqueWords.size / cleanedWords.length,
      punctuationDensity:
        normalizedText.length === 0
          ? 0
          : (normalizedText.match(/[,:;.!?'"()-]/g)?.length ?? 0) / normalizedText.length,
      vowelRatio: totalLetters === 0 ? 0 : vowelCount / totalLetters,
      longWordRatio:
        cleanedWords.length === 0 ? 0 : cleanedWords.filter((word) => word.length >= 7).length / cleanedWords.length,
    },
  };
}

function buildFocusTokens(words) {
  const frequencies = new Map();

  for (const word of words) {
    if (word.length < 3 || STOP_WORDS.has(word)) {
      continue;
    }

    frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
  }

  return [...frequencies.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      if (right[0].length !== left[0].length) {
        return right[0].length - left[0].length;
      }

      return left[0].localeCompare(right[0]);
    })
    .slice(0, 12)
    .map(([word]) => word);
}

function cleanToken(word) {
  return word.toLowerCase().replace(/(^[^a-z0-9]+|[^a-z0-9]+$)/g, "");
}
