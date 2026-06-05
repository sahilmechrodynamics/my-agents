import { useState, useRef, useEffect } from "react";

const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_KEY = "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";

const SYSTEM_PROMPT = `You are a friendly, professional customer support agent. Your job is to help customers with:

1. **FAQs** — Answer common questions about products, services, pricing, shipping, returns, etc.
2. **Complaints** — Handle complaints with empathy, apologize sincerely, and offer solutions.
3. **Order Tracking** — When asked about orders, ask for their order number and provide a simulated update.

Behavior rules:
- Always greet warmly on first message
- Be concise — max 3-4 sentences per reply
- If you don't know something, say "Let me connect you with a human agent for this."
- For complaints: Acknowledge → Apologize → Solve → Follow up
- For order tracking: Ask order number → Give a realistic simulated status
- Never make up specific prices unless the user provides context
- End responses with a helpful follow-up question when appropriate

Simulated order statuses (use these realistically):
- Orders under #1000: "Delivered 2 days ago"
- Orders #1000–#5000: "Out for delivery today"
- Orders above #5000: "Processing — ships within 2 business days"

Always stay in character as a support agent. Be warm, human, and solution-focused.`;

const QUICK_REPLIES = [
  "Where is my order?",
  "I want a refund",
  "What are your business hours?",
  "My product is damaged",
  "How do I cancel my order?",
  "Talk to a human agent",
];

function TypingIndicator() {
  return (
    <div style={s.typingWrapper}>
      <div style={s.typingBubble}>
        <span style={{...s.dot, animationDelay:"0s"}} />
        <span style={{...s.dot, animationDelay:"0.2s"}} />
        <span style={{...s.dot, animationDelay:"0.4s"}} />
      </div>
    </div>
  );
}

function Message({ msg }) {
  const isBot = msg.role === "assistant";
  return (
    <div style={{ ...s.msgRow, justifyContent: isBot ? "flex-start" : "flex-end" }} className="msg-in">
      {isBot && (
        <div style={s.avatar}>
          <span style={{ fontSize: 14 }}>🤖</span>
        </div>
      )}
      <div style={{ ...s.bubble, ...(isBot ? s.botBubble : s.userBubble) }}>
        {msg.content.split("\n").map((line, i) => (
          <p key={i} style={{ margin: 0, marginBottom: i < msg.content.split("\n").length - 1 ? 4 : 0 }}>
            {line.replace(/\*\*(.*?)\*\*/g, "$1")}
          </p>
        ))}
        <div style={s.timestamp}>{msg.time}</div>
      </div>
    </div>
  );
}

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function CustomerSupportBot() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 Hi there! I'm your support assistant. I can help with orders, refunds, complaints, and general questions.\n\nHow can I help you today?",
      time: now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState("Sahil's Support");
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("Sahil's Support");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");

    const userMsg = { role: "user", content: userText, time: now() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1000,
          messages: [
            { role: "system", content: SYSTEM_PROMPT + `\n\nYou are the support agent for "${businessName}". Always refer to the company as "${businessName}" when needed.` },
            ...apiMessages,
          ],
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const reply = data.choices?.[0]?.message?.content || "Sorry, something went wrong.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply, time: now() }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Sorry, I'm having trouble connecting. Please try again in a moment.",
        time: now(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      role: "assistant",
      content: `👋 Hi there! I'm the support assistant for ${businessName}. How can I help you today?`,
      time: now(),
    }]);
  };

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes dotPulse {
          0%,80%,100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .msg-in { animation: msgIn 0.25s ease forwards; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.4s ease forwards; }
        textarea {
          font-family: 'Sora', sans-serif;
          font-size: 14px;
          resize: none;
          border: none;
          outline: none;
          background: transparent;
          color: #1a1a2e;
          width: 100%;
          line-height: 1.5;
        }
        textarea::placeholder { color: #a0aec0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }
        .qr-btn {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          background: #fff;
          border: 1.5px solid #e8edf5;
          border-radius: 20px;
          padding: 6px 12px;
          color: #4a5568;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .qr-btn:hover { background: #1a1a2e; color: #fff; border-color: #1a1a2e; }
        .send-btn {
          background: #1a1a2e;
          border: none;
          border-radius: 10px;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .send-btn:hover { background: #2d2d4e; transform: scale(1.05); }
        .send-btn:disabled { background: #e2e8f0; cursor: not-allowed; transform: none; }
        .name-input {
          font-family: 'Sora', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 6px;
          padding: 2px 8px;
          outline: none;
          width: 160px;
        }
      `}</style>

      <div style={s.window} className="fade-up">
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.agentAvatar}>🤖</div>
            <div>
              {editingName ? (
                <input
                  className="name-input"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={() => { setBusinessName(tempName); setEditingName(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { setBusinessName(tempName); setEditingName(false); }}}
                  autoFocus
                />
              ) : (
                <div style={s.agentName} onClick={() => { setTempName(businessName); setEditingName(true); }}>
                  {businessName} ✏️
                </div>
              )}
              <div style={s.onlineStatus}>
                <div style={s.onlineDot} />
                <span>Online · Typically replies instantly</span>
              </div>
            </div>
          </div>
          <button onClick={clearChat} style={s.clearBtn} title="Clear chat">↺</button>
        </div>

        {/* Messages */}
        <div style={s.messages}>
          {messages.map((msg, i) => <Message key={i} msg={msg} />)}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Quick Replies */}
        <div style={s.quickReplies}>
          <div style={s.qrScroll}>
            {QUICK_REPLIES.map((qr) => (
              <button key={qr} className="qr-btn" onClick={() => sendMessage(qr)}>
                {qr}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div style={s.inputArea}>
          <div style={s.inputBox}>
            <textarea
              ref={inputRef}
              rows={1}
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              style={{ maxHeight: 80 }}
            />
            <button className="send-btn" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          
        </div>
      </div>

      {/* Setup tip */}
      <div style={s.tip}>
        💡 Tap <strong>"{businessName} ✏️"</strong> at the top to set your business name
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px 16px",
    fontFamily: "'Sora', sans-serif",
    gap: 12,
  },
  window: {
    width: "100%",
    maxWidth: 480,
    height: "min(680px, 85vh)",
    background: "#f8fafc",
    borderRadius: 20,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
  },
  header: {
    background: "linear-gradient(135deg, #1a1a2e, #2d2d4e)",
    padding: "16px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  agentAvatar: {
    width: 42, height: 42, borderRadius: "50%",
    background: "rgba(255,255,255,0.15)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 20, flexShrink: 0,
  },
  agentName: {
    fontFamily: "'Sora', sans-serif",
    fontWeight: 600, fontSize: 14, color: "#fff",
    cursor: "pointer", letterSpacing: "0.01em",
  },
  onlineStatus: {
    display: "flex", alignItems: "center", gap: 5, marginTop: 2,
  },
  onlineDot: {
    width: 7, height: 7, borderRadius: "50%", background: "#68d391",
    boxShadow: "0 0 6px #68d391",
  },
  clearBtn: {
    background: "rgba(255,255,255,0.1)", border: "none",
    color: "#fff", borderRadius: 8, padding: "6px 10px",
    cursor: "pointer", fontSize: 16, fontFamily: "'Sora', sans-serif",
  },
  messages: {
    flex: 1, overflowY: "auto",
    padding: "16px 14px",
    display: "flex", flexDirection: "column", gap: 10,
    background: "#f0f4f8",
  },
  msgRow: { display: "flex", alignItems: "flex-end", gap: 8 },
  avatar: {
    width: 30, height: 30, borderRadius: "50%",
    background: "#1a1a2e",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  bubble: {
    maxWidth: "75%", padding: "10px 14px",
    borderRadius: 14, fontSize: 13,
    lineHeight: 1.6, position: "relative",
  },
  botBubble: {
    background: "#fff", color: "#1a1a2e",
    borderBottomLeftRadius: 4,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  userBubble: {
    background: "#1a1a2e", color: "#fff",
    borderBottomRightRadius: 4,
  },
  timestamp: {
    fontSize: 10, opacity: 0.45, marginTop: 4,
    fontFamily: "'JetBrains Mono', monospace",
  },
  typingWrapper: { display: "flex", alignItems: "flex-end", gap: 8 },
  typingBubble: {
    background: "#fff", borderRadius: 14, borderBottomLeftRadius: 4,
    padding: "12px 16px", display: "flex", gap: 4, alignItems: "center",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  dot: {
    display: "inline-block", width: 7, height: 7,
    borderRadius: "50%", background: "#a0aec0",
    animation: "dotPulse 1.2s ease-in-out infinite",
  },
  quickReplies: {
    background: "#fff", borderTop: "1px solid #e8edf5",
    padding: "10px 14px", flexShrink: 0,
  },
  qrScroll: {
    display: "flex", gap: 8, overflowX: "auto",
    paddingBottom: 2,
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  },
  inputArea: {
    background: "#fff", borderTop: "1px solid #e8edf5",
    padding: "12px 14px 10px", flexShrink: 0,
  },
  inputBox: {
    display: "flex", alignItems: "center", gap: 10,
    background: "#f0f4f8", borderRadius: 12,
    padding: "8px 10px 8px 14px",
    border: "1.5px solid #e2e8f0",
  },
  poweredBy: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10, color: "#a0aec0",
    textAlign: "center", marginTop: 8, letterSpacing: "0.04em",
  },
  tip: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, color: "rgba(255,255,255,0.5)",
    textAlign: "center", maxWidth: 380,
    lineHeight: 1.6,
  },
};

