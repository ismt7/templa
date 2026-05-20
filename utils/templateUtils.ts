export type PlaceholderValues = Record<string, string>;

export type PlaceholderInputType = "text" | "list" | "date";

export type PlaceholderDateFormat = string;

export const DEFAULT_PLACEHOLDER_DATE_FORMAT: PlaceholderDateFormat =
  "YYYY-MM-DD";

export interface PlaceholderSetting {
  type: PlaceholderInputType;
  options?: string[];
  dateFormat?: PlaceholderDateFormat;
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
  manualPlaceholders: string[];
  placeholderSettings: PlaceholderSettings;
}

const DEFAULT_SCENE_NAME = "デフォルト";

export const createTemplate = (name = "デフォルト"): Template => ({
  name,
  contents: [""],
  scenes: [{ name: DEFAULT_SCENE_NAME, values: {} }],
  manualPlaceholders: [],
  placeholderSettings: {},
});

const DATE_INPUT_VALUE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_FORMAT_TOKEN_PATTERN = /YYYY|YY|MM|DD|M|D/g;

const formatDateValue = (
  value: string,
  format: PlaceholderDateFormat
): string => {
  const matchedDate = value.match(DATE_INPUT_VALUE_PATTERN);

  if (!matchedDate) {
    return value;
  }

  const [, year, month, day] = matchedDate;
  const shortYear = year.slice(-2);
  const unpaddedMonth = String(Number(month));
  const unpaddedDay = String(Number(day));

  return format.replace(
    DATE_FORMAT_TOKEN_PATTERN,
    (token: string): string => {
      switch (token) {
        case "YYYY":
          return year;
        case "YY":
          return shortYear;
        case "MM":
          return month;
        case "M":
          return unpaddedMonth;
        case "DD":
          return day;
        case "D":
          return unpaddedDay;
        default:
          return token;
      }
    }
  );
};

export const formatPlaceholderValue = (
  value: string,
  setting?: PlaceholderSetting
): string => {
  if (!setting || setting.type !== "date") {
    return value;
  }

  return formatDateValue(
    value,
    setting.dateFormat?.trim() || DEFAULT_PLACEHOLDER_DATE_FORMAT
  );
};

export const replacePlaceholders = (
  content: string,
  values: PlaceholderValues,
  settings: PlaceholderSettings = {}
): string =>
  content.replace(
    /{(.*?)}/g,
    (_, key: string) => {
      const resolvedValue = values[key];

      if (!resolvedValue) {
        return `{${key}}`;
      }

      return formatPlaceholderValue(resolvedValue, settings[key]);
    }
  );
