from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timezone

Base = declarative_base()

class Chat(Base):
    __tablename__ = "chats"
    id = Column(Integer, primary_key=True)
    session_id = Column(String, index=True)
    user_message = Column(Text)
    bot_reply = Column(Text)
    sources = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
