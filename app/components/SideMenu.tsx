"use client";

import {
  PlusIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Template } from "../page";

interface SideMenuProps {
  templates: Template[];
  activeTemplateIndex: number;
  setActiveTemplateIndex: (index: number) => void;
  handleExport: () => void;
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  addTemplate: () => void;
  handleDeleteTemplate: (index: number) => void;
}

const SideMenu: React.FC<SideMenuProps> = ({
  templates,
  activeTemplateIndex,
  setActiveTemplateIndex,
  handleExport,
  handleImport,
  addTemplate,
  handleDeleteTemplate,
}) => {
  return (
    <div className="w-90 bg-gray-100 p-4 overflow-y-auto">
      <h2 className="header mb-6">テンプレート一覧</h2>
      <div className="space-y-4">
        {templates.map((template, index) => (
          <div
            key={index}
            className={`card cursor-pointer transition relative ${
              activeTemplateIndex === index ? "bg-gray-200" : ""
            }`}
            onClick={() => setActiveTemplateIndex(index)}
          >
            <h3 className="text-base font-medium text-gray-700">
              {template.name}
            </h3>
            <button
              className="absolute top-1/2 right-2 transform -translate-y-1/2 button-action button-action-remove"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteTemplate(index);
              }}
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <button className="button-action-add mt-4 w-full" onClick={addTemplate}>
        <PlusIcon className="button-icon" />
        テンプレート追加
      </button>
      <div className="mt-4 flex space-x-2">
        <button
          className="button button-export w-full button flex items-center justify-center"
          onClick={handleExport}
        >
          <ArrowDownTrayIcon className="button-icon" />
          エクスポート
        </button>
        <label className="w-full">
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImport}
          />
          <span className="button button-import w-full flex items-center justify-center">
            <ArrowUpTrayIcon className="button-icon" />
            インポート
          </span>
        </label>
      </div>
    </div>
  );
};

export default SideMenu;
