# PortChatbot — Rohit's Portfolio Assistant

A privacy-first portfolio chatbot powered by a local LLM. Visitors can ask anything about Rohit's work, skills, and projects — answers are grounded in his resume via RAG (Retrieval-Augmented Generation), with no API calls leaving the machine.

Built with **FastAPI + Next.js + Ollama + FAISS + LangChain**.

---

## Features

| | Feature |
|---|---|
| 1 | **Markdown rendering** — Bot replies render with bold, lists, headers, and inline code |
| 2 | **Conversation memory** — Last 3 exchanges sent as context so follow-up questions work |
| 3 | **Hire-me CTAs** — Quick links to Email, LinkedIn, GitHub, and Resume PDF |
| 4 | **Source citations** — Expandable list showing which resume snippets grounded each answer |
| 5 | **Off-topic guard** — Politely refuses questions unrelated to Rohit (FAISS similarity threshold) |
| 6 | **Chat history sidebar** — Past conversations saved per browser session |
| 7 | **Voice input** — Speak questions via Web Speech API (Chrome) |
| 8 | **Text-to-speech** — Bot replies can be read aloud |
| 9 | **Code syntax highlighting** — Code blocks in responses are highlighted via Prism |
| 10 | **Streaming with typewriter cursor** — Tokens stream in real time with a blinking cursor |

Plus an **admin analytics page** at `/admin` showing total chats, unique sessions, and recent questions.

---

## Tech Stack

**Backend**
- FastAPI (Python)
- Ollama (`llama3.2:1b` for chat, `nomic-embed-text` for embeddings)
- FAISS vector store
- LangChain (document loaders, text splitter)
- SQLAlchemy + SQLite (chat history)

**Frontend**
- Next.js 16 (pages router)
- React 19 + TypeScript
- `react-markdown` + `remark-gfm`
- `react-syntax-highlighter`
- `lucide-react` icons
- Web Speech API (voice in/out)

---

## Architecture

```
User question
   ↓
Next.js UI ──fetch──▶ FastAPI /chat
                          ↓
                   FAISS similarity_search(k=3, score threshold)
                          ↓
              off-topic? → return fallback message
                          ↓
                Get last 3 turns from SQLite
                          ↓
                Ollama chat (streaming)
                          ↓
              Yield sources prefix, then stream tokens
                          ↓
              Save full exchange to SQLite
```

---

## Prerequisites

- **Python 3.13+**
- **Node.js 20+**
- **Ollama** — install from https://ollama.com/download

Pull the required models once:
```bash
ollama pull llama3.2:1b
ollama pull nomic-embed-text
```

---

## Setup

### 1. Backend

```bash
cd Backend
pip install -r ../requirements.txt
pip install ollama langchain-ollama
python -m uvicorn main:app --port 8003
```

Backend runs at `http://localhost:8003`. On first start, it builds the FAISS index from `Backend/profile_docs/resume.txt`.

### 2. Frontend

```bash
cd frontend-app
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

---

## Project Structure

```
PortChatbot-main/
├── Backend/
│   ├── main.py              # FastAPI app, /chat, /history, /sessions, /admin/stats
│   ├── rag.py               # FAISS + Ollama embeddings + chunking
│   ├── db.py                # SQLite (chat.db)
│   ├── models.py            # Chat schema (session_id, sources, timestamp)
│   └── profile_docs/
│       └── resume.txt       # Source-of-truth for the bot
│
├── frontend-app/            # Next.js project
│   ├── pages/
│   │   ├── index.tsx        # Main chat UI
│   │   └── admin.tsx        # Analytics page
│   ├── styles/globals.css
│   └── public/
│       └── resume.pdf       # (drop your PDF here for the download CTA)
│
├── Frontend/                # Original single-file React component (legacy)
├── requirements.txt
└── README.md
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/chat` | Streaming chat — body: `{message, session_id}` |
| GET | `/history/{session_id}` | All messages for a session |
| GET | `/sessions` | List all sessions with titles |
| DELETE | `/sessions/{session_id}` | Delete a session |
| GET | `/admin/stats` | Total chats, sessions, recent questions |

The `/chat` response stream is prefixed with `__SOURCES__[...]__END__` (JSON array of source snippets), followed by the streamed text tokens.

---

## Customisation

- **Update the bot's knowledge** — edit `Backend/profile_docs/resume.txt`, delete `Backend/faiss_index/`, restart backend.
- **Change CTAs** — edit the `CTAs` array near the top of `frontend-app/pages/index.tsx`.
- **Tune off-topic strictness** — adjust `SIMILARITY_THRESHOLD` in `Backend/main.py` (lower = stricter).
- **Swap the model** — change `model="llama3.2:1b"` in `Backend/main.py` to any model you've `ollama pull`-ed.

---

## Why local?

Most portfolio chatbots use OpenAI/Anthropic APIs, which means:
- Recurring cost per visitor
- Your resume data leaves your machine
- Rate-limited

This runs **entirely on your laptop** — no API keys, no quotas, no third party sees a single query. Trade-off: requires Ollama running locally (~2 GB RAM).

---

## License

MIT — feel free to fork and adapt for your own portfolio.

---

## Author

**Rohit Manvar**
[Email](mailto:rohitmanvar123@gmail.com) · [GitHub](https://github.com/RohitManvar) · [LinkedIn](https://linkedin.com/in/rohitmanvar)
