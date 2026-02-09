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
