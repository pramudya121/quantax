export type ChatMessage = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dragon-chat`;

export async function streamChat({
  messages,
  walletContext,
  onDelta,
  onDone,
  onError,
}: {
  messages: ChatMessage[];
  walletContext?: string;
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    const url = CHAT_URL;
    if (!url || url.includes('undefined')) {
      onError("Chat service not configured. Please refresh the page.");
      return;
    }

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, walletContext }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (resp.status === 429) {
      onError("Rate limit exceeded. Please wait a moment and try again. 🐉");
      return;
    }
    if (resp.status === 402) {
      onError("AI credits depleted. Please try again later.");
      return;
    }
    if (!resp.ok) {
      let errorDetail = "";
      try { errorDetail = await resp.text(); } catch {}
      console.error("[QuantaBot] Error:", resp.status, errorDetail);
      onError(`QuantaBot error (${resp.status}). Please try again.`);
      return;
    }
    if (!resp.body) {
      onError("No response body. Please try again.");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;
    let hasReceivedContent = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            hasReceivedContent = true;
            onDelta(content);
          }
        } catch {
          // Incomplete JSON - put back and wait for more data
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Flush remaining buffer
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            hasReceivedContent = true;
            onDelta(content);
          }
        } catch { /* ignore partial leftovers */ }
      }
    }

    if (!hasReceivedContent) {
      onError("QuantaBot returned an empty response. Please try again.");
      return;
    }

    onDone();
  } catch (e: any) {
    clearTimeout(timeout);
    if (e?.name === 'AbortError') {
      onError("Request timed out. QuantaBot is busy, please try again. 🐉");
    } else {
      console.error("[QuantaBot. Stream error:", e?.message || e);
      onError("Connection lost. Please try again.");
    }
  }
}
