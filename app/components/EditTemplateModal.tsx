"use client";

import { useEffect } from "react";

interface EditModalProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onClear: () => void;
}

const EditModal: React.FC<EditModalProps> = ({
  placeholder,
  value,
  onChange,
  onClose,
  onClear,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-11/12 h-5/6 flex flex-col">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {placeholder}の編集
        </h2>
        <textarea
          id="edit-modal-textarea"
          className="flex-1 w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
