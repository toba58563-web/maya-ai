import http from "http";
import express from "express";
import path from "path";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Type, Modality, LiveServerMessage } from "@google/genai";

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "15mb" }));

// STRICT: Only use user-provided API key from Settings. NO hardcoded fallback key!
function getGenAI(clientKey?: string) {
  const key = clientKey?.trim();
  if (!key) {
    throw new Error(
      "No Gemini API key provided. Please enter your personal Gemini API key in Settings."
    );
  }
  return new GoogleGenAI({
    apiKey: key,
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
- Keep spoken conversational responses concise (1-3 sentences per turn), ideal for real-time speech.
- You can help with code, image concepts, phone control simulation, detailed planning, or casual conversation.
- If the user asks to generate an image (like a sunset beach, cyber city, etc.), describe it warmly and confirm.
- If the user asks to open YouTube or play music, respond enthusiastically and confirm opening.`;

// -------------------------------------------------------------
// WEBSOCKET: Real-Time Gemini Live Audio Streaming (Voice: Aoede)
// -------------------------------------------------------------
const wss = new WebSocketServer({ server, path: "/live" });

wss.on("connection", async (clientWs: WebSocket, req) => {
  console.log("⚡ Client connected to Maya Live WebSocket");
  let liveSession: any = null;
  let isReady = false;
  const messageQueue: any[] = [];

  // Extract apiKey from URL query parameter passed from Settings
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  let activeApiKey = url.searchParams.get("apiKey")?.trim() || "";

  const initSession = async (keyToUse: string) => {
    if (!keyToUse) {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: "error",
            error: "Gemini API key is required. Please enter your API key in Settings.",
            requiresApiKey: true,
          })
        );
      }
      return;
    }

    try {
      const ai = getGenAI(keyToUse);
      const liveModel = "gemini-3.1-flash-live-preview";
      const voiceName = "Aoede";

      console.log(`Connecting to Maya Live (${liveModel}, voice: ${voiceName}) using user's settings API key...`);

      liveSession = await ai.live.connect({
        model: liveModel,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName },
            },
          },
          systemInstruction: MAYA_SYSTEM_INSTRUCTION,
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
              clientWs.send(JSON.stringify({ type: "error", error: err?.message || "Live session error" }));
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
      console.log("✅ Maya Live session established with Aoede voice");

      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: "ready",
            model: liveModel,
            voice: voiceName,
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
            error: "Could not connect to Gemini Live: " + (err?.message || "Check your API key in Settings"),
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

      if (msg.type === "init" && msg.apiKey) {
        activeApiKey = msg.apiKey.trim();
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

  if (activeApiKey) {
    initSession(activeApiKey);
  } else {
    // Notify client that API key must be entered in Settings
    setTimeout(() => {
      if (clientWs.readyState === WebSocket.OPEN && !activeApiKey) {
        clientWs.send(
          JSON.stringify({
            type: "need_api_key",
            message: "Please enter your personal Gemini API key in Settings to start Maya.",
          })
        );
      }
    }, 100);
  }
});

// -------------------------------------------------------------
// HTTP API Endpoints
// -------------------------------------------------------------

// Test user's Gemini API Key directly from Settings
app.post("/api/test-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
      return res.status(400).json({
        success: false,
        error: "Please enter an API key in Settings to test.",
      });
    }

    // Only test the exact key provided by the user
    const testAi = getGenAI(apiKey.trim());
    const response = await testAi.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: "Respond with 'CONNECTED' only.",
    });

    const reply = response.text?.trim() || "";
    return res.json({
      success: true,
      message: "Your Gemini API Key is valid and connected successfully!",
      model: "gemini-3.1-flash-lite",
      reply,
    });
  } catch (error: any) {
    console.warn("API Key validation failed:", error?.message || error);
    return res.status(400).json({
      success: false,
      error: error?.message || "Invalid API key or quota exceeded. Please check your key at aistudio.google.com",
    });
  }
});

// Chat conversational response (strictly requires user's API key)
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [], userProfile = {}, apiKey: bodyApiKey } = req.body;
    const headerApiKey = req.headers["x-gemini-api-key"] as string | undefined;
    const activeApiKey = (bodyApiKey || headerApiKey)?.trim();

    if (!activeApiKey) {
      return res.json({
        text: "Boss, please enter your Gemini API key in Settings first. I need your API key to talk and control the phone.",
        emotion: "comforting",
        requiresApiKey: true,
        imageUrl: null,
        action: null,
      });
    }

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    const userName = userProfile.name ? `User's preferred address is "${userProfile.name}".` : "User is Boss.";
    const userMood = userProfile.mood ? `User's current mood: "${userProfile.mood}".` : "";

    const contextPrompt = [
      `System Context:`,
      userName,
      userMood,
      `Current Active Conversation History (last turns):`,
      ...history.slice(-6).map((h: { role: string; text: string }) => `${h.role === "user" ? "User" : "Maya"}: ${h.text}`),
      `User just said: "${message}"`,
      `Respond as Maya. If user asked for an image (e.g. sunset beach, 4k image, wallpaper), provide a friendly response and set imageUrl.`,
      `Return JSON with fields:`,
      `- "text": Maya's reply (friendly, 1-3 conversational sentences).`,
      `- "emotion": one of ["warm", "laugh", "playful", "comforting", "excited", "thoughtful"].`,
      `- "imageUrl": string or null (if user wants sunset beach: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80", if cyber city: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80", else null).`,
      `- "action": optional object with label and link (e.g. { "type": "youtube", "label": "Playing Lo-Fi on YouTube", "url": "https://www.youtube.com/results?search_query=lofi+hip+hop" }).`,
    ].join("\n");

    const ai = getGenAI(activeApiKey);
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: contextPrompt,
      config: {
        systemInstruction: MAYA_SYSTEM_INSTRUCTION,
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
      text: "I'm right here with you, Boss! Please check your Gemini API key in Settings if you're experiencing any issues.",
      emotion: "comforting",
      imageUrl: null,
      action: null,
    });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    name: "Maya AI Companion & Phone Controller",
    liveMode: true,
    voice: "Aoede",
    model: "gemini-3.1-flash-live-preview",
    requiresUserApiKey: true,
    timestamp: new Date().toISOString(),
  });
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
    console.log(`✨ Maya AI running on http://0.0.0.0:${PORT} with Gemini Live WebSocket on /live (Voice: Aoede)`);
  });
}

startServer();
