import { useState, useEffect, useMemo } from "react";
import Auth from "./Auth";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendingUp, Plus, Trash2, DollarSign, BarChart2, List, ArrowDownCircle, X, ArrowRightCircle, Settings, Loader } from "lucide-react";

const SUPABASE_URL = "https://fvsojxozbvyznlzseboz.supabase.co";
const SUPABASE_KEY = "sb_publishable_8g5sy2fm1lWJNn3_VuEjOg_blrmAkVJ";
let authToken = null;
const getH = () => ({
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${authToken || SUPABASE_KEY}`
});

const api = {
  get: (table, qs = "") => fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, { headers: { ...getH(), "Prefer": "return=representation" } }).then(r => r.json()),
  post: (table, body) => fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: { ...getH(), "Prefer": "return=representation" }, body: JSON.stringify(body) }).then(r => r.json()),
  patch: (table, id, body) => fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: { ...getH(), "Prefer": "return=representation" }, body: JSON.stringify(body) }).then(r => r.json()),
  delete: (table, id) => fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: getH() }),
};

const COLORS = ["#C9A84C", "#E8C97A", "#A07830", "#F0DFA0", "#7A5C20", "#D4B060", "#8B6914", "#FFE8A0"];
const CATEGORIAS_ATIVO = ["Ações", "FIIs", "Renda Fixa", "Tesouro Direto", "Criptomoedas", "ETFs", "Fundos", "Outros"];
const CATEGORIAS_PROVENTO = ["Dividendos", "JCP", "Rendimento", "Aluguel", "Cupom", "Outros"];
const MOEDAS = ["BRL", "USD"];
const CORRETORAS_DEFAULT = ["Banco Inter", "Inter Global", "XP Investimentos", "Rico", "Clear", "Nu Invest", "BTG Pactual", "Toro", "Avenue"];

const fmtBRL = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const fmtUSD = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v || 0);
const fmt = (v, moeda) => moeda === "USD" ? fmtUSD(v) : fmtBRL(v);
const fmtDate = (d) => { if (!d) return ""; const [y, m, dd] = d.split("-"); return `${dd}/${m}/${y}`; };

const DEF_APLIC = { nome: "", categoria: "Renda Fixa", moeda: "BRL", valor: "", data: new Date().toISOString().split("T")[0], rentabilidade: "", notas: "", corretora: "", origemProventoIds: [] };
const DEF_PROV  = { ativo: "", tipo: "Dividendos", moeda: "BRL", valor: "", data: new Date().toISOString().split("T")[0], corretora: "" };

function CorretoraSelect({ value, onChange, corretoras, onAddCorretora }) {
  const [adding, setAdding] = useState(false);
  const [nova, setNova] = useState("");
  const inputStyle = { width: "100%", background: "#0D0D0D", border: "1px solid #2A2000", borderRadius: 8, padding: "10px 14px", color: "#E8C97A", fontSize: 14, fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box" };
  const confirmar = () => {
    const t = nova.trim();
    if (t) { onAddCorretora(t); onChange(t); }
    setNova(""); setAdding(false);
  };
  if (adding) return (
    <div style={{ display: "flex", gap: 8 }}>
      <input autoFocus value={nova} onChange={e => setNova(e.target.value)} onKeyDown={e => { if (e.key === "Enter") confirmar(); if (e.key === "Escape") setAdding(false); }} placeholder="Nome da corretora..." style={{ ...inputStyle, flex: 1 }} />
      <button onClick={confirmar} style={{ background: "#1A2A1A", border: "1px solid #2A4A2A", borderRadius: 8, padding: "0 14px", color: "#6BBF6B", cursor: "pointer", fontSize: 13 }}>✓</button>
      <button onClick={() => setAdding(false)} style={{ background: "none", border: "1px solid #2A2000", borderRadius: 8, padding: "0 10px", color: "#5A4A20", cursor: "pointer" }}>✕</button>
    </div>
  );
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
        <option value="">— Selecionar —</option>
        {corretoras.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <button onClick={() => setAdding(true)} style={{ background: "#1A1200", border: "1px solid #3A2800", borderRadius: 8, padding: "0 12px", color: "#C9A84C", cursor: "pointer", fontSize: 18, flexShrink: 0 }}>+</button>
    </div>
  );
}

export default function App() {
  const [aplicacoes, setAplicacoes] = useState([]);
  const [proventos, setProventos] = useState([]);
  const [corretoras, setCorretoras] = useState(CORRETORAS_DEFAULT);
  const [cotacaoUSD, setCotacaoUSD] = useState(5.80);
  const [cotacaoId, setCotacaoId] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [formA, setFormA] = useState(DEF_APLIC);
  const [formP, setFormP] = useState(DEF_PROV);
  const [editItem, setEditItem] = useState(null);
  const [editCotacao, setEditCotacao] = useState(false);
  const [tempCotacao, setTempCotacao] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadAll = async () => {
    setLoading(true); setError(null);
    try {
      const [apls, provs, configs] = await Promise.all([
        api.get("aplicacoes", `order=created_at.desc&user_id=eq.${user?.id}`),
        api.get("proventos", `order=created_at.desc&user_id=eq.${user?.id}`),
        api.get("configuracoes", `user_id=eq.${user?.id}`),
      ]);
      if (Array.isArray(apls)) setAplicacoes(apls); else throw new Error("Erro ao carregar aplicações");
      if (Array.isArray(provs)) setProventos(provs); else throw new Error("Erro ao carregar proventos");
      if (Array.isArray(configs)) {
        const cotConf = configs.find(c => c.chave === "cotacaoUSD");
        if (cotConf) { setCotacaoUSD(parseFloat(cotConf.valor)); setCotacaoId(cotConf.id); }
        const corrConf = configs.find(c => c.chave === "corretoras");
        if (corrConf) setCorretoras(JSON.parse(corrConf.valor));
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handleLogin = (token, userData) => {
    authToken = token;
    setUser(userData);
    localStorage.setItem("sb_token", token);
    localStorage.setItem("sb_user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    authToken = null;
    setUser(null);
    localStorage.removeItem("sb_token");
    localStorage.removeItem("sb_user");
  };

  useEffect(() => {
    const token = localStorage.getItem("sb_token");
    const userData = localStorage.getItem("sb_user");
    if (token && userData) {
      authToken = token;
      setUser(JSON.parse(userData));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) loadAll(); }, [user]);

  const toBRL = (valor, moeda) => moeda === "USD" ? valor * cotacaoUSD : valor;

  const totalPatrimonioBRL = useMemo(() => aplicacoes.reduce((s, a) => s + toBRL(Number(a.valor), a.moeda), 0), [aplicacoes, cotacaoUSD]);
  const totalProventosBRL  = useMemo(() => proventos.reduce((s, p) => s + toBRL(Number(p.valor), p.moeda), 0), [proventos, cotacaoUSD]);
  const proventosLivresBRL = useMemo(() => proventos.filter(p => !p.reaplicado).reduce((s, p) => s + toBRL(Number(p.valor), p.moeda), 0), [proventos, cotacaoUSD]);

  const byCategoria = useMemo(() => {
    const map = {};
    aplicacoes.forEach(a => { map[a.categoria] = (map[a.categoria] || 0) + toBRL(Number(a.valor), a.moeda); });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [aplicacoes, cotacaoUSD]);

  const byMonth = useMemo(() => {
    const map = {};
    aplicacoes.forEach(a => {
      const m = a.data?.slice(0, 7) || "N/A";
      map[m] = (map[m] || 0) + toBRL(Number(a.valor), a.moeda);
    });
    return Object.entries(map).sort().map(([m, v]) => { const [y, mo] = m.split("-"); return { month: `${mo}/${y}`, value: v }; });
  }, [aplicacoes, cotacaoUSD]);

  const saveCotacao = async () => {
    const v = parseFloat(tempCotacao.replace(",", "."));
    if (isNaN(v) || v <= 0) return;
    setSaving(true);
    if (cotacaoId) {
      await api.patch("configuracoes", cotacaoId, { valor: String(v) });
    } else {
      const res = await api.post("configuracoes", { chave: "cotacaoUSD", valor: String(v), user_id: user?.id });
      if (res[0]?.id) setCotacaoId(res[0].id);
    }
    setCotacaoUSD(v); setEditCotacao(false); setSaving(false);
  };

  const addCorretora = async (nome) => {
    const updated = [...new Set([...corretoras, nome])];
    setCorretoras(updated);
    const existing = await api.get("configuracoes", "chave=eq.corretoras");
    if (existing[0]?.id) {
      await api.patch("configuracoes", existing[0].id, { valor: JSON.stringify(updated) });
    } else {
      await api.post("configuracoes", { chave: "corretoras", valor: JSON.stringify(updated), user_id: user?.id });
    }
  };

  const addAplicacao = async () => {
    if (!formA.nome || !formA.valor) return;
    setSaving(true);
    const body = { nome: formA.nome, categoria: formA.categoria, moeda: formA.moeda, valor: Number(formA.valor), data: formA.data, rentabilidade: formA.rentabilidade || null, notas: formA.notas || null, corretora: formA.corretora || null, origem_provento_ids: formA.origemProventoIds, user_id: user?.id };
    const res = await api.post("aplicacoes", body);
    if (res[0]) {
      setAplicacoes(prev => [res[0], ...prev]);
      if (formA.origemProventoIds.length > 0) {
        await Promise.all(formA.origemProventoIds.map(pid => api.patch("proventos", pid, { reaplicado: true })));
        setProventos(prev => prev.map(p => formA.origemProventoIds.includes(p.id) ? { ...p, reaplicado: true } : p));
      }
    }
    setFormA(DEF_APLIC); setModal(null); setSaving(false);
  };

  const addProvento = async () => {
    if (!formP.ativo || !formP.valor) return;
    setSaving(true);
    const body = { ativo: formP.ativo, tipo: formP.tipo, moeda: formP.moeda, valor: Number(formP.valor), data: formP.data, corretora: formP.corretora || null, reaplicado: false, user_id: user?.id };
    const res = await api.post("proventos", body);
    if (res[0]) setProventos(prev => [res[0], ...prev]);
    setFormP(DEF_PROV); setModal(null); setSaving(false);
  };

  const delAplicacao = async (id) => { await api.delete("aplicacoes", id); setAplicacoes(prev => prev.filter(a => a.id !== id)); };
  const delProvento  = async (id) => { await api.delete("proventos", id); setProventos(prev => prev.filter(p => p.id !== id)); };

  const openEdit = (tipo, item) => setEditItem({ tipo, data: { ...item } });

  const saveEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    if (editItem.tipo === "aplicacao") {
      const { id, created_at, ...rest } = editItem.data;
      await api.patch("aplicacoes", id, { ...rest, valor: Number(rest.valor) });
      setAplicacoes(prev => prev.map(a => a.id === id ? { ...editItem.data, valor: Number(editItem.data.valor) } : a));
    } else {
      const { id, created_at, ...rest } = editItem.data;
      await api.patch("proventos", id, { ...rest, valor: Number(rest.valor) });
      setProventos(prev => prev.map(p => p.id === id ? { ...editItem.data, valor: Number(editItem.data.valor) } : p));
    }
    setEditItem(null); setSaving(false);
  };

  const inputStyle = { width: "100%", background: "#0D0D0D", border: "1px solid #2A2000", borderRadius: 8, padding: "10px 14px", color: "#E8C97A", fontSize: 14, fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontSize: 11, color: "#7A6A40", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 };
  const badge = (text, color = "#C9A84C", bg = "#1E1800", border = "#3A3000") => (
    <span style={{ background: bg, border: `1px solid ${border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, color, whiteSpace: "nowrap" }}>{text}</span>
  );

  if (!user) return <Auth onLogin={handleLogin} />;

  if (loading) return (
    <div style={{ background: "#0D0D0D", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "Georgia, serif" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#C9A84C,#7A5C20)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <TrendingUp size={20} color="#0D0D0D" />
      </div>
      <div style={{ color: "#C9A84C", fontSize: 15 }}>Conectando ao banco de dados...</div>
    </div>
  );

  if (error) return (
    <div style={{ background: "#0D0D0D", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "Georgia, serif" }}>
      <div style={{ color: "#C04040", fontSize: 15 }}>Erro: {error}</div>
      <button onClick={loadAll} style={{ background: "#1A1200", border: "1px solid #C9A84C", borderRadius: 8, padding: "10px 20px", color: "#C9A84C", cursor: "pointer", fontFamily: "Georgia, serif" }}>Tentar novamente</button>
    </div>
  );

  return (
    <div style={{ background: "#0D0D0D", minHeight: "100vh", fontFamily: "Georgia, serif", color: "#F5EDD6" }}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #2A2200", padding: "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#C9A84C,#7A5C20)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={18} color="#0D0D0D" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: "bold", color: "#E8C97A" }}>Carteira de Investimentos</div>
            <div style={{ fontSize: 11, color: "#7A6A40", letterSpacing: 2, textTransform: "uppercase" }}>Registro & Análise</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#1A1200", border: "1px solid #3A2800", borderRadius: 8, padding: "7px 14px" }}>
            <span style={{ fontSize: 11, color: "#7A6A40", textTransform: "uppercase", letterSpacing: 1 }}>USD/BRL</span>
            {editCotacao ? (
              <>
                <input autoFocus value={tempCotacao} onChange={e => setTempCotacao(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveCotacao(); if (e.key === "Escape") setEditCotacao(false); }} style={{ width: 64, background: "transparent", border: "none", outline: "none", color: "#E8C97A", fontSize: 13, fontFamily: "Georgia, serif", textAlign: "right" }} />
                <button onClick={saveCotacao} style={{ background: "none", border: "none", color: "#6BBF6B", cursor: "pointer", fontSize: 12 }}>{saving ? "..." : "✓"}</button>
              </>
            ) : (
              <>
                <span style={{ fontSize: 13, color: "#E8C97A", fontWeight: "bold" }}>{fmtBRL(cotacaoUSD)}</span>
                <button onClick={() => { setTempCotacao(String(cotacaoUSD)); setEditCotacao(true); }} style={{ background: "none", border: "none", color: "#5A4A20", cursor: "pointer", padding: 0 }}><Settings size={13} /></button>
              </>
            )}
          </div>
          <button onClick={() => setModal("provento")} style={{ background: "#1A1200", border: "1px solid #3A2800", borderRadius: 8, padding: "9px 16px", color: "#C9A84C", cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif", display: "flex", alignItems: "center", gap: 6 }}>
            <ArrowDownCircle size={15} /> Provento
          </button>
          <button onClick={() => setModal("aplicacao")} style={{ background: "linear-gradient(135deg,#C9A84C,#A07830)", border: "none", borderRadius: 8, padding: "9px 16px", color: "#0D0D0D", fontWeight: "bold", cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif", display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={15} /> Aplicação
          </button>
          <button onClick={() => setModal("convites")} style={{ background: "#1A1200", border: "1px solid #3A2800", borderRadius: 8, padding: "9px 14px", color: "#7A6A40", cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif" }}>Convites</button>
          <button onClick={handleLogout} title="Sair" style={{ background: "#1A0D0D", border: "1px solid #3A1A1A", borderRadius: 8, padding: "9px 14px", color: "#C07070", cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif" }}>Sair</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", padding: "0 28px", borderBottom: "1px solid #1A1500" }}>
        {[{ id: "dashboard", label: "Dashboard", icon: BarChart2 }, { id: "aplicacoes", label: "Aplicações", icon: List }, { id: "proventos", label: "Proventos", icon: ArrowDownCircle }].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} style={{ background: "none", border: "none", borderBottom: tab === id ? "2px solid #C9A84C" : "2px solid transparent", color: tab === id ? "#C9A84C" : "#5A4A20", cursor: "pointer", padding: "13px 18px", fontSize: 13, fontFamily: "Georgia, serif", display: "flex", alignItems: "center", gap: 7 }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div style={{ padding: "24px 28px" }}>

        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Patrimônio Aplicado", value: fmtBRL(totalPatrimonioBRL), sub: `${aplicacoes.length} aplicação(ões)`, color: "#E8C97A" },
            { label: "Proventos Recebidos", value: fmtBRL(totalProventosBRL), sub: `${proventos.length} lançamento(s)`, color: "#C9A84C" },
            { label: "Proventos Disponíveis", value: fmtBRL(proventosLivresBRL), sub: "não reaplicados", color: proventosLivresBRL > 0 ? "#6BBF6B" : "#5A4A20" },
          ].map((c, i) => (
            <div key={i} style={{ background: "linear-gradient(135deg,#141000,#1E1800)", border: "1px solid #2A2000", borderRadius: 12, padding: "18px 22px" }}>
              <div style={{ fontSize: 11, color: "#7A6A40", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>{c.label}</div>
              <div style={{ fontSize: 24, fontWeight: "bold", color: c.color, marginBottom: 4 }}>{c.value}</div>
              <div style={{ fontSize: 12, color: "#5A4A20" }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Dashboard */}
        {tab === "dashboard" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div style={{ background: "#141000", border: "1px solid #2A2000", borderRadius: 12, padding: 22 }}>
              <div style={{ fontSize: 12, color: "#C9A84C", letterSpacing: 1, marginBottom: 14, textTransform: "uppercase" }}>Distribuição por Categoria</div>
              {byCategoria.length === 0 ? <div style={{ color: "#3A3000", textAlign: "center", padding: "40px 0", fontSize: 14 }}>Nenhum dado</div> : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={byCategoria} cx="50%" cy="50%" outerRadius={85} dataKey="value" stroke="none">
                        {byCategoria.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => fmtBRL(v)} contentStyle={{ background: "#1A1500", border: "1px solid #3A3000", borderRadius: 8, color: "#E8C97A", fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 6 }}>
                    {byCategoria.map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#A09060" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                        {item.name}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={{ background: "#141000", border: "1px solid #2A2000", borderRadius: 12, padding: 22 }}>
              <div style={{ fontSize: 12, color: "#C9A84C", letterSpacing: 1, marginBottom: 14, textTransform: "uppercase" }}>Evolução Mensal (BRL)</div>
              {byMonth.length === 0 ? <div style={{ color: "#3A3000", textAlign: "center", padding: "40px 0", fontSize: 14 }}>Nenhum dado</div> : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={byMonth}>
                    <defs>
                      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1800" />
                    <XAxis dataKey="month" tick={{ fill: "#5A4A20", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fill: "#5A4A20", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={v => fmtBRL(v)} contentStyle={{ background: "#1A1500", border: "1px solid #3A3000", borderRadius: 8, color: "#E8C97A", fontSize: 12 }} />
                    <Area type="monotone" dataKey="value" stroke="#C9A84C" strokeWidth={2} fill="url(#g)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={{ gridColumn: "1/-1", background: "#141000", border: "1px solid #2A2000", borderRadius: 12, padding: 22 }}>
              <div style={{ fontSize: 12, color: "#C9A84C", letterSpacing: 1, marginBottom: 14, textTransform: "uppercase" }}>Maiores Posições</div>
              {aplicacoes.length === 0 ? <div style={{ color: "#3A3000", textAlign: "center", padding: "20px 0", fontSize: 14 }}>Nenhuma aplicação</div> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[...aplicacoes].sort((a, b) => toBRL(b.valor, b.moeda) - toBRL(a.valor, a.moeda)).slice(0, 5).map((inv, i) => {
                    const valBRL = toBRL(Number(inv.valor), inv.moeda);
                    return (
                      <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", background: COLORS[i % COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#0D0D0D", fontWeight: "bold", flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: "#E8C97A", display: "flex", alignItems: "center", gap: 8 }}>
                            {inv.nome}
                            {inv.moeda === "USD" && <span style={{ fontSize: 10, background: "#1A2A3A", border: "1px solid #2A4A6A", borderRadius: 10, padding: "1px 7px", color: "#6AAFD4" }}>USD</span>}
                          </div>
                          <div style={{ fontSize: 11, color: "#5A4A20" }}>{inv.categoria}{inv.corretora && ` · ${inv.corretora}`}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 14, color: "#C9A84C", fontWeight: "bold" }}>{fmtBRL(valBRL)}</div>
                          {inv.moeda === "USD" && <div style={{ fontSize: 11, color: "#6AAFD4" }}>{fmtUSD(inv.valor)}</div>}
                          <div style={{ fontSize: 11, color: "#5A4A20" }}>{totalPatrimonioBRL > 0 ? ((valBRL / totalPatrimonioBRL) * 100).toFixed(1) : 0}%</div>
                        </div>
                        <div style={{ width: 70, height: 4, background: "#1E1800", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${totalPatrimonioBRL > 0 ? (valBRL / totalPatrimonioBRL) * 100 : 0}%`, height: "100%", background: COLORS[i % COLORS.length], borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Aplicações */}
        {tab === "aplicacoes" && (
          <div style={{ background: "#141000", border: "1px solid #2A2000", borderRadius: 12, overflow: "auto" }}>
            {aplicacoes.length === 0 ? <div style={{ color: "#3A3000", textAlign: "center", padding: "60px 0", fontSize: 14 }}><DollarSign size={30} color="#2A2000" style={{ marginBottom: 10 }} /><div>Nenhuma aplicação</div></div> : (
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #2A2000" }}>
                    {["Ativo", "Categoria", "Corretora", "Data", "Rentab.", "Valor Original", "Em BRL", "Origem", ""].map((h, i) => (
                      <th key={i} style={{ padding: "12px 14px", textAlign: i >= 5 ? "right" : "left", fontSize: 11, color: "#5A4A20", textTransform: "uppercase", letterSpacing: 1, fontWeight: "normal", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {aplicacoes.map(a => {
                    const valBRL = toBRL(Number(a.valor), a.moeda);
                    const origemTotal = proventos.filter(p => a.origem_provento_ids?.includes(p.id)).reduce((s, p) => s + toBRL(Number(p.valor), p.moeda), 0);
                    return (
                      <tr key={a.id} style={{ borderBottom: "1px solid #1A1500" }} onMouseEnter={e => e.currentTarget.style.background = "#1A1200"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontSize: 13, color: "#E8C97A", display: "flex", alignItems: "center", gap: 7 }}>
                            {a.nome}
                            {a.moeda === "USD" && <span style={{ fontSize: 10, background: "#1A2A3A", border: "1px solid #2A4A6A", borderRadius: 10, padding: "1px 7px", color: "#6AAFD4" }}>USD</span>}
                          </div>
                          {a.notas && <div style={{ fontSize: 11, color: "#5A4A20", marginTop: 2 }}>{a.notas}</div>}
                        </td>
                        <td style={{ padding: "12px 14px" }}>{badge(a.categoria, COLORS[CATEGORIAS_ATIVO.indexOf(a.categoria) % COLORS.length])}</td>
                        <td style={{ padding: "12px 14px" }}>{a.corretora ? badge(a.corretora, "#A09060", "#1A1800", "#2A2800") : <span style={{ color: "#2A2000", fontSize: 12 }}>—</span>}</td>
                        <td style={{ padding: "12px 14px", fontSize: 13, color: "#7A6A40", whiteSpace: "nowrap" }}>{fmtDate(a.data)}</td>
                        <td style={{ padding: "12px 14px", fontSize: 13, color: a.rentabilidade ? "#6BBF6B" : "#3A3000" }}>{a.rentabilidade ? `${a.rentabilidade}% CDI` : "—"}</td>
                        <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 14, color: a.moeda === "USD" ? "#6AAFD4" : "#C9A84C", fontWeight: "bold" }}>{fmt(a.valor, a.moeda)}</td>
                        <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: "#C9A84C" }}>{a.moeda === "USD" ? fmtBRL(valBRL) : "—"}</td>
                        <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 12, color: origemTotal > 0 ? "#A09060" : "#2A2000" }}>
                          {origemTotal > 0 ? <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}><ArrowRightCircle size={13} />{fmtBRL(origemTotal)}</span> : "—"}
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                            <button onClick={() => openEdit("aplicacao", a)} style={{ background: "none", border: "none", cursor: "pointer", color: "#5A4A20", padding: 4 }} onMouseEnter={e => e.currentTarget.style.color = "#C9A84C"} onMouseLeave={e => e.currentTarget.style.color = "#5A4A20"} title="Editar">✏️</button>
                            <button onClick={() => delAplicacao(a.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#3A2000", padding: 4 }} onMouseEnter={e => e.currentTarget.style.color = "#C04040"} onMouseLeave={e => e.currentTarget.style.color = "#3A2000"} title="Excluir"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Proventos */}
        {tab === "proventos" && (
          <div style={{ background: "#141000", border: "1px solid #2A2000", borderRadius: 12, overflow: "auto" }}>
            {proventos.length === 0 ? <div style={{ color: "#3A3000", textAlign: "center", padding: "60px 0", fontSize: 14 }}><ArrowDownCircle size={30} color="#2A2000" style={{ marginBottom: 10 }} /><div>Nenhum provento registrado</div></div> : (
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #2A2000" }}>
                    {["Ativo", "Tipo", "Corretora", "Data", "Valor Original", "Em BRL", "Status", ""].map((h, i) => (
                      <th key={i} style={{ padding: "12px 14px", textAlign: i >= 4 ? "right" : "left", fontSize: 11, color: "#5A4A20", textTransform: "uppercase", letterSpacing: 1, fontWeight: "normal", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {proventos.map(p => (
                    <tr key={p.id} style={{ borderBottom: "1px solid #1A1500" }} onMouseEnter={e => e.currentTarget.style.background = "#1A1200"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontSize: 13, color: "#E8C97A", display: "flex", alignItems: "center", gap: 7 }}>
                          {p.ativo}
                          {p.moeda === "USD" && <span style={{ fontSize: 10, background: "#1A2A3A", border: "1px solid #2A4A6A", borderRadius: 10, padding: "1px 7px", color: "#6AAFD4" }}>USD</span>}
                        </div>
                        {p.notas && <div style={{ fontSize: 11, color: "#5A4A20", marginTop: 2 }}>{p.notas}</div>}
                      </td>
                      <td style={{ padding: "12px 14px" }}>{badge(p.tipo)}</td>
                      <td style={{ padding: "12px 14px" }}>{p.corretora ? badge(p.corretora, "#A09060", "#1A1800", "#2A2800") : <span style={{ color: "#2A2000", fontSize: 12 }}>—</span>}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: "#7A6A40", whiteSpace: "nowrap" }}>{fmtDate(p.data)}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 14, color: p.moeda === "USD" ? "#6AAFD4" : "#C9A84C", fontWeight: "bold" }}>{fmt(p.valor, p.moeda)}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: "#C9A84C" }}>{p.moeda === "USD" ? fmtBRL(toBRL(Number(p.valor), p.moeda)) : "—"}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>{badge(p.reaplicado ? "Reaplicado" : "Disponível", p.reaplicado ? "#6BBF6B" : "#A09060", p.reaplicado ? "#1A2A1A" : "#2A2000", p.reaplicado ? "#2A4A2A" : "#3A3000")}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          <button onClick={() => openEdit("provento", p)} style={{ background: "none", border: "none", cursor: "pointer", color: "#5A4A20", padding: 4 }} onMouseEnter={e => e.currentTarget.style.color = "#C9A84C"} onMouseLeave={e => e.currentTarget.style.color = "#5A4A20"} title="Editar">✏️</button>
                          <button onClick={() => delProvento(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#3A2000", padding: 4 }} onMouseEnter={e => e.currentTarget.style.color = "#C04040"} onMouseLeave={e => e.currentTarget.style.color = "#3A2000"} title="Excluir"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal Aplicação */}
      {modal === "aplicacao" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#141000", border: "1px solid #3A3000", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
            <button onClick={() => setModal(null)} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "#5A4A20" }}><X size={18} /></button>
            <div style={{ fontSize: 17, color: "#E8C97A", marginBottom: 22, fontWeight: "bold" }}>Nova Aplicação</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[{ label: "Nome do Ativo *", key: "nome", type: "text", placeholder: "Ex: Tesouro Selic, MXRF11..." }, { label: "Valor *", key: "valor", type: "number", placeholder: "0,00" }, { label: "Data *", key: "data", type: "date" }, { label: "Rentabilidade (%)", key: "rentabilidade", type: "number", placeholder: "Ex: 100" }, { label: "Notas", key: "notas", type: "text", placeholder: "Observações..." }].map(({ label, key, type, placeholder }) => (
                <div key={key}><label style={labelStyle}>{label}</label><input type={type} value={formA[key]} placeholder={placeholder} onChange={e => setFormA(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} /></div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={labelStyle}>Categoria</label><select value={formA.categoria} onChange={e => setFormA(f => ({ ...f, categoria: e.target.value }))} style={inputStyle}>{CATEGORIAS_ATIVO.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label style={labelStyle}>Moeda</label><select value={formA.moeda} onChange={e => setFormA(f => ({ ...f, moeda: e.target.value }))} style={inputStyle}>{MOEDAS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
              </div>
              {formA.moeda === "USD" && <div style={{ background: "#0D1A20", border: "1px solid #1A3A4A", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#6AAFD4" }}>1 USD = {fmtBRL(cotacaoUSD)} · Em BRL: {fmtBRL(Number(formA.valor || 0) * cotacaoUSD)}</div>}
              <div><label style={labelStyle}>Corretora / Banco</label><CorretoraSelect value={formA.corretora} onChange={v => setFormA(f => ({ ...f, corretora: v }))} corretoras={corretoras} onAddCorretora={addCorretora} /></div>
              {proventos.filter(p => !p.reaplicado).length > 0 && (
                <div><label style={labelStyle}>Vincular proventos disponíveis</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {proventos.filter(p => !p.reaplicado).map(p => (
                      <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#A09060", cursor: "pointer" }}>
                        <input type="checkbox" checked={formA.origemProventoIds.includes(p.id)} onChange={e => setFormA(f => ({ ...f, origemProventoIds: e.target.checked ? [...f.origemProventoIds, p.id] : f.origemProventoIds.filter(id => id !== p.id) }))} />
                        {p.ativo} — {p.tipo}: {fmt(p.valor, p.moeda)}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={addAplicacao} disabled={saving} style={{ background: "linear-gradient(135deg,#C9A84C,#A07830)", border: "none", borderRadius: 8, padding: 13, color: "#0D0D0D", fontWeight: "bold", cursor: "pointer", fontSize: 14, fontFamily: "Georgia, serif", marginTop: 6 }}>
                {saving ? "Salvando..." : "Registrar Aplicação"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Provento */}
      {modal === "provento" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#141000", border: "1px solid #3A3000", borderRadius: 16, padding: 28, width: "100%", maxWidth: 440, position: "relative" }}>
            <button onClick={() => setModal(null)} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "#5A4A20" }}><X size={18} /></button>
            <div style={{ fontSize: 17, color: "#E8C97A", marginBottom: 22, fontWeight: "bold" }}>Novo Provento</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[{ label: "Ativo *", key: "ativo", type: "text", placeholder: "Ex: VALE3, INTR..." }, { label: "Valor *", key: "valor", type: "number", placeholder: "0,00" }, { label: "Data *", key: "data", type: "date" }].map(({ label, key, type, placeholder }) => (
                <div key={key}><label style={labelStyle}>{label}</label><input type={type} value={formP[key]} placeholder={placeholder} onChange={e => setFormP(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} /></div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={labelStyle}>Tipo</label><select value={formP.tipo} onChange={e => setFormP(f => ({ ...f, tipo: e.target.value }))} style={inputStyle}>{CATEGORIAS_PROVENTO.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label style={labelStyle}>Moeda</label><select value={formP.moeda} onChange={e => setFormP(f => ({ ...f, moeda: e.target.value }))} style={inputStyle}>{MOEDAS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
              </div>
              {formP.moeda === "USD" && <div style={{ background: "#0D1A20", border: "1px solid #1A3A4A", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#6AAFD4" }}>1 USD = {fmtBRL(cotacaoUSD)} · Em BRL: {fmtBRL(Number(formP.valor || 0) * cotacaoUSD)}</div>}
              <div><label style={labelStyle}>Corretora / Banco</label><CorretoraSelect value={formP.corretora} onChange={v => setFormP(f => ({ ...f, corretora: v }))} corretoras={corretoras} onAddCorretora={addCorretora} /></div>
              <button onClick={addProvento} disabled={saving} style={{ background: "linear-gradient(135deg,#C9A84C,#A07830)", border: "none", borderRadius: 8, padding: 13, color: "#0D0D0D", fontWeight: "bold", cursor: "pointer", fontSize: 14, fontFamily: "Georgia, serif", marginTop: 6 }}>
                {saving ? "Salvando..." : "Registrar Provento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Convites */}
      {modal === "convites" && (
        <ConvitesModal onClose={() => setModal(null)} userId={user?.id} authToken={authToken} />
      )}

      {/* Modal Edição */}
      {editItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#141000", border: "1px solid #3A3000", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
            <button onClick={() => setEditItem(null)} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "#5A4A20" }}><X size={18} /></button>
            <div style={{ fontSize: 17, color: "#E8C97A", marginBottom: 22, fontWeight: "bold" }}>Editar {editItem.tipo === "aplicacao" ? "Aplicação" : "Provento"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {editItem.tipo === "aplicacao" ? (
                <>
                  {[{ label: "Nome do Ativo *", key: "nome", type: "text" }, { label: "Valor *", key: "valor", type: "number" }, { label: "Data *", key: "data", type: "date" }, { label: "Rentabilidade (%)", key: "rentabilidade", type: "number" }, { label: "Notas", key: "notas", type: "text" }].map(({ label, key, type }) => (
                    <div key={key}><label style={labelStyle}>{label}</label><input type={type} value={editItem.data[key] || ""} onChange={e => setEditItem(ei => ({ ...ei, data: { ...ei.data, [key]: e.target.value } }))} style={inputStyle} /></div>
                  ))}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={labelStyle}>Categoria</label><select value={editItem.data.categoria} onChange={e => setEditItem(ei => ({ ...ei, data: { ...ei.data, categoria: e.target.value } }))} style={inputStyle}>{CATEGORIAS_ATIVO.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div><label style={labelStyle}>Moeda</label><select value={editItem.data.moeda} onChange={e => setEditItem(ei => ({ ...ei, data: { ...ei.data, moeda: e.target.value } }))} style={inputStyle}>{MOEDAS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                  </div>
                  <div><label style={labelStyle}>Corretora / Banco</label><CorretoraSelect value={editItem.data.corretora || ""} onChange={v => setEditItem(ei => ({ ...ei, data: { ...ei.data, corretora: v } }))} corretoras={corretoras} onAddCorretora={addCorretora} /></div>
                </>
              ) : (
                <>
                  {[{ label: "Ativo *", key: "ativo", type: "text" }, { label: "Valor *", key: "valor", type: "number" }, { label: "Data *", key: "data", type: "date" }, { label: "Notas", key: "notas", type: "text" }].map(({ label, key, type }) => (
                    <div key={key}><label style={labelStyle}>{label}</label><input type={type} value={editItem.data[key] || ""} onChange={e => setEditItem(ei => ({ ...ei, data: { ...ei.data, [key]: e.target.value } }))} style={inputStyle} /></div>
                  ))}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={labelStyle}>Tipo</label><select value={editItem.data.tipo} onChange={e => setEditItem(ei => ({ ...ei, data: { ...ei.data, tipo: e.target.value } }))} style={inputStyle}>{CATEGORIAS_PROVENTO.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div><label style={labelStyle}>Moeda</label><select value={editItem.data.moeda} onChange={e => setEditItem(ei => ({ ...ei, data: { ...ei.data, moeda: e.target.value } }))} style={inputStyle}>{MOEDAS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                  </div>
                  <div><label style={labelStyle}>Corretora / Banco</label><CorretoraSelect value={editItem.data.corretora || ""} onChange={v => setEditItem(ei => ({ ...ei, data: { ...ei.data, corretora: v } }))} corretoras={corretoras} onAddCorretora={addCorretora} /></div>
                  <div><label style={labelStyle}>Status</label><select value={editItem.data.reaplicado ? "true" : "false"} onChange={e => setEditItem(ei => ({ ...ei, data: { ...ei.data, reaplicado: e.target.value === "true" } }))} style={inputStyle}><option value="false">Disponível</option><option value="true">Reaplicado</option></select></div>
                </>
              )}
              <button onClick={saveEdit} disabled={saving} style={{ background: "linear-gradient(135deg,#C9A84C,#A07830)", border: "none", borderRadius: 8, padding: 13, color: "#0D0D0D", fontWeight: "bold", cursor: "pointer", fontSize: 14, fontFamily: "Georgia, serif", marginTop: 6 }}>
                {saving ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function ConvitesModal({ onClose, userId, authToken: token }) {
  const SUPABASE_URL = "https://fvsojxozbvyznlzseboz.supabase.co";
  const SUPABASE_KEY = "sb_publishable_8g5sy2fm1lWJNn3_VuEjOg_blrmAkVJ";
  const H = { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token || SUPABASE_KEY}` };

  const [convites, setConvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);

  const loadConvites = async () => {
    setLoading(true);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/convites?criado_por=eq.${userId}&order=created_at.desc`, { headers: H }).then(r => r.json());
    if (Array.isArray(res)) setConvites(res);
    setLoading(false);
  };

  useEffect(() => { loadConvites(); }, []);

  const gerarConvite = async () => {
    setGerando(true);
    const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
    await fetch(`${SUPABASE_URL}/rest/v1/convites`, {
      method: "POST",
      headers: { ...H, "Prefer": "return=representation" },
      body: JSON.stringify({ codigo, criado_por: userId, usado: false }),
    });
    await loadConvites();
    setGerando(false);
  };

  const copiar = (codigo) => navigator.clipboard.writeText(codigo);

  const inputStyle = { background: "#0D0D0D", border: "1px solid #2A2000", borderRadius: 8, padding: "10px 14px", color: "#E8C97A", fontSize: 14, fontFamily: "Georgia, serif", outline: "none" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#141000", border: "1px solid #3A3000", borderRadius: 16, padding: 28, width: "100%", maxWidth: 460, position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "#5A4A20" }}><X size={18} /></button>
        <div style={{ fontSize: 17, color: "#E8C97A", marginBottom: 6, fontWeight: "bold" }}>Convites</div>
        <div style={{ fontSize: 12, color: "#5A4A20", marginBottom: 22 }}>Gere códigos para convidar outros usuários</div>

        <button onClick={gerarConvite} disabled={gerando}
          style={{ background: "linear-gradient(135deg,#C9A84C,#A07830)", border: "none", borderRadius: 8, padding: "11px 20px", color: "#0D0D0D", fontWeight: "bold", cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <Plus size={15} /> {gerando ? "Gerando..." : "Gerar novo convite"}
        </button>

        {loading ? (
          <div style={{ color: "#5A4A20", textAlign: "center", padding: "20px 0" }}>Carregando...</div>
        ) : convites.length === 0 ? (
          <div style={{ color: "#3A3000", textAlign: "center", padding: "20px 0", fontSize: 13 }}>Nenhum convite gerado ainda</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {convites.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#0D0D0D", border: "1px solid #2A2000", borderRadius: 10, padding: "12px 16px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, color: "#E8C97A", letterSpacing: 3, fontWeight: "bold" }}>{c.codigo}</div>
                  <div style={{ fontSize: 11, color: "#5A4A20", marginTop: 3 }}>{new Date(c.created_at).toLocaleDateString("pt-BR")}</div>
                </div>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: c.usado ? "#2A1A1A" : "#1A2A1A", color: c.usado ? "#C07070" : "#6BBF6B", border: `1px solid ${c.usado ? "#4A2A2A" : "#2A4A2A"}` }}>
                  {c.usado ? "Usado" : "Disponível"}
                </span>
                {!c.usado && (
                  <button onClick={() => copiar(c.codigo)} title="Copiar código"
                    style={{ background: "#1A1800", border: "1px solid #3A3000", borderRadius: 8, padding: "6px 10px", color: "#C9A84C", cursor: "pointer", fontSize: 12 }}>
                    Copiar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
