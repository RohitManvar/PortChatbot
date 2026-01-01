from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.vectorstores import FAISS
from langchain.document_loaders import TextLoader
import os

def load_rag():
    if os.path.exists("faiss_index"):
        return FAISS.load_local("faiss_index", OpenAIEmbeddings())

    loader = TextLoader("profile_docs/resume.txt")
    docs = loader.load()

    db = FAISS.from_documents(docs, OpenAIEmbeddings())
    db.save_local("faiss_index")
    return db
