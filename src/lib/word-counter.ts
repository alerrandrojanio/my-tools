export interface TextStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  /** Estimated reading time in minutes (200 words/min), rounded up. */
  readingMinutes: number;
}

const WORDS_PER_MINUTE = 200;

function countNonBlank(parts: readonly string[]): number {
  return parts.filter((part) => /\S/.test(part)).length;
}

export function countText(text: string): TextStats {
  const words = countNonBlank(text.split(/\s+/));
  // Terminators only count when followed by whitespace or the end ("3.14" stays whole).
  const sentences = countNonBlank(text.split(/[.!?…]+(?=\s|$)/));
  const paragraphs = countNonBlank(text.split(/\n\s*\n/));

  return {
    words,
    // Spread counts Unicode code points, so an emoji counts as one character.
    characters: [...text].length,
    charactersNoSpaces: [...text.replace(/\s/g, "")].length,
    sentences,
    paragraphs,
    readingMinutes: Math.ceil(words / WORDS_PER_MINUTE),
  };
}
