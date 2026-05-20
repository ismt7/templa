import { createTemplate, Template } from "@/utils/templateUtils";

const getDefaultTemplates = (): Template[] => [createTemplate()];

export const getStoredTemplates = (): Template[] => {
  if (typeof window === "undefined") {
    return getDefaultTemplates();
  }

  const storedTemplates = localStorage.getItem("templates");
  return storedTemplates ? JSON.parse(storedTemplates) : getDefaultTemplates();
};

export const saveTemplatesToStorage = (templates: Template[]): void => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem("templates", JSON.stringify(templates));
};
