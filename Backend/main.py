from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from ollama import Client
from db import SessionLocal, init_db
from models import Chat
from rag import load_rag

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

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
def chat(req: ChatRequest):
    docs = vector_db.similarity_search(req.message, k=3)
    context = "\n".join([d.page_content for d in docs])

    def generate():
        full_reply = ""
        stream = ollama.chat(
            model="llama3.2:1b",
            messages=[
                {"role": "system", "content": f"You are a helpful assistant who answers questions about Rohit Manvar based on the following context:\n{context}"},
                {"role": "user", "content": req.message},
            ],
            stream=True,
        )
        for chunk in stream:
            token = chunk["message"]["content"]
            full_reply += token
            yield token

        db = SessionLocal()
        db.add(Chat(user_message=req.message, bot_reply=full_reply))
        db.commit()
        db.close()

    return StreamingResponse(generate(), media_type="text/plain")
