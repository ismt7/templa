import { PlaceholderSettings } from "@/utils/templateUtils";

export const extractPlaceholders = (contents: string[]): string[] => {
  const allContents = contents.join(" ");
  const matches = allContents.match(/{(.*?)}/g) || [];

  return Array.from(new Set(matches.map((match) => match.slice(1, -1))));
};

export const normalizePlaceholderName = (name: string): string => {
  const trimmedName = name.trim();

  if (trimmedName.startsWith("{") && trimmedName.endsWith("}")) {
    return trimmedName.slice(1, -1).trim();
  }

  return trimmedName;
};

export interface PlaceholderInsertionResult {
  content: string;
  selectionStart: number;
  selectionEnd: number;
}

const normalizeSelectionPosition = (
  position: number,
  contentLength: number
): number => {
  if (!Number.isFinite(position)) {
    return contentLength;
  }

  return Math.min(Math.max(position, 0), contentLength);
};

export const insertPlaceholderAtSelection = (
  content: string,
  placeholder: string,
  selectionStart = content.length,
  selectionEnd = selectionStart
): PlaceholderInsertionResult => {
  const start = normalizeSelectionPosition(selectionStart, content.length);
  const end = normalizeSelectionPosition(selectionEnd, content.length);
  const rangeStart = Math.min(start, end);
  const rangeEnd = Math.max(start, end);
  const token = `{${placeholder}}`;
  const nextPosition = rangeStart + token.length;

  return {
    content: `${content.slice(0, rangeStart)}${token}${content.slice(rangeEnd)}`,
    selectionStart: nextPosition,
    selectionEnd: nextPosition,
  };
};

export const mergePlaceholders = (
  manualPlaceholders: string[],
  extractedPlaceholders: string[]
): string[] =>
  Array.from(new Set([...manualPlaceholders, ...extractedPlaceholders]));

export const ensurePlaceholderSettings = (
  placeholders: string[],
  placeholderSettings: PlaceholderSettings
): PlaceholderSettings => {
  let hasChanges = false;
  const updatedSettings = { ...placeholderSettings };

  placeholders.forEach((placeholder) => {
    if (!updatedSettings[placeholder]) {
      updatedSettings[placeholder] = { type: "text" };
      hasChanges = true;
    }
  });

  return hasChanges ? updatedSettings : placeholderSettings;
};

export const evaluatePlaceholders = (
  contents: string[],
  manualPlaceholders: string[],
  placeholderSettings: PlaceholderSettings
): {
  extractedPlaceholders: string[];
  placeholders: string[];
  updatedSettings: PlaceholderSettings;
} => {
  const extractedPlaceholders = extractPlaceholders(contents);
  const placeholders = mergePlaceholders(
    manualPlaceholders,
    extractedPlaceholders
  );
  const updatedSettings = ensurePlaceholderSettings(
    placeholders,
    placeholderSettings
  );

  return { extractedPlaceholders, placeholders, updatedSettings };
};
