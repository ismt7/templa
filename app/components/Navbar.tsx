"use client";

import Link from "next/link";
import { HomeIcon, CogIcon } from "@heroicons/react/24/outline";

export default function Navbar() {
  return (
    <nav className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <Link href="/" className="flex items-center space-x-2">
          <HomeIcon className="h-6 w-6" />
          <span>ホーム</span>
        </Link>
        <Link href="/settings" className="flex items-center space-x-2">
          <CogIcon className="h-6 w-6" />
          <span>設定</span>
        </Link>
      </div>
    </nav>
  );
}
