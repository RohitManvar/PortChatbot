from fastapi import FastAPI
from pydantic import BaseModel
from openai import OpenAI
from db import SessionLocal, init_db
from models import Chat
from rag import load_rag

app = FastAPI()
client = OpenAI()
vector_db = load_rag()
init_db()

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
def chat(req: ChatRequest):
    docs = vector_db.similarity_search(req.message, k=3)
    context = "\n".join([d.page_content for d in docs])

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": f"Answer using context:\n{context}"},
            {"role": "user", "content": req.message}
        ]
    )

    reply = response.choices[0].message.content

    db = SessionLocal()
    db.add(Chat(user_message=req.message, bot_reply=reply))
    db.commit()

    return {"reply": reply}
