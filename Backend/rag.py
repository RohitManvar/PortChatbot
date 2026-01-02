from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import TextLoader
import os

def load_rag():
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small"
    )

    if os.path.exists("faiss_index"):
        return FAISS.load_local(
            "faiss_index",
            embeddings,
            allow_dangerous_deserialization=True
        )

    loader = TextLoader("profile_docs/resume.txt")
    docs = loader.load()

    db = FAISS.from_documents(docs, embeddings)
    db.save_local("faiss_index")
    return db
