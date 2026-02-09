import { CalendarEvent } from '../types';

// In a real app, this would use the Google Calendar API with OAuth2.
// For this clone, we simulate the connection and data fetching.

export const connectCalendar = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 800); // Simulate network delay
  });
};

export const getUpcomingEvents = async (): Promise<CalendarEvent[]> => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  // Mock data relative to current time
  return [
    {
      id: 'evt_1',
      title: 'Q3 Product Strategy Sync',
      startTime: now + 1000 * 60 * 5, // Starts in 5 mins
      endTime: now + oneHour,
      attendees: ['Alice Chen', 'Bob Smith', 'David Kim'],
      link: 'https://meet.google.com/abc-defg-hij',
      platform: 'google_meet'
    },
    {
      id: 'evt_2',
      title: 'Client Design Review (Zoom)',
      startTime: now + oneHour * 2,
      endTime: now + oneHour * 3,
      attendees: ['Sarah Jones', 'Mike Ross'],
      link: 'https://zoom.us/j/123456789',
      platform: 'zoom'
    },
    {
      id: 'evt_3',
      title: 'Weekly Team Standup',
      startTime: now - 1000 * 60 * 15, // Started 15 mins ago
      endTime: now + 1000 * 60 * 15,
      attendees: ['Team Engineering', 'Product Owner'],
      link: 'https://meet.google.com/std-up-now',
      platform: 'google_meet'
    }
  ];
};
