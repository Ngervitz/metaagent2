import { useState, useEffect } from "react";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1AabqPmRBVR6J8trdM50_F5Nnw4tBFPoT1Fk-9PnLC5iz9T15lnSjNe4J21IW6CIKDXmkbzxmg6PK/pub?gid=0&single=true&output=csv";

const fmt = (val, dec = 2) => { const n = parseFloat(val); return isNaN(n) ? "—" : n.toFixed(dec); };
const fmtN = (val) => { const n = parseFloat(val); return isNaN(n) ? null : n; };

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_").replace(/[()]/g, ""));
  return lines.slice(1).map(line => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i]?.trim() || ""; });
    return obj;
  }).filter(row => Object.values(row).some(v => v !== ""));
}

function findVal(row, ...keys) {
  for (const k of keys) {
    const found = Object.keys(row).find(rk => rk.includes(k.toLowerCase()));
    if (found && row[found] !== "") { const n = parseFloat(row[found]); return isNaN(n) ? row[found] : n; }
  }
  return null;
}

function Sparkbar({ value, max, color = "#3b82f6" }) {
  const pct = Math.min(((fmtN(value) || 0) / (fmtN(max) || 1)) * 100, 100);
  return (
    <div style={{ height: 3, background: "#1f2937", borderRadius: 2, marginTop: 6 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 1s ease" }} />
    </div>
  );
}

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("campaigns");
  const [lastUpdate, setLastUpdate] = useState(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(SHEET_URL);
      if (!res.ok) throw new Error("Error al cargar");
      const text = await res.text();
      const parsed = parseCSV(text);
      setData(parsed);
      setLastUpdate(new Date().toLocaleTimeString("es-AR"));
    } catch (e) {
      setError("No se pudo conectar con Google Sheets.");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const campaigns = {};
  data.forEach(row => {
    const name = findVal(row, "campana", "campaign") || "Sin nombre";
    if (!campaigns[name]) campaigns[name] = { name, cpl: [], ctr: [], cpc: [], frecuencia: [], gasto: [], conversiones: [], dias: 0 };
    campaigns[name].dias++;
    const add = (arr, ...keys) => { const v = findVal(row, ...keys); if (v !== null && !isNaN(v)) arr.push(v); };
    add(campaigns[name].cpl, "cpl");
    add(campaigns[name].ctr, "ctr");
    add(campaigns[name].cpc, "cpc");
    add(campaigns[name].frecuencia, "frecuencia", "frequency");
    add(campaigns[name].gasto, "gasto", "spend");
    add(campaigns[name].conversiones, "conversiones", "conversions");
  });

  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const sum = arr => arr.length ? arr.reduce((a, b) => a + b, 0) : null;

  const campList = Object.values(campaigns).map(c => ({
    name: c.name, dias: c.dias,
    cpl: avg(c.cpl), ctr: avg(c.ctr), cpc: avg(c.cpc),
    frecuencia: avg(c.frecuencia), gasto: sum(c.gasto), conversiones: sum(c.conversiones),
  }));

  const totalGasto = campList.reduce((a, c) => a + (c.gasto || 0), 0);
  const totalConv = campList.reduce((a, c) => a + (c.conversiones || 0), 0);
  const cplVals = campList.filter(c => c.cpl !== null);
  const avgCPL = cplVals.length ? cplVals.reduce((a, c) => a + c.cpl, 0) / cplVals.length : null;
  const alertas = campList.filter(c => (c.frecuencia !== null && c.frecuencia > 4.5) || (c.cpl !== null && c.cpl > 1.5) || (c.ctr !== null && c.ctr < 1));

  return (
    <div style={{ fontFamily: "'DM Mono', monospace", background: "#050508", minHeight: "100vh", color: "#e2e8f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&family=DM+Sans:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #1f2937; }
        .card { background: #0d0d14; border: 1px solid #1a1a2e; border-radius: 12px; padding: 20px; transition: all 0.2s; }
        .fade { animation: fadeIn 0.4s ease both; } @keyframes fadeIn { from { opacity:0; transform:translateY(8px);} to { opacity:1; transform:translateY(0); } }
        .btn { cursor: pointer; border: none; border-radius: 8px; padding: 9px 18px; font-family: 'DM Mono', monospace; font-size: 12px; transition: all 0.2s; }
        .pulse { animation: pulse 2s infinite; } @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        .tab { cursor: pointer; padding: 7px 14px; border-radius: 8px; font-size: 12px; transition: all 0.2s; color: #374151; letter-spacing: 1px; text-transform: uppercase; }
        .tab.active { background: #0f172a; color: #60a5fa; border: 1px solid #1e3a8a; }
        .row-card { padding: 16px 20px; background: #0d0d14; border: 1px solid #1a1a2e; border-radius: 10px; transition: all 0.15s; margin-bottom: 10px; }
        .row-card:hover { border-color: #2d2d50; }
        .mv { font-family: 'Bebas Neue', sans-serif; letter-spacing: 1px; }
        .ab { padding: 2px 8px; border-radius: 20px; font-size: 10px; letter-spacing: 1px; }
      `}</style>

      <div style={{ padding: "16px 28px", borderBottom: "1px solid #0f0f1f", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 38, height: 38, background: "linear-gradient(135deg, #1d4ed8, #7c3aed)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚡</div>
          <div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: 3 }}>META ADS AGENT</div>
            <div style={{ fontSize: 10, color: "#374151", letterSpacing: 2 }}>POWERED BY CLAUDE AI</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {alertas.length > 0 && <div style={{ background: "#1c0a0a", border: "1px solid #7f1d1d", color: "#fca5a5", borderRadius: 8, padding: "6px 12px", fontSize: 11 }}>⚠ {alertas.length} ALERTA{alertas.length > 1 ? "S" : ""}</div>}
          <div style={{ fontSize: 10, color: "#374151" }}>{lastUpdate ? `SYNC ${lastUpdate}` : ""}</div>
          <button className="btn" onClick={loadData} style={{ background: "#0f172a", color: "#60a5fa", border: "1px solid #1e3a8a" }}>↻ SYNC</button>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#052e16", border: "1px solid #14532d", borderRadius: 8, padding: "6px 12px" }}>
            <span className="pulse" style={{ width: 6, height: 6, background: "#22c55e", borderRadius: "50%", display: "inline-block" }} />
            <span style={{ fontSize: 10, color: "#4ade80", letterSpacing: 2 }}>LIVE</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16 }}>
          <div className="pulse" style={{ fontFamily: "'Bebas Neue'", fontSize: 48, letterSpacing: 8, color: "#1d4ed8" }}>CARGANDO</div>
          <div style={{ fontSize: 11, color: "#374151", letterSpacing: 3 }}>CONECTANDO CON GOOGLE SHEETS</div>
        </div>
      ) : error ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16 }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <div style={{ color: "#fca5a5", fontSize: 14 }}>{error}</div>
          <button className="btn" onClick={loadData} style={{ background: "#1d4ed8", color: "#fff" }}>Reintentar</button>
        </div>
      ) : (
        <div style={{ padding: "24px 28px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }} className="fade">
            {[
              { label: "GASTO TOTAL", val: `$${fmt(totalGasto, 0)}`, sub: `${data.length} registros`, color: "#3b82f6", icon: "💰" },
              { label: "CONVERSIONES", val: totalConv ? fmt(totalConv, 0) : "—", sub: "total acumulado", color: "#22c55e", icon: "🎯" },
              { label: "CPL PROMEDIO", val: avgCPL !== null ? `$${fmt(avgCPL)}` : "—", sub: avgCPL !== null && avgCPL <= 1 ? "✓ Bajo objetivo" : "⚠ Sobre objetivo", color: avgCPL !== null && avgCPL <= 1 ? "#22c55e" : "#f59e0b", icon: "📉" },
              { label: "ALERTAS", val: alertas.length, sub: alertas.length === 0 ? "Todo en orden" : "Requieren atención", color: alertas.length === 0 ? "#22c55e" : "#ef4444", icon: alertas.length === 0 ? "✅" : "🚨" },
            ].map((k, i) => (
              <div key={i} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: "#374151", letterSpacing: 2 }}>{k.label}</div>
                  <span style={{ fontSize: 18 }}>{k.icon}</span>
                </div>
                <div className="mv" style={{ fontSize: 32, color: k.color }}>{k.val}</div>
                <div style={{ fontSize: 10, color: "#4b5563", marginTop: 4 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
            {[["campaigns", "📊 Campañas"], ["alerts", `🚨 Alertas (${alertas.length})`], ["raw", "📋 Datos"]].map(([id, label]) => (
              <div key={id} className={`tab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</div>
            ))}
          </div>

          {tab === "campaigns" && (
            <div className="fade">
              {campList.length === 0 ? (
                <div style={{ textAlign: "center", color: "#374151", padding: 40 }}>No se encontraron campañas</div>
              ) : campList.map((c, i) => {
                const hasAlert = (c.frecuencia !== null && c.frecuencia > 4.5) || (c.cpl !== null && c.cpl > 1.5) || (c.ctr !== null && c.ctr < 1);
                return (
                  <div key={i} className="row-card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: hasAlert ? "#ef4444" : "#22c55e", fontSize: 10 }}>●</span>
                        <span style={{ fontFamily: "'DM Sans'", fontWeight: 600, fontSize: 14 }}>{c.name}</span>
                        {hasAlert && <span className="ab" style={{ background: "#1c0a0a", color: "#fca5a5", border: "1px solid #7f1d1d" }}>⚠ ALERTA</span>}
                      </div>
                      <div style={{ fontSize: 10, color: "#374151" }}>{c.dias} DÍA{c.dias !== 1 ? "S" : ""}</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16 }}>
                      {[
                        { label: "CPL", val: c.cpl !== null ? `$${fmt(c.cpl)}` : "—", warn: c.cpl !== null && c.cpl > 1, bar: c.cpl, max: 5, color: c.cpl !== null && c.cpl > 1 ? "#ef4444" : "#22c55e" },
                        { label: "CTR", val: c.ctr !== null ? `${fmt(c.ctr)}%` : "—", warn: c.ctr !== null && c.ctr < 1, bar: c.ctr, max: 10, color: c.ctr !== null && c.ctr < 1 ? "#f59e0b" : "#3b82f6" },
                        { label: "CPC", val: c.cpc !== null ? `$${fmt(c.cpc)}` : "—", warn: false, bar: c.cpc, max: 5, color: "#8b5cf6" },
                        { label: "FREC.", val: c.frecuencia !== null ? fmt(c.frecuencia, 1) : "—", warn: c.frecuencia !== null && c.frecuencia > 4.5, bar: c.frecuencia, max: 10, color: c.frecuencia !== null && c.frecuencia > 4.5 ? "#ef4444" : "#22c55e" },
                        { label: "GASTO", val: c.gasto !== null ? `$${fmt(c.gasto, 0)}` : "—", warn: false, bar: c.gasto, max: totalGasto || 1, color: "#f59e0b" },
                        { label: "CONV.", val: c.conversiones !== null ? fmt(c.conversiones, 0) : "—", warn: false, bar: c.conversiones, max: totalConv || 1, color: "#22c55e" },
                      ].map((m, j) => (
                        <div key={j}>
                          <div style={{ fontSize: 9, color: "#374151", letterSpacing: 2, marginBottom: 4 }}>{m.label}</div>
                          <div className="mv" style={{ fontSize: 20, color: m.warn ? "#ef4444" : "#e2e8f0" }}>{m.val}</div>
                          <Sparkbar value={m.bar} max={m.max} color={m.color} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "alerts" && (
            <div className="fade">
              {alertas.length === 0 ? (
                <div style={{ textAlign: "center", padding: 60 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: 3, color: "#22c55e" }}>TODO EN ORDEN</div>
                </div>
              ) : alertas.map((c, i) => (
                <div key={i} className="card" style={{ borderColor: "#7f1d1d", marginBottom: 10 }}>
                  <div style={{ fontFamily: "'DM Sans'", fontWeight: 700, marginBottom: 12 }}>{c.name}</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {c.frecuencia !== null && c.frecuencia > 4.5 && (
                      <div style={{ background: "#1c0a0a", border: "1px solid #7f1d1d", borderRadius: 8, padding: "8px 14px" }}>
                        <div style={{ fontSize: 10, color: "#fca5a5", letterSpacing: 1 }}>⚡ FRECUENCIA ALTA</div>
                        <div className="mv" style={{ fontSize: 22, color: "#ef4444" }}>{fmt(c.frecuencia, 1)}</div>
                        <div style={{ fontSize: 10, color: "#6b7280" }}>Renovar creatividades urgente</div>
                      </div>
                    )}
                    {c.cpl !== null && c.cpl > 1.5 && (
                      <div style={{ background: "#1c0a0a", border: "1px solid #7f1d1d", borderRadius: 8, padding: "8px 14px" }}>
                        <div style={{ fontSize: 10, color: "#fca5a5", letterSpacing: 1 }}>📉 CPL ALTO</div>
                        <div className="mv" style={{ fontSize: 22, color: "#ef4444" }}>${fmt(c.cpl)}</div>
                        <div style={{ fontSize: 10, color: "#6b7280" }}>Revisar audiencia y landing</div>
                      </div>
                    )}
                    {c.ctr !== null && c.ctr < 1 && (
                      <div style={{ background: "#1c0911", border: "1px solid #78350f", borderRadius: 8, padding: "8px 14px" }}>
                        <div style={{ fontSize: 10, color: "#fcd34d", letterSpacing: 1 }}>👁 CTR BAJO</div>
                        <div className="mv" style={{ fontSize: 22, color: "#f59e0b" }}>{fmt(c.ctr)}%</div>
                        <div style={{ fontSize: 10, color: "#6b7280" }}>Cambiar creatividad urgente</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "raw" && (
            <div className="fade" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1a1a2e" }}>
                    {data.length > 0 && Object.keys(data[0]).map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#374151", letterSpacing: 2, fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 50).map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #0f0f1f" }}>
                      {Object.values(row).map((val, j) => (
                        <td key={j} style={{ padding: "8px 12px", color: "#6b7280" }}>{val || "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: 24, padding: "12px 0", borderTop: "1px solid #0f0f1f", display: "flex", justifyContent: "space-between", fontSize: 10, color: "#1f2937", letterSpacing: 2 }}>
            <span>SUPERAGENTE META ADS</span>
            <span>{data.length} REGISTROS · CPL OBJETIVO $1.00</span>
            <span>AUTO-REFRESH 5MIN</span>
          </div>
        </div>
      )}
    </div>
  );
}
