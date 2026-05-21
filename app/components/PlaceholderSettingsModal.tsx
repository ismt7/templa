"use client";

import { useState } from "react";
import {
  DEFAULT_PLACEHOLDER_DATE_FORMAT,
  PlaceholderDateFormat,
  PlaceholderInputType,
  PlaceholderSetting,
} from "@/utils/templateUtils";

interface PlaceholderSettingsModalProps {
  placeholder: string;
  settings?: PlaceholderSetting;
  onTypeChange: (type: PlaceholderInputType) => void;
  onDateFormatChange: (format: PlaceholderDateFormat) => void;
  onAddOption: (option: string) => void;
  onRemoveOption: (index: number) => void;
  onClose: () => void;
}

export default function PlaceholderSettingsModal({
  placeholder,
  settings,
  onTypeChange,
  onDateFormatChange,
  onAddOption,
  onRemoveOption,
  onClose,
}: PlaceholderSettingsModalProps) {
  const [newOption, setNewOption] = useState("");
  const dateFormatExamples = [
    "YYYY-MM-DD",
    "YYYY/MM/DD",
    "YYYY年M月D日",
    "YYYY-MM-DD(AAA)",
    "YYYY年M月D日 AAAA",
  ] satisfies PlaceholderDateFormat[];

  const preserveInputShortcuts = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.metaKey || e.ctrlKey) {
      e.stopPropagation();
    }
  };

  const handleAddOption = () => {
    const trimmedOption = newOption.trim();
    if (!trimmedOption) {
      return;
    }

    onAddOption(trimmedOption);
    setNewOption("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {placeholder}の設定
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
                checked={settings?.type === "text"}
                onChange={() => onTypeChange("text")}
              />
              <span>フリーテキスト</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="input-type"
                value="multiline"
                checked={settings?.type === "multiline"}
                onChange={() => onTypeChange("multiline")}
              />
              <span>複数行テキスト</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="input-type"
                value="list"
                checked={settings?.type === "list"}
                onChange={() => onTypeChange("list")}
              />
              <span>リスト選択</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="input-type"
                value="date"
                checked={settings?.type === "date"}
                onChange={() => onTypeChange("date")}
              />
              <span>日付</span>
            </label>
          </div>
        </div>
        {settings?.type === "list" && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              リストオプション
            </h4>
            <div className="space-y-2">
              {settings.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="flex-1 p-2 bg-gray-100 border border-gray-300 rounded-md">
                    {option}
                  </span>
                  <button
                    className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                    onClick={() => onRemoveOption(index)}
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center space-x-2 mt-4">
              <input
                type="text"
                className="flex-1 p-2 border border-gray-300 rounded-md"
                placeholder="オプションを追加"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={(e) => {
                  preserveInputShortcuts(e);
                  if (e.metaKey || e.ctrlKey || e.altKey) {
                    return;
                  }

                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddOption();
                  }
                }}
              />
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                onClick={handleAddOption}
              >
                追加
              </button>
            </div>
          </div>
        )}
        {settings?.type === "date" && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              日付の表示形式
            </h4>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md"
              autoFocus
              value={settings.dateFormat ?? DEFAULT_PLACEHOLDER_DATE_FORMAT}
              placeholder={DEFAULT_PLACEHOLDER_DATE_FORMAT}
              onKeyDown={preserveInputShortcuts}
              onChange={(e) => onDateFormatChange(e.target.value)}
            />
            <p className="mt-2 text-xs text-gray-500">
              `YYYY` `YY` `MM` `M` `DD` `D` `A` `AA` `AAA` `AAAA`
              を組み合わせて自由に指定できます。曜日は `A` / `AA` が
              `月`、`AAA` が `月曜`、`AAAA` が `月曜日` です。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {dateFormatExamples.map((format) => (
                <button
                  key={format}
                  type="button"
                  className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                  onClick={() => onDateFormatChange(format)}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-6 flex justify-end space-x-2">
          <button
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            onClick={onClose}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
