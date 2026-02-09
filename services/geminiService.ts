import { GoogleGenAI, Type } from "@google/genai";
import { ProcessedData } from "../types";

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const processMeetingAudio = async (
  audioBlob: Blob, 
  context?: { title?: string, attendees?: string[] }
): Promise<ProcessedData> => {
  const MODEL_NAME = 'gemini-3-flash-preview'; 
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const base64Audio = await blobToBase64(audioBlob);

  let contextString = "";
  if (context) {
    contextString = `
    Context Information:
    Meeting Title: ${context.title || "Unknown"}
    Attendees/Speakers: ${context.attendees?.join(', ') || "Unknown"}
    
    Use the attendee names to identify speakers in the transcript where possible.
    `;
  }

  const prompt = `
    You are an expert meeting secretary. Listen to the attached audio recording of a meeting.
    ${contextString}
    
    Task 1: Generate a detailed, verbatim transcript. Identify different speakers as "Speaker 1", "Speaker 2", or use their real names if you can identify them from the context. Add timestamps.
    Task 2: Create a structured meeting recap.
    Task 3: Generate 3-5 relevant category tags for this meeting (e.g., "Engineering", "Sales", "Q3 Planning", "1:1", "Budget").
    
    Return the output in the specified JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME, 
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioBlob.type || 'audio/webm',
              data: base64Audio
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.OBJECT,
              properties: {
                executiveSummary: { type: Type.STRING, description: "A high-level paragraph summarizing the meeting." },
                keyPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of key topics discussed." },
                actionItems: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of assigned tasks or next steps." },
                decisions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of decisions made." },
                tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 category tags for filtering." },
              },
              required: ["executiveSummary", "keyPoints", "actionItems", "decisions", "tags"]
            },
            transcript: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  speaker: { type: Type.STRING },
                  timestamp: { type: Type.STRING, description: "Format MM:SS" },
                  text: { type: Type.STRING }
                },
                required: ["speaker", "timestamp", "text"]
              }
            }
          },
          required: ["summary", "transcript"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response from Gemini");
    
    return JSON.parse(resultText) as ProcessedData;

  } catch (error) {
    console.error("Gemini processing error:", error);
    throw error;
  }
};

export const createMeetingChatSession = (data: ProcessedData) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Construct context
    const transcriptText = data.transcript
        .map(s => `${s.speaker} (${s.timestamp}): ${s.text}`)
        .join('\n');
        
    const systemInstruction = `
    You are an intelligent assistant for the following meeting.
    
    Meeting Summary:
    ${data.summary.executiveSummary}
    
    Action Items:
    ${data.summary.actionItems.join('\n')}
    
    Full Transcript:
    ${transcriptText}
    
    Your goal is to help the user perform tasks based on this meeting, such as writing follow-up emails, creating Jira/Asana tasks, or answering questions about what was said.
    Always be professional, concise, and helpful.
    When asked to write an email or task, provide the full text ready to copy.
    `;

    return ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
            systemInstruction: systemInstruction
        }
    });
};
