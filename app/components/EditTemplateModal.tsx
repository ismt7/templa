"use client";

import { useEffect, useRef } from "react";
import { insertPlaceholderAtSelection } from "@/utils/placeholderUtils";

interface EditModalProps {
  title: string;
  value: string;
  placeholders: string[];
  onChange: (value: string) => void;
  onClose: () => void;
  onClear: () => void;
}

const EditModal: React.FC<EditModalProps> = ({
  title,
  value,
  placeholders,
  onChange,
  onClose,
  onClear,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectionRef = useRef({ start: value.length, end: value.length });
  const pendingSelectionRef = useRef<{
    start: number;
    end: number;
  } | null>(null);

  const updateSelection = (target: HTMLTextAreaElement) => {
    selectionRef.current = {
      start: target.selectionStart ?? target.value.length,
      end: target.selectionEnd ?? target.value.length,
    };
  };

  const handleInsertPlaceholder = (placeholder: string) => {
    const textarea = textareaRef.current;
    const selectionStart =
      textarea?.selectionStart ?? selectionRef.current.start ?? value.length;
    const selectionEnd =
      textarea?.selectionEnd ?? selectionRef.current.end ?? selectionStart;
    const insertionResult = insertPlaceholderAtSelection(
      value,
      placeholder,
      selectionStart,
      selectionEnd
    );

    selectionRef.current = {
      start: insertionResult.selectionStart,
      end: insertionResult.selectionEnd,
    };
    pendingSelectionRef.current = {
      start: insertionResult.selectionStart,
      end: insertionResult.selectionEnd,
    };
    onChange(insertionResult.content);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    const pendingSelection = pendingSelectionRef.current;
    const textarea = textareaRef.current;

    if (!pendingSelection || !textarea) {
      return;
    }

    textarea.focus();
    textarea.setSelectionRange(pendingSelection.start, pendingSelection.end);
    pendingSelectionRef.current = null;
  }, [value]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-11/12 h-5/6 flex flex-col">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {title}の編集
        </h2>
        <div className="mb-4 flex items-center gap-3">
          <label
            htmlFor="edit-modal-placeholder-select"
            className="shrink-0 text-sm font-medium text-gray-700"
          >
            プレースホルダーを挿入
          </label>
          <select
            id="edit-modal-placeholder-select"
            className="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            defaultValue=""
            onChange={(e) => {
              const nextPlaceholder = e.target.value;

              if (!nextPlaceholder) {
                return;
              }

              handleInsertPlaceholder(nextPlaceholder);
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
        <textarea
          id="edit-modal-textarea"
          ref={textareaRef}
          className="flex-1 w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          autoFocus
          value={value}
          onSelect={(e) => updateSelection(e.currentTarget)}
          onClick={(e) => updateSelection(e.currentTarget)}
          onKeyDown={(e) => {
            updateSelection(e.currentTarget);
            if (e.metaKey || e.ctrlKey) {
              e.stopPropagation();
            }
          }}
          onKeyUp={(e) => updateSelection(e.currentTarget)}
          onChange={(e) => {
            updateSelection(e.currentTarget);
            onChange(e.target.value);
          }}
        />
        <div className="mt-6 flex justify-between">
          <button
            className="button bg-red-500 text-white rounded-md hover:bg-red-600"
            onClick={onClear}
          >
            クリア
          </button>
          <button
            className="button bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditModal;
