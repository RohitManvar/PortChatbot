from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from ollama import Client
from db import SessionLocal, init_db
from models import Chat
from rag import load_rag
from sqlalchemy import func, desc
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ollama = Client()
vector_db = load_rag()
init_db()

SIMILARITY_THRESHOLD = 1.5
SYSTEM_PROMPT = (
    "You are Rohit Manvar's portfolio assistant. Answer questions about his work, "
    "skills, projects, and background in a friendly, professional tone. "
    "Use markdown formatting (bold, lists, code blocks) when helpful. Keep answers "
    "concise and grounded only in the context provided below.\n\nContext:\n{context}"
)


class ChatRequest(BaseModel):
    message: str
    session_id: str


@app.post("/chat")
def chat(req: ChatRequest):
    results = vector_db.similarity_search_with_score(req.message, k=3)

    if not results or results[0][1] > SIMILARITY_THRESHOLD:
        def offtopic():
            msg = "I can only answer questions about **Rohit's work, skills, and background**. Try asking about his projects, experience, or technical skills."
            yield "__SOURCES__[]__END__"
            yield msg
        return StreamingResponse(offtopic(), media_type="text/plain")

    docs = [r[0] for r in results]
    sources = [
        {"snippet": d.page_content[:140].strip(), "score": float(s)}
        for d, s in results
    ]
    context = "\n\n".join([d.page_content for d in docs])

    db = SessionLocal()
    history = (
        db.query(Chat)
        .filter(Chat.session_id == req.session_id)
        .order_by(desc(Chat.created_at))
        .limit(3)
        .all()
    )
    db.close()

    history_messages = []
    for h in reversed(history):
        history_messages.append({"role": "user", "content": h.user_message})
        history_messages.append({"role": "assistant", "content": h.bot_reply})

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT.format(context=context)},
        *history_messages,
        {"role": "user", "content": req.message},
    ]

    def generate():
        yield f"__SOURCES__{json.dumps(sources)}__END__"
        full_reply = ""
        stream = ollama.chat(model="llama3.2:1b", messages=messages, stream=True)
        for chunk in stream:
            token = chunk["message"]["content"]
            full_reply += token
            yield token

        db2 = SessionLocal()
        db2.add(Chat(
            session_id=req.session_id,
            user_message=req.message,
            bot_reply=full_reply,
            sources=json.dumps(sources),
        ))
        db2.commit()
        db2.close()

    return StreamingResponse(generate(), media_type="text/plain")


@app.get("/history/{session_id}")
def get_history(session_id: str):
    db = SessionLocal()
    chats = (
        db.query(Chat)
        .filter(Chat.session_id == session_id)
        .order_by(Chat.created_at)
        .all()
    )
    db.close()
    return [
        {
            "user": c.user_message,
            "bot": c.bot_reply,
            "sources": json.loads(c.sources or "[]"),
            "at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in chats
    ]


@app.get("/sessions")
def get_sessions():
    db = SessionLocal()
    rows = (
        db.query(
            Chat.session_id,
            func.count(Chat.id).label("count"),
            func.max(Chat.created_at).label("last_at"),
        )
        .group_by(Chat.session_id)
        .order_by(desc("last_at"))
        .all()
    )

    sessions = []
    for r in rows:
        first = (
            db.query(Chat.user_message)
            .filter(Chat.session_id == r[0])
            .order_by(Chat.created_at)
            .first()
        )
        sessions.append({
            "session_id": r[0],
            "title": (first[0][:60] if first else "Untitled"),
            "count": r[1],
            "last_at": r[2].isoformat() if r[2] else None,
        })
    db.close()
    return sessions


@app.delete("/sessions/{session_id}")
def delete_session(session_id: str):
    db = SessionLocal()
    db.query(Chat).filter(Chat.session_id == session_id).delete()
    db.commit()
    db.close()
    return {"ok": True}


@app.get("/admin/stats")
def get_stats():
    db = SessionLocal()
    total_chats = db.query(func.count(Chat.id)).scalar() or 0
    total_sessions = db.query(func.count(func.distinct(Chat.session_id))).scalar() or 0
    recent = (
        db.query(Chat.user_message, Chat.created_at)
        .order_by(desc(Chat.created_at))
        .limit(20)
        .all()
    )
    db.close()
    return {
        "total_chats": total_chats,
        "total_sessions": total_sessions,
        "recent_questions": [
            {"question": r[0], "at": r[1].isoformat() if r[1] else None}
            for r in recent
        ],
    }
