import React, { useMemo } from 'react';
import { Recording } from '../types';
import { Clock, Calendar, ChevronRight, FileText, Loader2, AlertCircle, Sparkles } from 'lucide-react';

interface RecordingListProps {
  recordings: Recording[];
  onSelect: (recording: Recording) => void;
  isLoading?: boolean;
}

export const RecordingList: React.FC<RecordingListProps> = ({ recordings, onSelect, isLoading }) => {
  
  // Group recordings by Month Year
  const groupedRecordings = useMemo(() => {
    const groups: { title: string; items: Recording[] }[] = [];
    
    recordings.forEach((rec) => {
        const date = new Date(rec.date);
        const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        let group = groups.find(g => g.title === monthYear);
        if (!group) {
            group = { title: monthYear, items: [] };
            groups.push(group);
        }
        group.items.push(rec);
    });
    return groups;
  }, [recordings]);

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p>Loading recordings...</p>
        </div>
    )
  }

  if (recordings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
        <div className="p-4 bg-gray-100 rounded-full mb-4">
            <FileText size={32} className="opacity-50" />
        </div>
        <p className="text-lg font-medium text-gray-600">No recordings found</p>
        <p className="text-sm">Try adjusting filters or start a new recording</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {groupedRecordings.map((group) => (
        <div key={group.title}>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-1 sticky top-0 bg-white/95 backdrop-blur-sm py-2 z-10">
                {group.title}
            </h2>
            <div className="grid grid-cols-1 gap-3">
            {group.items.map((rec) => (
                <div
                key={rec.id}
                onClick={() => onSelect(rec)}
                className="group bg-white border border-gray-200 hover:border-blue-400 hover:ring-1 hover:ring-blue-100 rounded-xl p-4 shadow-sm transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between"
                >
                <div className="flex items-start space-x-4 overflow-hidden">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                        rec.status === 'completed' ? 'bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600' :
                        rec.status === 'processing' ? 'bg-amber-50 text-amber-600' : 
                        rec.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                        {rec.status === 'processing' ? <Loader2 className="animate-spin" size={20} /> : 
                         rec.status === 'completed' ? <Sparkles size={20} /> :
                         <FileText size={20} />}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center">
                            <h3 className="font-semibold text-gray-900 truncate pr-2 text-base group-hover:text-blue-600 transition-colors">
                                {rec.title}
                            </h3>
                        </div>
                        
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                            {rec.data?.summary?.executiveSummary || (rec.attendees?.length ? `with ${rec.attendees.join(', ')}` : "No summary available")}
                        </p>

                        <div className="flex items-center space-x-3 text-xs text-gray-400 mt-2">
                            <div className="flex items-center bg-gray-50 px-2 py-0.5 rounded-md">
                                <Calendar size={12} className="mr-1.5" />
                                {new Date(rec.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                            </div>
                            <div className="flex items-center bg-gray-50 px-2 py-0.5 rounded-md">
                                <Clock size={12} className="mr-1.5" />
                                {Math.floor(rec.duration / 60)}:{(rec.duration % 60).toString().padStart(2, '0')}
                            </div>
                            {rec.status === 'failed' && (
                                <span className="text-red-500 flex items-center">
                                    <AlertCircle size={12} className="mr-1" /> Failed
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="mt-4 sm:mt-0 flex items-center justify-end pl-4">
                    <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                        <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-500" />
                    </div>
                </div>
                </div>
            ))}
            </div>
        </div>
      ))}
    </div>
  );
};
