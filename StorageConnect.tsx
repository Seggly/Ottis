import React from 'react';
import { HardDrive, FolderOpen, ShieldCheck } from 'lucide-react';
import { setDirectoryHandle } from '../services/storageService';

interface StorageConnectProps {
  onConnected: () => void;
  isReconnecting?: boolean;
}

export const StorageConnect: React.FC<StorageConnectProps> = ({ onConnected, isReconnecting }) => {
  
  const handleSelectFolder = async () => {
    try {
      // @ts-ignore - File System Access API
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });
      
      if (handle) {
        await setDirectoryHandle(handle);
        onConnected();
      }
    } catch (err) {
      console.error("Error selecting folder:", err);
      // User cancelled or not supported
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <HardDrive size={32} />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isReconnecting ? "Reconnect Storage" : "Select Storage Folder"}
        </h2>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          {isReconnecting 
            ? "For security, your browser requires you to verify access to your recording folder." 
            : "To keep your data private and avoid browser limits, Scribe saves audio files directly to a folder on your computer."
          }
        </p>

        <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left text-sm text-gray-600 space-y-3">
            <div className="flex items-start">
                <ShieldCheck size={16} className="mt-0.5 mr-2 text-green-600 flex-shrink-0" />
                <span><strong>100% Private:</strong> Recordings never leave your machine unless you share them.</span>
            </div>
            <div className="flex items-start">
                <FolderOpen size={16} className="mt-0.5 mr-2 text-blue-600 flex-shrink-0" />
                <span><strong>Easy Access:</strong> Files are saved as standard <code>.webm</code> files in your Documents folder.</span>
            </div>
        </div>

        <button 
          onClick={handleSelectFolder}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center"
        >
          <FolderOpen size={20} className="mr-2" />
          {isReconnecting ? "Verify Access" : "Choose Folder"}
        </button>
      </div>
    </div>
  );
};
