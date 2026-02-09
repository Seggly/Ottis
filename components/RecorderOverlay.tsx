import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, X, Monitor, Info, Globe } from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';

interface RecorderOverlayProps {
  onStop: (blob: Blob, duration: number) => void;
  onCancel: () => void;
  initialTitle?: string;
}

export const RecorderOverlay: React.FC<RecorderOverlayProps> = ({ onStop, onCancel, initialTitle }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mode, setMode] = useState<'mic' | 'tab'>('tab'); // default to tab for "No bot" behavior
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopTracks();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopTracks = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const startRecording = async () => {
    try {
      let finalStream: MediaStream;

      if (mode === 'tab') {
        // Capture System Audio (Tab)
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1, height: 1 }, // Minimal video requirement
          audio: true,
          // @ts-ignore - 'preferCurrentTab' is a chrome-specific hint
          preferCurrentTab: true, 
          selfBrowserSurface: 'include',
          surfaceSwitching: 'include',
          systemAudio: 'include'
        });

        // Capture Mic Audio
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Mix streams
        const ctx = new AudioContext();
        const dest = ctx.createMediaStreamDestination();

        if (displayStream.getAudioTracks().length > 0) {
            const sysSource = ctx.createMediaStreamSource(displayStream);
            sysSource.connect(dest);
        } else {
            alert("No system audio detected. Did you check 'Share tab audio'?");
        }

        const micSource = ctx.createMediaStreamSource(micStream);
        micSource.connect(dest);

        finalStream = dest.stream;

        // Keep a reference to original streams to stop them later
        // Note: The visualizer needs a stream. 
        // dest.stream is fine for visualizer if we want to see combined.
        
        // Handling the "Stop sharing" chrome UI event
        displayStream.getVideoTracks()[0].onended = () => handleStop();

      } else {
        // Mic Only
        finalStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      setStream(finalStream);
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/mp4';

      const recorder = new MediaRecorder(finalStream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(1000); // Collect chunks every second
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error starting recording:", err);
      alert("Could not start recording. Please ensure permissions are granted.");
    }
  };

  const handleStop = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onStop(blob, duration);
        stopTracks();
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
              <h3 className="text-xl font-semibold text-gray-800">
                {isRecording ? 'Recording in Progress' : 'New Recording'}
              </h3>
              {initialTitle && (
                  <p className="text-sm text-blue-600 font-medium mt-1">{initialTitle}</p>
              )}
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center space-y-8">
          
          {/* Visualizer Area */}
          <div className="w-full h-32 bg-gray-50 rounded-xl overflow-hidden relative border border-gray-100">
             {isRecording ? (
               <AudioVisualizer stream={stream} isRecording={isRecording} />
             ) : (
               <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                 Ready to record
               </div>
             )}
          </div>

          <div className="text-4xl font-mono font-bold text-gray-800 tracking-wider">
            {formatTime(duration)}
          </div>

          {!isRecording && (
             <div className="flex bg-gray-100 p-1 rounded-lg w-full">
               <button 
                 onClick={() => setMode('tab')}
                 className={`flex-1 flex items-center justify-center py-2 rounded-md text-sm font-medium transition-all ${mode === 'tab' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
               >
                 <Globe size={16} className="mr-2" />
                 Meeting Tab
               </button>
               <button 
                 onClick={() => setMode('mic')}
                 className={`flex-1 flex items-center justify-center py-2 rounded-md text-sm font-medium transition-all ${mode === 'mic' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
               >
                 <Mic size={16} className="mr-2" />
                 Mic Only
               </button>
             </div>
          )}
          
          {mode === 'tab' && !isRecording && (
            <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg flex items-start">
               <Info size={14} className="mt-0.5 mr-2 flex-shrink-0" />
               <p>
                 Works with <strong>Google Meet, Zoom (Web), Teams (Web)</strong>. 
                 Select the meeting tab and ensure <strong>"Share tab audio"</strong> is checked.
               </p>
            </div>
          )}

          <div className="w-full">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center"
              >
                <div className="w-3 h-3 bg-white rounded-full mr-3 animate-pulse" />
                Start Recording
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-4 rounded-xl shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center justify-center"
              >
                <Square size={18} className="mr-3 fill-current" />
                Stop Recording
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
