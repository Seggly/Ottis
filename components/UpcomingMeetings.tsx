import React from 'react';
import { CalendarEvent } from '../types';
import { Calendar, Video, Users, ArrowRight, Monitor } from 'lucide-react';

interface UpcomingMeetingsProps {
  events: CalendarEvent[];
  onRecordEvent: (event: CalendarEvent) => void;
  isConnected: boolean;
  onConnect: () => void;
}

export const UpcomingMeetings: React.FC<UpcomingMeetingsProps> = ({ events, onRecordEvent, isConnected, onConnect }) => {
  if (!isConnected) {
    return (
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 flex flex-col sm:flex-row items-center justify-between">
        <div className="flex items-center mb-4 sm:mb-0">
          <div className="bg-white p-3 rounded-full shadow-sm mr-4">
            <Calendar className="text-blue-600" size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Connect Google Calendar</h3>
            <p className="text-sm text-gray-600">Auto-label recordings and identify speakers.</p>
          </div>
        </div>
        <button 
          onClick={onConnect}
          className="px-4 py-2 bg-white text-blue-600 font-medium rounded-lg shadow-sm hover:bg-gray-50 border border-blue-200 transition-colors"
        >
          Connect
        </button>
      </div>
    );
  }

  const getPlatformIcon = (platform: string) => {
    switch(platform) {
        case 'zoom':
            return <div className="p-1 rounded bg-blue-500 text-white"><Video size={12} /></div>;
        case 'teams':
            return <div className="p-1 rounded bg-indigo-500 text-white"><Monitor size={12} /></div>;
        case 'google_meet':
        default:
            return <div className="p-1 rounded bg-green-500 text-white"><Video size={12} /></div>;
    }
  };

  const getPlatformName = (platform: string) => {
     switch(platform) {
        case 'zoom': return 'Zoom';
        case 'teams': return 'Teams';
        case 'google_meet': return 'Google Meet';
        default: return 'Meeting';
     }
  };

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
        <Calendar size={20} className="mr-2 text-gray-500" />
        Upcoming Meetings
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map(event => {
          const startTime = new Date(event.startTime);
          const now = new Date();
          const diffMins = Math.floor((startTime.getTime() - now.getTime()) / 60000);
          
          let timeLabel = '';
          if (diffMins < 0) timeLabel = 'Happening now';
          else if (diffMins === 0) timeLabel = 'Starting now';
          else timeLabel = `In ${diffMins} min`;

          return (
            <div key={event.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-40">
              <div>
                <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${diffMins <= 10 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {timeLabel}
                    </span>
                    <div className="flex items-center space-x-2">
                        <span className="text-[10px] uppercase font-bold text-gray-400">{getPlatformName(event.platform)}</span>
                        {getPlatformIcon(event.platform)}
                    </div>
                </div>
                <h3 className="font-semibold text-gray-900 line-clamp-2" title={event.title}>
                    {event.title}
                </h3>
                <div className="flex items-center mt-2 text-xs text-gray-500">
                    <Users size={12} className="mr-1" />
                    <span className="truncate">{event.attendees.length > 0 ? event.attendees[0] + (event.attendees.length > 1 ? ` +${event.attendees.length - 1}` : '') : 'No attendees'}</span>
                </div>
              </div>
              
              <button 
                onClick={() => onRecordEvent(event)}
                className="w-full mt-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center justify-center transition-colors"
              >
                Join & Record <ArrowRight size={14} className="ml-1.5" />
              </button>
            </div>
          );
        })}
        {events.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                No upcoming meetings found for today.
            </div>
        )}
      </div>
    </div>
  );
};
