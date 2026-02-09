export interface MeetingSummary {
  executiveSummary: string;
  keyPoints: string[];
  actionItems: string[];
  decisions: string[];
  tags: string[]; // New field for auto-generated tags
}

export interface TranscriptSegment {
  speaker: string;
  timestamp: string;
  text: string;
}

export interface ProcessedData {
  summary: MeetingSummary;
  transcript: TranscriptSegment[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  attendees: string[];
  link?: string;
  platform: 'google_meet' | 'zoom' | 'teams' | 'other';
}

export interface Recording {
  id: string;
  title: string;
  date: number; // timestamp
  duration: number; // seconds
  // No blob here. We store the filename relative to the chosen directory.
  audioFilename: string; 
  transcriptFilename?: string;
  status: 'recorded' | 'processing' | 'completed' | 'failed';
  data?: ProcessedData;
  attendees?: string[]; // Context from calendar
  originalTitle?: string; // Context from calendar
}

export type ViewMode = 'list' | 'detail' | 'record';

export interface AudioDevice {
  deviceId: string;
  label: string;
}
