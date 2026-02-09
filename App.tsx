import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Mic, Settings, User, Calendar, FolderCheck } from 'lucide-react';
import { Recording, ViewMode, CalendarEvent } from './types';
import { RecorderOverlay } from './components/RecorderOverlay';
import { RecordingList } from './components/RecordingList';
import { MeetingDetail } from './components/MeetingDetail';
import { UpcomingMeetings } from './components/UpcomingMeetings';
import { StorageConnect } from './components/StorageConnect';
import { FilterBar, TimeFilter, StatusFilter } from './components/FilterBar';
import { saveRecording, getAllRecordings, getStoredDirectoryHandle, verifyPermission } from './services/storageService';
import { connectCalendar, getUpcomingEvents } from './services/calendarService';
import { v4 as uuidv4 } from 'uuid';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showRecorder, setShowRecorder] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [personFilter, setPersonFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');

  // Storage State
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [needsReconnection, setNeedsReconnection] = useState(false);
  
  // Calendar State
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [activeMeetingContext, setActiveMeetingContext] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    initializeStorage();
  }, []);

  const initializeStorage = async () => {
    setLoading(true);
    try {
      const handle = await getStoredDirectoryHandle();
      if (handle) {
        const hasPermission = await verifyPermission(false); 
        if (hasPermission) {
            setIsStorageReady(true);
            await fetchRecordings();
        } else {
            setNeedsReconnection(true);
        }
      }
    } catch (e) {
      console.error("Storage init error", e);
    } finally {
      setLoading(false);
    }
  };

  const handleStorageConnected = async () => {
    setIsStorageReady(true);
    setNeedsReconnection(false);
    await fetchRecordings();
  };

  const fetchRecordings = async () => {
      const data = await getAllRecordings();
      setRecordings(data);
  };

  const handleConnectCalendar = async () => {
    await connectCalendar();
    setIsCalendarConnected(true);
    const evts = await getUpcomingEvents();
    setEvents(evts);
  };

  const handleStartRecording = (contextEvent?: CalendarEvent) => {
    if (contextEvent) {
        if (contextEvent.link) {
            window.open(contextEvent.link, '_blank');
        }
        setActiveMeetingContext(contextEvent);
    } else {
        setActiveMeetingContext(null);
    }
    setShowRecorder(true);
  };

  const handleRecordingComplete = async (blob: Blob, duration: number) => {
    setShowRecorder(false);
    
    const title = activeMeetingContext ? activeMeetingContext.title : 'New Meeting';
    const attendees = activeMeetingContext ? activeMeetingContext.attendees : [];
    
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${dateStr}-${safeTitle}-${uuidv4().slice(0,6)}.webm`;

    const newRecording: Recording = {
      id: uuidv4(),
      title: title,
      date: Date.now(),
      duration,
      status: 'recorded',
      attendees: attendees,
      originalTitle: activeMeetingContext ? activeMeetingContext.title : undefined,
      audioFilename: filename
    };
    
    setRecordings(prev => [newRecording, ...prev]);

    try {
      await saveRecording(newRecording, blob);
      setSelectedRecordingId(newRecording.id);
      setViewMode('detail');
    } catch (error) {
      console.error("Failed to save recording", error);
      alert("Failed to save recording to disk. Please check permissions.");
    } finally {
        setActiveMeetingContext(null);
    }
  };

  // --- Dynamic Option Lists ---
  const availablePeople = useMemo(() => {
      const people = new Set<string>();
      recordings.forEach(r => {
          r.attendees?.forEach(a => people.add(a));
          // Optionally add speakers from transcript if desired, but they might be messy
      });
      return Array.from(people).sort();
  }, [recordings]);

  const availableTags = useMemo(() => {
      const tags = new Set<string>();
      recordings.forEach(r => {
          r.data?.summary?.tags?.forEach(t => tags.add(t));
      });
      return Array.from(tags).sort();
  }, [recordings]);

  // --- Filtering Logic ---
  const filteredRecordings = useMemo(() => {
    return recordings.filter(rec => {
        // 1. Status Filter
        if (statusFilter !== 'all') {
            if (rec.status !== statusFilter) return false;
        }

        // 2. Time Filter
        if (timeFilter !== 'all') {
            const now = Date.now();
            const recDate = rec.date;
            const day = 24 * 60 * 60 * 1000;
            
            if (timeFilter === '7days' && (now - recDate) > (7 * day)) return false;
            if (timeFilter === '30days' && (now - recDate) > (30 * day)) return false;
            if (timeFilter === '3months' && (now - recDate) > (90 * day)) return false;
            if (timeFilter === 'year' && (now - recDate) > (365 * day)) return false;
        }

        // 3. Person Filter
        if (personFilter !== 'all') {
            const hasPerson = rec.attendees?.includes(personFilter);
            if (!hasPerson) return false;
        }

        // 4. Tag Filter
        if (tagFilter !== 'all') {
            const hasTag = rec.data?.summary?.tags?.includes(tagFilter);
            if (!hasTag) return false;
        }

        // 5. Deep Search (Content)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            
            // Check Title
            if (rec.title.toLowerCase().includes(query)) return true;
            
            // Check Attendees
            if (rec.attendees?.some(a => a.toLowerCase().includes(query))) return true;

            // Check Processed Data
            if (rec.data) {
                // Check Executive Summary
                if (rec.data.summary.executiveSummary.toLowerCase().includes(query)) return true;
                
                // Check Key Points
                if (rec.data.summary.keyPoints.some(k => k.toLowerCase().includes(query))) return true;

                // Check Tags
                if (rec.data.summary.tags?.some(t => t.toLowerCase().includes(query))) return true;

                // Check Full Transcript (Deep Search)
                if (rec.data.transcript.some(t => t.text.toLowerCase().includes(query) || t.speaker.toLowerCase().includes(query))) return true;
            }

            return false;
        }

        return true;
    });
  }, [recordings, searchQuery, timeFilter, statusFilter, personFilter, tagFilter]);


  if (!isStorageReady || needsReconnection) {
      return (
          <StorageConnect 
            onConnected={handleStorageConnected} 
            isReconnecting={needsReconnection} 
          />
      );
  }

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans">
      
      {/* Sidebar Navigation */}
      <nav className="w-20 lg:w-64 border-r border-gray-200 flex flex-col justify-between bg-gray-50 flex-shrink-0 transition-all z-20">
        <div className="flex flex-col items-center lg:items-start">
          <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 w-full mb-6">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
               <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="ml-3 font-bold text-xl hidden lg:block tracking-tight text-gray-800">Scribe.ai</span>
          </div>

          <div className="w-full px-3 space-y-2">
            <button 
                onClick={() => { setViewMode('list'); setSelectedRecordingId(null); }}
                className={`w-full flex items-center p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Layout size={20} className="lg:mr-3" />
              <span className="hidden lg:inline font-medium">My Notes</span>
            </button>
            
            <button 
                onClick={() => { 
                    if (!isCalendarConnected) handleConnectCalendar(); 
                    setViewMode('list');
                }}
                className={`w-full flex items-center p-3 rounded-xl transition-all ${isCalendarConnected ? 'text-green-600 bg-green-50' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Calendar size={20} className="lg:mr-3" />
              <span className="hidden lg:inline font-medium">
                  {isCalendarConnected ? 'Calendar Linked' : 'Connect Calendar'}
              </span>
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
            <div className="mb-4 px-3 py-2 bg-green-50 rounded-lg border border-green-100 hidden lg:flex items-center">
                <FolderCheck size={14} className="text-green-600 mr-2" />
                <span className="text-xs text-green-700 font-medium">Local Storage Active</span>
            </div>

            <div className="flex items-center justify-center lg:justify-start text-gray-500">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <User size={16} />
                </div>
                <span className="ml-3 text-sm font-medium hidden lg:block">Pro Plan</span>
            </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {viewMode === 'list' && (
          <div className="flex-1 overflow-y-auto bg-white scroll-smooth">
            <div className="max-w-5xl mx-auto px-6 py-8">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">All Recordings</h1>
                  <p className="text-gray-500 mt-1">Manage and review your meeting notes</p>
                </div>
                
                <div className="mt-4 md:mt-0 flex items-center space-x-3">
                    <button 
                        onClick={() => handleStartRecording()}
                        className="flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-200 transition-all active:scale-95"
                    >
                        <Mic size={18} className="mr-2" />
                        Record
                    </button>
                </div>
              </div>

              {/* Show Upcoming if no search is active (keep cleaner UI when searching) */}
              {!searchQuery && (
                  <UpcomingMeetings 
                    events={events} 
                    isConnected={isCalendarConnected} 
                    onConnect={handleConnectCalendar}
                    onRecordEvent={handleStartRecording}
                  />
              )}

              <FilterBar 
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                timeFilter={timeFilter}
                onTimeFilterChange={setTimeFilter}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                personFilter={personFilter}
                onPersonFilterChange={setPersonFilter}
                availablePeople={availablePeople}
                tagFilter={tagFilter}
                onTagFilterChange={setTagFilter}
                availableTags={availableTags}
                resultCount={filteredRecordings.length}
              />

              <RecordingList 
                recordings={filteredRecordings} 
                onSelect={(rec) => {
                  setSelectedRecordingId(rec.id);
                  setViewMode('detail');
                }}
                isLoading={loading}
              />
            </div>
          </div>
        )}

        {viewMode === 'detail' && selectedRecordingId && (
          <MeetingDetail 
            recordingId={selectedRecordingId} 
            onBack={() => {
                setViewMode('list');
                setSelectedRecordingId(null);
                fetchRecordings(); 
            }} 
          />
        )}

        {showRecorder && (
          <RecorderOverlay 
            onStop={handleRecordingComplete} 
            onCancel={() => setShowRecorder(false)} 
            initialTitle={activeMeetingContext?.title}
          />
        )}

      </main>
    </div>
  );
}
