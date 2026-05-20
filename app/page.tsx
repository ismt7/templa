"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardDocumentIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  CogIcon,
} from "@heroicons/react/24/outline";
import {
  getStoredTemplates,
  saveTemplatesToStorage,
} from "@/utils/localStorageUtils";
import {
  ensurePlaceholderSettings,
  extractPlaceholders,
} from "@/utils/placeholderUtils";
import {
  createTemplate,
  PlaceholderInputType,
  PlaceholderSettings,
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

export default function TemplateEditorPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [hasLoadedTemplates, setHasLoadedTemplates] = useState<boolean>(false);
  const [activeTemplateIndex, setActiveTemplateIndex] = useState<number>(
    getTemplateIndexFromLocation
  );
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const [placeholderSettings, setPlaceholderSettings] =
    useState<PlaceholderSettings>({});
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
  const copyFeedbackTimeoutRef = useRef<number | null>(null);

  const activeTemplate =
    templates[activeTemplateIndex] ??
    ({
      ...createTemplate(""),
      contents: [],
    } satisfies Template);
  const activeSceneValues =
    activeTemplate.scenes[activeSceneIndex]?.values ?? {};
  const hasTemplates = templates.length > 0;

  const placeholders = useMemo(
    () => extractPlaceholders(activeTemplate.contents),
    [activeTemplate.contents]
  );

  useEffect(() => {
    setTemplates(getStoredTemplates());
    setActiveTemplateIndex(getTemplateIndexFromLocation());
    setHasLoadedTemplates(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedTemplates) {
      return;
    }

    saveTemplatesToStorage(templates);
  }, [hasLoadedTemplates, templates]);

  useEffect(() => {
    setPlaceholderSettings((currentSettings) =>
      ensurePlaceholderSettings(placeholders, currentSettings)
    );
  }, [placeholders]);

  useEffect(() => {
    if (!hasLoadedTemplates) {
      return;
    }

    const requestedTemplateIndex = getTemplateIndexFromLocation();
    const nextTemplateIndex =
      templates.length === 0
        ? 0
        : Math.min(requestedTemplateIndex, templates.length - 1);

    if (nextTemplateIndex !== activeTemplateIndex) {
      setActiveTemplateIndex(nextTemplateIndex);
      setActiveSceneIndex(0);
    }
  }, [activeTemplateIndex, hasLoadedTemplates, templates.length]);

  useEffect(() => {
    if (!hasLoadedTemplates) {
      return;
    }

    const normalizedTemplateIndex =
      templates.length === 0
        ? 0
        : Math.min(activeTemplateIndex, templates.length - 1);
    replaceTemplateIndexInUrl(
      templates.length === 0 ? null : normalizedTemplateIndex
    );
  }, [activeTemplateIndex, hasLoadedTemplates, templates.length]);

  useEffect(() => {
    if (!hasLoadedTemplates || templates.length === 0) {
      return;
    }

    const normalizedTemplateIndex = Math.min(
      activeTemplateIndex,
      templates.length - 1
    );

    if (normalizedTemplateIndex !== activeTemplateIndex) {
      setActiveTemplateIndex(normalizedTemplateIndex);
      setActiveSceneIndex(0);
    }
  }, [activeTemplateIndex, hasLoadedTemplates, templates.length]);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const updateActiveTemplate = (
    updater: (template: Template) => Template
  ): void => {
    setTemplates((currentTemplates) =>
      currentTemplates.map((template, index) =>
        index === activeTemplateIndex ? updater(template) : template
      )
    );
  };

  const updateActiveSceneValues = (
    updater: (values: PlaceholderValues) => PlaceholderValues
  ): void => {
    updateActiveTemplate((template) => ({
      ...template,
      scenes: template.scenes.map((scene, index) =>
        index === activeSceneIndex
          ? { ...scene, values: updater(scene.values) }
          : scene
      ),
    }));
  };

  const handleTemplateChange = (
    index: number,
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    updateActiveTemplate((template) => ({
      ...template,
      contents: template.contents.map((content, contentIndex) =>
        contentIndex === index ? value : content
      ),
    }));
  };

  const handleAddTextarea = () => {
    updateActiveTemplate((template) => ({
      ...template,
      contents: [...template.contents, ""],
    }));
  };

  const handleRemoveTextarea = (index: number) => {
    updateActiveTemplate((template) => ({
      ...template,
      contents: template.contents.filter((_, contentIndex) => contentIndex !== index),
    }));
  };

  const handleCopy = async (index: number) => {
    try {
      await copyTextToClipboard(
        replacePlaceholders(activeTemplate.contents[index], activeSceneValues)
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
    updateActiveTemplate((template) => ({
      ...template,
      contents: template.contents.map((content, index) =>
        getTextareaPlaceholderLabel(index) === key ? value : content
      ),
    }));
  };

  const handlePlaceholderSettingChange = (
    key: string,
    type: PlaceholderInputType
  ) => {
    setPlaceholderSettings((prev) => ({
      ...prev,
      [key]: { type, options: type === "list" ? [] : undefined },
    }));
  };

  const handleAddListOption = (
    key: string,
    option: string
  ) => {
    setPlaceholderSettings((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        options: [...(prev[key].options || []), option],
      },
    }));
  };

  const handleRemoveListOption = (key: string, index: number) => {
    setPlaceholderSettings((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        options: prev[key].options?.filter((_, i) => i !== index),
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
      const importedTemplates = JSON.parse(event.target?.result as string);
      setTemplates(importedTemplates);
      setActiveTemplateIndex(0);
      setActiveSceneIndex(0);
    };
    reader.readAsText(file);
  };

  const openModal = (placeholder: string) => {
    setCurrentPlaceholder(placeholder);
    setShowModal(true);
  };

  const closeModal = () => {
    setCurrentPlaceholder(null);
    setShowModal(false);
  };

  const openEditTemplateModal = (placeholder: string) => {
    setCurrentPlaceholder(placeholder);
    setShowEditTemplateModal(true);
  };

  const closeEditTemplateModal = () => {
    setCurrentPlaceholder(null);
    setShowEditTemplateModal(false);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const addTemplate = () => {
    const newTemplate = createTemplate(`テンプレート${templates.length + 1}`);
    setTemplates((currentTemplates) => [...currentTemplates, newTemplate]);
    setActiveTemplateIndex(templates.length);
    setActiveSceneIndex(0);
  };

  const handleDeleteTemplate = (index: number) => {
    const updatedTemplates = templates.filter((_, i) => i !== index);
    setTemplates(updatedTemplates);
    if (updatedTemplates.length === 0) {
      setCurrentPlaceholder(null);
      setShowModal(false);
      setShowEditTemplateModal(false);
    }
    if (activeTemplateIndex === index) {
      setActiveTemplateIndex(0);
      setActiveSceneIndex(0);
    } else if (activeTemplateIndex > index) {
      setActiveTemplateIndex(activeTemplateIndex - 1);
    }
  };

  const handleEditTemplateClick = (index: number) => {
    const placeholder = getTextareaPlaceholderLabel(index);
    setCurrentPlaceholder(placeholder);
    const value = activeTemplate.contents[index];
    handlePlaceholderChange(placeholder, value);
    openEditTemplateModal(placeholder);
  };

  return (
    <div className="flex h-screen">
      <SideMenu
        templates={templates}
        activeTemplateIndex={activeTemplateIndex}
        setActiveTemplateIndex={setActiveTemplateIndex}
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
                  className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  placeholder={`テキストエリア ${index + 1}`}
                  value={content}
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
              </div>
            ))}

            <button className="button-action-add" onClick={handleAddTextarea}>
              <PlusIcon className="w-5 h-5 mr-2" />
              テキストエリア追加
            </button>

            <div className="mt-8">
              <h2 className="heading-2">プレースホルダの値を入力</h2>
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
                    </tr>
                  </thead>
                  <tbody>
                    {placeholders.map((placeholder, index) => (
                      <tr key={index}>
                        <td className="border border-gray-300 px-4 py-2 text-gray-800">
                          {placeholder}
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
                          ) : (
                            <input
                              type="text"
                              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={activeSceneValues[placeholder] || ""}
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
          onAddOption={(option) => handleAddListOption(currentPlaceholder, option)}
          onRemoveOption={(index) =>
            handleRemoveListOption(currentPlaceholder, index)
          }
          onClose={closeModal}
        />
      )}

      {/* 編集用モーダル */}
      {hasTemplates && showEditTemplateModal && currentPlaceholder && (
        <EditTemplateModal
          placeholder={currentPlaceholder}
          value={activeSceneValues[currentPlaceholder] || ""}
          onChange={(value) => {
            handlePlaceholderChange(currentPlaceholder, value);
          }}
          onClose={closeEditTemplateModal}
          onClear={() => {
            handlePlaceholderChange(currentPlaceholder, "");
          }}
        />
      )}
    </div>
  );
}
