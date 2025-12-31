from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI

# Initialize app
app = FastAPI(title="Portfolio AI Chatbot")

# Enable CORS (important for frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenAI client
client = OpenAI(api_key="YOUR_OPENAI_API_KEY")

# Load portfolio context
with open("profile_context.txt", "r", encoding="utf-8") as f:
    CONTEXT = f.read()

# Request schema
class ChatRequest(BaseModel):
    message: str

# Response schema
class ChatResponse(BaseModel):
    reply: str

@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": CONTEXT},
            {"role": "user", "content": request.message}
        ]
    )

    return {"reply": response.choices[0].message.content}

@app.get("/")
def root():
    return {"status": "Portfolio AI Chatbot is running 🚀"}
