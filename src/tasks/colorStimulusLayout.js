export function getColorStimulusClassName(word = '') {
  const normalized = String(word ?? '').trim();
  return normalized.length >= 8 ? 'color-stimulus long-word' : 'color-stimulus';
}
