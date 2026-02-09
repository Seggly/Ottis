import React, { useState, useEffect } from 'react';
import { Recording } from '../types';
import { ArrowLeft, Play, Pause, Download, CheckCircle, List, Type, MessageSquare, Loader2, Users, FileText, Tag, Sparkles } from 'lucide-react';
import { getRecordingById, saveRecordingMetadata, loadAudioFile } from '../services/storageService';
import { processMeetingAudio } from '../services/geminiService';
import { ChatInterface } from './ChatInterface';

interface MeetingDetailProps {
  recordingId: string;
  onBack: () => void;
}

export const MeetingDetail: React.FC<MeetingDetailProps> = ({ recordingId, onBack }) => {
  const [recording, setRecording] = useState<Recording | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  
  // Mobile: 'transcript' | 'summary' | 'chat'
  // Desktop Right Panel: 'summary' | 'chat'
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'chat'>('summary'); 
  
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  useEffect(() => {
    loadRecordingMetadata();
    return () => {
      if (audioEl) {
        audioEl.pause();
        audioEl.src = '';
      }
    };
  }, [recordingId]);

  const loadRecordingMetadata = async () => {
    try {
      const rec = await getRecordingById(recordingId);
      setRecording(rec);
      
      // If recorded but no data, trigger processing
      if (rec.status === 'recorded') {
        processRecording(rec);
      }
    } catch (e) {
      console.error("Failed to load recording", e);
    }
  };

  const processRecording = async (rec: Recording) => {
    try {
        setRecording({ ...rec, status: 'processing' });
        await saveRecordingMetadata({ ...rec, status: 'processing' });
        
        // Load the audio file from disk for processing
        const blob = await loadAudioFile(rec.audioFilename);
        
        const context = {
            title: rec.originalTitle,
            attendees: rec.attendees
        };

        const data = await processMeetingAudio(blob, context);
        
        let finalTitle = rec.originalTitle || data.summary.executiveSummary.slice(0, 50) + (data.summary.executiveSummary.length > 50 ? '...' : '');

        const updatedRec: Recording = { 
            ...rec, 
            status: 'completed', 
            data,
            title: finalTitle
        };
        
        setRecording(updatedRec);
        await saveRecordingMetadata(updatedRec);

    } catch (err) {
        console.error("Processing failed", err);
        setProcessingError("Failed to process audio with Gemini.");
        setRecording(prev => prev ? { ...prev, status: 'failed' } : null);
        await saveRecordingMetadata({ ...rec, status: 'failed' });
    }
  };

  const togglePlay = async () => {
    if (!recording) return;

    if (!audioEl) {
      setIsLoadingAudio(true);
      try {
          const blob = await loadAudioFile(recording.audioFilename);
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => setIsPlaying(false);
          setAudioEl(audio);
          audio.play();
          setIsPlaying(true);
      } catch (e) {
          console.error("Could not load audio file", e);
          alert("Could not load audio file from disk. Is the drive connected?");
      } finally {
          setIsLoadingAudio(false);
      }
    } else {
      if (isPlaying) {
        audioEl.pause();
      } else {
        audioEl.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDownload = async (type: 'audio' | 'transcript') => {
    if (!recording) return;

    if (type === 'audio') {
        try {
            const blob = await loadAudioFile(recording.audioFilename);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = recording.audioFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            alert("Could not find file on disk.");
        }
    } else if (type === 'transcript' && recording.data) {
        const lines = [
            `# ${recording.title}`,
            `Date: ${new Date(recording.date).toLocaleString()}`,
            `\n## Executive Summary`,
            recording.data.summary.executiveSummary,
            `\n## Action Items`,
            ...recording.data.summary.actionItems.map(i => `- [ ] ${i}`),
            `\n## Transcript`,
            ...recording.data.transcript.map(t => `**${t.speaker}** (${t.timestamp}): ${t.text}`)
        ];
        
        const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${recording.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_notes.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
  };

  if (!recording) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  const isReady = recording.status === 'completed' && recording.data;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <ArrowLeft size={20} />
          </button>
          <div className="overflow-hidden">
            <h2 className="text-xl font-bold text-gray-900 truncate max-w-md">{recording.title}</h2>
            <div className="flex items-center text-sm text-gray-500 mt-0.5">
                <span>{new Date(recording.date).toLocaleString()}</span>
                <span className="mx-2">•</span>
                <span>{Math.floor(recording.duration / 60)}m {recording.duration % 60}s</span>
                {recording.attendees && recording.attendees.length > 0 && (
                    <>
                    <span className="mx-2">•</span>
                    <div className="flex items-center">
                        <Users size={12} className="mr-1" />
                        <span className="truncate max-w-[200px]">{recording.attendees.length} Attendees</span>
                    </div>
                    </>
                )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
            <button 
                onClick={togglePlay}
                disabled={isLoadingAudio}
                className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium disabled:opacity-50"
            >
                {isLoadingAudio ? <Loader2 size={18} className="mr-2 animate-spin"/> : (isPlaying ? <Pause size={18} className="mr-2" /> : <Play size={18} className="mr-2" />)}
                {isPlaying ? 'Pause' : 'Play'}
            </button>
            <div className="h-6 w-px bg-gray-300 mx-2 hidden sm:block"></div>
            <button 
                onClick={() => handleDownload('transcript')}
                title="Download Notes"
                className="hidden sm:block p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
                <FileText size={20} />
            </button>
            <button 
                onClick={() => handleDownload('audio')}
                title="Download Audio"
                className="hidden sm:block p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
                <Download size={20} />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        
        {/* Mobile Tabs */}
        <div className="lg:hidden flex border-b bg-white">
            <button 
                onClick={() => setActiveTab('summary')}
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'summary' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            >
                Summary
            </button>
            <button 
                onClick={() => setActiveTab('transcript')}
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'transcript' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            >
                Transcript
            </button>
            <button 
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'chat' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'} flex items-center justify-center`}
            >
                <Sparkles size={14} className="mr-1" /> Ask AI
            </button>
        </div>

        {/* Left Panel: Transcript (Always visible on Desktop, toggled on Mobile) */}
        <div className={`flex-1 overflow-y-auto p-6 bg-white border-r border-gray-200 ${activeTab === 'transcript' ? 'block' : 'hidden lg:block'}`}>
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold flex items-center text-gray-800">
                        <MessageSquare size={20} className="mr-2 text-blue-500" />
                        Transcript
                    </h3>
                </div>

                {recording.status === 'processing' && (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Loader2 className="animate-spin mb-3 text-blue-500" size={32} />
                        <p>Transcribing audio...</p>
                    </div>
                )}
                
                {recording.status === 'failed' && (
                    <div className="text-red-500 p-4 bg-red-50 rounded-lg border border-red-100">
                        {processingError || "Processing failed. Please try recording again."}
                    </div>
                )}

                <div className="space-y-6">
                    {recording.data?.transcript?.map((segment, idx) => (
                        <div key={idx} className="flex space-x-4 group">
                            <div className="flex-shrink-0 w-24 text-right mt-1">
                                <p className="text-xs font-bold text-gray-700">{segment.speaker}</p>
                                <p className="text-xs text-gray-400 font-mono">{segment.timestamp}</p>
                            </div>
                            <div className="flex-1">
                                <p className="text-gray-800 leading-relaxed text-base">{segment.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Right Panel: Summary OR Chat (Toggled on Desktop via Header, Toggled on Mobile via Tab) */}
        <div className={`lg:w-[450px] bg-gray-50 flex flex-col ${activeTab !== 'transcript' ? 'block' : 'hidden lg:flex'}`}>
            
            {/* Desktop Switcher for Right Panel */}
            <div className="hidden lg:flex items-center p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex bg-gray-200 rounded-lg p-1 w-full">
                    <button 
                        onClick={() => setActiveTab('summary')}
                        className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${activeTab !== 'chat' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Summary
                    </button>
                    <button 
                        onClick={() => setActiveTab('chat')}
                        className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center ${activeTab === 'chat' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Sparkles size={14} className="mr-1.5" />
                        Ask AI
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                
                {/* Mode: Summary */}
                <div className={`h-full overflow-y-auto p-6 space-y-6 ${(activeTab === 'summary' || (activeTab !== 'chat' && window.innerWidth >= 1024)) ? 'block' : 'hidden'}`}>
                    
                    {recording.data?.summary?.tags && recording.data.summary.tags.length > 0 && (
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3 flex items-center">
                                <Tag size={16} className="mr-2" />
                                Tags
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {recording.data.summary.tags.map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                            <Type size={16} className="mr-2" />
                            Executive Summary
                        </h3>
                        {recording.status === 'processing' ? (
                            <div className="h-20 bg-gray-100 animate-pulse rounded-lg"></div>
                        ) : (
                            <p className="text-gray-800 leading-relaxed">
                                {recording.data?.summary?.executiveSummary || "No summary available."}
                            </p>
                        )}
                    </div>

                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-sm font-bold text-green-600 uppercase tracking-wider mb-3 flex items-center">
                            <CheckCircle size={16} className="mr-2" />
                            Action Items
                        </h3>
                        <ul className="space-y-3">
                            {recording.status === 'processing' ? (
                                [1,2,3].map(i => <div key={i} className="h-4 bg-gray-100 animate-pulse rounded w-3/4"></div>)
                            ) : recording.data?.summary?.actionItems?.length ? (
                                recording.data.summary.actionItems.map((item, i) => (
                                    <li key={i} className="flex items-start">
                                        <input type="checkbox" className="mt-1 mr-3 h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500" readOnly />
                                        <span className="text-gray-700 text-sm">{item}</span>
                                    </li>
                                ))
                            ) : (
                                <p className="text-gray-400 text-sm italic">No action items detected.</p>
                            )}
                        </ul>
                    </div>

                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center">
                            <List size={16} className="mr-2" />
                            Key Points
                        </h3>
                        <ul className="list-disc list-outside ml-4 space-y-2">
                            {recording.status === 'processing' ? (
                                [1,2,3].map(i => <div key={i} className="h-4 bg-gray-100 animate-pulse rounded"></div>)
                            ) : recording.data?.summary?.keyPoints?.map((point, i) => (
                                <li key={i} className="text-gray-700 text-sm pl-1">{point}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Mode: Chat */}
                {activeTab === 'chat' && isReady && (
                    <div className="h-full">
                        <ChatInterface data={recording.data!} />
                    </div>
                )}
                
                {activeTab === 'chat' && !isReady && (
                     <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Loader2 className="animate-spin mb-2" size={32} />
                        <p>Waiting for analysis...</p>
                    </div>
                )}

            </div>
        </div>

      </div>
    </div>
  );
};
