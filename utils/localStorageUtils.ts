import { Template } from "@/app/page";

export const getStoredTemplates = (): Template[] => {
  if (typeof window === "undefined") {
    return [
      {
        name: "デフォルト",
        contents: [""],
        scenes: [{ name: "デフォルト", values: {} }],
      },
    ];
  }

  const storedTemplates = localStorage.getItem("templates");
  return storedTemplates
    ? JSON.parse(storedTemplates)
    : [
        {
          name: "デフォルト",
          contents: [""],
          scenes: [{ name: "デフォルト", values: {} }],
        },
      ];
};

export const saveTemplatesToStorage = (templates: Template[]): void => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem("templates", JSON.stringify(templates));
};
