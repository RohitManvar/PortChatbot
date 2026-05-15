import { useState, useRef, useEffect, KeyboardEvent } from "react";

type Message = { role: "user" | "bot"; text: string };

const SUGGESTIONS = [
  "What projects have you built?",
  "What are your skills?",
  "Tell me about your education",
  "What is your experience with ML?",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "Hi! I'm Rohit's portfolio assistant. Ask me anything about his skills, projects, or background." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: msg }, { role: "bot", text: "" }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8002/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "bot", text: updated[updated.length - 1].text + chunk };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "bot", text: "Error: could not reach the server." };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") send();
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.avatar}>R</div>
          <div>
            <div style={styles.headerName}>Rohit Manvar</div>
            <div style={styles.headerSub}>Portfolio Assistant • Powered by Llama 3.2</div>
          </div>
        </div>

        <div style={styles.chatArea}>
          {messages.map((m, i) => (
            <div key={i} style={m.role === "user" ? styles.rowRight : styles.rowLeft}>
              {m.role === "bot" && <div style={styles.botIcon}>🤖</div>}
              <div style={m.role === "user" ? styles.bubbleUser : styles.bubbleBot}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && messages[messages.length - 1]?.text === "" && (
            <div style={styles.rowLeft}>
              <div style={styles.botIcon}>🤖</div>
              <div style={styles.bubbleBot}>
                <span style={styles.typing}>thinking...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={styles.suggestions}>
          {SUGGESTIONS.map((s) => (
            <button key={s} style={styles.chip} onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>

        <div style={styles.inputRow}>
          <input
            style={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about Rohit..."
            disabled={loading}
          />
          <button style={styles.sendBtn} onClick={() => send()} disabled={loading}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', sans-serif",
  },
  container: {
    width: "100%",
    maxWidth: 700,
    height: "90vh",
    background: "#1e293b",
    borderRadius: 16,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "16px 20px",
    background: "#0f172a",
    borderBottom: "1px solid #334155",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 700,
    fontSize: 18,
  },
  headerName: { color: "#f1f5f9", fontWeight: 600, fontSize: 16 },
  headerSub: { color: "#94a3b8", fontSize: 12 },
  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: "20px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  rowLeft: { display: "flex", alignItems: "flex-end", gap: 8 },
  rowRight: { display: "flex", justifyContent: "flex-end" },
  botIcon: { fontSize: 22, flexShrink: 0 },
  bubbleBot: {
    background: "#334155",
    color: "#e2e8f0",
    padding: "10px 14px",
    borderRadius: "16px 16px 16px 4px",
    maxWidth: "80%",
    lineHeight: 1.6,
    fontSize: 14,
    whiteSpace: "pre-wrap",
  },
  bubbleUser: {
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: "16px 16px 4px 16px",
    maxWidth: "80%",
    lineHeight: 1.6,
    fontSize: 14,
    whiteSpace: "pre-wrap",
  },
  typing: { color: "#94a3b8", fontStyle: "italic" },
  suggestions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    padding: "8px 16px",
    borderTop: "1px solid #334155",
  },
  chip: {
    background: "transparent",
    border: "1px solid #475569",
    color: "#94a3b8",
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 12,
    cursor: "pointer",
  },
  inputRow: {
    display: "flex",
    gap: 8,
    padding: "12px 16px",
    background: "#0f172a",
    borderTop: "1px solid #334155",
  },
  input: {
    flex: 1,
    background: "#1e293b",
    border: "1px solid #475569",
    borderRadius: 10,
    padding: "10px 14px",
    color: "#f1f5f9",
    fontSize: 14,
    outline: "none",
  },
  sendBtn: {
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 20px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 14,
  },
};
