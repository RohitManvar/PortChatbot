import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Stats = {
  total_chats: number;
  total_sessions: number;
  recent_questions: { question: string; at: string }[];
};

const API = "http://localhost:8003";

export default function Admin() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/admin/stats`)
      .then((r) => r.json())
      .then((d) => {
        setStats(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <Head>
        <title>Admin · Ask Rohit</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>Analytics.</h1>
            <Link href="/" style={styles.back}>
              <ArrowLeft size={14} /> Back to chat
            </Link>
          </div>

          {loading && <p style={styles.muted}>Loading…</p>}

          {stats && (
            <>
              <div style={styles.statGrid}>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Total messages</div>
                  <div style={styles.statValue}>{stats.total_chats}</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Unique sessions</div>
                  <div style={styles.statValue}>{stats.total_sessions}</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Avg per session</div>
                  <div style={styles.statValue}>
                    {stats.total_sessions
                      ? (stats.total_chats / stats.total_sessions).toFixed(1)
                      : "0"}
                  </div>
                </div>
              </div>

              <div style={styles.card}>
                <h2 style={styles.sectionTitle}>Recent questions</h2>
                {!stats.recent_questions || stats.recent_questions.length === 0 ? (
                  <p style={styles.muted}>No questions yet.</p>
                ) : (
                  <div style={styles.questionList}>
                    {stats.recent_questions.map((q, i) => (
                      <div key={i} style={styles.questionRow}>
                        <span style={styles.questionText}>{q.question}</span>
                        <span style={styles.questionTime}>
                          {q.at ? new Date(q.at).toLocaleString() : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

const FONT_SERIF = "'Fraunces', 'Times New Roman', serif";
const FONT_SANS = "'Inter', sans-serif";
const CREAM = "#f5f3ee";
const PAPER = "#ffffff";
const INK = "#1a1a1a";
const MUTED = "#6b6b6b";
const BORDER = "#e5e2d9";

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: CREAM, fontFamily: FONT_SANS, color: INK, padding: "40px 20px" },
  container: { maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline" },
  title: { fontFamily: FONT_SERIF, fontSize: 36, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" },
  back: {
    color: INK, fontSize: 14, textDecoration: "underline",
    display: "inline-flex", alignItems: "center", gap: 4,
  },
  muted: { color: MUTED },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
  statCard: {
    background: PAPER, border: `1px solid ${BORDER}`, borderRadius: 14,
    padding: 20, display: "flex", flexDirection: "column", gap: 8,
  },
  statLabel: { fontSize: 12, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em" },
  statValue: { fontFamily: FONT_SERIF, fontSize: 38, fontWeight: 600, color: INK },
  card: { background: PAPER, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 },
  sectionTitle: { fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 600, margin: "0 0 16px 0" },
  questionList: { display: "flex", flexDirection: "column", gap: 0 },
  questionRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 0", borderBottom: `1px solid ${BORDER}`, gap: 16,
  },
  questionText: { fontSize: 14, color: INK, flex: 1 },
  questionTime: { fontSize: 12, color: MUTED, whiteSpace: "nowrap" },
};
