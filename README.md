<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1PRnxknTFsxlKI-5o7rxs-SxrtP0BDKld

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set environment variables in `.env.local`:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
   ```
3. Create a Google OAuth Client ID (Web application):
   - Go to Google Cloud Console → APIs & Services → Credentials
   - Create OAuth Client ID (Web application)
   - Add `http://localhost:5173` to **Authorized JavaScript origins**
4. Ensure the Google Calendar API is enabled for your project.
5. Run the app:
   `npm run dev`

## Free (or no-recurring-cost) alternatives

If you want to avoid paid APIs, here are options that can work for personal use, with trade-offs:

1. **Local transcription with OpenAI Whisper (free, runs on your machine).**
   - You can record audio the same way but run transcription locally using the open-source Whisper model.
   - **Pros:** No API costs, works offline.
   - **Cons:** Needs CPU/GPU time and setup; long meetings can be slow on laptops.

2. **Google Meet built-in captions/transcripts (depending on your Google plan).**
   - Some Google Workspace plans include meeting transcripts; if you already have access, it can be free to you.
   - **Pros:** No extra setup for recording/transcription.
   - **Cons:** Not available on all plans; less control over formatting/summary.

3. **Manual notes + AI summaries from free tiers.**
   - You can paste a manual note outline into free-tier chat tools for a recap.
   - **Pros:** No audio processing needed.
   - **Cons:** Not fully automated; depends on free tier limits.

If you want, we can add a local transcription option (Whisper) or a hybrid flow that keeps everything on your Mac.

## Desktop-like app option (Chrome “installed app”)

If you want this to feel like a desktop app (dock icon, standalone window, no browser tabs), you can install it as a **Chrome app** (PWA-style):

1. Start the app: `npm run dev`
2. Open it in Chrome at `http://localhost:5173`
3. Click the **Install** icon in the Chrome address bar (or go to **Chrome menu → Save and share → Install app**)
4. Launch it from your Dock/Applications like a regular app

**Note:** This still runs locally in Chrome, but it looks and behaves like a native desktop app window.
