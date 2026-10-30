import { MayaPhoneAction, MayaPhoneControlBridge } from "./mayaPhoneControl";

export interface MayaAIPlanResult {
  speechReply: string;
  emotion: "warm" | "laugh" | "playful" | "comforting" | "excited" | "thoughtful";
  actions: MayaPhoneAction[];
  isSensitiveConfirmationNeeded?: boolean;
  confirmationMessage?: string;
}

const SYSTEM_PROMPT = `You are Maya, an intelligent AI female companion and Android phone assistant.
You understand Hindi, Hinglish, and English voice and text commands fluently.
Your goal is to converse warmly with the user ("Boss") AND translate phone navigation requests into structured phone actions.

When the user gives a phone command (e.g., "open WhatsApp", "WhatsApp kholo", "scroll down", "neeche scroll karo", "tap search", "type Hello", "open YouTube and search music", "stop"):
Translate it into structured actions:
- type: "launchApp" | "tap" | "scroll" | "typeText" | "readScreen"
- target: string (label, button text, or view name to tap)
- packageName: string (e.g. "com.whatsapp", "com.google.android.youtube", "com.android.chrome", "com.google.android.apps.maps", "com.android.settings")
- text: string (text to type)
- direction: "down" | "up"
- isSensitive: boolean (true if sending message, placing phone call, deleting content, or submitting payment/credentials)

Always respond in valid JSON with:
{
  "speechReply": "Short warm verbal reply to speak (1-2 sentences)",
  "emotion": "warm" | "playful" | "excited",
  "actions": [
    { "type": "launchApp", "packageName": "com.whatsapp", "description": "Opening WhatsApp" }
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
    console.warn("Server maya-command unavailable, using local intent fallback:", e);
  }

  // Fallback to local rule-based intent parser for offline / basic commands
  const lower = userText.toLowerCase().trim();

  // 1. WhatsApp
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

  // 2. YouTube
  if (lower.includes("youtube")) {
    const isSearchMusic = lower.includes("music") || lower.includes("song") || lower.includes("lofi");
    const actions: MayaPhoneAction[] = [
      {
        type: "launchApp",
        packageName: "com.google.android.youtube",
        description: "Opening YouTube",
      },
    ];

    if (isSearchMusic) {
      actions.push({ type: "tap", target: "Search", description: "Tapping Search" });
      actions.push({ type: "typeText", text: "Lofi hip hop music", description: "Typing music" });
    }

    return {
      speechReply: `Opening YouTube now, ${userAddress}!`,
      emotion: "playful",
      actions,
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
