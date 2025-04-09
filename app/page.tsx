"use client";

import { useState, useEffect } from "react";
import {
  ClipboardDocumentIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CogIcon,
} from "@heroicons/react/24/outline";
import {
  getStoredTemplates,
  saveTemplatesToStorage,
} from "../utils/localStorageUtils";
import { evaluatePlaceholders } from "../utils/placeholderUtils";
import SideMenu from "./components/SideMenu";
import EditTemplateModal from "./components/EditTemplateModal";

interface PlaceholderValues {
  [key: string]: string;
}

export interface PlaceholderSettings {
  [key: string]: {
    type: "text" | "list";
    options?: string[];
  };
}

export interface Template {
  name: string;
  contents: string[];
  scenes: { name: string; values: PlaceholderValues }[];
}

export default function TemplateEditorPage() {
  const [templates, setTemplates] = useState<Template[]>([]); // 初期状態を空配列に設定
  const [activeTemplateIndex, setActiveTemplateIndex] = useState<number>(0);
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [placeholderSettings, setPlaceholderSettings] =
    useState<PlaceholderSettings>({});
  const [showTooltip, setShowTooltip] = useState<number | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showEditTemplateModal, setShowEditTemplateModal] =
    useState<boolean>(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState<string | null>(
    null
  );

  const activeTemplate = templates[activeTemplateIndex] || {
    name: "",
    contents: [],
    scenes: [],
  };

  useEffect(() => {
    const storedTemplates = getStoredTemplates();
    setTemplates(storedTemplates);
  }, []);

  useEffect(() => {
    saveTemplatesToStorage(templates);
  }, [templates]);

  const evaluatePlaceholdersWrapper = () => {
    const { placeholders, updatedSettings } = evaluatePlaceholders(
      activeTemplate.contents,
      placeholderSettings
    );
    setPlaceholders(placeholders);
    setPlaceholderSettings(updatedSettings);
  };

  const handleTemplateChange = (
    index: number,
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    const updatedTemplates = [...templates];
    updatedTemplates[activeTemplateIndex].contents[index] = value;
    setTemplates(updatedTemplates);
    evaluatePlaceholdersWrapper();
  };

  const handleAddTextarea = () => {
    const updatedTemplates = [...templates];
    updatedTemplates[activeTemplateIndex].contents.push("");
    setTemplates(updatedTemplates);
    evaluatePlaceholdersWrapper();
  };

  const handleRemoveTextarea = (index: number) => {
    const updatedTemplates = [...templates];
    updatedTemplates[activeTemplateIndex].contents.splice(index, 1);
    setTemplates(updatedTemplates);
    evaluatePlaceholdersWrapper();
  };

  const handleCopy = (index: number) => {
    navigator.clipboard.writeText(
      activeTemplate.contents[index].replace(
        /{(.*?)}/g,
        (_, key) =>
          activeTemplate.scenes[activeSceneIndex].values[key] || `{${key}}`
      )
    );
    setShowTooltip(index);
    setTimeout(() => setShowTooltip(null), 2000);
  };

  const handlePlaceholderChange = (key: string, value: string) => {
    const updatedTemplates = [...templates];
    updatedTemplates[activeTemplateIndex].scenes[activeSceneIndex].values[key] =
      value;
    updatedTemplates[activeTemplateIndex].contents = updatedTemplates[
      activeTemplateIndex
    ].contents.map((content, index) =>
      `テキストエリア ${index + 1}` === key ? value : content
    );
    setTemplates(updatedTemplates);
  };

  const handlePlaceholderSettingChange = (
    key: string,
    type: "text" | "list"
  ) => {
    setPlaceholderSettings((prev) => ({
      ...prev,
      [key]: { type, options: type === "list" ? [] : undefined },
    }));
  };

  const handleAddListOption = (
    key: string,
    option: string,
    clearInput: () => void
  ) => {
    setPlaceholderSettings((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        options: [...(prev[key].options || []), option],
      },
    }));
    clearInput(); // 入力フォームの値をクリア
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
      localStorage.setItem("templates", JSON.stringify(importedTemplates));
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
    setTimeout(() => {
      const textarea = document.getElementById("edit-modal-textarea");
      if (textarea) {
        textarea.focus();
      }
    }, 0);
  };

  // モーダルを閉じた際にテキストエリアのフォーカスを外す
  const closeEditTemplateModal = () => {
    setCurrentPlaceholder(null);
    setShowEditTemplateModal(false);
    document.activeElement instanceof HTMLElement &&
      document.activeElement.blur();
  };

  const addTemplate = () => {
    setTemplates([
      ...templates,
      {
        name: `テンプレート${templates.length + 1}`,
        contents: [""],
        scenes: [{ name: "デフォルト", values: {} }],
      },
    ]);
    setActiveTemplateIndex(templates.length);
    setActiveSceneIndex(0);
    setPlaceholders([]);
  };

  const handleDeleteTemplate = (index: number) => {
    const updatedTemplates = templates.filter((_, i) => i !== index);
    setTemplates(updatedTemplates);
    if (activeTemplateIndex === index) {
      setActiveTemplateIndex(0);
      setActiveSceneIndex(0);
    } else if (activeTemplateIndex > index) {
      setActiveTemplateIndex(activeTemplateIndex - 1);
    }
  };

  // モーダルとテキストエリアの値を連動させる
  const handleTextareaFocus = (index: number) => {
    const placeholder = `テキストエリア ${index + 1}`;
    setCurrentPlaceholder(placeholder);
    const value = activeTemplate.contents[index];
    handlePlaceholderChange(placeholder, value);
    openEditTemplateModal(placeholder);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeEditTemplateModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // モーダル内に入力内容をクリアするボタンを追加
  const clearModalInput = () => {
    if (currentPlaceholder) {
      handlePlaceholderChange(currentPlaceholder, "");
      evaluatePlaceholdersWrapper();
    }
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
              onChange={(e) => {
                const value = e.target.value;
                const updatedTemplates = [...templates];
                updatedTemplates[activeTemplateIndex].name = value;
                setTemplates(updatedTemplates);
              }}
            />
          </div>
        </div>

        {activeTemplate.contents.map((content, index) => (
          <div key={index} className="mb-2 relative">
            <textarea
              className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              placeholder={`テキストエリア ${index + 1}`}
              value={content}
              onFocus={() => handleTextareaFocus(index)}
              onChange={(e) => handleTemplateChange(index, e)}
            />
            <div className="absolute top-2 right-2 flex space-x-2">
              <button
                className="button-action button-action-copy"
                onClick={() => handleCopy(index)}
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
            {showTooltip === index && (
              <div className="absolute top-12 right-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg">
                コピーしました！
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
                          value={
                            activeTemplate.scenes[activeSceneIndex].values[
                              placeholder
                            ] || ""
                          }
                          onChange={(e) =>
                            handlePlaceholderChange(placeholder, e.target.value)
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
                          value={
                            activeTemplate.scenes[activeSceneIndex].values[
                              placeholder
                            ] || ""
                          }
                          onChange={(e) =>
                            handlePlaceholderChange(placeholder, e.target.value)
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
            <p className="text-gray-500 mt-4">プレースホルダはありません。</p>
          )}
        </div>
      </div>

      {/* モーダル */}
      {showModal && currentPlaceholder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {currentPlaceholder}の設定
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                入力タイプ
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="input-type"
                    value="text"
                    checked={
                      placeholderSettings[currentPlaceholder]?.type === "text"
                    }
                    onChange={() =>
                      handlePlaceholderSettingChange(currentPlaceholder, "text")
                    }
                  />
                  <span>フリーテキスト</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="input-type"
                    value="list"
                    checked={
                      placeholderSettings[currentPlaceholder]?.type === "list"
                    }
                    onChange={() =>
                      handlePlaceholderSettingChange(currentPlaceholder, "list")
                    }
                  />
                  <span>リスト選択</span>
                </label>
              </div>
            </div>
            {placeholderSettings[currentPlaceholder]?.type === "list" && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  リストオプション
                </h4>
                <div className="space-y-2">
                  {placeholderSettings[currentPlaceholder]?.options?.map(
                    (option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <span className="flex-1 p-2 bg-gray-100 border border-gray-300 rounded-md">
                          {option}
                        </span>
                        <button
                          className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                          onClick={() =>
                            handleRemoveListOption(currentPlaceholder, index)
                          }
                        >
                          削除
                        </button>
                      </div>
                    )
                  )}
                </div>
                <div className="flex items-center space-x-2 mt-4">
                  <input
                    type="text"
                    className="flex-1 p-2 border border-gray-300 rounded-md"
                    placeholder="オプションを追加"
                    ref={(input) => {
                      if (input) input.value = ""; // 初期化
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.currentTarget.value) {
                        handleAddListOption(
                          currentPlaceholder,
                          e.currentTarget.value,
                          () => (e.currentTarget.value = "")
                        );
                      }
                    }}
                  />
                  <button
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    onClick={(e) => {
                      const input = e.currentTarget
                        .previousSibling as HTMLInputElement;
                      if (input && input.value) {
                        handleAddListOption(
                          currentPlaceholder,
                          input.value,
                          () => (input.value = "")
                        );
                      }
                    }}
                  >
                    追加
                  </button>
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-end space-x-2">
              <button
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                onClick={closeModal}
              >
                キャンセル
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                onClick={closeModal}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 編集用モーダル */}
      {showEditTemplateModal && currentPlaceholder && (
        <EditTemplateModal
          placeholder={currentPlaceholder}
          value={
            activeTemplate.scenes[activeSceneIndex].values[
              currentPlaceholder
            ] || ""
          }
          onChange={(value) => {
            handlePlaceholderChange(currentPlaceholder, value);
            evaluatePlaceholdersWrapper();
          }}
          onClose={closeEditTemplateModal}
          onClear={() => {
            handlePlaceholderChange(currentPlaceholder, "");
            evaluatePlaceholdersWrapper();
          }}
        />
      )}
    </div>
  );
}
