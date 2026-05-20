export type PlaceholderValues = Record<string, string>;

export type PlaceholderInputType = "text" | "list";

export interface PlaceholderSetting {
  type: PlaceholderInputType;
  options?: string[];
}

export type PlaceholderSettings = Record<string, PlaceholderSetting>;

export interface TemplateScene {
  name: string;
  values: PlaceholderValues;
}

export interface Template {
  name: string;
  contents: string[];
  scenes: TemplateScene[];
}

const DEFAULT_SCENE_NAME = "デフォルト";

export const createTemplate = (name = "デフォルト"): Template => ({
  name,
  contents: [""],
  scenes: [{ name: DEFAULT_SCENE_NAME, values: {} }],
});

export const replacePlaceholders = (
  content: string,
  values: PlaceholderValues
): string =>
  content.replace(
    /{(.*?)}/g,
    (_, key: string) => values[key] || `{${key}}`
  );
