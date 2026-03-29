"use client";

import React, { useState } from 'react';
import { X, Save, Key } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');
    try {
        const res = await fetch('http://localhost:8000/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey
            })
        });
        
        if (res.ok) {
            setStatus('success');
            setTimeout(() => {
                onClose();
            }, 1500);
        } else {
            setStatus('error');
        }
    } catch (err) {
        console.error(err);
        setStatus('error');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X size={24} />
        </button>
        
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600" />
            Settings
        </h2>
        <p className="text-sm text-gray-500 mb-6">Configure system preferences</p>

        {status === 'success' ? (
            <div className="text-center py-8">
                <div className="text-green-500 text-4xl mb-4">✅</div>
                <h3 className="font-bold text-lg">Detailed Saved!</h3>
                <p className="text-gray-600">The system is ready to use.</p>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gemini API Key</label>
                    <input 
                        type="password" 
                        required
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                        placeholder="AIzaSy..."
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                        Required for analysis. Get one at <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-500 hover:underline">Google AI Studio</a>.
                    </p>
                </div>

                {status === 'error' && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                        Failed to save settings. Please check the console.
                    </div>
                )}

                <div className="pt-2">
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {loading ? 'Saving...' : <><Save size={16} /> Save Changes</>}
                    </button>
                </div>
            </form>
        )}
      </div>
    </div>
  );
}
