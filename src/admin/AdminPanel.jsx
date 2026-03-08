// =============================================================================
// ADMIN PANEL
// Painel administrativo acessível em /admin
// Acesso restrito ao usuário admin definido no Worker.
//
// Funcionalidades:
//   - Estatísticas gerais do sistema
//   - Gestão de usuários (ver, banir, remover)
//   - Logs de acesso
//   - Gestão de convites
//   - Edição de listas globais
// =============================================================================

import { useState, useEffect } from "react";
import { TrendingUp, Users, Activity, Key, List, LogOut, RefreshCw, Ban, Trash2, CheckCircle } from "lucide-react";

// URL do Cloudflare Worker — atualizar após deploy
const WORKER_URL = "https://carteira-admin-api.kydhbhdt7z.workers.dev";

const SUPABASE_URL = "https://fvsojxozbvyznlzseboz.supabase.co";
const SUPABASE_KEY = "sb_publishable_8g5sy2fm1lWJNn3_VuEjOg_blrmAkVJ";
const ADMIN_USER_ID = "d459204d-350d-4c95-a896-07ad4cc02402";

// --- Helpers ---
const fmtDate = (d) => d ? new Date(d).toLocaleString("pt-BR") : "—";
const fmtDateShort = (d) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

// =============================================================================
// Tela de login
// =============================================================================
function LoginScreen({ onLogin }) {
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleLogin = async () => {
    setLoading(true); setError(null);
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
      body: JSON.stringify({ email, password }),
    }).then((r) => r.json());

    if (res.access_token) {
      if (res.user?.id !== ADMIN_USER_ID) {
        setError("Acesso restrito ao administrador.");
        setLoading(false); return;
      }
      onLogin(res.access_token, res.user);
    } else {
      setError("E-mail ou senha incorretos.");
    }
    setLoading(false);
  };

  return (
    <div style={{ background: "#0D0D0D", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif" }}>
      <div style={{ width: "100%", maxWidth: 380, padding: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#C9A84C,#7A5C20)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <TrendingUp size={26} color="#0D0D0D" />
          </div>
          <div style={{ fontSize: 20, fontWeight: "bold", color: "#E8C97A" }}>Painel Administrativo</div>
          <div style={{ fontSize: 11, color: "#7A6A40", letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>Acesso restrito</div>
        </div>
        <div style={{ background: "#141000", border: "1px solid #2A2000", borderRadius: 16, padding: 28 }}>
          {error && <div style={{ background: "#2A0D0D", border: "1px solid #4A1A1A", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#C07070", marginBottom: 16 }}>{error}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail admin"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              style={{ background: "#0D0D0D", border: "1px solid #2A2000", borderRadius: 8, padding: "11px 14px", color: "#E8C97A", fontSize: 14, fontFamily: "Georgia, serif", outline: "none" }} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              style={{ background: "#0D0D0D", border: "1px solid #2A2000", borderRadius: 8, padding: "11px 14px", color: "#E8C97A", fontSize: 14, fontFamily: "Georgia, serif", outline: "none" }} />
            <button onClick={handleLogin} disabled={loading}
              style={{ background: "linear-gradient(135deg,#C9A84C,#A07830)", border: "none", borderRadius: 8, padding: 12, color: "#0D0D0D", fontWeight: "bold", cursor: "pointer", fontSize: 14, fontFamily: "Georgia, serif" }}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Card de estatística
// =============================================================================
function StatCard({ label, value, color = "#E8C97A", icon: Icon }) {
  return (
    <div style={{ background: "linear-gradient(135deg,#141000,#1E1800)", border: "1px solid #2A2000", borderRadius: 12, padding: "18px 22px", display: "flex", alignItems: "center", gap: 16 }}>
      {Icon && <div style={{ width: 40, height: 40, borderRadius: 10, background: "#1E1800", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={20} color={color} /></div>}
      <div>
        <div style={{ fontSize: 11, color: "#7A6A40", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: "bold", color }}>{value}</div>
      </div>
    </div>
  );
}

// =============================================================================
// Painel principal
// =============================================================================
export default function AdminPanel() {
  const [token, setToken]   = useState(null);
  const [user, setUser]     = useState(null);
  const [tab, setTab]       = useState("stats");
  const [loading, setLoading] = useState(false);

  // Dados de cada aba
  const [stats,    setStats]    = useState(null);
  const [users,    setUsers]    = useState([]);
  const [logs,     setLogs]     = useState([]);
  const [convites, setConvites] = useState([]);
  const [listas,   setListas]   = useState({ corretoras: [] });
  const [novaCorretora, setNovaCorretora] = useState("");
  const [saving, setSaving]     = useState(false);
  const [confirm, setConfirm]   = useState(null); // { action, userId, email }

  const apiCall = async (path, options = {}) => {
    const res = await fetch(`${WORKER_URL}${path}`, {
      ...options,
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json", ...(options.headers || {}) },
    });
    return res.json();
  };

  const loadTab = async (t) => {
    setLoading(true);
    if (t === "stats")    setStats(await apiCall("/api/admin/stats"));
    if (t === "users")    setUsers(await apiCall("/api/admin/users"));
    if (t === "logs")     setLogs(await apiCall("/api/admin/logs"));
    if (t === "convites") setConvites(await apiCall("/api/admin/convites"));
    if (t === "listas") {
      const data = await apiCall("/api/admin/listas");
      if (data.valor) setListas({ corretoras: JSON.parse(data.valor) });
    }
    setLoading(false);
  };

  useEffect(() => { if (token) loadTab(tab); }, [token, tab]);

  const handleBan = async (userId, isBanned) => {
    await apiCall(`/api/admin/users/${userId}/${isBanned ? "unban" : "ban"}`, { method: "POST" });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, banned_until: isBanned ? null : "2124-01-01" } : u));
    setConfirm(null);
  };

  const handleDelete = async (userId) => {
    await apiCall(`/api/admin/users/${userId}/delete`, { method: "POST" });
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setConfirm(null);
  };

  const handleSaveListas = async () => {
    setSaving(true);
    await apiCall("/api/admin/listas", { method: "PUT", body: JSON.stringify(listas) });
    setSaving(false);
  };

  if (!token) return <LoginScreen onLogin={(t, u) => { setToken(t); setUser(u); }} />;

  const s = { background: "#0D0D0D", minHeight: "100vh", fontFamily: "Georgia, serif", color: "#F5EDD6" };

  const tabs = [
    { id: "stats",    label: "Estatísticas", Icon: Activity },
    { id: "users",    label: "Usuários",     Icon: Users },
    { id: "logs",     label: "Logs",         Icon: Activity },
    { id: "convites", label: "Convites",     Icon: Key },
    { id: "listas",   label: "Listas",       Icon: List },
  ];

  return (
    <div style={s}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #2A2200", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#C9A84C,#7A5C20)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={17} color="#0D0D0D" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: "bold", color: "#E8C97A" }}>Admin</div>
            <div style={{ fontSize: 11, color: "#7A6A40" }}>{user?.email}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => loadTab(tab)} style={{ background: "#1A1200", border: "1px solid #3A2800", borderRadius: 8, padding: "8px 14px", color: "#C9A84C", cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif", display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={13} /> Atualizar
          </button>
          <button onClick={() => { setToken(null); setUser(null); }} style={{ background: "#1A0D0D", border: "1px solid #3A1A1A", borderRadius: 8, padding: "8px 14px", color: "#C07070", cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif", display: "flex", alignItems: "center", gap: 6 }}>
            <LogOut size={13} /> Sair
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", padding: "0 20px", borderBottom: "1px solid #1A1500", overflowX: "auto" }}>
        {tabs.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ background: "none", border: "none", borderBottom: tab === id ? "2px solid #C9A84C" : "2px solid transparent", color: tab === id ? "#C9A84C" : "#5A4A20", cursor: "pointer", padding: "12px 16px", fontSize: 13, fontFamily: "Georgia, serif", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div style={{ padding: 20 }}>
        {loading && <div style={{ color: "#5A4A20", textAlign: "center", padding: "40px 0" }}>Carregando...</div>}

        {/* ---------------------------------------------------------------- */}
        {/* Estatísticas                                                     */}
        {/* ---------------------------------------------------------------- */}
        {!loading && tab === "stats" && stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <StatCard label="Usuários cadastrados" value={stats.totalUsers}      icon={Users}    color="#E8C97A" />
            <StatCard label="Aplicações no sistema" value={stats.totalAplicacoes} icon={Activity} color="#C9A84C" />
            <StatCard label="Proventos registrados" value={stats.totalProventos}  icon={Activity} color="#C9A84C" />
            <StatCard label="Convites usados"       value={stats.convitesUsados}  icon={Key}      color="#6BBF6B" />
            <StatCard label="Convites disponíveis"  value={stats.convitesLivres}  icon={Key}      color="#A09060" />
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Usuários                                                         */}
        {/* ---------------------------------------------------------------- */}
        {!loading && tab === "users" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {users.map((u) => {
              const isBanned = u.banned_until && new Date(u.banned_until) > new Date();
              const isAdmin  = u.id === ADMIN_USER_ID;
              return (
                <div key={u.id} style={{ background: "#141000", border: `1px solid ${isBanned ? "#3A1A1A" : "#2A2000"}`, borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, color: "#E8C97A", fontWeight: "bold", display: "flex", alignItems: "center", gap: 8 }}>
                        {u.email}
                        {isAdmin  && <span style={{ fontSize: 10, background: "#1A2A1A", border: "1px solid #2A5A2A", borderRadius: 10, padding: "2px 8px", color: "#6BBF6B" }}>Admin</span>}
                        {isBanned && <span style={{ fontSize: 10, background: "#2A1A1A", border: "1px solid #5A2A2A", borderRadius: 10, padding: "2px 8px", color: "#C07070" }}>Banido</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#5A4A20", marginTop: 4 }}>
                        Cadastro: {fmtDateShort(u.created_at)} · Último acesso: {fmtDate(u.last_sign_in_at)} · Provider: {u.provider}
                      </div>
                      <div style={{ fontSize: 11, color: "#7A6A40", marginTop: 3 }}>
                        {u.aplicacoes} aplicação(ões) · {u.proventos} provento(s)
                      </div>
                    </div>
                    {!isAdmin && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setConfirm({ action: isBanned ? "unban" : "ban", userId: u.id, email: u.email, isBanned })}
                          style={{ background: isBanned ? "#1A2A1A" : "#2A1A1A", border: `1px solid ${isBanned ? "#2A4A2A" : "#4A2A2A"}`, borderRadius: 8, padding: "7px 12px", color: isBanned ? "#6BBF6B" : "#C07070", cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif", display: "flex", alignItems: "center", gap: 5 }}>
                          {isBanned ? <CheckCircle size={13} /> : <Ban size={13} />}
                          {isBanned ? "Reativar" : "Banir"}
                        </button>
                        <button onClick={() => setConfirm({ action: "delete", userId: u.id, email: u.email })}
                          style={{ background: "#2A0D0D", border: "1px solid #5A1A1A", borderRadius: 8, padding: "7px 12px", color: "#C07070", cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif", display: "flex", alignItems: "center", gap: 5 }}>
                          <Trash2 size={13} /> Remover
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Logs de acesso                                                   */}
        {/* ---------------------------------------------------------------- */}
        {!loading && tab === "logs" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {logs.map((l, i) => (
              <div key={i} style={{ background: "#141000", border: "1px solid #2A2000", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontSize: 13, color: "#E8C97A" }}>{l.email}</div>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#7A6A40" }}>
                  <span style={{ background: "#1A1800", border: "1px solid #3A3000", borderRadius: 10, padding: "2px 8px" }}>{l.provider}</span>
                  <span>{fmtDate(l.last_sign_in_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Convites                                                         */}
        {/* ---------------------------------------------------------------- */}
        {!loading && tab === "convites" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {convites.map((c) => (
              <div key={c.id} style={{ background: "#141000", border: "1px solid #2A2000", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 16, color: "#E8C97A", letterSpacing: 3, fontWeight: "bold" }}>{c.codigo}</div>
                  <div style={{ fontSize: 11, color: "#5A4A20", marginTop: 2 }}>Criado em: {fmtDateShort(c.created_at)}</div>
                </div>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: c.usado ? "#2A1A1A" : "#1A2A1A", color: c.usado ? "#C07070" : "#6BBF6B", border: `1px solid ${c.usado ? "#4A2A2A" : "#2A4A2A"}` }}>
                  {c.usado ? "Usado" : "Disponível"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Listas globais                                                   */}
        {/* ---------------------------------------------------------------- */}
        {!loading && tab === "listas" && (
          <div style={{ background: "#141000", border: "1px solid #2A2000", borderRadius: 12, padding: 22, maxWidth: 500 }}>
            <div style={{ fontSize: 14, color: "#E8C97A", fontWeight: "bold", marginBottom: 16 }}>Corretoras globais</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {listas.corretoras.map((c, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0D0D0D", border: "1px solid #2A2000", borderRadius: 8, padding: "10px 14px" }}>
                  <span style={{ fontSize: 13, color: "#A09060" }}>{c}</span>
                  <button onClick={() => setListas((l) => ({ ...l, corretoras: l.corretoras.filter((_, j) => j !== i) }))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#5A4A20", padding: 4 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input value={novaCorretora} onChange={(e) => setNovaCorretora(e.target.value)}
                placeholder="Nova corretora..."
                onKeyDown={(e) => { if (e.key === "Enter" && novaCorretora.trim()) { setListas((l) => ({ ...l, corretoras: [...l.corretoras, novaCorretora.trim()] })); setNovaCorretora(""); } }}
                style={{ flex: 1, background: "#0D0D0D", border: "1px solid #2A2000", borderRadius: 8, padding: "10px 14px", color: "#E8C97A", fontSize: 13, fontFamily: "Georgia, serif", outline: "none" }} />
              <button onClick={() => { if (novaCorretora.trim()) { setListas((l) => ({ ...l, corretoras: [...l.corretoras, novaCorretora.trim()] })); setNovaCorretora(""); } }}
                style={{ background: "#1A1200", border: "1px solid #3A2800", borderRadius: 8, padding: "0 16px", color: "#C9A84C", cursor: "pointer", fontSize: 18 }}>+</button>
            </div>
            <button onClick={handleSaveListas} disabled={saving}
              style={{ background: "linear-gradient(135deg,#C9A84C,#A07830)", border: "none", borderRadius: 8, padding: "11px 24px", color: "#0D0D0D", fontWeight: "bold", cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif" }}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Modal de confirmação de ação destrutiva                            */}
      {/* ------------------------------------------------------------------ */}
      {confirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#141000", border: "1px solid #3A1A1A", borderRadius: 16, padding: 28, maxWidth: 400, width: "100%" }}>
            <div style={{ fontSize: 16, color: "#E8C97A", marginBottom: 12, fontWeight: "bold" }}>
              {confirm.action === "delete" ? "Remover usuário" : confirm.isBanned ? "Reativar usuário" : "Banir usuário"}
            </div>
            <div style={{ fontSize: 13, color: "#A09060", marginBottom: 24 }}>
              {confirm.action === "delete"
                ? `Todos os dados de ${confirm.email} serão removidos permanentemente. Esta ação não pode ser desfeita.`
                : confirm.isBanned
                  ? `O usuário ${confirm.email} terá acesso restaurado.`
                  : `O usuário ${confirm.email} será impedido de acessar o sistema.`}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirm(null)}
                style={{ flex: 1, background: "#1A1200", border: "1px solid #3A2800", borderRadius: 8, padding: 11, color: "#C9A84C", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={() => confirm.action === "delete" ? handleDelete(confirm.userId) : handleBan(confirm.userId, confirm.isBanned)}
                style={{ flex: 1, background: confirm.action === "delete" ? "#2A0D0D" : "#1A2A1A", border: `1px solid ${confirm.action === "delete" ? "#5A1A1A" : "#2A4A2A"}`, borderRadius: 8, padding: 11, color: confirm.action === "delete" ? "#C07070" : "#6BBF6B", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: 13, fontWeight: "bold" }}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
