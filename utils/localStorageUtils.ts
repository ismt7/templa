import {
  createTemplate,
  PlaceholderInputType,
  PlaceholderSetting,
  PlaceholderSettings,
  PlaceholderValues,
  Template,
  TemplateScene,
} from "@/utils/templateUtils";
import {
  evaluatePlaceholders,
  normalizePlaceholderName,
} from "@/utils/placeholderUtils";

const getDefaultTemplates = (): Template[] => [createTemplate()];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isPlaceholderInputType = (
  value: unknown
): value is PlaceholderInputType =>
  value === "text" ||
  value === "multiline" ||
  value === "list" ||
  value === "date";

const normalizePlaceholderSetting = (
  value: unknown
): PlaceholderSetting | null => {
  if (!isRecord(value) || !isPlaceholderInputType(value.type)) {
    return null;
  }

  if (value.type === "list") {
    return {
      type: value.type,
      options: Array.isArray(value.options)
        ? value.options.filter(
            (option): option is string => typeof option === "string"
          )
        : [],
    };
  }

  if (value.type === "date") {
    return {
      type: value.type,
      dateFormat:
        typeof value.dateFormat === "string" ? value.dateFormat : undefined,
    };
  }

  return { type: value.type };
};

const normalizePlaceholderSettings = (value: unknown): PlaceholderSettings => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<PlaceholderSettings>(
    (settings, [key, setting]) => {
      const normalizedKey = normalizePlaceholderName(key);
      const normalizedSetting = normalizePlaceholderSetting(setting);

      if (!normalizedKey || !normalizedSetting) {
        return settings;
      }

      settings[normalizedKey] = normalizedSetting;
      return settings;
    },
    {}
  );
};

const normalizePlaceholderValues = (value: unknown): PlaceholderValues => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<PlaceholderValues>((values, [key, item]) => {
    if (typeof item === "string") {
      values[key] = item;
    }

    return values;
  }, {});
};

const normalizeScene = (value: unknown): TemplateScene | null => {
  if (!isRecord(value)) {
    return null;
  }

  return {
    name: typeof value.name === "string" ? value.name : "デフォルト",
    values: normalizePlaceholderValues(value.values),
  };
};

const normalizeManualPlaceholders = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map(normalizePlaceholderName)
        .filter(Boolean)
    )
  );
};

const normalizeTemplate = (value: unknown, index: number): Template => {
  const fallbackTemplate = createTemplate(`テンプレート${index + 1}`);

  if (!isRecord(value)) {
    return fallbackTemplate;
  }

  const contents =
    Array.isArray(value.contents) && value.contents.length > 0
      ? value.contents.filter(
          (content): content is string => typeof content === "string"
        )
      : fallbackTemplate.contents;
  const scenes =
    Array.isArray(value.scenes) && value.scenes.length > 0
      ? value.scenes
          .map(normalizeScene)
          .filter((scene): scene is TemplateScene => scene !== null)
      : fallbackTemplate.scenes;
  const manualPlaceholders = normalizeManualPlaceholders(
    "manualPlaceholders" in value ? value.manualPlaceholders : value.placeholders
  );
  const { updatedSettings } = evaluatePlaceholders(
    contents,
    manualPlaceholders,
    normalizePlaceholderSettings(value.placeholderSettings)
  );

  return {
    name: typeof value.name === "string" ? value.name : fallbackTemplate.name,
    contents: contents.length > 0 ? contents : fallbackTemplate.contents,
    scenes: scenes.length > 0 ? scenes : fallbackTemplate.scenes,
    manualPlaceholders,
    placeholderSettings: updatedSettings,
  };
};

export const normalizeTemplates = (value: unknown): Template[] =>
  Array.isArray(value)
    ? value.map((template, index) => normalizeTemplate(template, index))
    : [];

export const getStoredTemplates = (): Template[] => {
  if (typeof window === "undefined") {
    return getDefaultTemplates();
  }

  const storedTemplates = localStorage.getItem("templates");
  return storedTemplates
    ? normalizeTemplates(JSON.parse(storedTemplates))
    : getDefaultTemplates();
};

export const saveTemplatesToStorage = (templates: Template[]): void => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem("templates", JSON.stringify(templates));
};
