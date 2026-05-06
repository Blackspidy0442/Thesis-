import { useState, useMemo, useEffect } from "react";

// ── Discord Pure Black Theme (like your screenshot) ───────
const C = {
  bg:          "#000000",  // pure black — exactly like Discord black
  surface:     "#111214",  // cards / panels
  elevated:    "#1a1b1e",  // inputs / hover
  border:      "#2a2b2f",  // dividers
  accent:      "#5865f2",  // Discord blurple
  accent2:     "#7289da",  // lighter blurple
  accentGlow:  "#5865f244",
  muted:       "#72767d",  // secondary text
  text:        "#ffffff",  // primary — pure white on black
  subtext:     "#b9bbbe",  // secondary text
  green:       "#3ba55c",
  greenBright: "#57f287",
  red:         "#ed4245",
  redBright:   "#ff5b5e",
  yellow:      "#faa61a",
};

const INDICES = [
  { label: "NIFTY 50",   symbol: "%5ENSETP",   fallback: 24500 },
  { label: "SENSEX",     symbol: "%5EBSESN",   fallback: 80500 },
  { label: "BANK NIFTY", symbol: "%5ENSEBANK", fallback: 52000 },
  { label: "NIFTY IT",   symbol: "%5ECNXIT",   fallback: 37000 },
  { label: "NIFTY MID",  symbol: "%5ENSEI",    fallback: 11200 },
];

function useLiveIndices() {
  const [data, setData] = useState(INDICES.map(i => ({ ...i, price: null, pct: null, loading: true, error: false })));
  const [lastUpdated, setLastUpdated] = useState(null);
  const [marketOpen, setMarketOpen] = useState(false);

  const checkMarket = () => {
    const ist = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const mins = ist.getHours() * 60 + ist.getMinutes(), day = ist.getDay();
    return day >= 1 && day <= 5 && mins >= 555 && mins <= 930;
  };

  const fetchAll = async () => {
    setMarketOpen(checkMarket());
    const results = await Promise.all(INDICES.map(async (idx) => {
      try {
        const url = `https://corsproxy.io/?url=https://query1.finance.yahoo.com/v8/finance/chart/${idx.symbol}?interval=1d&range=2d`;
        const res = await fetch(url);
        const json = await res.json();
        const meta = json?.chart?.result?.[0]?.meta;
        if (!meta) throw new Error();
        const price = meta.regularMarketPrice ?? meta.previousClose;
        const prev = meta.previousClose ?? price;
        return { ...idx, price, pct: ((price - prev) / prev) * 100, loading: false, error: false };
      } catch {
        return { ...idx, price: idx.fallback, pct: 0, loading: false, error: true };
      }
    }));
    setData(results);
    setLastUpdated(new Date());
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAll(); const id = setInterval(fetchAll, 30000); return () => clearInterval(id); }, []);
  return { data, lastUpdated, marketOpen, refresh: fetchAll };
}

const IndexTicker = ({ isMobile }) => {
  const { data, lastUpdated, marketOpen, refresh } = useLiveIndices();
  const [spinning, setSpinning] = useState(false);
  const go = async () => { setSpinning(true); await refresh(); setTimeout(() => setSpinning(false), 600); };
  const fmtP = (n) => n == null ? "—" : n >= 10000 ? n.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "3px 14px" : "3px 24px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: marketOpen ? C.greenBright : C.red, boxShadow: marketOpen ? `0 0 8px ${C.greenBright}` : "none" }} />
          <span style={{ fontSize: 9, fontFamily: "monospace", color: marketOpen ? C.greenBright : C.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>
            {marketOpen ? "Market Open" : "Market Closed"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {lastUpdated && <span style={{ fontSize: 9, color: C.muted, fontFamily: "monospace" }}>{lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} IST</span>}
          <button onClick={go} style={{ background: "none", border: "none", cursor: "pointer", color: C.accent2, fontSize: 13, transition: "transform 0.6s", transform: spinning ? "rotate(360deg)" : "none", display: "inline-block" }}>↻</button>
        </div>
      </div>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", padding: isMobile ? "8px 14px" : "10px 24px", display: "flex", gap: isMobile ? 22 : 38, scrollbarWidth: "none" }}>
        {data.map((idx) => (
          <div key={idx.label} style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: C.muted, fontFamily: "monospace", letterSpacing: 1.5, textTransform: "uppercase", whiteSpace: "nowrap", marginBottom: 2 }}>{idx.label}</div>
            <div style={{ fontSize: isMobile ? 13 : 14, fontFamily: "monospace", fontWeight: 700, color: idx.loading ? C.muted : C.text, whiteSpace: "nowrap" }}>{idx.loading ? "···" : fmtP(idx.price)}</div>
            {!idx.loading && <div style={{ fontSize: 10, fontFamily: "monospace", marginTop: 1, whiteSpace: "nowrap", color: idx.error ? C.muted : idx.pct >= 0 ? C.greenBright : C.redBright }}>{idx.error ? "offline" : `${idx.pct >= 0 ? "▲" : "▼"} ${Math.abs(idx.pct).toFixed(2)}%`}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Logo: TradingView-style upward breakout arrow ─────────
const LogoMark = ({ size = 30 }) => (
  <div style={{ width: size, height: size, background: "#000", borderRadius: size * 0.2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid #222" }}>
    <svg width={size * 0.75} height={size * 0.75} viewBox="0 0 24 24" fill="none">
      {/* Speed / momentum lines */}
      <line x1="2" y1="18" x2="6.5" y2="18" stroke="white" strokeWidth="2.3" strokeLinecap="round"/>
      <line x1="2" y1="21.5" x2="8.5" y2="21.5" stroke="white" strokeWidth="2.3" strokeLinecap="round"/>
      {/* Chart line */}
      <polyline points="4,16 8.5,11.5 12.5,14 17.5,7" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* Arrow */}
      <polyline points="13.5,4 20,4 20,10.5" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  </div>
);

const INITIAL_TRADES = [
  { id: 1, date: "2026-04-01", instrument: "RELIANCE", direction: "Long", entry: 2850, exit: 2920, size: 10, strategy: "Breakout", emotion: "Calm", notes: "Clean breakout above resistance", pnl: 700, fees: 20 },
  { id: 2, date: "2026-04-03", instrument: "TCS", direction: "Short", entry: 3980, exit: 3910, size: 5, strategy: "Mean Reversion", emotion: "Confident", notes: "Overextended, RSI overbought", pnl: 350, fees: 20 },
  { id: 3, date: "2026-04-07", instrument: "NIFTY", direction: "Long", entry: 22450, exit: 22310, size: 1, strategy: "Trend Follow", emotion: "FOMO", notes: "Entered too late, got stopped out", pnl: -140, fees: 40 },
  { id: 4, date: "2026-04-10", instrument: "INFY", direction: "Long", entry: 1560, exit: 1620, size: 20, strategy: "Breakout", emotion: "Calm", notes: "Strong earnings momentum", pnl: 1200, fees: 20 },
  { id: 5, date: "2026-04-14", instrument: "BANKNIFTY", direction: "Long", entry: 48200, exit: 47600, size: 1, strategy: "Swing", emotion: "Anxious", notes: "News reversal, cut loss early", pnl: -600, fees: 50 },
  { id: 6, date: "2026-04-17", instrument: "HDFC", direction: "Long", entry: 1720, exit: 1775, size: 15, strategy: "Breakout", emotion: "Calm", notes: "Weekly level breakout", pnl: 825, fees: 20 },
  { id: 7, date: "2026-04-22", instrument: "WIPRO", direction: "Short", entry: 465, exit: 448, size: 50, strategy: "Mean Reversion", emotion: "Confident", notes: "Distribution pattern", pnl: 850, fees: 20 },
  { id: 8, date: "2026-04-25", instrument: "TATAMOTORS", direction: "Long", entry: 820, exit: 812, size: 30, strategy: "Trend Follow", emotion: "Uncertain", notes: "Weak follow-through", pnl: -240, fees: 20 },
];

const EMOTIONS = ["Calm", "Confident", "Anxious", "FOMO", "Uncertain", "Excited", "Fearful"];
const STRATEGIES = ["Breakout", "Mean Reversion", "Trend Follow", "Swing", "Scalp", "News Play"];
const DIRECTIONS = ["Long", "Short"];

const fmt = (n) => {
  const abs = Math.abs(n);
  const s = abs >= 100000 ? `₹${(abs/100000).toFixed(1)}L` : abs >= 1000 ? `₹${(abs/1000).toFixed(1)}k` : `₹${abs.toFixed(0)}`;
  return n < 0 ? `-${s}` : `+${s}`;
};
const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function useIsMobile() {
  const [m, setM] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  useEffect(() => { const fn = () => setM(window.innerWidth < 768); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn); }, []);
  return m;
}

const StatCard = ({ label, value, sub, color, accent = false, small = false }) => (
  <div style={{
    background: accent ? "linear-gradient(145deg,#0d0f1a,#0a0c15)" : C.surface,
    border: `1px solid ${accent ? C.accent+"44" : C.border}`,
    borderRadius: 10, padding: small ? "13px 14px" : "18px 20px",
    display: "flex", flexDirection: "column", gap: 4, position: "relative", overflow: "hidden",
  }}>
    {accent && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${C.accent},${C.accent2})` }} />}
    <span style={{ fontSize: 10, fontFamily: "monospace", color: C.muted, textTransform: "uppercase", letterSpacing: 1.5 }}>{label}</span>
    <span style={{ fontSize: small ? 19 : 23, fontWeight: 700, fontFamily: "monospace", color: color || C.text, lineHeight: 1.2 }}>{value}</span>
    {sub && <span style={{ fontSize: 11, color: C.muted }}>{sub}</span>}
  </div>
);

const MiniChart = ({ trades }) => {
  const sorted = [...trades].sort((a,b) => a.date.localeCompare(b.date));
  const cum = []; let run = 0;
  sorted.forEach(t => { run += t.pnl - t.fees; cum.push(run); });
  if (cum.length < 2) return <div style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontSize: 12 }}>Not enough data</div>;
  const W=400, H=70, p=6;
  const min=Math.min(0,...cum), max=Math.max(...cum), rng=max-min||1;
  const pts = cum.map((v,i) => `${p+(i/(cum.length-1))*(W-2*p)},${p+(1-(v-min)/rng)*(H-2*p)}`).join(" ");
  const color = cum[cum.length-1]>=0 ? C.greenBright : C.redBright;
  const ab = p+(1-(0-min)/rng)*(H-2*p);
  const fp=pts.split(" ")[0], lp=pts.split(" ").slice(-1)[0];
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:"block" }} preserveAspectRatio="none">
      <defs><linearGradient id="cg2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
        <stop offset="100%" stopColor={color} stopOpacity="0"/>
      </linearGradient></defs>
      <polygon points={`${fp} ${pts} ${lp.split(",")[0]},${ab} ${fp.split(",")[0]},${ab}`} fill="url(#cg2)"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
};

const BarChart = ({ trades }) => {
  const by={};
  trades.forEach(t=>{ if(!by[t.strategy]) by[t.strategy]={pnl:0,count:0}; by[t.strategy].pnl+=t.pnl-t.fees; by[t.strategy].count++; });
  const entries=Object.entries(by).sort((a,b)=>b[1].pnl-a[1].pnl);
  const maxA=Math.max(...entries.map(([,v])=>Math.abs(v.pnl)),1);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {entries.map(([s,{pnl,count}])=>(
        <div key={s} style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:90, fontSize:10, fontFamily:"monospace", color:C.muted, textAlign:"right", flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s}</span>
          <div style={{ flex:1, height:13, background:C.elevated, borderRadius:3, overflow:"hidden", position:"relative", minWidth:0 }}>
            <div style={{ position:"absolute", top:0, bottom:0, left:pnl>=0?"50%":`${50-(Math.abs(pnl)/maxA)*50}%`, width:`${(Math.abs(pnl)/maxA)*50}%`, background:pnl>=0?C.green:C.red, opacity:0.9 }}/>
            <div style={{ position:"absolute", left:"50%", top:0, bottom:0, width:1, background:C.border }}/>
          </div>
          <span style={{ width:70, fontSize:10, fontFamily:"monospace", color:pnl>=0?C.greenBright:C.redBright, flexShrink:0, textAlign:"right" }}>{fmt(pnl)} <span style={{color:C.muted}}>({count})</span></span>
        </div>
      ))}
    </div>
  );
};

const EmptyState = () => (
  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"36px 20px", color:C.muted, gap:10 }}>
    <svg width={34} height={34} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
    <span style={{ fontSize:13 }}>No trades yet — log your first one.</span>
  </div>
);

const TradeCard = ({ t, onDelete }) => {
  const [open, setOpen] = useState(false);
  const net = t.pnl - t.fees;
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden", marginBottom:8 }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ display:"flex", alignItems:"center", gap:10, padding:"13px 14px", cursor:"pointer", userSelect:"none" }}>
        <div style={{ width:5, height:5, borderRadius:"50%", background:net>=0?C.greenBright:C.redBright, flexShrink:0 }}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
            <span style={{ fontFamily:"monospace", fontSize:14, fontWeight:700, color:C.text }}>{t.instrument}</span>
            <span style={{ fontSize:10, fontWeight:700, color:t.direction==="Long"?C.accent2:C.yellow, background:t.direction==="Long"?"#1a1d30":"#1a1500", borderRadius:4, padding:"1px 7px" }}>{t.direction}</span>
            <span style={{ fontSize:10, color:C.muted, background:C.elevated, borderRadius:4, padding:"1px 7px" }}>{t.strategy}</span>
          </div>
          <span style={{ fontSize:11, color:C.muted, fontFamily:"monospace" }}>{fmtDate(t.date)}</span>
        </div>
        <span style={{ fontFamily:"monospace", fontSize:15, fontWeight:700, color:net>=0?C.greenBright:C.redBright, flexShrink:0 }}>{fmt(net)}</span>
        <span style={{ color:C.muted, fontSize:10, flexShrink:0 }}>{open?"▲":"▼"}</span>
      </div>
      {open && (
        <div style={{ borderTop:`1px solid ${C.border}`, padding:"12px 14px", display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {[["Entry",t.entry.toFixed(2)],["Exit",t.exit.toFixed(2)],["Size",t.size]].map(([l,v])=>(
              <div key={l} style={{ background:C.elevated, borderRadius:6, padding:"8px 10px" }}>
                <div style={{ fontSize:9, color:C.muted, fontFamily:"monospace", letterSpacing:1 }}>{l.toUpperCase()}</div>
                <div style={{ fontSize:13, color:C.text, fontFamily:"monospace", marginTop:2 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[["Emotion",t.emotion],["Fees",`₹${t.fees}`]].map(([l,v])=>(
              <div key={l} style={{ background:C.elevated, borderRadius:6, padding:"8px 10px" }}>
                <div style={{ fontSize:9, color:C.muted, fontFamily:"monospace", letterSpacing:1 }}>{l.toUpperCase()}</div>
                <div style={{ fontSize:13, color:C.text, marginTop:2 }}>{v}</div>
              </div>
            ))}
          </div>
          {t.notes && <div style={{ background:C.elevated, borderRadius:6, padding:"8px 10px" }}>
            <div style={{ fontSize:9, color:C.muted, fontFamily:"monospace", letterSpacing:1, marginBottom:4 }}>NOTES</div>
            <div style={{ fontSize:12, color:C.subtext, lineHeight:1.5 }}>{t.notes}</div>
          </div>}
          <button onClick={()=>onDelete(t.id)} style={{ alignSelf:"flex-end", background:"transparent", border:`1px solid ${C.red}44`, color:C.red, borderRadius:6, padding:"6px 14px", fontSize:12, cursor:"pointer" }}>Delete</button>
        </div>
      )}
    </div>
  );
};

const NAV = {
  Dashboard: (a) => <svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke={a?C.accent2:C.muted} strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>,
  Trades: (a) => <svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke={a?C.accent2:C.muted} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>,
  "Add Trade": (a) => <svg width={21} height={21} fill="none" viewBox="0 0 24 24" stroke={a?C.accent2:C.muted} strokeWidth={2.5}><circle cx="12" cy="12" r="9"/><path strokeLinecap="round" d="M12 8v8M8 12h8"/></svg>,
};

export default function Thesis() {
  const [trades, setTrades] = useState(INITIAL_TRADES);
  const [tab, setTab] = useState("Dashboard");
  const [form, setForm] = useState({ date:"", instrument:"", direction:"Long", entry:"", exit:"", size:"", strategy:"Breakout", emotion:"Calm", notes:"", fees:"20" });
  const [formError, setFormError] = useState("");
  const [filterDir, setFilterDir] = useState("All");
  const [sortKey, setSortKey] = useState("date");
  const [sortAsc, setSortAsc] = useState(false);
  const isMobile = useIsMobile();

  const stats = useMemo(() => {
    if (!trades.length) return { totalPnl:0, winRate:0, avgWin:0, avgLoss:0, totalTrades:0, bestTrade:0, profitFactor:"—", wins:0, losses:0 };
    const net = trades.map(t=>t.pnl-t.fees);
    const wins=net.filter(n=>n>0), losses=net.filter(n=>n<0);
    const gw=wins.reduce((a,b)=>a+b,0), gl=Math.abs(losses.reduce((a,b)=>a+b,0));
    return { totalPnl:net.reduce((a,b)=>a+b,0), winRate:Math.round((wins.length/trades.length)*100), avgWin:wins.length?gw/wins.length:0, avgLoss:losses.length?gl/losses.length:0, totalTrades:trades.length, bestTrade:Math.max(...net), profitFactor:gl>0?(gw/gl).toFixed(2):"∞", wins:wins.length, losses:losses.length };
  }, [trades]);

  const filteredTrades = useMemo(() => {
    let list = filterDir==="All" ? trades : trades.filter(t=>t.direction===filterDir);
    return [...list].sort((a,b) => {
      let av=a[sortKey], bv=b[sortKey];
      if(sortKey==="pnl"){av=a.pnl-a.fees; bv=b.pnl-b.fees;}
      return sortAsc?(av<bv?-1:1):(av>bv?-1:1);
    });
  }, [trades, filterDir, sortKey, sortAsc]);

  const handleSort = (k) => { if(sortKey===k) setSortAsc(!sortAsc); else{setSortKey(k);setSortAsc(false);} };

  const handleSubmit = () => {
    const {date,instrument,entry,exit,size}=form;
    if(!date||!instrument||!entry||!exit||!size){setFormError("Please fill in all required fields.");return;}
    const e=parseFloat(entry),x=parseFloat(exit),s=parseFloat(size),f=parseFloat(form.fees||0);
    const pnl = form.direction==="Long"?(x-e)*s:(e-x)*s;
    setTrades(prev=>[...prev,{id:Date.now(),...form,entry:e,exit:x,size:s,fees:f,pnl}]);
    setForm({date:"",instrument:"",direction:"Long",entry:"",exit:"",size:"",strategy:"Breakout",emotion:"Calm",notes:"",fees:"20"});
    setFormError(""); setTab("Trades");
  };

  const IS = { background:C.elevated, border:`1px solid ${C.border}`, borderRadius:8, padding:"11px 14px", color:C.text, fontFamily:"monospace", fontSize:"15px", width:"100%", outline:"none", WebkitAppearance:"none", appearance:"none" };
  const inp = (f,ph,t="text") => <input type={t} placeholder={ph} value={form[f]} onChange={e=>setForm(v=>({...v,[f]:e.target.value}))} style={IS}/>;
  const sel = (f,opts) => <select value={form[f]} onChange={e=>setForm(v=>({...v,[f]:e.target.value}))} style={{...IS,cursor:"pointer"}}>{opts.map(o=><option key={o} style={{background:C.elevated}}>{o}</option>)}</select>;

  const TABS = ["Dashboard","Trades","Add Trade"];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"system-ui, -apple-system, sans-serif", color:C.text, paddingBottom:isMobile?80:0 }}>
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:${C.bg}; }
        ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:4px; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
        input, select, textarea { -webkit-tap-highlight-color:transparent; }
        .trow:hover { background:${C.elevated} !important; }
        .delbtn { opacity:0; transition:opacity 0.15s; }
        .trow:hover .delbtn { opacity:1 !important; }
        input:focus, select:focus, textarea:focus { border-color:${C.accent} !important; box-shadow:0 0 0 3px ${C.accentGlow} !important; outline:none; }
        ::placeholder { color:${C.muted}; opacity:0.6; }
        button { font-family:inherit; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:isMobile?"0 14px":"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:isMobile?52:60, position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <LogoMark size={isMobile?28:32}/>
          <div style={{ display:"flex", flexDirection:"column", lineHeight:1 }}>
            <span style={{ fontFamily:"monospace", fontWeight:700, fontSize:isMobile?15:18, color:C.text, letterSpacing:"-0.3px" }}>
              Thesis<span style={{ color:C.accent }}>.</span>
            </span>
            {!isMobile && <span style={{ fontSize:10, color:C.muted, letterSpacing:1, textTransform:"uppercase", marginTop:1 }}>Trade Journal</span>}
          </div>
        </div>

        {!isMobile && (
          <div style={{ display:"flex", gap:2, background:C.elevated, borderRadius:8, padding:"3px" }}>
            {TABS.map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{ padding:"6px 16px", borderRadius:6, border:"none", cursor:"pointer", fontSize:13, fontWeight:500, transition:"all 0.15s", background:tab===t?C.surface:"transparent", color:tab===t?C.text:C.muted, boxShadow:tab===t?`0 1px 4px #0008`:"none" }}>{t}</button>
            ))}
          </div>
        )}
        {isMobile && <span style={{ fontSize:10, fontFamily:"monospace", color:C.muted }}>{stats.totalTrades} trades</span>}
      </div>

      <IndexTicker isMobile={isMobile}/>

      <div style={{ padding:isMobile?"12px":"22px 24px", maxWidth:1280, margin:"0 auto" }}>

        {/* DASHBOARD */}
        {tab==="Dashboard" && (
          <div style={{ display:"flex", flexDirection:"column", gap:isMobile?10:18 }}>
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(auto-fit,minmax(155px,1fr))", gap:isMobile?8:10 }}>
              <StatCard label="Total P&L" value={fmt(stats.totalPnl)} sub={`${stats.totalTrades} trades`} color={stats.totalPnl>=0?C.greenBright:C.redBright} accent small={isMobile}/>
              <StatCard label="Win Rate" value={`${stats.winRate}%`} sub={`${stats.wins}W · ${stats.losses}L`} color={C.accent2} small={isMobile}/>
              <StatCard label="Profit Factor" value={stats.profitFactor} color="#a5b4fc" small={isMobile}/>
              <StatCard label="Avg Win" value={fmt(stats.avgWin)} color={C.greenBright} small={isMobile}/>
              {!isMobile && <StatCard label="Avg Loss" value={fmt(stats.avgLoss)} color={C.redBright}/>}
              {!isMobile && <StatCard label="Best Trade" value={fmt(stats.bestTrade)} color={C.greenBright}/>}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:isMobile?10:12 }}>
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:isMobile?14:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <span style={{ fontSize:10, fontFamily:"monospace", color:C.muted, letterSpacing:1.5, textTransform:"uppercase" }}>Equity Curve</span>
                  <span style={{ fontSize:13, fontFamily:"monospace", fontWeight:700, color:stats.totalPnl>=0?C.greenBright:C.redBright }}>{fmt(stats.totalPnl)}</span>
                </div>
                <MiniChart trades={trades}/>
                {trades.length>0 && <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                  <span style={{ fontSize:10, color:C.muted, fontFamily:"monospace" }}>{fmtDate(trades.reduce((a,b)=>a.date<b.date?a:b).date)}</span>
                  <span style={{ fontSize:10, color:C.muted, fontFamily:"monospace" }}>{fmtDate(trades.reduce((a,b)=>a.date>b.date?a:b).date)}</span>
                </div>}
              </div>
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:isMobile?14:20 }}>
                <span style={{ fontSize:10, fontFamily:"monospace", color:C.muted, letterSpacing:1.5, textTransform:"uppercase", display:"block", marginBottom:14 }}>P&L by Strategy</span>
                {trades.length?<BarChart trades={trades}/>:<EmptyState/>}
              </div>
            </div>

            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:isMobile?14:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <span style={{ fontSize:10, fontFamily:"monospace", color:C.muted, letterSpacing:1.5, textTransform:"uppercase" }}>Recent Trades</span>
                <button onClick={()=>setTab("Trades")} style={{ background:"none", border:"none", color:C.accent2, fontSize:12, cursor:"pointer" }}>View all →</button>
              </div>
              {trades.length===0?<EmptyState/>:(
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  {[...trades].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(t=>{
                    const net=t.pnl-t.fees;
                    return (
                      <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:7, background:C.elevated }}>
                        <div style={{ width:5, height:5, borderRadius:"50%", background:net>=0?C.greenBright:C.redBright, flexShrink:0 }}/>
                        <span style={{ width:isMobile?50:70, fontFamily:"monospace", fontSize:10, color:C.muted, flexShrink:0 }}>{fmtDate(t.date)}</span>
                        <span style={{ fontFamily:"monospace", fontSize:13, fontWeight:700, color:C.text, flexShrink:0 }}>{t.instrument}</span>
                        <span style={{ flex:1, fontSize:11, color:t.direction==="Long"?C.accent2:C.yellow, fontWeight:600 }}>{t.direction}</span>
                        {!isMobile && <span style={{ flex:1, fontSize:11, color:C.muted }}>{t.strategy}</span>}
                        <span style={{ fontFamily:"monospace", fontSize:13, fontWeight:700, color:net>=0?C.greenBright:C.redBright, flexShrink:0 }}>{fmt(net)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TRADES */}
        {tab==="Trades" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
              {["All","Long","Short"].map(d=>(
                <button key={d} onClick={()=>setFilterDir(d)} style={{ padding:"6px 14px", borderRadius:6, border:`1px solid ${filterDir===d?C.accent:C.border}`, cursor:"pointer", fontSize:12, fontWeight:600, background:filterDir===d?`${C.accent}22`:"transparent", color:filterDir===d?C.accent2:C.muted, transition:"all 0.15s" }}>{d}</button>
              ))}
              <span style={{ marginLeft:"auto", fontSize:11, color:C.muted, fontFamily:"monospace" }}>{filteredTrades.length} trades</span>
            </div>

            {isMobile && <div>{filteredTrades.length===0?<EmptyState/>:filteredTrades.map(t=><TradeCard key={t.id} t={t} onDelete={(id)=>setTrades(p=>p.filter(x=>x.id!==id))}/>)}</div>}

            {!isMobile && (
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, overflow:"auto" }}>
                <div style={{ display:"grid", gridTemplateColumns:"110px 90px 60px 90px 90px 70px 130px 110px 90px 40px", padding:"11px 18px", borderBottom:`1px solid ${C.border}`, background:C.elevated, minWidth:890 }}>
                  {[["date","Date"],["instrument","Symbol"],["direction","Side"],["entry","Entry"],["exit","Exit"],["size","Size"],["strategy","Strategy"],["emotion","Emotion"],["pnl","Net P&L"]].map(([k,l])=>(
                    <button key={k} onClick={()=>handleSort(k)} style={{ background:"none", border:"none", cursor:"pointer", textAlign:"left", fontFamily:"monospace", fontSize:10, color:sortKey===k?C.accent2:C.muted, letterSpacing:1.5, textTransform:"uppercase", padding:0 }}>
                      {l}{sortKey===k&&<span style={{ fontSize:8, marginLeft:3 }}>{sortAsc?"▲":"▼"}</span>}
                    </button>
                  ))}
                  <span/>
                </div>
                {filteredTrades.length===0?<EmptyState/>:filteredTrades.map(t=>{
                  const net=t.pnl-t.fees;
                  return (
                    <div key={t.id} className="trow" title={t.notes} style={{ display:"grid", gridTemplateColumns:"110px 90px 60px 90px 90px 70px 130px 110px 90px 40px", padding:"12px 18px", borderBottom:`1px solid ${C.border}`, alignItems:"center", transition:"background 0.15s", minWidth:890 }}>
                      <span style={{ fontFamily:"monospace", fontSize:11, color:C.muted }}>{fmtDate(t.date)}</span>
                      <span style={{ fontFamily:"monospace", fontSize:13, fontWeight:700, color:C.text }}>{t.instrument}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:t.direction==="Long"?C.accent2:C.yellow }}>{t.direction}</span>
                      <span style={{ fontFamily:"monospace", fontSize:12, color:C.subtext }}>{t.entry.toFixed(2)}</span>
                      <span style={{ fontFamily:"monospace", fontSize:12, color:C.subtext }}>{t.exit.toFixed(2)}</span>
                      <span style={{ fontFamily:"monospace", fontSize:12, color:C.subtext }}>{t.size}</span>
                      <span style={{ fontSize:11, color:C.muted, background:C.elevated, borderRadius:4, padding:"2px 8px", display:"inline-block" }}>{t.strategy}</span>
                      <span style={{ fontSize:11, color:C.muted }}>{t.emotion}</span>
                      <span style={{ fontFamily:"monospace", fontSize:13, fontWeight:700, color:net>=0?C.greenBright:C.redBright }}>{fmt(net)}</span>
                      <button className="delbtn" onClick={()=>setTrades(p=>p.filter(x=>x.id!==t.id))} style={{ background:"none", border:"none", cursor:"pointer", color:C.red, fontSize:17, padding:0 }}>×</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ADD TRADE */}
        {tab==="Add Trade" && (
          <div style={{ maxWidth:580, margin:"0 auto" }}>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:isMobile?14:26, display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <h2 style={{ fontFamily:"monospace", fontSize:isMobile?14:16, color:C.text }}>Log New Trade</h2>
                <p style={{ fontSize:12, color:C.muted, marginTop:4 }}>Record your entry, exit and notes</p>
              </div>
              <div style={{ height:1, background:C.border }}/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:isMobile?10:12 }}>
                {[["DATE *","date","Date","date"],["SYMBOL *","instrument","e.g. RELIANCE","text"]].map(([l,f,ph,t])=>(
                  <div key={f} style={{ display:"flex", flexDirection:"column", gap:5 }}>
                    <label style={{ fontSize:10, fontFamily:"monospace", color:C.muted, letterSpacing:1 }}>{l}</label>
                    {inp(f,ph,t)}
                  </div>
                ))}
                {[["DIRECTION *","direction",DIRECTIONS],["STRATEGY","strategy",STRATEGIES]].map(([l,f,opts])=>(
                  <div key={f} style={{ display:"flex", flexDirection:"column", gap:5 }}>
                    <label style={{ fontSize:10, fontFamily:"monospace", color:C.muted, letterSpacing:1 }}>{l}</label>
                    {sel(f,opts)}
                  </div>
                ))}
                {[["ENTRY *","entry","0.00"],["EXIT *","exit","0.00"],["SIZE *","size","Qty"],["FEES (₹)","fees","20"]].map(([l,f,ph])=>(
                  <div key={f} style={{ display:"flex", flexDirection:"column", gap:5 }}>
                    <label style={{ fontSize:10, fontFamily:"monospace", color:C.muted, letterSpacing:1 }}>{l}</label>
                    {inp(f,ph,"number")}
                  </div>
                ))}
                <div style={{ display:"flex", flexDirection:"column", gap:5, gridColumn:"span 2" }}>
                  <label style={{ fontSize:10, fontFamily:"monospace", color:C.muted, letterSpacing:1 }}>EMOTION</label>
                  {sel("emotion",EMOTIONS)}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:5, gridColumn:"span 2" }}>
                  <label style={{ fontSize:10, fontFamily:"monospace", color:C.muted, letterSpacing:1 }}>NOTES / THESIS</label>
                  <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Why did you take this trade?" rows={3}
                    style={{...IS, fontFamily:"sans-serif", fontSize:"15px", resize:"vertical"}}/>
                </div>
              </div>

              {form.entry&&form.exit&&form.size&&(()=>{
                const pnl=form.direction==="Long"?(parseFloat(form.exit)-parseFloat(form.entry))*parseFloat(form.size):(parseFloat(form.entry)-parseFloat(form.exit))*parseFloat(form.size);
                const net=pnl-parseFloat(form.fees||0);
                return !isNaN(net)?(<div style={{ background:C.elevated, border:`1px solid ${C.border}`, borderRadius:8, padding:"11px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontFamily:"monospace", fontSize:11, color:C.muted, letterSpacing:1 }}>EST. P&L</span>
                  <span style={{ fontFamily:"monospace", fontSize:16, fontWeight:700, color:net>=0?C.greenBright:C.redBright }}>{fmt(net)}</span>
                </div>):null;
              })()}

              {formError&&<p style={{ color:C.red, fontSize:12 }}>{formError}</p>}

              <button onClick={handleSubmit} style={{ background:C.accent, border:"none", borderRadius:8, padding:"12px 24px", color:"white", fontFamily:"monospace", fontSize:13, fontWeight:700, cursor:"pointer", touchAction:"manipulation", letterSpacing:"0.3px" }}
                onMouseOver={e=>e.currentTarget.style.background="#4752c4"} onMouseOut={e=>e.currentTarget.style.background=C.accent}>
                Log Trade →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <div style={{ position:"fixed", bottom:0, left:0, right:0, background:C.surface, borderTop:`1px solid ${C.border}`, display:"flex", zIndex:200, paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"10px 0 8px", background:"none", border:"none", cursor:"pointer", gap:3, borderTop:tab===t?`2px solid ${C.accent}`:"2px solid transparent", touchAction:"manipulation" }}>
              {NAV[t](tab===t)}
              <span style={{ fontSize:9, fontFamily:"monospace", letterSpacing:0.5, textTransform:"uppercase", color:tab===t?C.accent2:C.muted }}>{t==="Add Trade"?"Add":t}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
