import { PlaceholderSettings } from "@/app/page";

export const evaluatePlaceholders = (
  contents: string[],
  placeholderSettings: PlaceholderSettings
): { placeholders: string[]; updatedSettings: PlaceholderSettings } => {
  const allContents = contents.join(" ");
  const matches = allContents.match(/{(.*?)}/g) || [];
  const uniquePlaceholders = Array.from(
    new Set(matches.map((m) => m.slice(1, -1)))
  );

  const updatedSettings = { ...placeholderSettings };
  uniquePlaceholders.forEach((placeholder) => {
    if (!updatedSettings[placeholder]) {
      updatedSettings[placeholder] = { type: "text" };
    }
  });

  return { placeholders: uniquePlaceholders, updatedSettings };
};
