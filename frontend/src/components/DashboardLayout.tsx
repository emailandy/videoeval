"use client";

import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, Library, Settings, LogOut } from 'lucide-react';
import SettingsModal from './SettingsModal';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">A</div>
          <span className="text-xl font-bold tracking-tight">Agoda</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Campaign Selector</span>
          </Link>
          <Link href="/library" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors">
            <Library className="w-5 h-5" />
            <span className="font-medium">Evaluation Library</span>
          </Link>
          <div className="pt-4 mt-4 border-t border-gray-100">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-gray-600 rounded-lg transition-colors w-full text-left"
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-500 w-full rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-10 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">AI Assisted Video Evaluation</h1>
          </div>


        </header>
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
}
