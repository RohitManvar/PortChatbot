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
  X,
  ArrowUp,
  Plus,
  User,
  Info,
  ExternalLink,
  MessageSquarePlus,
  LayoutDashboard,
  Trash2,
  Menu,
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [userName, setUserName] = useState<string | null>(null);
  const [namePromptOpen, setNamePromptOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const inputBoxRef = useRef<HTMLInputElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const autoScrollRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const existing = localStorage.getItem("chat_session");
    if (existing) {
      loadSession(existing);
    } else {
      const sid = uuidv4();
      localStorage.setItem("chat_session", sid);
      setSessionId(sid);
      setMessages([
        {
          role: "bot",
          text: "Hi, I'm Rohit's portfolio assistant. Ask me anything about his work, skills, or projects.",
        },
      ]);
    }
    fetchSessions();

    const savedName = localStorage.getItem("user_name");
    if (savedName) {
      setUserName(savedName);
    } else {
      setNamePromptOpen(true);
    }

    try {
      const cached = JSON.parse(localStorage.getItem("chat_titles") || "{}");
      setTitles(cached);
    } catch {}
  }, []);

  useEffect(() => {
    if (autoScrollRef.current && chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages, loading]);

  function handleChatScroll() {
    const el = chatAreaRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    autoScrollRef.current = nearBottom;
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const inMenu = menuRef.current?.contains(target);
      const onAvatar = avatarRef.current?.contains(target);
      if (!inMenu && !onAvatar) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 900);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setAboutOpen(false);
        setNamePromptOpen(false);
      }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputBoxRef.current?.focus();
      }
      if (mod && e.key.toLowerCase() === "j") {
        e.preventDefault();
        newChat();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function clearAllHistory() {
    if (!confirm("Delete all chat history? This cannot be undone.")) return;
    for (const s of sessions) {
      await fetch(`${API}/sessions/${s.session_id}`, { method: "DELETE" });
    }
    fetchSessions();
    newChat();
    setMenuOpen(false);
  }

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
      setMobileSidebarOpen(false);
    } catch {}
  }

  function newChat() {
    const sid = uuidv4();
    localStorage.setItem("chat_session", sid);
    setSessionId(sid);
    setMessages([
      { role: "bot", text: "Hi, I'm Rohit's portfolio assistant. Ask me anything about his work, skills, or projects." },
    ]);
    setMobileSidebarOpen(false);
  }

  async function deleteSession(sid: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`${API}/sessions/${sid}`, { method: "DELETE" });
    fetchSessions();
    if (sid === sessionId) newChat();
  }

  function stop() {
    abortRef.current?.abort();
  }

  async function generateTitle(sid: string, msg: string) {
    try {
      const res = await fetch(`${API}/title`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (data.title) {
        setTitles((prev) => {
          const next = { ...prev, [sid]: data.title };
          localStorage.setItem("chat_titles", JSON.stringify(next));
          return next;
        });
      }
    } catch {}
  }

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const isFirstUserMessage = !messages.some((m) => m.role === "user");

    setMessages((prev) => [...prev, { role: "user", text: msg }, { role: "bot", text: "" }]);
    setInput("");
    setLoading(true);

    if (isFirstUserMessage) generateTitle(sessionId, msg);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, session_id: sessionId }),
        signal: controller.signal,
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sourcesParsed = false;
      let sources: Source[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        if (!sourcesParsed) {
          buffer += chunk;
          if (buffer.includes("__END__")) {
            const match = buffer.match(/^__SOURCES__(.*?)__END__/);
            if (match) {
              try {
                sources = JSON.parse(match[1]);
              } catch {}
              const initialText = buffer.slice(match[0].length);
              sourcesParsed = true;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "bot", text: initialText, sources };
                return updated;
              });
            }
          }
        } else {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "bot",
              text: updated[updated.length - 1].text + chunk,
              sources,
            };
            return updated;
          });
        }
      }
      fetchSessions();
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = {
            ...last,
            text: (last.text || "") + "\n\n_— stopped_",
          };
          return updated;
        });
        fetchSessions();
      } else {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "bot", text: "Sorry, I couldn't reach the server." };
          return updated;
        });
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
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

  const hasUserMessage = messages.some((m) => m.role === "user");

  return (
    <>
      <Head>
        <title>Ask Rohit — Portfolio Assistant</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div style={{ ...styles.page, ...(isMobile && styles.pageMobile) }}>
        <div style={{ ...styles.container, justifyContent: hasUserMessage ? "flex-start" : "center" }}>
          <header style={{ ...styles.header, ...(hasUserMessage ? styles.headerCompact : styles.headerHero) }}>
            <div style={styles.headerLeft}>
              <button
                ref={avatarRef}
                style={{
                  ...styles.avatar,
                  ...(hasUserMessage ? styles.avatarCompact : styles.avatarHero),
                  ...(isMobile && !hasUserMessage && styles.avatarHeroMobile),
                  ...(isMobile && hasUserMessage && styles.avatarCompactMobile),
                  cursor: "pointer", border: "none",
                }}
                onClick={() => setMenuOpen((v) => !v)}
                title="Menu"
              >
                R
              </button>
              {!hasUserMessage && (
                <div>
                  <h1 style={{ ...styles.title, ...styles.titleHero, ...(isMobile && styles.titleHeroMobile) }}>Ask Rohit.</h1>
                  <p style={styles.subtitle}>Portfolio assistant — Llama 3.2 · FAISS · LangChain</p>
                </div>
              )}
            </div>
          </header>

          {isMobile && hasUserMessage && (
            <button
              style={styles.mobileMenuToggle}
              onClick={() => setMobileSidebarOpen(true)}
              title="Open conversations"
            >
              <Menu size={20} />
            </button>
          )}

          {menuOpen && (
            <div
              ref={menuRef}
              style={hasUserMessage ? styles.menuCompact : styles.menuHero}
            >
              <button style={styles.menuItem} onClick={() => { setAboutOpen(true); setMenuOpen(false); }}>
                <Info size={16} /> About this assistant
              </button>
              <button style={styles.menuItem} onClick={() => { newChat(); setMenuOpen(false); }}>
                <MessageSquarePlus size={16} /> New chat
              </button>
              <a style={styles.menuItem} href="https://github.com/RohitManvar" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>
                <ExternalLink size={16} /> View portfolio
              </a>
              <a style={styles.menuItem} href="https://github.com/RohitManvar/PortChatbot" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>
                <ExternalLink size={16} /> Source code
              </a>
              <a style={styles.menuItem} href="/admin" onClick={() => setMenuOpen(false)}>
                <LayoutDashboard size={16} /> Admin panel
              </a>
              <div style={styles.menuDivider} />
              <button style={{ ...styles.menuItem, color: "#dc2626" }} onClick={clearAllHistory}>
                <Trash2 size={16} /> Clear all history
              </button>
            </div>
          )}

          {aboutOpen && (
            <div style={styles.modalOverlay} onClick={() => setAboutOpen(false)}>
              <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                <button style={styles.modalClose} onClick={() => setAboutOpen(false)}>
                  <X size={18} />
                </button>
                <h2 style={styles.modalTitle}>About this assistant</h2>
                <p style={styles.modalText}>
                  A privacy-first portfolio chatbot powered by a local LLM. Ask anything about Rohit's work, skills, and projects — answers are grounded in his resume via RAG (Retrieval-Augmented Generation).
                </p>
                <div style={styles.modalStack}>
                  <h3 style={styles.modalSubtitle}>Tech</h3>
                  <ul style={styles.modalList}>
                    <li>Ollama (Llama 3.2 · 1B)</li>
                    <li>FAISS vector store</li>
                    <li>LangChain document chunking</li>
                    <li>FastAPI streaming backend</li>
                    <li>Next.js + React frontend</li>
                    <li>SQLite chat history</li>
                  </ul>
                </div>
                <p style={styles.modalNote}>
                  <strong>Fully private:</strong> No API calls leave your machine. The model runs entirely on local hardware.
                </p>
              </div>
            </div>
          )}

          {hasUserMessage && (
            <div style={styles.chatAreaBare} ref={chatAreaRef} onScroll={handleChatScroll}>
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
            </div>
          )}

          <div style={styles.inputRow}>
              <button
                style={{
                  ...styles.pillIconBtn,
                  color: listening ? "#dc2626" : INK,
                }}
                onClick={toggleVoice}
                title="Voice input"
              >
                <Mic size={18} />
              </button>
              <input
                ref={inputBoxRef}
                style={styles.input}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask anything"
                disabled={loading}
              />
              {loading ? (
                <button
                  style={{ ...styles.sendCircle, cursor: "pointer" }}
                  onClick={stop}
                  title="Stop generating"
                >
                  <Square size={14} fill="currentColor" />
                </button>
              ) : (
                <button
                  style={{
                    ...styles.sendCircle,
                    opacity: !input.trim() ? 0.3 : 1,
                    cursor: !input.trim() ? "not-allowed" : "pointer",
                  }}
                  onClick={() => send()}
                  disabled={!input.trim()}
                  title="Send"
                >
                  <ArrowUp size={18} strokeWidth={2.5} />
                </button>
              )}
            </div>

          <footer style={styles.footer}>
            <span>Powered locally — no API calls, fully private.</span>
          </footer>
        </div>

        {isMobile && mobileSidebarOpen && (
          <div style={styles.mobileBackdrop} onClick={() => setMobileSidebarOpen(false)} />
        )}

        <aside style={{
          ...styles.sidebar,
          ...(isMobile && styles.sidebarMobile),
          ...(isMobile && {
            transform: mobileSidebarOpen ? "translateX(0)" : "translateX(100%)",
          }),
        }}>
          <div style={styles.sidebarHeader}>
            <h3 style={styles.sidebarTitle}>Conversations</h3>
            <button style={styles.newBtn} onClick={newChat}><Plus size={14} /> New</button>
          </div>
          {sessions.length > 0 && (
            <input
              style={styles.searchInput}
              type="text"
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}
          <div style={styles.sessionList}>
            {sessions.length === 0 && <p style={styles.empty}>No past conversations yet.</p>}
            {sessions
              .map((s) => ({ ...s, displayTitle: titles[s.session_id] || s.title }))
              .filter((s) =>
                search ? s.displayTitle.toLowerCase().includes(search.toLowerCase()) : true
              )
              .map((s) => (
                <div
                  key={s.session_id}
                  style={{
                    ...styles.sessionItem,
                    background: s.session_id === sessionId ? "#ebe7dc" : "transparent",
                  }}
                  onClick={() => loadSession(s.session_id)}
                >
                  <div style={styles.sessionTitle}>{s.displayTitle}</div>
                  <div style={styles.sessionMeta}>{s.count} msgs</div>
                  <button style={styles.deleteBtn} onClick={(e) => deleteSession(s.session_id, e)}><X size={14} /></button>
                </div>
              ))}
          </div>

          <div style={styles.suggestionsBlock}>
            <div style={styles.suggestionsLabel}>Try asking</div>
            <div style={styles.suggestionsList}>
              {SUGGESTIONS.map((s) => (
                <button key={s} style={styles.chip} onClick={() => send(s)} disabled={loading}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {!isMobile && (
          <div style={styles.userPill} title={userName || "Set your name"} onClick={() => setNamePromptOpen(true)}>
            <div style={styles.userIcon}>
              {userName ? userName.trim().charAt(0).toUpperCase() : <User size={18} />}
            </div>
            {userName && <span style={styles.userPillName}>{userName}</span>}
          </div>
        )}

        {namePromptOpen && (
          <div style={styles.modalOverlay} onClick={() => setNamePromptOpen(false)}>
            <div style={{ ...styles.modalCard, maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
              <button style={styles.modalClose} onClick={() => setNamePromptOpen(false)}>
                <X size={18} />
              </button>
              <h2 style={styles.modalTitle}>What's your name?</h2>
              <p style={styles.modalText}>
                I'll use it to personalize our chat. Just first name is fine.
              </p>
              <input
                style={{ ...styles.input, background: CREAM, border: `1px solid ${BORDER}`, marginBottom: 12, padding: "12px 16px", borderRadius: 10 }}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = nameInput.trim();
                    if (v) {
                      localStorage.setItem("user_name", v);
                      setUserName(v);
                    }
                    setNamePromptOpen(false);
                  }
                }}
                placeholder="Your name"
                autoFocus
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={{ ...styles.newBtn, padding: "10px 16px", flex: 1, justifyContent: "center" }}
                  onClick={() => {
                    const v = nameInput.trim();
                    if (v) {
                      localStorage.setItem("user_name", v);
                      setUserName(v);
                    }
                    setNamePromptOpen(false);
                  }}
                >
                  Save
                </button>
                <button
                  style={{ ...styles.menuItem, background: "transparent", border: `1px solid ${BORDER}`, padding: "10px 16px", justifyContent: "center", flex: 1 }}
                  onClick={() => setNamePromptOpen(false)}
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}
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
    height: "100vh",
    background: CREAM,
    fontFamily: FONT_SANS,
    color: INK,
    display: "flex",
    padding: "24px 0 24px 20px",
    gap: 20,
    justifyContent: "center",
    overflow: "hidden",
  },
  sidebar: {
    width: 290,
    background: PAPER,
    border: `1px solid ${BORDER}`,
    borderRadius: 20,
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    flexShrink: 0,
    height: "100%",
    minHeight: 0,
    boxShadow: "0 2px 6px rgba(0,0,0,0.04), 0 12px 32px -8px rgba(0,0,0,0.08)",
  },
  curveDivider: {
    width: "100%",
    height: 18,
    display: "block",
    margin: "0 0 6px 0",
    opacity: 0.6,
  },
  sidebarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  sidebarTitle: { fontFamily: FONT_SERIF, fontSize: 18, margin: 0 },
  newBtn: {
    background: INK, color: PAPER, border: "none", borderRadius: 8,
    padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600,
    display: "inline-flex", alignItems: "center", gap: 4,
  },
  sessionList: { display: "flex", flexDirection: "column", gap: 4, overflowY: "auto", flex: 1, minHeight: 0 },
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
  container: {
    width: "100%", maxWidth: 760, display: "flex", flexDirection: "column",
    gap: 10, minHeight: 0, flex: 1,
    transition: "justify-content 0.4s ease",
  },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  avatar: {
    borderRadius: "50%", background: INK, color: CREAM,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: FONT_SERIF, fontWeight: 600, flexShrink: 0,
    transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1), height 0.4s cubic-bezier(0.4, 0, 0.2, 1), font-size 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  avatarHero: { width: 96, height: 96, fontSize: 42 },
  avatarCompact: {
    width: 48, height: 48, fontSize: 22,
    position: "fixed", top: 20, left: 20, zIndex: 5,
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
  },
  title: {
    fontFamily: FONT_SERIF, fontWeight: 600,
    margin: 0, letterSpacing: "-0.03em", lineHeight: 1.05, color: INK,
    transition: "font-size 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  titleHero: { fontSize: 72 },
  titleCompact: { fontSize: 36 },
  headerHero: { paddingBottom: 8 },
  headerCompact: { paddingBottom: 0 },
  subtitle: { fontSize: 13, color: MUTED, margin: "4px 0 0 0" },
  chatAreaBare: {
    flex: 1, minHeight: 0, padding: "8px 0 16px",
    display: "flex", flexDirection: "column", gap: 20, overflowY: "auto",
  },
  ctaRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  ctaLink: {
    background: PAPER, border: `1px solid ${BORDER}`, color: INK,
    padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 500,
    textDecoration: "none", transition: "all 0.15s",
    display: "inline-flex", alignItems: "center", gap: 6,
  },
  chatCard: {
    background: PAPER, borderRadius: 20, border: `1px solid ${BORDER}`,
    overflow: "hidden", display: "flex", flexDirection: "column",
    boxShadow: "0 2px 6px rgba(0,0,0,0.04), 0 12px 32px -8px rgba(0,0,0,0.08)",
    flex: 1, minHeight: 0,
  },
  chatArea: {
    flex: 1, minHeight: 0, padding: "28px 24px 16px",
    display: "flex", flexDirection: "column", gap: 18, overflowY: "auto",
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
  suggestionsBlock: {
    display: "flex", flexDirection: "column", gap: 8,
    paddingTop: 12, borderTop: `1px solid ${BORDER}`,
    flexShrink: 0,
  },
  suggestionsLabel: {
    fontSize: 11, fontWeight: 600, color: MUTED,
    textTransform: "uppercase", letterSpacing: "0.06em",
  },
  suggestionsList: { display: "flex", flexDirection: "column", gap: 6 },
  chip: {
    background: CREAM, border: `1px solid ${BORDER}`, color: INK,
    borderRadius: 10, padding: "8px 12px", fontSize: 12.5,
    fontFamily: FONT_SANS, fontWeight: 500, cursor: "pointer",
    textAlign: "left", width: "100%",
  },
  inputRow: {
    display: "flex", alignItems: "center", gap: 4,
    margin: "12px 0 4px", padding: "6px 6px 6px 14px",
    background: PAPER, border: `1px solid ${BORDER}`, borderRadius: 999,
    boxShadow: "0 6px 22px -6px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.04)",
    flexShrink: 0,
  },
  pillIconBtn: {
    background: "transparent", border: "none", color: INK,
    width: 38, height: 38, borderRadius: "50%",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", flexShrink: 0,
  },
  input: {
    flex: 1, background: "transparent", border: "none",
    padding: "10px 8px", color: INK, fontSize: 15, fontFamily: FONT_SANS,
    outline: "none", minWidth: 0,
  },
  sendCircle: {
    background: INK, color: PAPER, border: "none",
    width: 38, height: 38, borderRadius: "50%",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, transition: "opacity 0.15s",
  },
  footer: { textAlign: "center", fontSize: 12, color: MUTED, padding: "8px 0" },
  footerLink: { color: INK, textDecoration: "underline", marginLeft: 4 },
  userPill: {
    position: "fixed", left: 20, bottom: 20,
    display: "flex", alignItems: "center", gap: 8,
    background: PAPER, border: `1px solid ${BORDER}`,
    borderRadius: 999, padding: 6,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    zIndex: 10, cursor: "pointer",
  },
  userIcon: {
    width: 36, height: 36, borderRadius: "50%", background: INK, color: PAPER,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    fontFamily: FONT_SERIF, fontSize: 17, fontWeight: 600,
  },
  userPillName: {
    fontSize: 13, fontWeight: 500, color: INK, paddingRight: 10,
  },
  searchInput: {
    width: "100%", background: CREAM, border: `1px solid ${BORDER}`,
    borderRadius: 10, padding: "8px 12px", color: INK, fontSize: 13,
    fontFamily: FONT_SANS, outline: "none", flexShrink: 0,
  },
  pageMobile: { padding: "16px 12px" },
  avatarHeroMobile: { width: 64, height: 64, fontSize: 28 },
  avatarCompactMobile: { width: 40, height: 40, fontSize: 18, top: 12, left: 12 },
  titleHeroMobile: { fontSize: 44 },
  mobileMenuToggle: {
    position: "fixed", top: 12, right: 12, zIndex: 30,
    width: 40, height: 40, borderRadius: "50%",
    background: PAPER, border: `1px solid ${BORDER}`, color: INK,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  mobileBackdrop: {
    position: "fixed", inset: 0, background: "rgba(26,26,26,0.4)",
    zIndex: 80, backdropFilter: "blur(2px)",
  },
  sidebarMobile: {
    position: "fixed", top: 0, right: 0, bottom: 0,
    height: "100vh", width: "min(320px, 88vw)",
    borderRadius: 0, margin: 0, zIndex: 90,
    transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  menuCompact: {
    position: "fixed", top: 78, left: 20, zIndex: 20,
    width: 240, background: PAPER, border: `1px solid ${BORDER}`,
    borderRadius: 14, padding: 6,
    boxShadow: "0 10px 30px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
    display: "flex", flexDirection: "column", gap: 2,
  },
  menuHero: {
    position: "absolute", marginTop: 110, zIndex: 20,
    width: 240, background: PAPER, border: `1px solid ${BORDER}`,
    borderRadius: 14, padding: 6,
    boxShadow: "0 10px 30px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
    display: "flex", flexDirection: "column", gap: 2,
  },
  menuItem: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "9px 12px", borderRadius: 8,
    background: "transparent", border: "none", color: INK,
    fontSize: 13.5, fontFamily: FONT_SANS, fontWeight: 500,
    cursor: "pointer", textAlign: "left", width: "100%",
    textDecoration: "none",
  },
  menuDivider: { height: 1, background: BORDER, margin: "4px 6px" },
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(26,26,26,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 50, padding: 20, backdropFilter: "blur(4px)",
  },
  modalCard: {
    background: PAPER, borderRadius: 18, padding: "32px 28px",
    maxWidth: 480, width: "100%", position: "relative",
    boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
    maxHeight: "85vh", overflowY: "auto",
  },
  modalClose: {
    position: "absolute", top: 14, right: 14, background: "transparent",
    border: "none", color: MUTED, cursor: "pointer",
    width: 32, height: 32, borderRadius: "50%",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
  },
  modalTitle: {
    fontFamily: FONT_SERIF, fontSize: 28, fontWeight: 600,
    margin: "0 0 12px 0", letterSpacing: "-0.02em",
  },
  modalSubtitle: {
    fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600,
    textTransform: "uppercase", letterSpacing: "0.06em",
    color: MUTED, margin: "0 0 8px 0",
  },
  modalText: { fontSize: 14.5, lineHeight: 1.65, color: INK, margin: "0 0 20px 0" },
  modalStack: { background: CREAM, borderRadius: 12, padding: 16, marginBottom: 16 },
  modalList: { fontSize: 13.5, lineHeight: 1.8, color: INK, paddingLeft: 18, margin: 0 },
  modalNote: { fontSize: 13, color: MUTED, margin: 0, lineHeight: 1.6 },
};
