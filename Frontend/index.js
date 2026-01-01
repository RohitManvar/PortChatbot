import { useState } from "react";

export default function Home() {
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState([]);

  async function send() {
    const res = await fetch("http://localhost:8000/chat", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ message: msg })
    });
    const data = await res.json();
    setChat([...chat, {user: msg, bot: data.reply}]);
    setMsg("");
  }

  return (
    <div style={{padding:20}}>
      <h2>🤖 Ask about Rohit</h2>
      {chat.map((c,i)=>(
        <p key={i}><b>You:</b>{c.user}<br/><b>Bot:</b>{c.bot}</p>
      ))}
      <input value={msg} onChange={e=>setMsg(e.target.value)} />
      <button onClick={send}>Send</button>
    </div>
  );
}
