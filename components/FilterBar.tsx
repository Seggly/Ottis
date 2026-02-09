import React from 'react';
import { Search, X, Calendar, CheckCircle2, Users, Tag } from 'lucide-react';

export type TimeFilter = 'all' | '7days' | '30days' | '3months' | 'year';
export type StatusFilter = 'all' | 'completed' | 'processing' | 'failed';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  
  timeFilter: TimeFilter;
  onTimeFilterChange: (val: TimeFilter) => void;
  
  statusFilter: StatusFilter;
  onStatusFilterChange: (val: StatusFilter) => void;
  
  personFilter: string;
  onPersonFilterChange: (val: string) => void;
  availablePeople: string[];

  tagFilter: string;
  onTagFilterChange: (val: string) => void;
  availableTags: string[];

  resultCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  timeFilter,
  onTimeFilterChange,
  statusFilter,
  onStatusFilterChange,
  personFilter,
  onPersonFilterChange,
  availablePeople,
  tagFilter,
  onTagFilterChange,
  availableTags,
  resultCount
}) => {
  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1 group min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search content, speakers..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm"
          />
          {searchQuery && (
            <button 
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          
          {/* Time Filter */}
          <div className="relative flex-shrink-0">
             <select 
                value={timeFilter}
                onChange={(e) => onTimeFilterChange(e.target.value as TimeFilter)}
                className="appearance-none pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer shadow-sm"
             >
                <option value="all">Any Time</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="3months">Last 3 Months</option>
                <option value="year">Past Year</option>
             </select>
             <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
          </div>

          {/* Person Filter */}
          <div className="relative flex-shrink-0">
             <select 
                value={personFilter}
                onChange={(e) => onPersonFilterChange(e.target.value)}
                className="appearance-none pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer shadow-sm max-w-[160px] truncate"
             >
                <option value="all">Any Person</option>
                {availablePeople.map(person => (
                    <option key={person} value={person}>{person}</option>
                ))}
             </select>
             <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
          </div>

          {/* Tag Filter */}
          <div className="relative flex-shrink-0">
             <select 
                value={tagFilter}
                onChange={(e) => onTagFilterChange(e.target.value)}
                className="appearance-none pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer shadow-sm max-w-[160px] truncate"
             >
                <option value="all">Any Tag</option>
                {availableTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                ))}
             </select>
             <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
          </div>

          {/* Status Filter */}
          <div className="relative flex-shrink-0">
             <select 
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
                className="appearance-none pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer shadow-sm"
             >
                <option value="all">Any Status</option>
                <option value="completed">Processed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
             </select>
             <CheckCircle2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {resultCount} {resultCount === 1 ? 'Result' : 'Results'} found
        </p>
        {(timeFilter !== 'all' || statusFilter !== 'all' || personFilter !== 'all' || tagFilter !== 'all') && (
            <button 
                onClick={() => { 
                    onTimeFilterChange('all'); 
                    onStatusFilterChange('all');
                    onPersonFilterChange('all');
                    onTagFilterChange('all');
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
                Clear Filters
            </button>
        )}
      </div>
    </div>
  );
};
