
import { useState, useEffect } from "react";

const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_KEY = "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";
const FREE_LIMIT = 3;
const STORAGE_KEY = "mailagent_usage";

const SYSTEM_PROMPT = `You are an expert cold email copywriter with 10+ years of experience writing emails that get replies. 

When given prospect information, you write a highly personalized, compelling cold email that:
- Has a punchy subject line (under 8 words)
- Opens with a specific, researched hook about their company/role
- Clearly explains the value proposition in 1-2 sentences
- Has a low-friction CTA (not "let's jump on a call" — try "worth a 2-min read?")
- Is under 120 words total
- Feels human, not robotic

Return your response in this exact JSON format (no markdown, no backticks):
{
  "subject": "the subject line here",
  "email": "the full email body here",
  "hook_used": "brief note on what personalization hook you used",
  "why_it_works": "1 sentence on why this email will get replies"
}`;

// ─── Paywall Modal ────────────────────────────────────────────────────────────
function PaywallModal({ onClose }) {
  const [selected, setSelected] = useState("pro");

  const plans = [
    {
      id: "pro",
      name: "Pro",
      price: "$19",
      period: "/month",
      features: ["Unlimited emails", "All tones", "Priority support", "Export to CSV"],
      highlight: true,
    },
    {
      id: "agency",
      name: "Agency",
      price: "$49",
      period: "/month",
      features: ["Everything in Pro", "5 team seats", "White-label option", "API access"],
      highlight: false,
    },
  ];

  return (
    <div style={pw.overlay}>
      <div style={pw.modal}>
        <button style={pw.closeBtn} onClick={onClose}>✕</button>

        <div style={pw.badge}>🔒 Free limit reached</div>
        <h2 style={pw.title}>You've used all 3 free emails</h2>
        <p style={pw.sub}>Upgrade to keep writing cold emails that get replies.</p>

        <div style={pw.plans}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              style={{
                ...pw.planCard,
                ...(selected === plan.id ? pw.planSelected : {}),
                ...(plan.highlight ? pw.planHighlight : {}),
              }}
              onClick={() => setSelected(plan.id)}
            >
              {plan.highlight && <div style={pw.popularBadge}>Most Popular</div>}
              <div style={pw.planName}>{plan.name}</div>
              <div style={pw.planPrice}>
                {plan.price}<span style={pw.planPeriod}>{plan.period}</span>
              </div>
              <ul style={pw.featureList}>
                {plan.features.map((f) => (
                  <li key={f} style={pw.featureItem}>
                    <span style={pw.check}>✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <button
          style={pw.ctaBtn}
          onClick={() => alert("👋 Connect Stripe/LemonSqueezy here to take real payments!\n\nFor now, this is a demo of the paywall flow.")}
        >
          Upgrade to {plans.find(p => p.id === selected)?.name} — {plans.find(p => p.id === selected)?.price}/mo
        </button>

        <p style={pw.guarantee}>🔒 Cancel anytime · Secure payment · 7-day refund</p>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function ColdEmailAgent() {
  const [form, setForm] = useState({
    name: "", title: "", company: "", website: "", yourProduct: "", tone: "professional",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isPro, setIsPro] = useState(false);

  // Load usage from memory (resets on page refresh — replace with backend for production)
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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const generateEmail = async () => {
    if (!form.name || !form.company || !form.yourProduct) {
      setError("Please fill in Name, Company, and Your Product at minimum.");
      return;
    }

    // Paywall check
    if (!isPro && usageCount >= FREE_LIMIT) {
      setShowPaywall(true);
      return;
    }

    setError("");
    setLoading(true);
    setResult(null);

    const userPrompt = `Write a cold email for this prospect:
- Name: ${form.name}
- Title: ${form.title || "unknown"}
- Company: ${form.company}
- Website: ${form.website || "not provided"}
- My product/service: ${form.yourProduct}
- Desired tone: ${form.tone}

Use any details about their company/industry to personalize. Make it feel researched and genuine.`;

    try {
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
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt }
          ],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const raw = data.choices?.[0]?.message?.content || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      const parsed = JSON.parse(jsonMatch[0]);
      setResult(parsed);
      saveUsage(usageCount + 1);
    } catch (err) {
      setError("Error: " + (err.message || "Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const copyEmail = () => {
    if (!result) return;
    navigator.clipboard.writeText(`Subject: ${result.subject}\n\n${result.email}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const remainingFree = Math.max(0, FREE_LIMIT - usageCount);

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: #c8f135; color: #111; }
        input, textarea, select {
          font-family: 'DM Mono', monospace; font-size: 13px;
          background: #f5f3ee; border: 1.5px solid #ddd8ce;
          border-radius: 8px; padding: 10px 14px; width: 100%;
          color: #1a1a1a; outline: none; transition: border-color 0.2s;
        }
        input:focus, textarea:focus, select:focus { border-color: #111; background: #fff; }
        input::placeholder, textarea::placeholder { color: #aaa9a5; }
        .field { display: flex; flex-direction: column; gap: 5px; }
        .label { font-family: 'DM Mono', monospace; font-size: 11px; color: #888; letter-spacing: 0.08em; text-transform: uppercase; }
        .row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 600px) { .row { grid-template-columns: 1fr; } }
        .btn { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 500; background: #111; color: #fff; border: none; border-radius: 8px; padding: 13px 28px; cursor: pointer; transition: background 0.15s, transform 0.1s; letter-spacing: 0.03em; }
        .btn:hover { background: #333; }
        .btn:active { transform: scale(0.98); }
        .btn:disabled { background: #ccc; cursor: not-allowed; }
        .btn-lime { background: #c8f135; color: #111; }
        .btn-lime:hover { background: #b5e020; }
        .pulse { display: inline-block; animation: pulse 1.2s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .fade-in { animation: fadeIn 0.4s ease forwards; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .tag { display: inline-block; font-family: 'DM Mono', monospace; font-size: 10px; background: #f0ede6; border: 1px solid #ddd8ce; border-radius: 4px; padding: 3px 8px; color: #666; letter-spacing: 0.06em; text-transform: uppercase; }
        .tag-green { background: #edfcd4; border-color: #c8f135; color: #4a6600; }
        .tag-orange { background: #fff4e6; border-color: #ffc078; color: #b35900; }
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
        <p style={s.sub}>AI-powered personalization in seconds.</p>
      </div>

      {/* Usage Bar */}
      {!isPro && (
        <div style={s.usageBar}>
          <div style={s.usageLeft}>
            <span style={s.usageText}>
              {remainingFree > 0
                ? `✦ ${remainingFree} free email${remainingFree !== 1 ? "s" : ""} remaining`
                : "🔒 Free limit reached"}
            </span>
            <div style={s.usageDots}>
              {Array.from({ length: FREE_LIMIT }).map((_, i) => (
                <div key={i} style={{ ...s.usageDot, background: i < usageCount ? "#111" : "#e0ddd6" }} />
              ))}
            </div>
          </div>
          <button
            className="btn btn-lime"
            style={{ padding: "7px 14px", fontSize: 11 }}
            onClick={() => setShowPaywall(true)}
          >
            Upgrade → Pro
          </button>
        </div>
      )}

      {/* Form */}
      <div style={s.card}>
        <div style={s.cardHeader}>
          <span className="tag">Step 1</span>
          <span style={s.cardTitle}>Prospect Details</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
          <div className="field">
            <span className="label">Your Product / Service *</span>
            <input name="yourProduct" placeholder="e.g. AI tool that automates customer support tickets" value={form.yourProduct} onChange={handleChange} />
          </div>
          <div className="field">
            <span className="label">Tone</span>
            <select name="tone" value={form.tone} onChange={handleChange}>
              <option value="professional">Professional</option>
              <option value="casual and friendly">Casual & Friendly</option>
              <option value="bold and direct">Bold & Direct</option>
              <option value="curious and humble">Curious & Humble</option>
            </select>
          </div>
        </div>

        {error && <p style={s.error}>{error}</p>}

        <button
          className="btn"
          onClick={generateEmail}
          disabled={loading}
          style={{ marginTop: 20, width: "100%" }}
        >
          {loading
            ? <span className="pulse">✦ Writing your email...</span>
            : remainingFree === 0 && !isPro
              ? "🔒 Upgrade to Generate"
              : "✦ Generate Cold Email"}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div style={s.card} className="fade-in">
          <div style={s.cardHeader}>
            <span className="tag tag-green">✓ Generated</span>
            <span style={s.cardTitle}>Your Email</span>
            {!isPro && <span className="tag tag-orange" style={{marginLeft:"auto"}}>{remainingFree} left</span>}
          </div>

          <div style={s.subjectBox}>
            <span style={s.subjectLabel}>SUBJECT</span>
            <span style={s.subjectText}>{result.subject}</span>
          </div>

          <div style={s.emailBody}>
            {result.email.split("\n").map((line, i) => (
              <p key={i} style={{ marginBottom: line === "" ? 10 : 0, minHeight: line === "" ? 0 : "1.5em" }}>{line}</p>
            ))}
          </div>

          <div style={s.metaRow}>
            <div style={s.metaItem}>
              <span style={s.metaLabel}>🎯 Hook Used</span>
              <span style={s.metaValue}>{result.hook_used}</span>
            </div>
            <div style={s.metaItem}>
              <span style={s.metaLabel}>💡 Why It Works</span>
              <span style={s.metaValue}>{result.why_it_works}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button className="btn btn-lime" onClick={copyEmail} style={{ flex: 1 }}>
              {copied ? "✓ Copied!" : "Copy Email"}
            </button>
            <button className="btn" onClick={() => setResult(null)} style={{ background: "#f0ede6", color: "#333" }}>
              ↺
            </button>
          </div>
        </div>
      )}

      {/* Demo Pro toggle for testing */}
      <p
        style={{ fontSize: 11, color: "#bbb", cursor: "pointer", textDecoration: "underline" }}
        onClick={() => { setIsPro(!isPro); setUsageCount(0); }}
      >
        {isPro ? "← Switch back to Free (demo)" : "Demo: simulate Pro unlock"}
      </p>

      
    </div>
  );
}

// ─── Paywall Styles ───────────────────────────────────────────────────────────
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
  popularBadge: { position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)", background:"#c8f135", color:"#111", fontFamily:"'DM Mono',monospace", fontSize:9, fontWeight:500, padding:"2px 8px", borderRadius:20, whiteSpace:"nowrap", letterSpacing:"0.05em" },
  planName: { fontFamily:"'DM Mono',monospace", fontSize:11, color:"#888", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.07em" },
  planPrice: { fontFamily:"'Instrument Serif',serif", fontSize:26, color:"#111", marginBottom:10 },
  planPeriod: { fontFamily:"'DM Mono',monospace", fontSize:12, color:"#999" },
  featureList: { listStyle:"none", display:"flex", flexDirection:"column", gap:5 },
  featureItem: { fontFamily:"'DM Mono',monospace", fontSize:11, color:"#555", display:"flex", alignItems:"center", gap:6 },
  check: { color:"#4a6600", fontWeight:700 },
  ctaBtn: { width:"100%", background:"#111", color:"#fff", border:"none", borderRadius:8, padding:"13px", fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:500, cursor:"pointer", marginBottom:12 },
  guarantee: { fontFamily:"'DM Mono',monospace", fontSize:10, color:"#aaa", textAlign:"center", letterSpacing:"0.04em" },
};

// ─── App Styles ───────────────────────────────────────────────────────────────
const s = {
  page: { minHeight:"100vh", background:"#faf8f4", fontFamily:"'DM Mono',monospace", padding:"32px 16px 60px", display:"flex", flexDirection:"column", alignItems:"center", gap:16 },
  header: { maxWidth:560, width:"100%", textAlign:"left", paddingBottom:4 },
  logoRow: { display:"flex", alignItems:"center", gap:7, marginBottom:18 },
  dot: { width:10, height:10, borderRadius:"50%", background:"#c8f135" },
  logoText: { fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:500, color:"#111", letterSpacing:"0.05em" },
  headline: { fontFamily:"'Instrument Serif',serif", fontSize:"clamp(30px,7vw,46px)", fontWeight:400, color:"#111", lineHeight:1.15, marginBottom:12 },
  sub: { fontSize:13, color:"#777", lineHeight:1.7 },
  usageBar: { maxWidth:560, width:"100%", background:"#fff", border:"1.5px solid #e8e4dc", borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 },
  usageLeft: { display:"flex", flexDirection:"column", gap:6 },
  usageText: { fontFamily:"'DM Mono',monospace", fontSize:12, color:"#555" },
  usageDots: { display:"flex", gap:5 },
  usageDot: { width:10, height:10, borderRadius:"50%", transition:"background 0.2s" },
  card: { background:"#fff", border:"1.5px solid #e8e4dc", borderRadius:14, padding:"24px 22px", width:"100%", maxWidth:560, boxShadow:"0 2px 20px rgba(0,0,0,0.04)" },
  cardHeader: { display:"flex", alignItems:"center", gap:10, marginBottom:20 },
  cardTitle: { fontFamily:"'Instrument Serif',serif", fontSize:18, color:"#111" },
  error: { fontFamily:"'DM Mono',monospace", fontSize:12, color:"#c0392b", background:"#fdf0ef", border:"1px solid #f5c6c2", borderRadius:6, padding:"8px 12px", marginTop:10 },
  subjectBox: { background:"#f5f3ee", border:"1.5px solid #e8e4dc", borderRadius:8, padding:"10px 14px", display:"flex", alignItems:"center", gap:12, marginBottom:16 },
  subjectLabel: { fontSize:10, color:"#aaa", letterSpacing:"0.1em", whiteSpace:"nowrap" },
  subjectText: { fontFamily:"'DM Mono',monospace", fontSize:13, color:"#111", fontWeight:500 },
  emailBody: { fontFamily:"'Instrument Serif',serif", fontSize:16, color:"#2a2a2a", lineHeight:1.75, background:"#fdfcfa", border:"1.5px solid #e8e4dc", borderRadius:8, padding:"16px 18px", marginBottom:16 },
  metaRow: { display:"flex", flexDirection:"column", gap:10, background:"#f9f7f3", border:"1px solid #ede9e1", borderRadius:8, padding:"14px 16px" },
  metaItem: { display:"flex", flexDirection:"column", gap:3 },
  metaLabel: { fontSize:11, color:"#999", letterSpacing:"0.05em" },
  metaValue: { fontS
