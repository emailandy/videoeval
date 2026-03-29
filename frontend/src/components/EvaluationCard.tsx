import React from 'react';
import Link from 'next/link';
import { Play, FileText, Calendar } from 'lucide-react';
import ScoreGauge from './ScoreGauge';

interface EvaluationCardProps {
  id: string;
  filename: string;
  date: number;
  score?: number;
  thumbnailUrl?: string; // Optional if we have thumbnails
}

export default function EvaluationCard({ id, filename, date, score }: EvaluationCardProps) {
  return (
    <Link href={`/library/${id}`} className="block group">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full">
        <div className="bg-gray-100 aspect-video flex items-center justify-center relative">
            <Play className="w-12 h-12 text-gray-400 opacity-80 group-hover:text-blue-600 group-hover:scale-110 transition-all" fill="currentColor" />
            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                0:15
            </div>
        </div>
        <div className="p-4 flex flex-col flex-1">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-gray-800 line-clamp-2" title={filename}>
              {filename}
            </h3>
             {score !== undefined && (
                 <div className="scale-75 origin-top-right">
                    <ScoreGauge score={score} size={40} label="" />
                 </div>
             )}
          </div>
          
          <div className="mt-auto flex items-center text-xs text-gray-500 gap-3">
             <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{new Date(date * 1000).toLocaleDateString()}</span>
             </div>
             <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>JSON Report</span>
             </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
