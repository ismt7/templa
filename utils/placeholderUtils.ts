import { PlaceholderSettings } from "@/utils/templateUtils";

export const extractPlaceholders = (contents: string[]): string[] => {
  const allContents = contents.join(" ");
  const matches = allContents.match(/{(.*?)}/g) || [];

  return Array.from(new Set(matches.map((match) => match.slice(1, -1))));
};

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
  placeholderSettings: PlaceholderSettings
): { placeholders: string[]; updatedSettings: PlaceholderSettings } => {
  const placeholders = extractPlaceholders(contents);
  const updatedSettings = ensurePlaceholderSettings(
    placeholders,
    placeholderSettings
  );

  return { placeholders, updatedSettings };
};
