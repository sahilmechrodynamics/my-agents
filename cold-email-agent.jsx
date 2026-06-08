import { useState, useEffect } from "react";

const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_KEY = "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";
const FREE_LIMIT = 3;
const STORAGE_KEY = "mailagent_usage";

const SYSTEM_PROMPT = `You are an expert cold email copywriter with 10+ years of experience writing emails that get replies.

When given prospect information, you write highly personalized, compelling cold emails.

Rules:
- Subject line under 8 words
- Opens with a specific hook about their company/role
- Clear value proposition in 1-2 sentences
- Low-friction CTA
- Length based on requested size: short=60 words, medium=100 words, long=150 words
- Feels human, not robotic
- Match the requested tone exactly

Return ONLY a JSON array with exactly the number of variations requested. No markdown, no backticks:
[
  {
    "subject": "subject line",
    "email": "full email body",
    "hook_used": "what personalization hook was used",
    "why_it_works": "why this email will get replies",
    "tone_label": "the tone used"
  }
]`;

// ── Paywall Modal ─────────────────────────────────────────────────────────────
function PaywallModal({ onClose }) {
  const [selected, setSelected] = useState("pro");
  const plans = [
    { id:"pro", name:"Pro", price:"$19", period:"/month", features:["Unlimited emails","All tones","Priority support","Export to CSV"], highlight:true },
    { id:"agency", name:"Agency", price:"$49", period:"/month", features:["Everything in Pro","5 team seats","White-label","API access"], highlight:false },
  ];
  return (
    <div style={pw.overlay}>
      <div style={pw.modal}>
        <button style={pw.closeBtn} onClick={onClose}>✕</button>
        <div style={pw.badge}>🔒 Free limit reached</div>
        <h2 style={pw.title}>You've used all 3 free emails</h2>
        <p style={pw.sub}>Upgrade to keep writing cold emails that get replies.</p>
        <div style={pw.plans}>
          {plans.map(plan => (
            <div key={plan.id} style={{ ...pw.planCard, ...(selected===plan.id?pw.planSelected:{}), ...(plan.highlight?pw.planHighlight:{}) }} onClick={() => setSelected(plan.id)}>
              {plan.highlight && <div style={pw.popularBadge}>Most Popular</div>}
              <div style={pw.planName}>{plan.name}</div>
              <div style={pw.planPrice}>{plan.price}<span style={pw.planPeriod}>{plan.period}</span></div>
              <ul style={pw.featureList}>
                {plan.features.map(f => <li key={f} style={pw.featureItem}><span style={pw.check}>✓</span> {f}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <button style={pw.ctaBtn} onClick={() => alert("Connect Stripe/LemonSqueezy here!")}>
          Upgrade to {plans.find(p=>p.id===selected)?.name} — {plans.find(p=>p.id===selected)?.price}/mo
        </button>
        <p style={pw.guarantee}>🔒 Cancel anytime · Secure payment · 7-day refund</p>
      </div>
    </div>
  );
}

// ── Saved Email Card ──────────────────────────────────────────────────────────
function SavedCard({ email, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={sv.card}>
      <div style={sv.cardHeader} onClick={() => setOpen(!open)}>
        <div>
          <div style={sv.cardSubject}>{email.subject}</div>
          <div style={sv.cardMeta}>{email.company} · {email.savedAt}</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <span style={sv.tone}>{email.tone}</span>
          <span style={{ fontSize:12, color:"#94a3b8" }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div style={sv.cardBody}>
          <div style={sv.emailPreview}>{email.email}</div>
          <div style={{ display:"flex", gap:8, marginTop:12 }}>
            <button className="btn btn-lime" style={{ flex:1, padding:"8px" }} onClick={() => { navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.email}`); }}>
              Copy
            </button>
            <button className="btn" style={{ background:"#fef2f2", color:"#ef4444", padding:"8px 14px" }} onClick={() => onDelete(email.id)}>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Email Result Card ─────────────────────────────────────────────────────────
function EmailCard({ result, index, total, onSave, saved }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(`Subject: ${result.subject}\n\n${result.email}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ ...s.card, marginBottom: index < total-1 ? 12 : 0 }} className="fade-in">
      <div style={s.cardHeader}>
        <span className="tag tag-green">✓ Version {index+1}</span>
        <span style={s.cardTitle}>Your Email</span>
        <span className="tag" style={{ marginLeft:"auto", background:"#f0f0ff", borderColor:"#c4c4f4", color:"#6366f1" }}>
          {result.tone_label || "Professional"}
        </span>
      </div>
      <div style={s.subjectBox}>
        <span style={s.subjectLabel}>SUBJECT</span>
        <span style={s.subjectText}>{result.subject}</span>
      </div>
      <div style={s.emailBody}>
        {result.email.split("\n").map((line, i) => (
          <p key={i} style={{ marginBottom: line===""?10:0, minHeight: line===""?0:"1.5em" }}>{line}</p>
        ))}
      </div>
      <div style={s.metaRow}>
        <div style={s.metaItem}><span style={s.metaLabel}>🎯 Hook Used</span><span style={s.metaValue}>{result.hook_used}</span></div>
        <div style={s.metaItem}><span style={s.metaLabel}>💡 Why It Works</span><span style={s.metaValue}>{result.why_it_works}</span></div>
      </div>
      <div style={{ display:"flex", gap:8, marginTop:16 }}>
        <button className="btn btn-lime" onClick={copy} style={{ flex:1 }}>
          {copied ? "✓ Copied!" : "Copy Email"}
        </button>
        <button
          className="btn"
          style={{ background: saved ? "#edfcd4" : "#f5f3ee", color: saved ? "#4a6600" : "#333", padding:"8px 14px" }}
          onClick={onSave}
          title="Save email"
        >
          {saved ? "✓" : "💾"}
        </button>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function ColdEmailAgent() {
  const [form, setForm] = useState({ name:"", title:"", company:"", website:"", yourProduct:"", industry:"" });
  const [tones, setTones] = useState(["professional"]);
  const [length, setLength] = useState("medium");
  const [variations, setVariations] = useState(1);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usageCount, setUsageCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [activeTab, setActiveTab] = useState("generate"); // generate | saved
  const [savedEmails, setSavedEmails] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showSubjects, setShowSubjects] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setUsageCount(parseInt(saved));
    } catch {}
  }, []);

  const saveUsage = (count) => {
    setUsageCount(count);
    try { sessionStorage.setItem(STORAGE_KEY, count); } catch {}
  };

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const toggleTone = (tone) => {
    setTones(prev => prev.includes(tone)
      ? prev.length > 1 ? prev.filter(t => t !== tone) : prev
      : [...prev, tone].slice(0, 3)
    );
  };

  const generateEmail = async () => {
    if (!form.name || !form.company || !form.yourProduct) {
      setError("Please fill in Name, Company, and Your Product at minimum.");
      return;
    }
    if (!isPro && usageCount >= FREE_LIMIT) { setShowPaywall(true); return; }

    setError("");
    setLoading(true);
    setResults([]);
    setSubjects([]);
    setShowSubjects(false);

    const numVariations = isPro ? variations : Math.min(variations, 1);
    const toneList = tones.slice(0, numVariations).join(", ");

    const userPrompt = `Write ${numVariations} cold email variation(s) for this prospect:
- Name: ${form.name}
- Title: ${form.title || "unknown"}
- Company: ${form.company}
- Website: ${form.website || "not provided"}
- Industry: ${form.industry || "not specified"}
- My product/service: ${form.yourProduct}
- Desired tone(s): ${toneList}
- Email length: ${length}

Generate exactly ${numVariations} variation(s), each with a different approach if multiple. Return a JSON array.`;

    try {
      const res = await fetch(API_URL, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${GROQ_KEY}` },
        body:JSON.stringify({
          model:"llama-3.3-70b-versatile",
          max_tokens:2000,
          messages:[
            { role:"system", content:SYSTEM_PROMPT },
            { role:"user", content:userPrompt },
          ],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const raw = data.choices?.[0]?.message?.content || "";
      const clean = raw.replace(/```json|```/g,"").trim();
      const jsonMatch = clean.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array in response");
      const parsed = JSON.parse(jsonMatch[0]);
      setResults(parsed);
      setSubjects(parsed.map(r => r.subject));
      saveUsage(usageCount + 1);
    } catch (err) {
      setError("Error: " + (err.message || "Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const generateSubjectLines = async () => {
    if (!form.company || !form.yourProduct) return;
    setShowSubjects(true);
    try {
      const res = await fetch(API_URL, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${GROQ_KEY}` },
        body:JSON.stringify({
          model:"llama-3.3-70b-versatile",
          max_tokens:500,
          messages:[
            { role:"system", content:`Generate 5 compelling cold email subject lines. Return ONLY a JSON array of strings. No markdown.` },
            { role:"user", content:`Company: ${form.company}, Product: ${form.yourProduct}, Contact: ${form.name} (${form.title || "unknown role"})` },
          ],
        }),
      });
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || "[]";
      const clean = raw.replace(/```json|```/g,"").trim();
      const match = clean.match(/\[[\s\S]*\]/);
      if (match) setSubjects(JSON.parse(match[0]));
    } catch {}
  };

  const saveEmail = (result, index) => {
    const id = `${Date.now()}-${index}`;
    setSavedIds(prev => [...prev, index]);
    setSavedEmails(prev => [{
      id, subject:result.subject, email:result.email,
      company:form.company, tone:result.tone_label || tones[0],
      savedAt:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),
    }, ...prev]);
  };

  const deleteEmail = (id) => setSavedEmails(prev => prev.filter(e => e.id !== id));
  const remainingFree = Math.max(0, FREE_LIMIT - usageCount);

  const TONE_OPTIONS = [
    { value:"professional", label:"Professional", icon:"💼" },
    { value:"casual and friendly", label:"Friendly", icon:"😊" },
    { value:"bold and direct", label:"Bold", icon:"⚡" },
    { value:"curious and humble", label:"Humble", icon:"🤔" },
    { value:"urgent", label:"Urgent", icon:"🔥" },
    { value:"witty", label:"Witty", icon:"😄" },
  ];

  const INDUSTRY_OPTIONS = ["SaaS","E-commerce","Agency","Startup","Healthcare","Finance","Real Estate","Education","Retail","Other"];

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::selection { background:#c8f135; color:#111; }
        input,textarea,select { font-family:'DM Mono',monospace; font-size:13px; background:#f5f3ee; border:1.5px solid #ddd8ce; border-radius:8px; padding:10px 14px; width:100%; color:#1a1a1a; outline:none; transition:border-color 0.2s; }
        input:focus,textarea:focus,select:focus { border-color:#111; background:#fff; }
        input::placeholder,textarea::placeholder { color:#aaa9a5; }
        .field { display:flex; flex-direction:column; gap:5px; }
        .label { font-family:'DM Mono',monospace; font-size:11px; color:#888; letter-spacing:0.08em; text-transform:uppercase; }
        .row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        @media(max-width:600px){.row{grid-template-columns:1fr;}}
        .btn { font-family:'DM Mono',monospace; font-size:13px; font-weight:500; background:#111; color:#fff; border:none; border-radius:8px; padding:13px 28px; cursor:pointer; transition:all 0.15s; letter-spacing:0.03em; }
        .btn:hover { background:#333; }
        .btn:active { transform:scale(0.98); }
        .btn:disabled { background:#ccc; cursor:not-allowed; }
        .btn-lime { background:#c8f135; color:#111; }
        .btn-lime:hover { background:#b5e020; }
        .pulse { display:inline-block; animation:pulse 1.2s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        .fade-in { animation:fadeIn 0.4s ease forwards; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .tag { display:inline-block; font-family:'DM Mono',monospace; font-size:10px; background:#f0ede6; border:1px solid #ddd8ce; border-radius:4px; padding:3px 8px; color:#666; letter-spacing:0.06em; text-transform:uppercase; }
        .tag-green { background:#edfcd4; border-color:#c8f135; color:#4a6600; }
        .tag-orange { background:#fff4e6; border-color:#ffc078; color:#b35900; }
        .tone-btn { font-family:'DM Mono',monospace; font-size:11px; padding:7px 12px; border-radius:20px; border:1.5px solid #e8e4dc; cursor:pointer; transition:all 0.15s; background:#fff; color:#555; display:flex; align-items:center; gap:5px; }
        .tone-btn.active { background:#111; color:#fff; border-color:#111; }
        .tone-btn:hover { border-color:#111; }
        .tab-btn { font-family:'DM Mono',monospace; font-size:12px; padding:8px 20px; border:none; cursor:pointer; transition:all 0.15s; background:transparent; }
        .tab-btn.active { border-bottom:2px solid #111; color:#111; font-weight:500; }
        .tab-btn:not(.active) { color:#999; border-bottom:2px solid transparent; }
        .subject-chip { font-family:'DM Mono',monospace; font-size:11px; background:#f5f3ee; border:1.5px solid #ddd8ce; border-radius:6px; padding:6px 12px; cursor:pointer; transition:all 0.15s; color:#333; }
        .subject-chip:hover { background:#111; color:#fff; border-color:#111; }
      `}</style>

      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}

      {/* Header */}
      <div style={s.header}>
        <div style={s.logoRow}>
          <div style={s.dot} />
          <span style={s.logoText}>MailAgent</span>
          {isPro && <span className="tag tag-green" style={{marginLeft:6}}>PRO</span>}
        </div>
        <h1 style={s.headline}>Cold emails that<br /><em>actually get replies.</em></h1>
        <p style={s.sub}>AI-powered personalization · Multiple tones · Instant generation</p>
      </div>

      {/* Usage Bar */}
      {!isPro && (
        <div style={s.usageBar}>
          <div style={s.usageLeft}>
            <span style={s.usageText}>
              {remainingFree > 0 ? `✦ ${remainingFree} free email${remainingFree!==1?"s":""} remaining` : "🔒 Free limit reached"}
            </span>
            <div style={s.usageDots}>
              {Array.from({length:FREE_LIMIT}).map((_,i) => (
                <div key={i} style={{...s.usageDot, background:i<usageCount?"#111":"#e0ddd6"}} />
              ))}
            </div>
          </div>
          <button className="btn btn-lime" style={{padding:"7px 14px",fontSize:11}} onClick={() => setShowPaywall(true)}>
            Upgrade → Pro
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={s.tabs}>
        <button className={`tab-btn ${activeTab==="generate"?"active":""}`} onClick={() => setActiveTab("generate")}>
          ✦ Generate
        </button>
        <button className={`tab-btn ${activeTab==="saved"?"active":""}`} onClick={() => setActiveTab("saved")}>
          💾 Saved ({savedEmails.length})
        </button>
      </div>

      {activeTab === "saved" ? (
        <div style={{width:"100%",maxWidth:560}}>
          {savedEmails.length === 0 ? (
            <div style={s.emptyState}>
              <div style={{fontSize:32,marginBottom:12}}>📭</div>
              <div style={{fontFamily:"'Instrument Serif',serif",fontSize:20,color:"#111",marginBottom:6}}>No saved emails yet</div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:"#888"}}>Generate emails and click 💾 to save them here</div>
            </div>
          ) : (
            savedEmails.map(e => <SavedCard key={e.id} email={e} onDelete={deleteEmail} />)
          )}
        </div>
      ) : (
        <>
          {/* Form */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <span className="tag">Step 1</span>
              <span style={s.cardTitle}>Prospect Details</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div className="row">
                <div className="field">
                  <span className="label">First Name *</span>
                  <input name="name" placeholder="e.g. Sarah" value={form.name} onChange={handleChange} />
                </div>
                <div className="field">
                  <span className="label">Job Title</span>
                  <input name="title" placeholder="e.g. Head of Marketing" value={form.title} onChange={handleChange} />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <span className="label">Company *</span>
                  <input name="company" placeholder="e.g. Acme Inc." value={form.company} onChange={handleChange} />
                </div>
                <div className="field">
                  <span className="label">Website</span>
                  <input name="website" placeholder="e.g. acme.com" value={form.website} onChange={handleChange} />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <span className="label">Industry</span>
                  <select name="industry" value={form.industry} onChange={handleChange}>
                    <option value="">Select industry...</option>
                    {INDUSTRY_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div className="field">
                  <span className="label">Email Length</span>
                  <select value={length} onChange={e => setLength(e.target.value)}>
                    <option value="short">Short (~60 words)</option>
                    <option value="medium">Medium (~100 words)</option>
                    <option value="long">Long (~150 words)</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <span className="label">Your Product / Service *</span>
                <input name="yourProduct" placeholder="e.g. AI chatbot that handles customer support 24/7" value={form.yourProduct} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* Tone Selector */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <span className="tag">Step 2</span>
              <span style={s.cardTitle}>Select Tone(s)</span>
              {isPro && <span style={{marginLeft:"auto",fontFamily:"'DM Mono',monospace",fontSize:11,color:"#888"}}>Select up to 3</span>}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {TONE_OPTIONS.map(t => (
                <button
                  key={t.value}
                  className={`tone-btn ${tones.includes(t.value)?"active":""}`}
                  onClick={() => toggleTone(t.value)}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
            {!isPro && tones.length > 1 && (
              <p style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#f59e0b",marginTop:10}}>
                ⚠️ Multiple tones require Pro. Upgrade to use them.
              </p>
            )}
          </div>

          {/* Variations + Subject Lines */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <span className="tag">Step 3</span>
              <span style={s.cardTitle}>Options</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div className="field">
                <span className="label">Variations {!isPro && "(Pro: up to 3)"}</span>
                <select value={variations} onChange={e => setVariations(parseInt(e.target.value))}>
                  <option value={1}>1 email</option>
                  {isPro && <><option value={2}>2 emails</option><option value={3}>3 emails</option></>}
                </select>
              </div>
              {/* Subject Line Generator */}
              <div>
                <button
                  className="btn"
                  style={{background:"#f5f3ee",color:"#333",width:"100%",padding:"10px"}}
                  onClick={generateSubjectLines}
                  disabled={!form.company || !form.yourProduct}
                >
                  ✨ Generate Subject Lines Only
                </button>
              </div>
              {showSubjects && subjects.length > 0 && (
                <div style={{display:"flex",flexDirection:"column",gap:6}} className="fade-in">
                  <span className="label">Click to copy a subject line:</span>
                  {subjects.map((sub,i) => (
                    <button
                      key={i}
                      className="subject-chip"
                      onClick={() => { navigator.clipboard.writeText(sub); }}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && <p style={{...s.error,width:"100%",maxWidth:560}}>{error}</p>}

          <button
            className="btn"
            onClick={generateEmail}
            disabled={loading}
            style={{width:"100%",maxWidth:560,padding:"15px"}}
          >
            {loading
              ? <span className="pulse">✦ Writing your email{variations>1?"s":""}...</span>
              : remainingFree===0 && !isPro
                ? "🔒 Upgrade to Generate"
                : `✦ Generate ${variations} Email${variations>1?"s":""}`}
          </button>

          {/* Results */}
          {results.length > 0 && (
            <div style={{width:"100%",maxWidth:560}}>
              {results.map((result,i) => (
                <EmailCard
                  key={i}
                  result={result}
                  index={i}
                  total={results.length}
                  onSave={() => saveEmail(result, i)}
                  saved={savedIds.includes(i)}
                />
              ))}
            </div>
          )}

          <p style={{fontSize:11,color:"#bbb",cursor:"pointer",textDecoration:"underline"}} onClick={() => { setIsPro(!isPro); setUsageCount(0); }}>
            {isPro ? "← Switch back to Free (demo)" : "Demo: simulate Pro unlock"}
          </p>
        </>
      )}
    </div>
  );
}

// ── Saved Styles ──────────────────────────────────────────────────────────────
const sv = {
  card: { background:"#fff", border:"1.5px solid #e8e4dc", borderRadius:12, marginBottom:10, overflow:"hidden" },
  cardHeader: { padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", gap:12 },
  cardSubject: { fontFamily:"'DM Mono',monospace", fontSize:13, color:"#111", fontWeight:500, marginBottom:3 },
  cardMeta: { fontFamily:"'DM Mono',monospace", fontSize:11, color:"#94a3b8" },
  tone: { fontFamily:"'DM Mono',monospace", fontSize:10, background:"#f0f0ff", border:"1px solid #c4c4f4", borderRadius:4, padding:"2px 8px", color:"#6366f1" },
  cardBody: { borderTop:"1.5px solid #e8e4dc", padding:"14px 18px" },
  emailPreview: { fontFamily:"'Instrument Serif',serif", fontSize:14, color:"#333", lineHeight:1.7, background:"#fdfcfa", borderRadius:8, padding:"12px 14px" },
};

// ── Paywall Styles ────────────────────────────────────────────────────────────
const pw = {
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 },
  modal: { background:"#fff", borderRadius:16, padding:"32px 28px", maxWidth:480, width:"100%", position:"relative", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" },
  closeBtn: { position:"absolute", top:16, right:16, background:"none", border:"none", fontSize:16, cursor:"pointer", color:"#999", fontFamily:"'DM Mono',monospace" },
  badge: { fontFamily:"'DM Mono',monospace", fontSize:11, background:"#fff4e6", border:"1px solid #ffc078", borderRadius:6, padding:"4px 10px", display:"inline-block", color:"#b35900", marginBottom:14 },
  title: { fontFamily:"'Instrument Serif',serif", fontSize:24, color:"#111", marginBottom:8 },
  sub: { fontFamily:"'DM Mono',monospace", fontSize:12, color:"#888", marginBottom:24, lineHeight:1.6 },
  plans: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 },
  planCard: { border:"1.5px solid #e8e4dc", borderRadius:10, padding:"16px 14px", cursor:"pointer", transition:"all 0.15s", position:"relative" },
  planSelected: { border:"1.5px solid #111", background:"#fafaf8" },
  planHighlight: { background:"#f9fce8" },
  popularBadge: { position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)", background:"#c8f135", color:"#111", fontFamily:"'DM Mono',monospace", fontSize:9, fontWeight:500, padding:"2px 8px", borderRadius:20, whiteSpace:"nowrap" },
  planName: { fontFamily:"'DM Mono',monospace", fontSize:11, color:"#888", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.07em" },
  planPrice: { fontFamily:"'Instrument Serif',serif", fontSize:26, color:"#111", marginBottom:10 },
  planPeriod: { fontFamily:"'DM Mono',monospace", fontSize:12, color:"#999" },
  featureList: { listStyle:"none", display:"flex", flexDirection:"column", gap:5 },
  featureItem: { fontFamily:"'DM Mono',monospace", fontSize:11, color:"#555", display:"flex", alignItems:"center", gap:6 },
  check: { color:"#4a6600", fontWeight:700 },
  ctaBtn: { width:"100%", background:"#111", color:"#fff", border:"none", borderRadius:8, padding:"13px", fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:500, cursor:"pointer", marginBottom:12 },
  guarantee: { fontFamily:"'DM Mono',monospace", fontSize:10, color:"#aaa", textAlign:"center", letterSpacing:"0.04em" },
};

// ── App Styles ────────────────────────────────────────────────────────────────
const s = {
  page: { minHeight:"100vh", background:"#faf8f4", fontFamily:"'DM Mono',monospace", padding:"32px 16px 60px", display:"flex", flexDirection:"column", alignItems:"center", gap:12 },
  header: { maxWidth:560, width:"100%", textAlign:"left", paddingBottom:4 },
  logoRow: { display:"flex", alignItems:"center", gap:7, marginBottom:18 },
  dot: { width:10, height:10, borderRadius:"50%", background:"#c8f135" },
  logoText: { fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:500, color:"#111", letterSpacing:"0.05em" },
  headline: { fontFamily:"'Instrument Serif',serif", fontSize:"clamp(30px,7vw,46px)", fontWeight:400, color:"#111", lineHeight:1.15, marginBottom:12 },
  sub: { fontSize:13, color:"#777", lineHeight:1.7 },
  tabs: { maxWidth:560, width:"100%", display:"flex", borderBottom:"1px solid #e8e4dc" },
  usageBar: { maxWidth:560, width:"100%", background:"#fff", border:"1.5px solid #e8e4dc", borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 },
  usageLeft: { display:"flex", flexDirection:"column", gap:6 },
  usageText: { fontFamily:"'DM Mono',monospace", fontSize:12, color:"#555" },
  usageDots: { display:"flex", gap:5 },
  usageDot: { width:10, height:10, borderRadius:"50%", transition:"background 0.2s" },
  card: { background:"#fff", border:"1.5px solid #e8e4dc", borderRadius:14, padding:"24px 22px", width:"100%", maxWidth:560, boxShadow:"0 2px 20px rgba(0,0,0,0.04)" },
  cardHeader: { display:"flex", alignItems:"center", gap:10, marginBottom:20 },
  cardTitle: { fontFamily:"'Instrument Serif',serif", fontSize:18, color:"#111" },
  error: { fontFamily:"'DM Mono',monospace", fontSize:12, color:"#c0392b", background:"#fdf0ef", border:"1px solid #f5c6c2", borderRadius:6, padding:"8px 12px" },
  subjectBox: { background:"#f5f3ee", border:"1.5px solid #e8e4dc", borderRadius:8, padding:"10px 14px", display:"flex", alignItems:"center", gap:12, marginBottom:16 },
  subjectLabel: { fontSize:10, color:"#aaa", letterSpacing:"0.1em", whiteSpace:"nowrap" },
  subjectText: { fontFamily:"'DM Mono',monospace", fontSize:13, color:"#111", fontWeight:500 },
  emailBody: { fontFamily:"'Instrument Serif',serif", fontSize:16, color:"#2a2a2a", lineHeight:1.75, background:"#fdfcfa", border:"1.5px solid #e8e4dc", borderRadius:8, padding:"16px 18px", marginBottom:16 },
  metaRow: { display:"flex", flexDirection:"column", gap:10, background:"#f9f7f3", border:"1px solid #ede9e1", borderRadius:8, padding:"14px 16px" },
  metaItem: { display:"flex", flexDirection:"column", gap:3 },
  metaLabel: { fontSize:11, color:"#999", letterSpacing:"0.05em" },
  metaValue: { fontFamily:"'DM Mono',monospace", fontSize:12, color:"#444", lineHeight:1.5 },
  emptyState: { background:"#fff", border:"1.5px solid #e8e4dc", borderRadius:14, padding:"48px 24px", textAlign:"center", width:"100%" },
};
