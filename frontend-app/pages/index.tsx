import { useState, useRef, useEffect, KeyboardEvent } from "react";
import Head from "next/head";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { v4 as uuidv4 } from "uuid";
import {
  Mail,
  FileText,
  BookOpen,
  Copy,
  Volume2,
  Square,
  Mic,
  Menu,
  X,
  ArrowRight,
  Plus,
} from "lucide-react";

const Github = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.36-3.88-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.24 3.34.95.1-.74.4-1.24.73-1.53-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.97 10.97 0 0 1 5.73 0c2.19-1.49 3.15-1.18 3.15-1.18.63 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.09 0 4.43-2.7 5.41-5.26 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/>
  </svg>
);

const Linkedin = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/>
  </svg>
);

type Source = { snippet: string; score: number };
type Message = { role: "user" | "bot"; text: string; sources?: Source[] };
type Session = { session_id: string; title: string; count: number; last_at: string };

const SUGGESTIONS = [
  "What projects have you built?",
  "Tell me about your skills",
  "Your experience with Data Engineering",
  "Education background",
];

const CTAs = [
  { label: "Email", href: "mailto:rohitmanvar123@gmail.com", icon: Mail },
  { label: "LinkedIn", href: "https://linkedin.com/in/rohitmanvar", icon: Linkedin },
  { label: "GitHub", href: "https://github.com/RohitManvar", icon: Github },
  { label: "Resume", href: "/resume.pdf", download: true, icon: FileText },
];

const API = "http://localhost:8003";

export default function Home() {
  const [sessionId, setSessionId] = useState<string>("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    let sid = localStorage.getItem("chat_session");
    if (!sid) {
      sid = uuidv4();
      localStorage.setItem("chat_session", sid);
    }
    setSessionId(sid);
    fetchSessions();
    setMessages([
      {
        role: "bot",
        text: "Hi, I'm Rohit's portfolio assistant. Ask me anything about his work, skills, or projects.",
      },
    ]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function fetchSessions() {
    try {
      const res = await fetch(`${API}/sessions`);
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      setSessions([]);
    }
  }

  async function loadSession(sid: string) {
    setSessionId(sid);
    localStorage.setItem("chat_session", sid);
    try {
      const res = await fetch(`${API}/history/${sid}`);
      const data = await res.json();
      const msgs: Message[] = [
        { role: "bot", text: "Hi, I'm Rohit's portfolio assistant. Ask me anything about his work, skills, or projects." },
      ];
      if (Array.isArray(data)) {
        data.forEach((c: any) => {
          msgs.push({ role: "user", text: c.user });
          msgs.push({ role: "bot", text: c.bot, sources: c.sources || [] });
        });
      }
      setMessages(msgs);
      setSidebarOpen(false);
    } catch {}
  }

  function newChat() {
    const sid = uuidv4();
    localStorage.setItem("chat_session", sid);
    setSessionId(sid);
    setMessages([
      { role: "bot", text: "Hi, I'm Rohit's portfolio assistant. Ask me anything about his work, skills, or projects." },
    ]);
    setSidebarOpen(false);
  }

  async function deleteSession(sid: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`${API}/sessions/${sid}`, { method: "DELETE" });
    fetchSessions();
    if (sid === sessionId) newChat();
  }

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: msg }, { role: "bot", text: "" }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, session_id: sessionId }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sourcesParsed = false;
      let sources: Source[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        if (!sourcesParsed && buffer.includes("__END__")) {
          const match = buffer.match(/^__SOURCES__(.*?)__END__/);
          if (match) {
            try {
              sources = JSON.parse(match[1]);
            } catch {}
            buffer = buffer.slice(match[0].length);
            sourcesParsed = true;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "bot", text: buffer, sources };
              return updated;
            });
            continue;
          }
        }

        if (sourcesParsed) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "bot",
              text: updated[updated.length - 1].text + decoder.decode(value, { stream: true }),
              sources,
            };
            return updated;
          });
        }
      }
      fetchSessions();
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "bot", text: "Sorry, I couldn't reach the server." };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") send();
  }

  function toggleVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input not supported in this browser. Try Chrome.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
      send(transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  function speak(text: string, idx: number) {
    if (speaking === idx) {
      window.speechSynthesis.cancel();
      setSpeaking(null);
      return;
    }
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_`#]/g, "");
    const utter = new SpeechSynthesisUtterance(clean);
    utter.onend = () => setSpeaking(null);
    utter.onerror = () => setSpeaking(null);
    window.speechSynthesis.speak(utter);
    setSpeaking(idx);
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <>
      <Head>
        <title>Ask Rohit — Portfolio Assistant</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div style={styles.page}>
        {sidebarOpen && (
          <div style={styles.sidebar}>
            <div style={styles.sidebarHeader}>
              <h3 style={styles.sidebarTitle}>Conversations</h3>
              <button style={styles.newBtn} onClick={newChat}><Plus size={14} /> New</button>
            </div>
            <div style={styles.sessionList}>
              {sessions.length === 0 && <p style={styles.empty}>No past conversations yet.</p>}
              {sessions.map((s) => (
                <div
                  key={s.session_id}
                  style={{
                    ...styles.sessionItem,
                    background: s.session_id === sessionId ? "#ebe7dc" : "transparent",
                  }}
                  onClick={() => loadSession(s.session_id)}
                >
                  <div style={styles.sessionTitle}>{s.title}</div>
                  <div style={styles.sessionMeta}>{s.count} msgs</div>
                  <button style={styles.deleteBtn} onClick={(e) => deleteSession(s.session_id, e)}><X size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={styles.container}>
          <header style={styles.header}>
            <div style={styles.headerLeft}>
              <button style={styles.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
                {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
              <div style={styles.avatar}>R</div>
              <div>
                <h1 style={styles.title}>Ask Rohit.</h1>
                <p style={styles.subtitle}>Portfolio assistant — Llama 3.2 · FAISS · LangChain</p>
              </div>
            </div>
            <div style={styles.statusDot}>
              <span style={styles.dot} />
              <span style={styles.statusText}>online</span>
            </div>
          </header>

          <div style={styles.ctaRow}>
            {CTAs.map((c) => {
              const Icon = c.icon;
              return (
                <a
                  key={c.label}
                  href={c.href}
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  download={c.download}
                  style={styles.ctaLink}
                >
                  <Icon size={14} />
                  {c.label}
                </a>
              );
            })}
          </div>

          <section style={styles.chatCard}>
            <div style={styles.chatArea}>
              {messages.map((m, i) => (
                <div key={i} style={m.role === "user" ? styles.rowRight : styles.rowLeft}>
                  {m.role === "bot" && <div style={styles.botBadge}>R</div>}
                  <div style={styles.messageBlock}>
                    <div style={m.role === "user" ? styles.bubbleUser : styles.bubbleBot}>
                      {m.role === "bot" ? (
                        m.text ? (
                          <div style={styles.markdownBody}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                code({ inline, className, children, ...props }: any) {
                                  const match = /language-(\w+)/.exec(className || "");
                                  return !inline && match ? (
                                    <SyntaxHighlighter
                                      style={oneLight}
                                      language={match[1]}
                                      PreTag="div"
                                      customStyle={{ borderRadius: 8, fontSize: 13 }}
                                      {...props}
                                    >
                                      {String(children).replace(/\n$/, "")}
                                    </SyntaxHighlighter>
                                  ) : (
                                    <code style={styles.inlineCode} {...props}>{children}</code>
                                  );
                                },
                              }}
                            >
                              {m.text}
                            </ReactMarkdown>
                            {loading && i === messages.length - 1 && <span style={styles.cursor}>▊</span>}
                          </div>
                        ) : (
                          <span style={styles.typing}>thinking…</span>
                        )
                      ) : (
                        m.text
                      )}
                    </div>

                    {m.role === "bot" && m.text && (
                      <div style={styles.actionRow}>
                        <button style={styles.actionBtn} onClick={() => copy(m.text)} title="Copy">
                          <Copy size={12} /> Copy
                        </button>
                        <button style={styles.actionBtn} onClick={() => speak(m.text, i)} title="Speak">
                          {speaking === i ? (<><Square size={12} /> Stop</>) : (<><Volume2 size={12} /> Speak</>)}
                        </button>
                      </div>
                    )}

                    {m.role === "bot" && m.sources && m.sources.length > 0 && (
                      <details style={styles.sourcesBlock}>
                        <summary style={styles.sourcesSummary}>
                          <BookOpen size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
                          {m.sources.length} source{m.sources.length > 1 ? "s" : ""}
                        </summary>
                        {m.sources.map((s, si) => (
                          <div key={si} style={styles.sourceItem}>
                            <span style={styles.sourceText}>{s.snippet}…</span>
                          </div>
                        ))}
                      </details>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <button key={s} style={styles.chip} onClick={() => send(s)} disabled={loading}>
                  {s}
                </button>
              ))}
            </div>

            <div style={styles.inputRow}>
              <button
                style={{ ...styles.iconBtn, background: listening ? "#fca5a5" : "transparent" }}
                onClick={toggleVoice}
                title="Voice input"
              >
                <Mic size={16} />
              </button>
              <input
                style={styles.input}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask anything about Rohit…"
                disabled={loading}
              />
              <button
                style={{
                  ...styles.sendBtn,
                  opacity: loading || !input.trim() ? 0.4 : 1,
                  cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                }}
                onClick={() => send()}
                disabled={loading || !input.trim()}
              >
                Send <ArrowRight size={14} />
              </button>
            </div>
          </section>

          <footer style={styles.footer}>
            <span>Powered locally — no API calls, fully private. <a href="/admin" style={styles.footerLink}>Admin →</a></span>
          </footer>
        </div>
      </div>
    </>
  );
}

const FONT_SERIF = "'Fraunces', 'Times New Roman', serif";
const FONT_SANS = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

const CREAM = "#f5f3ee";
const PAPER = "#ffffff";
const INK = "#1a1a1a";
const MUTED = "#6b6b6b";
const BORDER = "#e5e2d9";

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: CREAM,
    fontFamily: FONT_SANS,
    color: INK,
    display: "flex",
    padding: "40px 20px",
    gap: 20,
    justifyContent: "center",
  },
  sidebar: {
    width: 260,
    background: PAPER,
    border: `1px solid ${BORDER}`,
    borderRadius: 14,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    maxHeight: "85vh",
    position: "sticky",
    top: 40,
  },
  sidebarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  sidebarTitle: { fontFamily: FONT_SERIF, fontSize: 18, margin: 0 },
  newBtn: {
    background: INK, color: PAPER, border: "none", borderRadius: 8,
    padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600,
    display: "inline-flex", alignItems: "center", gap: 4,
  },
  sessionList: { display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" },
  empty: { color: MUTED, fontSize: 13, textAlign: "center", padding: 16 },
  sessionItem: {
    padding: "10px 12px", borderRadius: 8, cursor: "pointer", position: "relative",
    transition: "background 0.15s",
  },
  sessionTitle: { fontSize: 13, fontWeight: 500, color: INK, paddingRight: 20, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  sessionMeta: { fontSize: 11, color: MUTED, marginTop: 2 },
  deleteBtn: {
    position: "absolute", right: 8, top: 10, background: "transparent",
    border: "none", color: MUTED, cursor: "pointer", lineHeight: 1,
    display: "inline-flex", alignItems: "center",
  },
  container: { width: "100%", maxWidth: 720, display: "flex", flexDirection: "column", gap: 16 },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  menuBtn: {
    background: PAPER, border: `1px solid ${BORDER}`, borderRadius: 8,
    padding: "6px 10px", fontSize: 16, cursor: "pointer",
  },
  avatar: {
    width: 52, height: 52, borderRadius: "50%", background: INK, color: CREAM,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: FONT_SERIF, fontSize: 24, fontWeight: 600, flexShrink: 0,
  },
  title: { fontFamily: FONT_SERIF, fontSize: 30, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" },
  subtitle: { fontSize: 12.5, color: MUTED, margin: "2px 0 0 0" },
  statusDot: {
    display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: MUTED,
    background: PAPER, padding: "6px 12px", borderRadius: 999, border: `1px solid ${BORDER}`,
  },
  dot: { width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 0 3px rgba(34,197,94,0.15)" },
  statusText: { fontWeight: 500 },
  ctaRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  ctaLink: {
    background: PAPER, border: `1px solid ${BORDER}`, color: INK,
    padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 500,
    textDecoration: "none", transition: "all 0.15s",
    display: "inline-flex", alignItems: "center", gap: 6,
  },
  chatCard: {
    background: PAPER, borderRadius: 18, border: `1px solid ${BORDER}`,
    overflow: "hidden", display: "flex", flexDirection: "column",
    boxShadow: "0 1px 3px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)",
  },
  chatArea: {
    padding: "28px 24px", display: "flex", flexDirection: "column", gap: 18,
    minHeight: 380, maxHeight: 520, overflowY: "auto",
  },
  rowLeft: { display: "flex", alignItems: "flex-start", gap: 10 },
  rowRight: { display: "flex", justifyContent: "flex-end" },
  botBadge: {
    width: 28, height: 28, borderRadius: "50%", background: INK, color: CREAM,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: FONT_SERIF, fontSize: 13, fontWeight: 600, flexShrink: 0, marginTop: 2,
  },
  messageBlock: { display: "flex", flexDirection: "column", gap: 6, maxWidth: "85%" },
  bubbleBot: {
    background: CREAM, color: INK, padding: "12px 16px",
    borderRadius: "4px 16px 16px 16px", lineHeight: 1.65, fontSize: 14.5,
    border: `1px solid ${BORDER}`,
  },
  bubbleUser: {
    background: INK, color: PAPER, padding: "12px 16px",
    borderRadius: "16px 16px 4px 16px", lineHeight: 1.65, fontSize: 14.5,
    whiteSpace: "pre-wrap", maxWidth: "85%",
  },
  markdownBody: { },
  inlineCode: {
    background: "#ebe7dc", padding: "2px 6px", borderRadius: 4,
    fontSize: 13, fontFamily: "monospace",
  },
  cursor: { display: "inline-block", marginLeft: 2, color: MUTED, animation: "blink 1s infinite" },
  typing: { color: MUTED, fontStyle: "italic" },
  actionRow: { display: "flex", gap: 6 },
  actionBtn: {
    background: "transparent", border: "none", color: MUTED,
    fontSize: 11, cursor: "pointer", padding: "2px 6px", borderRadius: 4,
    display: "inline-flex", alignItems: "center", gap: 4,
  },
  sourcesBlock: { fontSize: 12, marginTop: 4 },
  sourcesSummary: {
    color: MUTED, cursor: "pointer", padding: "4px 0", fontWeight: 500,
    display: "inline-flex", alignItems: "center",
  },
  sourceItem: {
    background: CREAM, padding: "6px 10px", borderRadius: 6,
    marginTop: 4, border: `1px solid ${BORDER}`,
  },
  sourceText: { color: "#4a4a4a", fontSize: 12, fontStyle: "italic" },
  suggestions: {
    display: "flex", flexWrap: "wrap", gap: 8, padding: "16px 20px 12px",
    borderTop: `1px solid ${BORDER}`,
  },
  chip: {
    background: PAPER, border: `1px solid ${BORDER}`, color: INK,
    borderRadius: 999, padding: "6px 14px", fontSize: 12.5,
    fontFamily: FONT_SANS, fontWeight: 500, cursor: "pointer",
  },
  inputRow: { display: "flex", gap: 8, padding: "12px 16px 16px", background: PAPER, borderTop: `1px solid ${BORDER}` },
  iconBtn: {
    background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 10,
    padding: "10px 12px", cursor: "pointer", fontSize: 14, color: INK,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
  },
  input: {
    flex: 1, background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 10,
    padding: "12px 16px", color: INK, fontSize: 14.5, fontFamily: FONT_SANS, outline: "none",
  },
  sendBtn: {
    background: INK, color: PAPER, border: "none", borderRadius: 10,
    padding: "12px 22px", fontWeight: 600, fontSize: 14, fontFamily: FONT_SANS,
    display: "inline-flex", alignItems: "center", gap: 6,
  },
  footer: { textAlign: "center", fontSize: 12, color: MUTED, padding: "8px 0" },
  footerLink: { color: INK, textDecoration: "underline", marginLeft: 4 },
};
