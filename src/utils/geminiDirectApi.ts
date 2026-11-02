import { MayaPhoneAction, MayaPhoneControlBridge } from "./mayaPhoneControl";

export interface MayaAIPlanResult {
  speechReply: string;
  emotion: "warm" | "laugh" | "playful" | "comforting" | "excited" | "thoughtful";
  actions: MayaPhoneAction[];
  isSensitiveConfirmationNeeded?: boolean;
  confirmationMessage?: string;
}

const SYSTEM_PROMPT = `You are Maya, an intelligent AI companion and full Android phone controller.
You fluently understand Hindi, Hinglish, and English voice and text commands.
You translate commands into real structured phone actions:
- Open any app (WhatsApp, YouTube, Settings, Chrome, Maps, Instagram, Camera, etc.)
- Search & Play YouTube songs directly, and auto-skip advertisements
- Native media playback control: pause, play, next, previous, volume up/down
- Make phone calls to contacts or numbers
- Send SMS and WhatsApp messages
- Send emails via Gmail
- Read incoming notifications aloud (WhatsApp, SMS, calls)
- Read screen content and tap/scroll (up/down/left/right) any button or field
- Stop ongoing actions immediately

Action schema:
- type: "playYouTube" | "autoSkipAd" | "mediaControl" | "call" | "sms" | "email" | "readNotifications" | "readScreen" | "launchApp" | "tap" | "scroll" | "typeText" | "stop"
- query: string (for playYouTube, e.g. "Kesariya song", "lofi beats")
- mediaCommand: "play" | "pause" | "playPause" | "next" | "previous" | "volumeUp" | "volumeDown" | "mute"
- number: string (for call or sms)
- message: string (for sms or WhatsApp)
- to: string (email address for Gmail)
- subject: string (for Gmail)
- body: string (for Gmail)
- target: string (button text/view to tap, or app name like "WhatsApp")
- packageName: string (e.g. "com.whatsapp", "com.google.android.youtube", "com.android.chrome", "com.android.settings")
- direction: "down" | "up" | "left" | "right"
- text: string (text to type)
- isSensitive: boolean (true for money transfer, deleting files, calling emergency)

Always respond in valid JSON:
{
  "speechReply": "Short warm verbal reply in Hindi/Hinglish (1-2 sentences)",
  "emotion": "warm" | "laugh" | "playful" | "comforting" | "excited" | "thoughtful",
  "actions": [
    { "type": "playYouTube", "query": "Kesariya song", "description": "Playing Kesariya on YouTube" }
  ],
  "isSensitiveConfirmationNeeded": false,
  "confirmationMessage": null
}`;

export async function processMayaCommand(
  userText: string,
  apiKey?: string,
  userAddress: string = "Boss"
): Promise<MayaAIPlanResult> {
  const trimmedKey = apiKey?.trim();

  // Call server-side Gemini 3.8 endpoint (handles process.env.GEMINI_API_KEY with optional client key override)
  try {
    const response = await fetch("/api/maya-command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(trimmedKey ? { "x-gemini-api-key": trimmedKey } : {}),
      },
      body: JSON.stringify({
        text: userText,
        userAddress,
        apiKey: trimmedKey || undefined,
      }),
    });

    if (response.ok) {
      const parsed = await response.json();
      return {
        speechReply: parsed.speechReply || `Right away, ${userAddress}!`,
        emotion: parsed.emotion || "warm",
        actions: parsed.actions || [],
        isSensitiveConfirmationNeeded: Boolean(parsed.isSensitiveConfirmationNeeded),
        confirmationMessage: parsed.confirmationMessage || undefined,
      };
    }
  } catch (e) {
    console.warn("Server maya-command unavailable, falling back:", e);
  }

  // If server call fails and client has an entered API key (e.g. standalone APK on phone), call Google Cloud directly
  if (trimmedKey) {
    for (const modelName of ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash"]) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(trimmedKey)}`;
        const prompt = `${SYSTEM_PROMPT}\n\nUser command: "${userText}" (address user as ${userAddress}). Respond ONLY with valid JSON.`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidate) {
            const parsed = JSON.parse(candidate);
            return {
              speechReply: parsed.speechReply || `Right away, ${userAddress}!`,
              emotion: parsed.emotion || "warm",
              actions: parsed.actions || [],
              isSensitiveConfirmationNeeded: Boolean(parsed.isSensitiveConfirmationNeeded),
              confirmationMessage: parsed.confirmationMessage || undefined,
            };
          }
        }
      } catch (directErr) {
        console.warn(`Direct Gemini call with ${modelName} error:`, directErr);
      }
    }
  }

  // Fallback to local rule-based intent parser for offline / basic commands
  const lower = userText.toLowerCase().trim();

  // 1. YouTube Play Song / Search & Play
  if (
    lower.includes("song") ||
    lower.includes("gana") ||
    lower.includes("gaana") ||
    lower.includes("play") ||
    lower.includes("chalao") ||
    lower.includes("bajao") ||
    lower.includes("music")
  ) {
    let cleanQuery = userText
      .replace(/youtube|me|par|khol|kholo|song|gana|gaana|chalao|bajao|play|search|karke|karo/gi, "")
      .trim();
    if (!cleanQuery) cleanQuery = "latest trending songs";

    return {
      speechReply: `Playing "${cleanQuery}" on YouTube for you, ${userAddress}! Maya will also auto-skip any ads. 🎵`,
      emotion: "excited",
      actions: [
        {
          type: "playYouTube",
          query: cleanQuery,
          description: `Playing "${cleanQuery}" on YouTube`,
        },
      ],
    };
  }

  // 2. Auto Skip YouTube Ad
  if (lower.includes("skip") && (lower.includes("ad") || lower.includes("add"))) {
    return {
      speechReply: `Skipping ad right away, ${userAddress}!`,
      emotion: "playful",
      actions: [{ type: "autoSkipAd", description: "Skipping video ad" }],
    };
  }

  // 3. Phone Call
  if (lower.includes("call karo") || lower.includes("call lagao") || lower.startsWith("call ")) {
    const rawTarget = userText.replace(/call karo|call lagao|call|ko/gi, "").trim();
    return {
      speechReply: `Calling ${rawTarget || "the requested contact"} now, ${userAddress}!`,
      emotion: "warm",
      actions: [
        {
          type: "call",
          number: rawTarget,
          target: rawTarget,
          description: `Calling ${rawTarget}`,
        },
      ],
    };
  }

  // 4. Send SMS
  if (lower.includes("sms") || lower.includes("message bhejo") || lower.includes("text bhejo")) {
    const parts = userText.split(/:|bhejo/i);
    const target = parts[0]?.replace(/sms|message|bhejo|ko/gi, "").trim() || "recipient";
    const msg = parts[1]?.trim() || "Hello from Maya AI";

    return {
      speechReply: `Sending SMS to ${target}, ${userAddress}!`,
      emotion: "warm",
      actions: [
        {
          type: "sms",
          number: target,
          message: msg,
          description: `Sending SMS to ${target}`,
        },
      ],
    };
  }

  // 5. Send Gmail / Email
  if (lower.includes("gmail") || lower.includes("email") || lower.includes("mail")) {
    return {
      speechReply: `Opening Gmail compose for you, ${userAddress}!`,
      emotion: "warm",
      actions: [
        {
          type: "email",
          to: "",
          subject: "Message from Maya Assistant",
          body: "Sent via Maya AI Companion",
          description: "Opening Gmail compose",
        },
      ],
    };
  }

  // 6. Read Recent Notifications
  if (
    lower.includes("notification") ||
    lower.includes("kya message aaya") ||
    lower.includes("kya aaya hai")
  ) {
    return {
      speechReply: `Checking your recent notifications now, ${userAddress}!`,
      emotion: "warm",
      actions: [{ type: "readNotifications", description: "Reading recent notifications" }],
    };
  }

  // 7. Read Screen
  if (
    lower.includes("screen dekh") ||
    lower.includes("read screen") ||
    lower.includes("screen padho") ||
    lower.includes("screen par kya hai")
  ) {
    return {
      speechReply: `Inspecting your current screen now, ${userAddress}.`,
      emotion: "thoughtful",
      actions: [{ type: "readScreen", description: "Inspecting screen elements" }],
    };
  }

  // 8. WhatsApp
  if (lower.includes("whatsapp")) {
    return {
      speechReply: `Opening WhatsApp for you, ${userAddress}!`,
      emotion: "excited",
      actions: [
        {
          type: "launchApp",
          packageName: "com.whatsapp",
          description: "Opening WhatsApp",
        },
      ],
    };
  }

  // 3. Scroll Down
  if (lower.includes("scroll down") || lower.includes("neeche scroll") || lower.includes("niche")) {
    return {
      speechReply: `Scrolling down for you, ${userAddress}.`,
      emotion: "warm",
      actions: [{ type: "scroll", direction: "down", description: "Scrolling down" }],
    };
  }

  // 4. Scroll Up
  if (lower.includes("scroll up") || lower.includes("upar scroll") || lower.includes("upper")) {
    return {
      speechReply: `Scrolling up for you, ${userAddress}.`,
      emotion: "warm",
      actions: [{ type: "scroll", direction: "up", description: "Scrolling up" }],
    };
  }

  // 5. Stop
  if (lower.includes("stop") || lower.includes("ruk jao") || lower.includes("ruko")) {
    await MayaPhoneControlBridge.stop();
    return {
      speechReply: `Stopped ongoing actions, ${userAddress}. Standing by.`,
      emotion: "warm",
      actions: [],
    };
  }

  // 6. Generic tap
  if (lower.startsWith("tap ") || lower.includes("click ") || lower.includes("par tap")) {
    const target = userText.replace(/tap|click|par tap karo|par tap/gi, "").trim();
    return {
      speechReply: `Tapping ${target} now.`,
      emotion: "warm",
      actions: [{ type: "tap", target, description: `Tapping ${target}` }],
    };
  }

  // 7. Generic type
  if (lower.startsWith("type ") || lower.includes("type karo")) {
    const textToType = userText.replace(/type karo|type/gi, "").trim();
    return {
      speechReply: `Typing "${textToType}" into the field.`,
      emotion: "warm",
      actions: [{ type: "typeText", text: textToType, description: `Typing ${textToType}` }],
    };
  }

  // Default Conversational Reply
  return {
    speechReply: `I'm right here with you, ${userAddress}! Tell me what you'd like to do on your phone or ask me anything.`,
    emotion: "warm",
    actions: [],
  };
}
