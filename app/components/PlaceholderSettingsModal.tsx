"use client";

import { useState } from "react";
import {
  PlaceholderInputType,
  PlaceholderSetting,
} from "@/utils/templateUtils";

interface PlaceholderSettingsModalProps {
  placeholder: string;
  settings?: PlaceholderSetting;
  onTypeChange: (type: PlaceholderInputType) => void;
  onAddOption: (option: string) => void;
  onRemoveOption: (index: number) => void;
  onClose: () => void;
}

export default function PlaceholderSettingsModal({
  placeholder,
  settings,
  onTypeChange,
  onAddOption,
  onRemoveOption,
  onClose,
}: PlaceholderSettingsModalProps) {
  const [newOption, setNewOption] = useState("");

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
                value="list"
                checked={settings?.type === "list"}
                onChange={() => onTypeChange("list")}
              />
              <span>リスト選択</span>
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
                  if (e.key === "Enter") {
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
