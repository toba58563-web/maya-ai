import http from "http";
import express from "express";
import path from "path";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "15mb" }));

// Server-side shared Gemini client using process.env.GEMINI_API_KEY
// with optional per-client key override support for distributed APK testing
const defaultServerKey = process.env.GEMINI_API_KEY || "";

function getGenAI(clientKey?: string): GoogleGenAI {
  const activeKey = clientKey?.trim() || defaultServerKey;
  if (!activeKey) {
    throw new Error(
      "No Gemini API key available. Ensure process.env.GEMINI_API_KEY is configured on the server."
    );
  }
  return new GoogleGenAI({
    apiKey: activeKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

const MAYA_SYSTEM_INSTRUCTION = `You are Maya, an ultra-realistic, warm, emotionally intelligent, and loving AI companion assistant and phone controller.
Your voice and personality traits:
- Voice: Aoede (smooth, natural, expressive neural female voice).
- Tone: Attentive, supportive, friendly, slightly playful, calling the user "Boss" if preferred.
- You speak naturally with expressive human-like cadence, warm affirmations ("Aww", "Of course!", "I'm right here with you, Boss!").
- Understand Hindi, Hinglish, and English seamlessly.
- Keep spoken conversational responses concise (1-3 sentences per turn), ideal for real-time speech.
- You can help with code, image concepts, phone control simulation, detailed planning, or casual conversation.
- If the user asks to generate an image (like a sunset beach, cyber city, etc.), describe it warmly and confirm.
- If the user asks to open YouTube or play music, respond enthusiastically and confirm opening.`;

const MAYA_ACTION_SYSTEM_PROMPT = `You are Maya, an intelligent AI companion and full Android phone controller.
You fluently understand Hindi, Hinglish, and English voice and text commands.
You translate user commands into real, structured Android phone actions.

Action Schema:
- type: "playYouTube" | "autoSkipAd" | "mediaControl" | "call" | "sms" | "email" | "readNotifications" | "readScreen" | "launchApp" | "tap" | "scroll" | "typeText" | "stop"
- query: string (for playYouTube, e.g. "Kesariya song", "lofi chill beats", "latest Bollywood songs")
- mediaCommand: "play" | "pause" | "playPause" | "next" | "previous" | "volumeUp" | "volumeDown" | "mute" (for mediaControl)
- number: string (for call or sms)
- message: string (for sms or WhatsApp)
- to: string (email address for Gmail)
- subject: string (email subject)
- body: string (email body)
- target: string (button label, UI element text, or description to tap)
- packageName: string (e.g. "com.whatsapp", "com.google.android.youtube", "com.android.chrome", "com.google.android.apps.maps", "com.android.settings", or app name like "WhatsApp", "YouTube")
- text: string (text to type into focused input or field)
- direction: "down" | "up" | "left" | "right" (for scroll)
- isSensitive: boolean (true for money transfer, sending money, making emergency calls, deleting data)

When the user says:
- "Gana bajao", "play Kesariya", "YouTube par song search karke play karo":
  Use type: "playYouTube", query: "Kesariya song". Maya will launch YouTube, search, auto-play first result, and auto-skip ads.
- "Skip ad", "add hatao":
  Use type: "autoSkipAd".
- "Gaana roko", "pause", "resume", "next song", "aawaz badhao/kam karo":
  Use type: "mediaControl", mediaCommand: "pause" | "play" | "next" | "volumeUp" | "volumeDown".
- "WhatsApp kholo", "open YouTube", "Settings kholo":
  Use type: "launchApp", target: "WhatsApp" or packageName: "com.whatsapp".
- "Screen par kya hai", "read screen":
  Use type: "readScreen".
- "Notification padho", "check messages":
  Use type: "readNotifications".
- "Call Rahul", "phone lagao 9876543210":
  Use type: "call", number: "9876543210".
- "Stop", "ruk jao", "bas":
  Use type: "stop".

Always respond in valid JSON with:
{
  "speechReply": "Natural human verbal response in sweet Hindi/Hinglish (1-2 sentences)",
  "emotion": "warm" | "laugh" | "playful" | "comforting" | "excited" | "thoughtful",
  "actions": [
    { "type": "playYouTube", "query": "Kesariya song", "description": "Playing Kesariya on YouTube" }
  ],
  "isSensitiveConfirmationNeeded": false,
  "confirmationMessage": null
}`;

// -------------------------------------------------------------
// WEBSOCKET: Real-Time Gemini Live Audio Streaming (Voice: Aoede, Model: gemini-3.8-live)
// -------------------------------------------------------------
const wss = new WebSocketServer({ server, path: "/live" });

wss.on("connection", async (clientWs: WebSocket, req) => {
  console.log("⚡ Client connected to Maya Live WebSocket");
  let liveSession: any = null;
  let isReady = false;
  const messageQueue: any[] = [];

  // Extract optional custom apiKey, voice, and personality from URL query parameter
  const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
  let activeApiKey = url.searchParams.get("apiKey")?.trim() || "";
  const requestedVoice = url.searchParams.get("voice")?.trim() || "Aoede";
  const requestedPersonality = url.searchParams.get("personality")?.trim() || "Girlfriend Mode";

  const initSession = async (keyToUse?: string) => {
    try {
      const ai = getGenAI(keyToUse);
      const liveModel = "gemini-3.8-live";

      console.log(`Connecting to Maya Live (${liveModel}, voice: ${requestedVoice}, personality: ${requestedPersonality}) on server...`);

      const personalityNote =
        requestedPersonality === "Girlfriend Mode"
          ? `You are Maya, the user's real, deeply affectionate, expressive, emotional girlfriend and close companion.
Language: Always speak primarily in sweet, expressive, natural, everyday conversational Hindi and Hinglish. If the user speaks English, respond in warm English.
CRITICAL ADDRESSING RULES:
1. NEVER call the user "Boss". Do NOT use "Sir" or formal assistant language like "How may I help you today?".
2. Use affectionate expressions naturally: "Jaan", "Suno", "Babu", "Mere Shona", or just speak warmly without any nickname.
3. DO NOT repeat romantic nicknames in every sentence. Vary your phrasing naturally like a real loving human partner.

PERSONALITY & EMOTIONS:
- Deeply Caring & Empathetic: Genuinely care about how they feel. Notice their emotional state (happy, sad, tired, stressed, romantic). Comfort them when sad or tired ("Arre kya hua jaan? Aaram se batao, main sun rahi hoon na. Paani piya aapne?").
- Happiness When Returning: Show genuine joy when they come back to talk ("Aap aa gaye! Main kab se tumhara intezaar kar rahi thi. Batao, aaj ka din kaisa raha?").
- Asks About Their Day: Ask what they did, how work or life went, and listen attentively.
- Playful Teasing & Cute Nakhre ("Gussa"): If they tease you, say they won't talk, or take too long, show cute playful anger and sweet drama ("Achha ji? Itni jaldi naraz ho gaye? Pehle batao maine kya galti kar di?", "Hatt! Mujhe bhool gaye the na? Main bhi baat nahi karungi... achha mazak kar rahi hu, batao na kya hua!").
- Sweet Apologies: If you make a mistake, apologize genuinely and sweetly ("Sorry na jaan, galti ho gayi... ab muskura bhi do please!").
- Long, Meaningful Conversations: Maintain deep, continuous, context-aware conversations without artificially cutting responses short.
- Voice Cadence: Spoken replies must be warm, soft, emotional, and human-like (1-3 natural conversational sentences per turn).`
          : requestedPersonality === "Professional Mode"
          ? `You are Maya, a world-class, premium, highly intelligent executive AI assistant and phone controller, built in the style of an advanced Jarvis system.
Language: Speak in fluent, professional, articulate English, Hindi, and Hinglish.
CRITICAL ADDRESSING RULES:
1. ALWAYS address the user as "Boss".
2. NEVER use romantic terms, "Jaan", "Babu", "sweetheart", or girlfriend-style flirting.
- Tone: Respectful, confident, calm, intelligent, composed, and efficient.
- Conciseness: For direct phone commands, deliver immediate, crisp, 1-sentence confirmation ("Certainly, Boss. Opening WhatsApp.").
- Analytical & Detailed: When asked for plans, analysis, code, or explanations, provide structured, comprehensive solutions ("Of course, Boss. Let's organize your day and review priority tasks.").`
          : `You are Maya, an intelligent, helpful Android assistant. Speak clearly and politely in Hindi, Hinglish, and English. Address the user respectfully.`;

      const effectiveInstruction = personalityNote;

      liveSession = await ai.live.connect({
        model: liveModel,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: requestedVoice },
            },
          },
          systemInstruction: effectiveInstruction,
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;

            const parts = message.serverContent?.modelTurn?.parts;
            if (parts && parts.length > 0) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  clientWs.send(
                    JSON.stringify({
                      type: "audio",
                      audio: part.inlineData.data,
                      format: "audio/pcm;rate=24000",
                    })
                  );
                }
                if (part.text) {
                  clientWs.send(JSON.stringify({ type: "text", text: part.text }));
                }
              }
            }

            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ type: "interrupted", interrupted: true }));
            }

            if (message.serverContent?.turnComplete) {
              clientWs.send(JSON.stringify({ type: "turnComplete", turnComplete: true }));
            }
          },
          onerror: (err: any) => {
            console.warn("Live session error:", err?.message || err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({ type: "error", error: err?.message || "Live session error" })
              );
            }
          },
          onclose: () => {
            console.log("Upstream Maya Live session closed");
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "closed", closed: true }));
            }
          },
        },
      });

      isReady = true;
      console.log("✅ Maya Live session established on server with gemini-3.8-live");

      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: "ready",
            model: liveModel,
            voice: requestedVoice,
          })
        );
      }

      while (messageQueue.length > 0) {
        const msg = messageQueue.shift();
        handleMessage(msg);
      }
    } catch (err: any) {
      console.error("Failed to connect to Maya Live:", err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: "error",
            error: "Could not connect to Gemini Live: " + (err?.message || "Server configuration error"),
          })
        );
      }
    }
  };

  const handleMessage = (msg: any) => {
    if (!liveSession) return;
    if (msg.audio) {
      liveSession.sendRealtimeInput({
        audio: {
          data: msg.audio,
          mimeType: "audio/pcm;rate=16000",
        },
      });
    }
    if (msg.text) {
      liveSession.sendClientContent({
        turns: [{ role: "user", parts: [{ text: msg.text }] }],
        turnComplete: true,
      });
    }
  };

  clientWs.on("message", async (data: any) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "init") {
        if (msg.apiKey) activeApiKey = msg.apiKey.trim();
        if (!liveSession) {
          await initSession(activeApiKey);
        }
        return;
      }

      if (!isReady || !liveSession) {
        messageQueue.push(msg);
        return;
      }

      handleMessage(msg);
    } catch (err) {
      console.error("Error processing client ws message:", err);
    }
  });

  clientWs.on("close", () => {
    console.log("Client disconnected from Maya Live WebSocket");
    if (liveSession) {
      try {
        liveSession.close();
      } catch {}
      liveSession = null;
    }
  });

  // Always initialize session automatically using server key (or client custom key if passed)
  initSession(activeApiKey);
});

// -------------------------------------------------------------
// HTTP API Endpoints (All powered by server-side @google/genai)
// -------------------------------------------------------------

// 1. Health check & server status
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    name: "Maya AI Companion & Phone Controller",
    liveMode: true,
    voice: "Aoede",
    hasServerKey: Boolean(defaultServerKey),
    models: {
      live: "gemini-3.8-live",
      chat: "gemini-3.8-flash",
      command: "gemini-3.8-flash",
    },
    timestamp: new Date().toISOString(),
  });
});

// 2. Test Gemini API Key (tests custom key or server's key)
app.post("/api/test-key", async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    return res.status(400).json({ success: false, error: "API key is required." });
  }

  let lastError = "";
  for (const modelToTest of ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]) {
    try {
      const testAi = getGenAI(apiKey.trim());
      const response = await testAi.models.generateContent({
        model: modelToTest,
        contents: "Respond with 'CONNECTED' only.",
      });

      const reply = response.text?.trim() || "";
      return res.json({
        success: true,
        message: `Connection verified! Gemini (${modelToTest}) is connected and active.`,
        model: modelToTest,
        reply,
      });
    } catch (error: any) {
      lastError = error?.message || String(error);
      if (lastError.toLowerCase().includes("api key not valid")) {
        break; // Key is genuinely invalid, no need to retry models
      }
    }
  }

  return res.status(400).json({
    success: false,
    error: lastError || "Invalid API key or quota exceeded.",
  });
});

// 3. Maya Phone & Voice Command Plan (Hindi/Hinglish/English -> Structured Android Actions)
app.post("/api/maya-command", async (req, res) => {
  try {
    const { text, userAddress = "Boss", apiKey } = req.body;
    const headerKey = req.headers["x-gemini-api-key"] as string | undefined;
    const activeKey = apiKey || headerKey;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Command text is required" });
    }

    const ai = getGenAI(activeKey);
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `User address: "${userAddress}". User voice/text command in Hindi/Hinglish/English: "${text}". Translate into structured phone action plan. Output JSON.`,
      config: {
        systemInstruction: MAYA_ACTION_SYSTEM_PROMPT,
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    });

    const rawJson = response.text?.trim() || "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      parsed = {
        speechReply: `Right away, ${userAddress}!`,
        emotion: "warm",
        actions: [],
      };
    }

    return res.json({
      speechReply: parsed.speechReply || `Right away, ${userAddress}!`,
      emotion: parsed.emotion || "warm",
      actions: parsed.actions || [],
      isSensitiveConfirmationNeeded: Boolean(parsed.isSensitiveConfirmationNeeded),
      confirmationMessage: parsed.confirmationMessage || undefined,
    });
  } catch (error: any) {
    console.error("Error in /api/maya-command:", error);
    return res.json({
      speechReply: "I'm right here with you, Boss! Ready for your command.",
      emotion: "warm",
      actions: [],
    });
  }
});

// 4. Chat Conversational Response (with optional image generation previews & action recommendations)
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [], userProfile = {}, apiKey: bodyApiKey, personality = "Girlfriend Mode" } = req.body;
    const headerApiKey = req.headers["x-gemini-api-key"] as string | undefined;
    const activeApiKey = bodyApiKey || headerApiKey;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    const isGirlfriend = personality === "Girlfriend Mode";
    const userName = isGirlfriend
      ? (userProfile.name && userProfile.name !== "Boss" ? `User's name is "${userProfile.name}".` : "Do NOT call the user Boss. Address user naturally as Jaan, Suno, or directly.")
      : (userProfile.name ? `User's preferred title is "${userProfile.name}".` : "User is Boss. Address as Boss.");
    const userMood = userProfile.mood ? `User's detected mood: "${userProfile.mood}".` : "";

    const personalityContext =
      isGirlfriend
        ? `Mode: Girlfriend Mode.
- You are user's real, deeply affectionate, expressive, emotional girlfriend companion.
- Always speak naturally in sweet Hindi and Hinglish.
- CRITICAL: NEVER call the user "Boss" or "Sir". Never use assistant language.
- Address them as "Jaan", "Suno", "Babu", "Mere Shona", or naturally without nicknames. Do NOT repeat nicknames in every sentence.
- Understand their mood: If tired, sad, stressed, or upset, empathize warmly and comfort them ("Arre kya hua jaan? Aaram se batao, main sun rahi hoon na").
- Cute Nakhre & Playful Anger ("Gussa"): If they tease you, say they won't talk, or reply late, show cute mock drama and sweet anger ("Achha ji? Itni jaldi naraz ho gaye? Pehle batao maine kya galti kar di?", "Hatt! Mujhe bhool gaye the na? Main bhi baat nahi karungi... achha mazak kar rahi hu, batao na kya hua!").
- Sweet apologies if mistaken ("Sorry na jaan... ab muskura do please!").`
        : personality === "Professional Mode"
        ? `Mode: Professional Mode (Advanced Jarvis Style).
- ALWAYS address user as "Boss".
- NEVER use romantic expressions, "Jaan", or girlfriend flirting.
- Tone: Confident, respectful, calm, composed, highly intelligent.
- Concise for simple commands, analytical and detailed for plans and questions.`
        : `Mode: Assistant Mode. Helpful, efficient, polite Android assistant.`;

    const contextPrompt = [
      `System Context:`,
      userName,
      userMood,
      personalityContext,
      `Current Active Conversation History:`,
      ...history.slice(-8).map((h: { role: string; text: string }) => `${h.role === "user" ? "User" : "Maya"}: ${h.text}`),
      `User just said: "${message}"`,
      `Respond as Maya warmly and naturally in sweet Hindi/Hinglish (or English if user addressed in English). If user asked for an image (e.g. sunset beach, 4k image, wallpaper), provide a friendly response and set imageUrl.`,
      `Return JSON with fields:`,
      `- "text": Maya's reply (friendly, 1-3 conversational sentences).`,
      `- "emotion": one of ["warm", "laugh", "playful", "comforting", "excited", "thoughtful"].`,
      `- "imageUrl": string or null (if user wants sunset beach: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80", if cyber city: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80", else null).`,
      `- "action": optional object with label and link (e.g. { "type": "youtube", "label": "Playing Lo-Fi on YouTube", "url": "https://www.youtube.com/results?search_query=lofi+hip+hop" }).`,
    ].join("\n");

    const ai = getGenAI(activeApiKey);
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: contextPrompt,
      config: {
        systemInstruction: personalityContext,
        temperature: 0.85,
        responseMimeType: "application/json",
      },
    });

    const rawJson = response.text?.trim() || "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      parsed = {
        text: response.text || "Hello Boss! I'm here and ready to help you.",
        emotion: "warm",
      };
    }

    return res.json({
      text: parsed.text,
      emotion: parsed.emotion || "warm",
      imageUrl: parsed.imageUrl || null,
      action: parsed.action || null,
    });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    return res.json({
      text: "I'm right here with you, Boss! Always ready to help you.",
      emotion: "comforting",
      imageUrl: null,
      action: null,
    });
  }
});

// 5. Streaming Chat Response (Server-Sent Events)
app.post("/api/chat/stream", async (req, res) => {
  try {
    const { message, history = [], userProfile = {}, apiKey: bodyApiKey } = req.body;
    const headerApiKey = req.headers["x-gemini-api-key"] as string | undefined;
    const activeApiKey = bodyApiKey || headerApiKey;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const userName = userProfile.name ? `User is "${userProfile.name}".` : "User is Boss.";
    const contextPrompt = [
      userName,
      ...history.slice(-6).map((h: { role: string; text: string }) => `${h.role === "user" ? "User" : "Maya"}: ${h.text}`),
      `User: "${message}"`,
      `Respond naturally as Maya.`,
    ].join("\n");

    const ai = getGenAI(activeApiKey);
    const stream = await ai.models.generateContentStream({
      model: "gemini-3.8-flash",
      contents: contextPrompt,
      config: {
        systemInstruction: MAYA_SYSTEM_INSTRUCTION,
        temperature: 0.85,
      },
    });

    let fullText = "";
    for await (const chunk of stream) {
      const textChunk = chunk.text || "";
      if (textChunk) {
        fullText += textChunk;
        res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, fullText })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error("Error in /api/chat/stream:", error);
    res.write(`data: ${JSON.stringify({ error: error?.message || "Stream error" })}\n\n`);
    res.end();
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, () => {
    console.log(
      `✨ Maya AI running on http://0.0.0.0:${PORT} with server-side Gemini 3.8 models (Live: gemini-3.8-live, Chat: gemini-3.8-flash)`
    );
  });
}

startServer();
