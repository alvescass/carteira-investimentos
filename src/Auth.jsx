import { useState, useEffect } from "react";
import { TrendingUp, Mail, Lock, Eye, EyeOff, Key } from "lucide-react";

const SUPABASE_URL = "https://fvsojxozbvyznlzseboz.supabase.co";
const SUPABASE_KEY = "sb_publishable_8g5sy2fm1lWJNn3_VuEjOg_blrmAkVJ";

const authFetch = (path, body) => fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
  body: JSON.stringify(body),
}).then(r => r.json());

const dbFetch = (path, token) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token || SUPABASE_KEY}` }
}).then(r => r.json());

const checkConvite = (codigo) =>
  dbFetch(`convites?codigo=eq.${codigo.trim().toUpperCase()}&usado=eq.false&select=id,codigo`).then(r => r[0] || null);

const marcarConviteUsado = (id, token) =>
  fetch(`${SUPABASE_URL}/rest/v1/convites?id=eq.${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token || SUPABASE_KEY}` },
    body: JSON.stringify({ usado: true }),
  });

const deleteUser = (token) =>
  fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "DELETE",
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` },
  });

const getUserProfile = (token) =>
  fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` },
  }).then(r => r.json());

const checkUserHasData = async (userId, token) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/aplicacoes?user_id=eq.${userId}&select=id&limit=1`, {
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` },
  }).then(r => r.json());
  return Array.isArray(res) && res.length > 0;
};

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [convite, setConvite] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Detecta redirect OAuth do Google
  const [googleToken, setGoogleToken] = useState(null);
  const [googleUser, setGoogleUser] = useState(null);
  const [needsConvite, setNeedsConvite] = useState(false);

  const [resetToken, setResetToken] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get("access_token");
      const type = params.get("type");
      window.location.hash = "";
      if (type === "recovery") {
        setResetToken(token);
      } else if (token) {
        handleGoogleCallback(token);
      }
    }
  }, []);

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setMessage({ type: "error", text: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }
    setLoading(true); setMessage(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${resetToken}` },
        body: JSON.stringify({ password: newPassword }),
      }).then(r => r.json());
      if (res.id) {
        setResetDone(true);
        setMessage({ type: "success", text: "Senha alterada com sucesso! Faça login." });
        setTimeout(() => { setResetToken(null); setResetDone(false); setNewPassword(""); }, 2000);
      } else {
        setMessage({ type: "error", text: "Erro ao redefinir senha. Tente novamente." });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Erro de conexão." });
    }
    setLoading(false);
  };

  const handleGoogleCallback = async (token) => {
    setLoading(true);
    try {
      const userData = await getUserProfile(token);
      if (!userData?.id) { setMessage({ type: "error", text: "Erro ao obter dados do Google." }); setLoading(false); return; }

      // Verifica se usuário já tem dados (já cadastrado antes)
      const hasData = await checkUserHasData(userData.id, token);
      if (hasData) {
        // Usuário existente — loga direto
        onLogin(token, userData);
      } else {
        // Novo usuário via Google — pede convite
        setGoogleToken(token);
        setGoogleUser(userData);
        setNeedsConvite(true);
      }
    } catch (e) {
      setMessage({ type: "error", text: "Erro ao autenticar com Google." });
    }
    setLoading(false);
  };

  const handleGoogleConvite = async () => {
    if (!convite) { setMessage({ type: "error", text: "Informe o código de convite." }); return; }
    setLoading(true);
    const conviteValido = await checkConvite(convite);
    if (!conviteValido) {
      // Convite inválido — remove a conta do Google criada
      await deleteUser(googleToken);
      setMessage({ type: "error", text: "Convite inválido ou já utilizado. Acesso negado." });
      setNeedsConvite(false);
      setGoogleToken(null);
      setGoogleUser(null);
      setLoading(false);
      return;
    }
    await marcarConviteUsado(conviteValido.id, googleToken);
    onLogin(googleToken, googleUser);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!email || (!password && mode !== "forgot")) return;
    setLoading(true); setMessage(null);
    try {
      if (mode === "login") {
        const res = await authFetch("token?grant_type=password", { email, password });
        if (res.access_token) {
          onLogin(res.access_token, res.user);
        } else {
          setMessage({ type: "error", text: "E-mail ou senha incorretos." });
        }
      } else if (mode === "register") {
        if (!convite) { setMessage({ type: "error", text: "Informe o código de convite." }); setLoading(false); return; }
        const conviteValido = await checkConvite(convite);
        if (!conviteValido) { setMessage({ type: "error", text: "Convite inválido ou já utilizado." }); setLoading(false); return; }
        const res = await authFetch("signup", { email, password });
        if (res.id || res.email) {
          await marcarConviteUsado(conviteValido.id);
          setMessage({ type: "success", text: "Conta criada! Verifique seu e-mail para confirmar antes de fazer login." });
          setMode("login");
        } else {
          setMessage({ type: "error", text: res.msg || res.error_description || "Erro ao criar conta." });
        }
      } else if (mode === "forgot") {
        await authFetch("recover", { email });
        setMessage({ type: "success", text: "E-mail de recuperação enviado!" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Erro de conexão. Tente novamente." });
    }
    setLoading(false);
  };

  const handleGoogle = () => {
    window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${window.location.origin}`;
  };

  const inputStyle = {
    width: "100%", background: "#0D0D0D", border: "1px solid #2A2000",
    borderRadius: 8, padding: "11px 14px 11px 40px", color: "#E8C97A",
    fontSize: 14, fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box",
  };

  // Tela de redefinição de senha
  if (resetToken) return (
    <div style={{ background: "#0D0D0D", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 36 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#C9A84C,#7A5C20)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <TrendingUp size={26} color="#0D0D0D" />
          </div>
          <div style={{ fontSize: 22, fontWeight: "bold", color: "#E8C97A" }}>Nova senha</div>
          <div style={{ fontSize: 12, color: "#7A6A40", letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>Redefina sua senha de acesso</div>
        </div>
        <div style={{ background: "#141000", border: "1px solid #2A2000", borderRadius: 16, padding: 28 }}>
          {message && (
            <div style={{ background: message.type === "error" ? "#2A0D0D" : "#0D2A1A", border: `1px solid ${message.type === "error" ? "#4A1A1A" : "#1A4A2A"}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: message.type === "error" ? "#C07070" : "#6BBF6B", marginBottom: 18 }}>
              {message.text}
            </div>
          )}
          {!resetDone && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ position: "relative" }}>
                <Lock size={15} color="#5A4A20" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                <input type={showPass ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="Nova senha (mín. 6 caracteres)" onKeyDown={e => e.key === "Enter" && handleResetPassword()}
                  style={{ width: "100%", background: "#0D0D0D", border: "1px solid #2A2000", borderRadius: 8, padding: "11px 40px", color: "#E8C97A", fontSize: 14, fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box" }} />
                <button onClick={() => setShowPass(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#5A4A20", padding: 0 }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <button onClick={handleResetPassword} disabled={loading}
                style={{ background: "linear-gradient(135deg,#C9A84C,#A07830)", border: "none", borderRadius: 8, padding: "12px", color: "#0D0D0D", fontWeight: "bold", cursor: "pointer", fontSize: 14, fontFamily: "Georgia, serif" }}>
                {loading ? "Salvando..." : "Redefinir senha"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Tela de convite para usuários novos via Google
  if (needsConvite) return (
    <div style={{ background: "#0D0D0D", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 36 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#C9A84C,#7A5C20)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <TrendingUp size={26} color="#0D0D0D" />
          </div>
          <div style={{ fontSize: 22, fontWeight: "bold", color: "#E8C97A" }}>Quase lá!</div>
          <div style={{ fontSize: 12, color: "#7A6A40", letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>Informe seu código de convite</div>
        </div>
        <div style={{ background: "#141000", border: "1px solid #2A2000", borderRadius: 16, padding: 28 }}>
          {message && (
            <div style={{ background: message.type === "error" ? "#2A0D0D" : "#0D2A1A", border: `1px solid ${message.type === "error" ? "#4A1A1A" : "#1A4A2A"}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: message.type === "error" ? "#C07070" : "#6BBF6B", marginBottom: 18 }}>
              {message.text}
            </div>
          )}
          <div style={{ fontSize: 13, color: "#7A6A40", marginBottom: 16 }}>
            Logado como <span style={{ color: "#C9A84C" }}>{googleUser?.email}</span>. Para finalizar o cadastro, informe um código de convite válido.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ position: "relative" }}>
              <Key size={15} color="#5A4A20" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
              <input type="text" value={convite} onChange={e => setConvite(e.target.value.toUpperCase())}
                placeholder="Código de convite" onKeyDown={e => e.key === "Enter" && handleGoogleConvite()}
                style={{ ...inputStyle, letterSpacing: 2 }} />
            </div>
            <button onClick={handleGoogleConvite} disabled={loading}
              style={{ background: "linear-gradient(135deg,#C9A84C,#A07830)", border: "none", borderRadius: 8, padding: "12px", color: "#0D0D0D", fontWeight: "bold", cursor: "pointer", fontSize: 14, fontFamily: "Georgia, serif" }}>
              {loading ? "Validando..." : "Confirmar acesso"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Tela de login normal
  return (
    <div style={{ background: "#0D0D0D", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 36 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#C9A84C,#7A5C20)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <TrendingUp size={26} color="#0D0D0D" />
          </div>
          <div style={{ fontSize: 22, fontWeight: "bold", color: "#E8C97A" }}>Carteira de Investimentos</div>
          <div style={{ fontSize: 12, color: "#7A6A40", letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>
            {mode === "login" ? "Entrar na sua conta" : mode === "register" ? "Criar conta" : "Recuperar senha"}
          </div>
        </div>

        <div style={{ background: "#141000", border: "1px solid #2A2000", borderRadius: 16, padding: 28 }}>
          {message && (
            <div style={{ background: message.type === "error" ? "#2A0D0D" : "#0D2A1A", border: `1px solid ${message.type === "error" ? "#4A1A1A" : "#1A4A2A"}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: message.type === "error" ? "#C07070" : "#6BBF6B", marginBottom: 18 }}>
              {message.text}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ position: "relative" }}>
              <Mail size={15} color="#5A4A20" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
                onKeyDown={e => e.key === "Enter" && handleSubmit()} style={inputStyle} />
            </div>

            {mode !== "forgot" && (
              <div style={{ position: "relative" }}>
                <Lock size={15} color="#5A4A20" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha"
                  onKeyDown={e => e.key === "Enter" && handleSubmit()} style={{ ...inputStyle, paddingRight: 40 }} />
                <button onClick={() => setShowPass(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#5A4A20", padding: 0 }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            )}

            {mode === "register" && (
              <div style={{ position: "relative" }}>
                <Key size={15} color="#5A4A20" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                <input type="text" value={convite} onChange={e => setConvite(e.target.value.toUpperCase())} placeholder="Código de convite"
                  onKeyDown={e => e.key === "Enter" && handleSubmit()} style={{ ...inputStyle, letterSpacing: 2 }} />
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading}
              style={{ background: "linear-gradient(135deg,#C9A84C,#A07830)", border: "none", borderRadius: 8, padding: "12px", color: "#0D0D0D", fontWeight: "bold", cursor: "pointer", fontSize: 14, fontFamily: "Georgia, serif", marginTop: 4 }}>
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : mode === "register" ? "Criar conta" : "Enviar e-mail"}
            </button>

            {mode !== "forgot" && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
                  <div style={{ flex: 1, height: 1, background: "#2A2000" }} />
                  <span style={{ fontSize: 12, color: "#5A4A20" }}>ou</span>
                  <div style={{ flex: 1, height: 1, background: "#2A2000" }} />
                </div>
                <button onClick={handleGoogle}
                  style={{ background: "#1A1200", border: "1px solid #3A2800", borderRadius: 8, padding: "11px", color: "#E8C97A", cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Continuar com Google
                </button>
              </>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
            {mode === "login" && (
              <>
                <button onClick={() => { setMode("register"); setMessage(null); }} style={{ background: "none", border: "none", color: "#C9A84C", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: 12 }}>Criar conta</button>
                <button onClick={() => { setMode("forgot"); setMessage(null); }} style={{ background: "none", border: "none", color: "#7A6A40", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: 12 }}>Esqueci a senha</button>
              </>
            )}
            {(mode === "register" || mode === "forgot") && (
              <button onClick={() => { setMode("login"); setMessage(null); }} style={{ background: "none", border: "none", color: "#C9A84C", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: 12 }}>← Voltar para login</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
