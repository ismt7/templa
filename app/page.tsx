"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardDocumentIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  CogIcon,
} from "@heroicons/react/24/outline";
import {
  getStoredTemplates,
  normalizeTemplates,
  saveTemplatesToStorage,
} from "@/utils/localStorageUtils";
import {
  evaluatePlaceholders,
  insertPlaceholderAtSelection,
  normalizePlaceholderName,
} from "@/utils/placeholderUtils";
import {
  createTemplate,
  DEFAULT_PLACEHOLDER_DATE_FORMAT,
  PlaceholderDateFormat,
  PlaceholderInputType,
  PlaceholderSetting,
  PlaceholderValues,
  Template,
  replacePlaceholders,
} from "@/utils/templateUtils";
import SideMenu from "./components/SideMenu";
import EditTemplateModal from "./components/EditTemplateModal";
import PlaceholderSettingsModal from "./components/PlaceholderSettingsModal";

const TEMPLATE_QUERY_PARAM = "template";

const parseTemplateIndex = (value: string | null): number => {
  if (value === null) {
    return 0;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue;
};

const getTemplateIndexFromLocation = (): number => {
  if (typeof window === "undefined") {
    return 0;
  }

  return parseTemplateIndex(
    new URLSearchParams(window.location.search).get(TEMPLATE_QUERY_PARAM)
  );
};

const replaceTemplateIndexInUrl = (templateIndex: number | null): void => {
  if (typeof window === "undefined") {
    return;
  }

  const nextUrl = new URL(window.location.href);

  if (templateIndex === null) {
    nextUrl.searchParams.delete(TEMPLATE_QUERY_PARAM);
  } else {
    nextUrl.searchParams.set(TEMPLATE_QUERY_PARAM, String(templateIndex));
  }

  const currentUrl = `${window.location.pathname}${window.location.search}`;
  const nextRelativeUrl = `${nextUrl.pathname}${nextUrl.search}`;

  if (currentUrl === nextRelativeUrl) {
    return;
  }

  window.history.replaceState(window.history.state, "", nextRelativeUrl);
};

const normalizeTemplateIndex = (
  templateIndex: number,
  templateCount: number
): number => {
  if (templateCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(templateIndex, 0), templateCount - 1);
};

const copyTextToClipboard = async (text: string): Promise<void> => {
  if (typeof navigator !== "undefined") {
    const writeText = navigator.clipboard?.writeText;

    if (typeof writeText === "function") {
      await writeText.call(navigator.clipboard, text);
      return;
    }
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard API is unavailable.");
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    if (!document.execCommand("copy")) {
      throw new Error("Fallback copy command failed.");
    }
  } finally {
    document.body.removeChild(textarea);
  }
};

const getTextareaPlaceholderLabel = (index: number): string =>
  `テキストエリア ${index + 1}`;

const DATE_INPUT_VALUE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const NO_INSERTION_TARGET = "none";

interface TextSelectionRange {
  start: number;
  end: number;
}

const createPlaceholderSetting = (
  type: PlaceholderInputType,
  currentSetting?: PlaceholderSetting
): PlaceholderSetting => {
  switch (type) {
    case "multiline":
      return { type };
    case "list":
      return {
        type,
        options: currentSetting?.options ?? [],
      };
    case "date":
      return {
        type,
        dateFormat:
          currentSetting?.dateFormat ?? DEFAULT_PLACEHOLDER_DATE_FORMAT,
      };
    case "text":
    default:
      return { type };
  }
};

const getInputValueForPlaceholder = (
  value: string | undefined,
  setting?: PlaceholderSetting
): string => {
  if (setting?.type !== "date") {
    return value ?? "";
  }

  return value && DATE_INPUT_VALUE_PATTERN.test(value) ? value : "";
};

const appendPlaceholderToken = (
  content: string,
  placeholder: string
): string => {
  const token = `{${placeholder}}`;

  if (!content) {
    return token;
  }

  return /[\s\n]$/.test(content) ? `${content}${token}` : `${content} ${token}`;
};

export default function TemplateEditorPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [hasLoadedTemplates, setHasLoadedTemplates] = useState<boolean>(false);
  const [activeTemplateIndex, setActiveTemplateIndex] = useState<number>(
    getTemplateIndexFromLocation
  );
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const [copyFeedback, setCopyFeedback] = useState<{
    index: number;
    status: "success" | "error";
  } | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showEditTemplateModal, setShowEditTemplateModal] =
    useState<boolean>(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState<string | null>(
    null
  );
  const [editingTextareaIndex, setEditingTextareaIndex] = useState<number | null>(
    null
  );
  const [newPlaceholderName, setNewPlaceholderName] = useState<string>("");
  const [newPlaceholderInsertTarget, setNewPlaceholderInsertTarget] =
    useState<string>(NO_INSERTION_TARGET);
  const [newPlaceholderError, setNewPlaceholderError] = useState<string | null>(
    null
  );
  const copyFeedbackTimeoutRef = useRef<number | null>(null);
  const inlineTextareaRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const inlineTextareaSelectionsRef = useRef<Record<number, TextSelectionRange>>(
    {}
  );
  const pendingInlineSelectionRef = useRef<{
    index: number;
    selection: TextSelectionRange;
  } | null>(null);

  const activeTemplate =
    templates[activeTemplateIndex] ??
    ({
      ...createTemplate(""),
      contents: [],
    } satisfies Template);
  const activeSceneValues =
    activeTemplate.scenes[activeSceneIndex]?.values ?? {};
  const hasTemplates = templates.length > 0;

  const {
    extractedPlaceholders,
    placeholders,
    updatedSettings: placeholderSettings,
  } = useMemo(
    () =>
      evaluatePlaceholders(
        activeTemplate.contents,
        activeTemplate.manualPlaceholders,
        activeTemplate.placeholderSettings
      ),
    [
      activeTemplate.contents,
      activeTemplate.manualPlaceholders,
      activeTemplate.placeholderSettings,
    ]
  );
  const extractedPlaceholderSet = useMemo(
    () => new Set(extractedPlaceholders),
    [extractedPlaceholders]
  );
  const manualPlaceholderSet = useMemo(
    () => new Set(activeTemplate.manualPlaceholders),
    [activeTemplate.manualPlaceholders]
  );

  useEffect(() => {
    const storedTemplates = getStoredTemplates();
    const nextTemplateIndex = normalizeTemplateIndex(
      getTemplateIndexFromLocation(),
      storedTemplates.length
    );

    setTemplates(storedTemplates);
    setActiveTemplateIndex(nextTemplateIndex);
    replaceTemplateIndexInUrl(
      storedTemplates.length === 0 ? null : nextTemplateIndex
    );
    setHasLoadedTemplates(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedTemplates) {
      return;
    }

    saveTemplatesToStorage(templates);
  }, [hasLoadedTemplates, templates]);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const pendingSelection = pendingInlineSelectionRef.current;

    if (!pendingSelection) {
      return;
    }

    const textarea = inlineTextareaRefs.current[pendingSelection.index];

    if (!textarea) {
      return;
    }

    textarea.focus();
    textarea.setSelectionRange(
      pendingSelection.selection.start,
      pendingSelection.selection.end
    );
    pendingInlineSelectionRef.current = null;
  }, [activeTemplate.contents]);

  const applyTemplateSelection = useCallback(
    (
      index: number,
      templateCount: number,
      {
        resetScene = true,
        syncUrl = true,
        forceResetScene = false,
      }: {
        resetScene?: boolean;
        syncUrl?: boolean;
        forceResetScene?: boolean;
      } = {}
    ): void => {
      const nextTemplateIndex = normalizeTemplateIndex(index, templateCount);
      const hasChanged = nextTemplateIndex !== activeTemplateIndex;

      if (hasChanged) {
        setActiveTemplateIndex(nextTemplateIndex);
      }

      if (resetScene && (hasChanged || forceResetScene)) {
        setActiveSceneIndex(0);
      }

      if (syncUrl) {
        replaceTemplateIndexInUrl(
          templateCount === 0 ? null : nextTemplateIndex
        );
      }
    },
    [activeTemplateIndex]
  );

  const selectTemplate = useCallback(
    (
      index: number,
      options?: {
        resetScene?: boolean;
        syncUrl?: boolean;
      }
    ): void => {
      applyTemplateSelection(index, templates.length, options);
    },
    [applyTemplateSelection, templates.length]
  );

  useEffect(() => {
    if (!hasLoadedTemplates) {
      return;
    }

    if (templates.length === 0) {
      replaceTemplateIndexInUrl(null);
      return;
    }

    const normalizedTemplateIndex = normalizeTemplateIndex(
      activeTemplateIndex,
      templates.length
    );

    if (normalizedTemplateIndex !== activeTemplateIndex) {
      applyTemplateSelection(normalizedTemplateIndex, templates.length);
    }
  }, [
    activeTemplateIndex,
    applyTemplateSelection,
    hasLoadedTemplates,
    templates.length,
  ]);

  useEffect(() => {
    if (!hasLoadedTemplates) {
      return;
    }

    const handlePopState = (): void => {
      applyTemplateSelection(getTemplateIndexFromLocation(), templates.length, {
        syncUrl: false,
      });
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [applyTemplateSelection, hasLoadedTemplates, templates.length]);

  const updateActiveTemplate = useCallback(
    (updater: (template: Template) => Template): void => {
      setTemplates((currentTemplates) =>
        currentTemplates.map((template, index) =>
          index === activeTemplateIndex ? updater(template) : template
        )
      );
    },
    [activeTemplateIndex]
  );

  const updateActiveSceneValues = useCallback(
    (updater: (values: PlaceholderValues) => PlaceholderValues): void => {
      updateActiveTemplate((template) => ({
        ...template,
        scenes: template.scenes.map((scene, index) =>
          index === activeSceneIndex
            ? { ...scene, values: updater(scene.values) }
            : scene
        ),
      }));
    },
    [activeSceneIndex, updateActiveTemplate]
  );

  const updateActiveTemplateContent = useCallback(
    (index: number, value: string): void => {
      updateActiveTemplate((template) => ({
        ...template,
        contents: template.contents.map((content, contentIndex) =>
          contentIndex === index ? value : content
        ),
      }));
    },
    [updateActiveTemplate]
  );

  useEffect(() => {
    if (!hasTemplates || placeholderSettings === activeTemplate.placeholderSettings) {
      return;
    }

    updateActiveTemplate((template) => ({
      ...template,
      placeholderSettings,
    }));
  }, [
    activeTemplate.placeholderSettings,
    hasTemplates,
    placeholderSettings,
    updateActiveTemplate,
  ]);

  useEffect(() => {
    if (newPlaceholderInsertTarget === NO_INSERTION_TARGET) {
      return;
    }

    const targetIndex = Number.parseInt(newPlaceholderInsertTarget, 10);

    if (
      Number.isNaN(targetIndex) ||
      targetIndex < 0 ||
      targetIndex >= activeTemplate.contents.length
    ) {
      setNewPlaceholderInsertTarget(NO_INSERTION_TARGET);
    }
  }, [activeTemplate.contents.length, newPlaceholderInsertTarget]);

  const updateInlineTextareaSelection = useCallback(
    (index: number, target: HTMLTextAreaElement): void => {
      inlineTextareaSelectionsRef.current[index] = {
        start: target.selectionStart ?? target.value.length,
        end: target.selectionEnd ?? target.value.length,
      };
    },
    []
  );

  const handleTemplateChange = (
    index: number,
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    updateInlineTextareaSelection(index, e.target);
    updateActiveTemplateContent(index, e.target.value);
  };

  const handleInsertPlaceholderIntoTextarea = useCallback(
    (index: number, placeholder: string): void => {
      const currentContent = activeTemplate.contents[index] ?? "";
      const textarea = inlineTextareaRefs.current[index];
      const previousSelection = inlineTextareaSelectionsRef.current[index];
      const selectionStart =
        textarea?.selectionStart ??
        previousSelection?.start ??
        currentContent.length;
      const selectionEnd =
        textarea?.selectionEnd ?? previousSelection?.end ?? selectionStart;
      const insertionResult = insertPlaceholderAtSelection(
        currentContent,
        placeholder,
        selectionStart,
        selectionEnd
      );

      inlineTextareaSelectionsRef.current[index] = {
        start: insertionResult.selectionStart,
        end: insertionResult.selectionEnd,
      };
      pendingInlineSelectionRef.current = {
        index,
        selection: {
          start: insertionResult.selectionStart,
          end: insertionResult.selectionEnd,
        },
      };
      updateActiveTemplateContent(index, insertionResult.content);
    },
    [activeTemplate.contents, updateActiveTemplateContent]
  );

  const handleAddTextarea = () => {
    updateActiveTemplate((template) => ({
      ...template,
      contents: [...template.contents, ""],
    }));
  };

  const handleRemoveTextarea = (index: number) => {
    if (editingTextareaIndex === index) {
      closeEditTemplateModal();
    }

    delete inlineTextareaSelectionsRef.current[index];
    updateActiveTemplate((template) => ({
      ...template,
      contents: template.contents.filter((_, contentIndex) => contentIndex !== index),
    }));
  };

  const handleCopy = async (index: number) => {
    try {
      await copyTextToClipboard(
        replacePlaceholders(
          activeTemplate.contents[index],
          activeSceneValues,
          placeholderSettings
        )
      );
      setCopyFeedback({ index, status: "success" });
    } catch (error) {
      console.error("Failed to copy text.", error);
      setCopyFeedback({ index, status: "error" });
    }

    if (copyFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(copyFeedbackTimeoutRef.current);
    }

    copyFeedbackTimeoutRef.current = window.setTimeout(() => {
      setCopyFeedback(null);
      copyFeedbackTimeoutRef.current = null;
    }, 2000);
  };

  const handlePlaceholderChange = (key: string, value: string) => {
    updateActiveSceneValues((values) => ({
      ...values,
      [key]: value,
    }));
  };

  const handlePlaceholderSettingChange = (
    key: string,
    type: PlaceholderInputType
  ) => {
    updateActiveTemplate((template) => ({
      ...template,
      placeholderSettings: {
        ...template.placeholderSettings,
        [key]: createPlaceholderSetting(type, template.placeholderSettings[key]),
      },
    }));
  };

  const handleDateFormatChange = (
    key: string,
    dateFormat: PlaceholderDateFormat
  ) => {
    updateActiveTemplate((template) => ({
      ...template,
      placeholderSettings: {
        ...template.placeholderSettings,
        [key]: {
          ...createPlaceholderSetting("date", template.placeholderSettings[key]),
          dateFormat,
        },
      },
    }));
  };

  const handleAddListOption = (
    key: string,
    option: string
  ) => {
    updateActiveTemplate((template) => ({
      ...template,
      placeholderSettings: {
        ...template.placeholderSettings,
        [key]: {
          ...template.placeholderSettings[key],
          options: [...(template.placeholderSettings[key]?.options || []), option],
        },
      },
    }));
  };

  const handleRemoveListOption = (key: string, index: number) => {
    updateActiveTemplate((template) => ({
      ...template,
      placeholderSettings: {
        ...template.placeholderSettings,
        [key]: {
          ...template.placeholderSettings[key],
          options: template.placeholderSettings[key]?.options?.filter(
            (_, optionIndex) => optionIndex !== index
          ),
        },
      },
    }));
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(templates, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "templates.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const importedTemplates = normalizeTemplates(
        JSON.parse(event.target?.result as string)
      );
      setTemplates(importedTemplates);
      applyTemplateSelection(0, importedTemplates.length, {
        forceResetScene: true,
      });
    };
    reader.readAsText(file);
  };

  const handleCreatePlaceholder = () => {
    const normalizedPlaceholderName = normalizePlaceholderName(newPlaceholderName);

    if (!normalizedPlaceholderName) {
      setNewPlaceholderError("プレースホルダー名を入力してください。");
      return;
    }

    if (placeholders.includes(normalizedPlaceholderName)) {
      setNewPlaceholderError("同名のプレースホルダーは既に存在します。");
      return;
    }

    const insertionTargetIndex =
      newPlaceholderInsertTarget === NO_INSERTION_TARGET
        ? null
        : Number.parseInt(newPlaceholderInsertTarget, 10);

    updateActiveTemplate((template) => ({
      ...template,
      manualPlaceholders: [
        ...template.manualPlaceholders,
        normalizedPlaceholderName,
      ],
      placeholderSettings: {
        ...template.placeholderSettings,
        [normalizedPlaceholderName]:
          template.placeholderSettings[normalizedPlaceholderName] ??
          createPlaceholderSetting("text"),
      },
      contents:
        insertionTargetIndex === null
          ? template.contents
          : template.contents.map((content, index) =>
              index === insertionTargetIndex
                ? appendPlaceholderToken(content, normalizedPlaceholderName)
                : content
            ),
    }));
    setNewPlaceholderName("");
    setNewPlaceholderInsertTarget(NO_INSERTION_TARGET);
    setNewPlaceholderError(null);
  };

  const handleRemoveManualPlaceholder = (placeholder: string) => {
    updateActiveTemplate((template) => {
      const nextPlaceholderSettings = { ...template.placeholderSettings };
      delete nextPlaceholderSettings[placeholder];

      return {
        ...template,
        manualPlaceholders: template.manualPlaceholders.filter(
          (item) => item !== placeholder
        ),
        placeholderSettings: nextPlaceholderSettings,
        scenes: template.scenes.map((scene) => {
          const nextValues = { ...scene.values };
          delete nextValues[placeholder];

          return { ...scene, values: nextValues };
        }),
      };
    });
  };

  const openModal = (placeholder: string) => {
    setCurrentPlaceholder(placeholder);
    setShowModal(true);
  };

  const closeModal = () => {
    setCurrentPlaceholder(null);
    setShowModal(false);
  };

  const closeEditTemplateModal = () => {
    setEditingTextareaIndex(null);
    setShowEditTemplateModal(false);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const addTemplate = () => {
    const newTemplate = createTemplate(`テンプレート${templates.length + 1}`);
    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    applyTemplateSelection(updatedTemplates.length - 1, updatedTemplates.length);
  };

  const handleDeleteTemplate = (index: number) => {
    const updatedTemplates = templates.filter((_, i) => i !== index);
    setTemplates(updatedTemplates);

    const nextTemplateIndex =
      activeTemplateIndex > index ? activeTemplateIndex - 1 : activeTemplateIndex;

    if (updatedTemplates.length === 0) {
      applyTemplateSelection(0, 0);
      setCurrentPlaceholder(null);
      setEditingTextareaIndex(null);
      setShowModal(false);
      setShowEditTemplateModal(false);
      return;
    }

    applyTemplateSelection(nextTemplateIndex, updatedTemplates.length, {
      forceResetScene: activeTemplateIndex === index,
    });
  };

  const handleEditTemplateClick = (index: number) => {
    setEditingTextareaIndex(index);
    setShowEditTemplateModal(true);
  };

  return (
    <div className="flex h-screen">
      <SideMenu
        templates={templates}
        activeTemplateIndex={activeTemplateIndex}
        onSelectTemplate={selectTemplate}
        handleExport={handleExport}
        handleImport={handleImport}
        addTemplate={addTemplate}
        handleDeleteTemplate={handleDeleteTemplate}
      />

      {/* メインコンテンツ */}
      <div className="flex-1 p-8 overflow-y-auto">
        {hasTemplates ? (
          <>
            <h1 className="heading-1">テンプレート編集</h1>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                テンプレート名
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  className="input-text"
                  value={activeTemplate.name}
                  onChange={(e) =>
                    updateActiveTemplate((template) => ({
                      ...template,
                      name: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {activeTemplate.contents.map((content, index) => (
              <div key={index} className="mb-2 relative">
                <textarea
                  ref={(element) => {
                    inlineTextareaRefs.current[index] = element;
                  }}
                  className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  placeholder={`テキストエリア ${index + 1}`}
                  value={content}
                  onSelect={(e) =>
                    updateInlineTextareaSelection(index, e.currentTarget)
                  }
                  onClick={(e) =>
                    updateInlineTextareaSelection(index, e.currentTarget)
                  }
                  onKeyUp={(e) =>
                    updateInlineTextareaSelection(index, e.currentTarget)
                  }
                  onChange={(e) => handleTemplateChange(index, e)}
                />
                <div className="absolute top-2 right-2 flex space-x-2">
                  <button
                    className="button-action"
                    onClick={() => handleEditTemplateClick(index)}
                    aria-label={`テキストエリア ${index + 1} をモーダルで編集`}
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                  </button>
                  <button
                    className="button-action button-action-copy"
                    onClick={() => {
                      void handleCopy(index);
                    }}
                  >
                    <ClipboardDocumentIcon className="w-5 h-5" />
                  </button>
                  <button
                    className="button-action button-action-remove"
                    onClick={() => handleRemoveTextarea(index)}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
                {copyFeedback?.index === index && (
                  <div
                    className={`absolute top-12 right-2 px-3 py-2 text-white text-sm rounded-lg shadow-lg ${
                      copyFeedback.status === "success"
                        ? "bg-gray-800"
                        : "bg-red-600"
                    }`}
                  >
                    {copyFeedback.status === "success"
                      ? "コピーしました！"
                      : "コピーに失敗しました"}
                    </div>
                )}
                <div className="mt-2 flex items-center gap-3">
                  <label
                    htmlFor={`placeholder-insert-${index}`}
                    className="shrink-0 text-sm font-medium text-gray-700"
                  >
                    プレースホルダーを挿入
                  </label>
                  <select
                    id={`placeholder-insert-${index}`}
                    className="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue=""
                    onChange={(e) => {
                      const nextPlaceholder = e.target.value;

                      if (!nextPlaceholder) {
                        return;
                      }

                      handleInsertPlaceholderIntoTextarea(index, nextPlaceholder);
                      e.target.value = "";
                    }}
                    disabled={placeholders.length === 0}
                  >
                    <option value="">
                      {placeholders.length > 0
                        ? "選択してください"
                        : "挿入できるプレースホルダーがありません"}
                    </option>
                    {placeholders.map((placeholder) => (
                      <option key={placeholder} value={placeholder}>
                        {placeholder}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}

            <button className="button-action-add" onClick={handleAddTextarea}>
              <PlusIcon className="w-5 h-5 mr-2" />
              テキストエリア追加
            </button>

            <div className="mt-8">
              <h2 className="heading-2">プレースホルダの値を入力</h2>
              <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      プレースホルダー名
                    </label>
                    <input
                      type="text"
                      className="input-text"
                      placeholder="例: 顧客名 / {顧客名}"
                      value={newPlaceholderName}
                      onChange={(e) => {
                        setNewPlaceholderName(e.target.value);
                        setNewPlaceholderError(null);
                      }}
                    />
                  </div>
                  <div className="w-full lg:w-72">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      本文へ挿入
                    </label>
                    <select
                      className="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newPlaceholderInsertTarget}
                      onChange={(e) => setNewPlaceholderInsertTarget(e.target.value)}
                    >
                      <option value={NO_INSERTION_TARGET}>挿入しない</option>
                      {activeTemplate.contents.map((_, index) => (
                        <option key={index} value={String(index)}>
                          {getTextareaPlaceholderLabel(index)} に挿入
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="button-action-add whitespace-nowrap"
                    onClick={handleCreatePlaceholder}
                  >
                    <PlusIcon className="mr-2 h-5 w-5" />
                    プレースホルダー追加
                  </button>
                </div>
                {newPlaceholderError && (
                  <p className="mt-3 text-sm text-red-600">{newPlaceholderError}</p>
                )}
                <p className="mt-3 text-sm text-gray-500">
                  本文にまだ書いていないプレースホルダーも先に作成して設定できます。
                </p>
              </div>
              {placeholders.length > 0 ? (
                <table className="w-full border-collapse border border-gray-300 bg-white shadow-md rounded-lg">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 bg-gray-100 text-left text-gray-700">
                        プレースホルダ
                      </th>
                      <th className="border border-gray-300 px-4 py-2 bg-gray-100 text-left text-gray-700">
                        値
                      </th>
                      <th className="border border-gray-300 px-4 py-2 bg-gray-100 text-center text-gray-700">
                        設定
                      </th>
                      <th className="border border-gray-300 px-4 py-2 bg-gray-100 text-center text-gray-700">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {placeholders.map((placeholder, index) => (
                      <tr key={index}>
                        <td className="border border-gray-300 px-4 py-2 text-gray-800">
                          <div className="flex items-center gap-2">
                            <span>{placeholder}</span>
                            {manualPlaceholderSet.has(placeholder) && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                                手動
                              </span>
                            )}
                            {extractedPlaceholderSet.has(placeholder) && (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                本文内
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {placeholderSettings[placeholder]?.type === "list" ? (
                            <select
                              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={activeSceneValues[placeholder] || ""}
                              onChange={(e) =>
                                handlePlaceholderChange(
                                  placeholder,
                                  e.target.value
                                )
                              }
                            >
                              <option value="">選択してください</option>
                              {placeholderSettings[placeholder]?.options?.map(
                                (option, idx) => (
                                  <option key={idx} value={option}>
                                    {option}
                                  </option>
                                )
                              )}
                            </select>
                          ) : placeholderSettings[placeholder]?.type ===
                            "multiline" ? (
                            <textarea
                              className="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows={4}
                              value={getInputValueForPlaceholder(
                                activeSceneValues[placeholder],
                                placeholderSettings[placeholder]
                              )}
                              onChange={(e) =>
                                handlePlaceholderChange(
                                  placeholder,
                                  e.target.value
                                )
                              }
                            />
                          ) : (
                            <input
                              type={
                                placeholderSettings[placeholder]?.type === "date"
                                  ? "date"
                                  : "text"
                              }
                              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={getInputValueForPlaceholder(
                                activeSceneValues[placeholder],
                                placeholderSettings[placeholder]
                              )}
                              onChange={(e) =>
                                handlePlaceholderChange(
                                  placeholder,
                                  e.target.value
                                )
                              }
                            />
                          )}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          <button
                            className="px-2 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 flex items-center justify-center"
                            onClick={() => openModal(placeholder)}
                          >
                            <CogIcon className="w-5 h-5" />
                          </button>
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          {manualPlaceholderSet.has(placeholder) &&
                          !extractedPlaceholderSet.has(placeholder) ? (
                            <button
                              className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center justify-center"
                              onClick={() => handleRemoveManualPlaceholder(placeholder)}
                              aria-label={`${placeholder} を削除`}
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500 mt-4">
                  プレースホルダはありません。
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="w-full max-w-xl rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center shadow-sm">
              <h1 className="heading-1 mb-4">テンプレートがありません</h1>
              <p className="text-gray-600">
                左メニューの「テンプレート追加」から新規作成するか、
                JSON をインポートしてください。
              </p>
              <button className="button-action-add mt-6 inline-flex" onClick={addTemplate}>
                <PlusIcon className="w-5 h-5 mr-2" />
                テンプレート追加
              </button>
            </div>
          </div>
        )}
      </div>

      {/* モーダル */}
      {hasTemplates && showModal && currentPlaceholder && (
        <PlaceholderSettingsModal
          key={currentPlaceholder}
          placeholder={currentPlaceholder}
          settings={placeholderSettings[currentPlaceholder]}
          onTypeChange={(type) =>
            handlePlaceholderSettingChange(currentPlaceholder, type)
          }
          onDateFormatChange={(format) =>
            handleDateFormatChange(currentPlaceholder, format)
          }
          onAddOption={(option) => handleAddListOption(currentPlaceholder, option)}
          onRemoveOption={(index) =>
            handleRemoveListOption(currentPlaceholder, index)
          }
          onClose={closeModal}
        />
      )}

      {/* 編集用モーダル */}
      {hasTemplates &&
        showEditTemplateModal &&
        editingTextareaIndex !== null &&
        activeTemplate.contents[editingTextareaIndex] !== undefined && (
        <EditTemplateModal
          title={getTextareaPlaceholderLabel(editingTextareaIndex)}
          value={activeTemplate.contents[editingTextareaIndex]}
          placeholders={placeholders}
          onChange={(value) =>
            updateActiveTemplateContent(editingTextareaIndex, value)
          }
          onClose={closeEditTemplateModal}
          onClear={() => updateActiveTemplateContent(editingTextareaIndex, "")}
        />
      )}
    </div>
  );
}
