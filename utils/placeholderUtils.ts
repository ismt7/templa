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
