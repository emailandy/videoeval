import React from 'react';
import { Play, FileVideo, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface VideoListItemProps {
  filename: string;
  status: 'completed' | 'processing' | 'pending' | 'failed';
  score?: number;
  onClick: () => void;
}

export default function VideoListItem({ filename, status, score, onClick }: VideoListItemProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'bg-white border-green-200 hover:border-green-300';
      case 'processing': return 'bg-blue-50 border-blue-200';
      case 'failed': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div 
      onClick={status === 'completed' ? onClick : undefined}
      className={`relative flex items-center justify-between p-4 rounded-xl border transition-all ${getStatusColor()} ${status === 'completed' ? 'cursor-pointer hover:shadow-md' : 'opacity-80'}`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status === 'completed' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
          <FileVideo size={20} />
        </div>
        <div>
          <h4 className="font-medium text-gray-900 truncate max-w-md">{filename}</h4>
          <p className="text-xs text-gray-500 capitalize">{status}</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {status === 'completed' && score !== undefined && (
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{Math.round(score)}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Score</div>
          </div>
        )}
        
        {status === 'processing' && (
           <div className="flex items-center gap-2 text-blue-600">
             <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
             <span className="text-sm font-medium">Analyzing...</span>
           </div>
        )}

        {status === 'pending' && (
           <div className="flex items-center gap-2 text-gray-400">
             <Clock size={18} />
             <span className="text-sm">Queued</span>
           </div>
        )}
        
        {status === 'completed' && (
            <div className="bg-blue-600 text-white p-2 rounded-full shadow-sm">
                <Play size={16} fill="currentColor" />
            </div>
        )}
      </div>
      
      {/* Progress Bar Background for processing? Optional, simpler to just start with status text */}
    </div>
  );
}
