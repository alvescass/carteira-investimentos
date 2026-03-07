// =============================================================================
// COMPONENT — Auth
// Tela de autenticação com suporte a:
//   - Login com e-mail e senha
//   - Cadastro com código de convite
//   - Recuperação de senha por e-mail
//   - Redefinição de senha (após clicar no link do e-mail)
//   - Login via Google OAuth (com validação de convite para novos usuários)
// =============================================================================

import { useState, useEffect } from "react";
import { Eye, EyeOff, Key, Mail, Lock, TrendingUp } from "lucide-react";
import {
  authSignIn,
  authSignUp,
  authRecover,
  authUpdatePassword,
  authGetUser,
  authDeleteUser,
  getGoogleAuthUrl,
  checkConvite,
  marcarConviteUsado,
  userHasData,
} from "../api/supabase";

// --- Sub-componente: logo e título ---
const AuthHeader = ({ subtitle }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 36 }}>
    <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#C9A84C,#7A5C20)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
      <TrendingUp size={26} color="#0D0D0D" />
    </div>
    <div style={{ fontSize: 22, fontWeight: "bold", color: "#E8C97A" }}>Carteira de Investimentos</div>
    <div style={{ fontSize: 12, color: "#7A6A40", letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>{subtitle}</div>
  </div>
);

// --- Sub-componente: mensagem de erro ou sucesso ---
const AlertBox = ({ message }) => {
  if (!message) return null;
  const isError = message.type === "error";
  return (
    <div style={{
      background: isError ? "#2A0D0D" : "#0D2A1A",
      border: `1px solid ${isError ? "#4A1A1A" : "#1A4A2A"}`,
      borderRadius: 8, padding: "10px 14px", fontSize: 13,
      color: isError ? "#C07070" : "#6BBF6B", marginBottom: 18,
    }}>
      {message.text}
    </div>
  );
};

// --- Wrapper da tela de autenticação ---
const AuthScreen = ({ subtitle, children }) => (
  <div style={{ background: "#0D0D0D", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", padding: 20 }}>
    <div style={{ width: "100%", maxWidth: 400 }}>
      <AuthHeader subtitle={subtitle} />
      <div style={{ background: "#141000", border: "1px solid #2A2000", borderRadius: 16, padding: 28 }}>
        {children}
      </div>
    </div>
  </div>
);

const inputBase = {
  width: "100%", background: "#0D0D0D", border: "1px solid #2A2000",
  borderRadius: 8, padding: "11px 14px 11px 40px", color: "#E8C97A",
  fontSize: 14, fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box",
};

const iconStyle = { position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" };

// =============================================================================

export default function Auth({ onLogin, resetToken: initialResetToken, googlePending: initialGooglePending, onClearSpecialFlow }) {
  const [mode, setMode]       = useState("login"); // "login" | "register" | "forgot"
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [convite, setConvite] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Fluxos especiais (recebidos via props do useAuth)
  const [resetToken, setResetToken]       = useState(initialResetToken);
  const [googlePending, setGooglePending] = useState(initialGooglePending);
  const [newPassword, setNewPassword]     = useState("");

  useEffect(() => { setResetToken(initialResetToken); }, [initialResetToken]);
  useEffect(() => { setGooglePending(initialGooglePending); }, [initialGooglePending]);

  const changeMode = (newMode) => { setMode(newMode); setMessage(null); };

  // --- Login com e-mail e senha ---
  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true); setMessage(null);
    const res = await authSignIn(email, password);
    if (res.access_token) {
      onLogin(res.access_token, res.user);
    } else {
      setMessage({ type: "error", text: "E-mail ou senha incorretos." });
    }
    setLoading(false);
  };

  // --- Cadastro com convite ---
  const handleRegister = async () => {
    if (!email || !password) return;
    if (!convite) { setMessage({ type: "error", text: "Informe o código de convite." }); return; }

    setLoading(true); setMessage(null);
    const conviteValido = await checkConvite(convite);
    if (!conviteValido) {
      setMessage({ type: "error", text: "Convite inválido ou já utilizado." });
      setLoading(false); return;
    }

    const res = await authSignUp(email, password);
    if (res.id || res.email) {
      await marcarConviteUsado(conviteValido.id);
      setMessage({ type: "success", text: "Conta criada! Faça login para continuar." });
      changeMode("login");
    } else {
      setMessage({ type: "error", text: res.msg || res.error_description || "Erro ao criar conta." });
    }
    setLoading(false);
  };

  // --- Recuperação de senha ---
  const handleForgot = async () => {
    if (!email) return;
    setLoading(true); setMessage(null);
    await authRecover(email);
    setMessage({ type: "success", text: "E-mail de recuperação enviado!" });
    setLoading(false);
  };

  const handleSubmit = () => {
    if (mode === "login")    return handleLogin();
    if (mode === "register") return handleRegister();
    if (mode === "forgot")   return handleForgot();
  };

  // --- Redefinição de senha (após clicar no link do e-mail) ---
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setMessage({ type: "error", text: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }
    setLoading(true); setMessage(null);
    const res = await authUpdatePassword(resetToken, newPassword);
    if (res.id) {
      setMessage({ type: "success", text: "Senha alterada com sucesso! Faça login." });
      setTimeout(() => { setResetToken(null); onClearSpecialFlow?.("reset"); }, 1500);
    } else {
      setMessage({ type: "error", text: "Erro ao redefinir senha. Tente novamente." });
    }
    setLoading(false);
  };

  // --- Fluxo Google OAuth: validação de convite para novo usuário ---
  const handleGoogleConvite = async () => {
    if (!convite) { setMessage({ type: "error", text: "Informe o código de convite." }); return; }
    setLoading(true); setMessage(null);

    const conviteValido = await checkConvite(convite);
    if (!conviteValido) {
      // Convite inválido: remove a conta criada pelo Google
      await authDeleteUser(googlePending.token);
      setMessage({ type: "error", text: "Convite inválido. Acesso negado." });
      setGooglePending(null);
      onClearSpecialFlow?.("google");
      setLoading(false); return;
    }

    await marcarConviteUsado(conviteValido.id, googlePending.token);
    onLogin(googlePending.token, googlePending.user);
    setLoading(false);
  };

  // --- Verificar se usuário Google é novo ou existente ---
  useEffect(() => {
    if (!googlePending) return;
    const checkExisting = async () => {
      const hasData = await userHasData(googlePending.user.id, googlePending.token);
      if (hasData) {
        // Usuário já cadastrado: loga direto
        onLogin(googlePending.token, googlePending.user);
      }
      // Se não tem dados, mantém a tela de convite
    };
    checkExisting();
  }, [googlePending]); // eslint-disable-line react-hooks/exhaustive-deps

  // ==========================================================================
  // RENDER — Tela de redefinição de senha
  // ==========================================================================
  if (resetToken) return (
    <AuthScreen subtitle="Redefina sua senha de acesso">
      <AlertBox message={message} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ position: "relative" }}>
          <Lock size={15} color="#5A4A20" style={iconStyle} />
          <input
            type={showPass ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nova senha (mín. 6 caracteres)"
            onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
            style={{ ...inputBase, paddingRight: 40 }}
          />
          <button onClick={() => setShowPass((s) => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#5A4A20", padding: 0 }}>
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <button onClick={handleResetPassword} disabled={loading} style={{ background: "linear-gradient(135deg,#C9A84C,#A07830)", border: "none", borderRadius: 8, padding: 12, color: "#0D0D0D", fontWeight: "bold", cursor: "pointer", fontSize: 14, fontFamily: "Georgia, serif" }}>
          {loading ? "Salvando..." : "Redefinir senha"}
        </button>
      </div>
    </AuthScreen>
  );

  // ==========================================================================
  // RENDER — Tela de convite para novo usuário Google
  // ==========================================================================
  if (googlePending) return (
    <AuthScreen subtitle="Informe seu código de convite">
      <AlertBox message={message} />
      <p style={{ fontSize: 13, color: "#7A6A40", marginBottom: 16 }}>
        Logado como <span style={{ color: "#C9A84C" }}>{googlePending.user?.email}</span>. Informe um convite para finalizar o cadastro.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ position: "relative" }}>
          <Key size={15} color="#5A4A20" style={iconStyle} />
          <input
            type="text" value={convite}
            onChange={(e) => setConvite(e.target.value.toUpperCase())}
            placeholder="Código de convite"
            onKeyDown={(e) => e.key === "Enter" && handleGoogleConvite()}
            style={{ ...inputBase, letterSpacing: 2 }}
          />
        </div>
        <button onClick={handleGoogleConvite} disabled={loading} style={{ background: "linear-gradient(135deg,#C9A84C,#A07830)", border: "none", borderRadius: 8, padding: 12, color: "#0D0D0D", fontWeight: "bold", cursor: "pointer", fontSize: 14, fontFamily: "Georgia, serif" }}>
          {loading ? "Validando..." : "Confirmar acesso"}
        </button>
      </div>
    </AuthScreen>
  );

  // ==========================================================================
  // RENDER — Tela de login principal
  // ==========================================================================
  const modeLabels = { login: "Entrar na sua conta", register: "Criar conta", forgot: "Recuperar senha" };
  const submitLabels = { login: "Entrar", register: "Criar conta", forgot: "Enviar e-mail" };

  return (
    <AuthScreen subtitle={modeLabels[mode]}>
      <AlertBox message={message} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Campo de e-mail */}
        <div style={{ position: "relative" }}>
          <Mail size={15} color="#5A4A20" style={iconStyle} />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com" onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={inputBase} />
        </div>

        {/* Campo de senha (não exibido no modo "esqueci a senha") */}
        {mode !== "forgot" && (
          <div style={{ position: "relative" }}>
            <Lock size={15} color="#5A4A20" style={iconStyle} />
            <input type={showPass ? "text" : "password"} value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="Senha"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              style={{ ...inputBase, paddingRight: 40 }} />
            <button onClick={() => setShowPass((s) => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#5A4A20", padding: 0 }}>
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        )}

        {/* Campo de convite (apenas no cadastro) */}
        {mode === "register" && (
          <div style={{ position: "relative" }}>
            <Key size={15} color="#5A4A20" style={iconStyle} />
            <input type="text" value={convite}
              onChange={(e) => setConvite(e.target.value.toUpperCase())}
              placeholder="Código de convite"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              style={{ ...inputBase, letterSpacing: 2 }} />
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{ background: "linear-gradient(135deg,#C9A84C,#A07830)", border: "none", borderRadius: 8, padding: 12, color: "#0D0D0D", fontWeight: "bold", cursor: "pointer", fontSize: 14, fontFamily: "Georgia, serif", marginTop: 4 }}>
          {loading ? "Aguarde..." : submitLabels[mode]}
        </button>

        {/* Botão Google (não exibido no modo "esqueci a senha") */}
        {mode !== "forgot" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
              <div style={{ flex: 1, height: 1, background: "#2A2000" }} />
              <span style={{ fontSize: 12, color: "#5A4A20" }}>ou</span>
              <div style={{ flex: 1, height: 1, background: "#2A2000" }} />
            </div>
            <button onClick={() => window.location.href = getGoogleAuthUrl()} style={{ background: "#1A1200", border: "1px solid #3A2800", borderRadius: 8, padding: 11, color: "#E8C97A", cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar com Google
            </button>
          </>
        )}
      </div>

      {/* Links de navegação entre modos */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
        {mode === "login" && (
          <>
            <button onClick={() => changeMode("register")} style={{ background: "none", border: "none", color: "#C9A84C", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: 12 }}>Criar conta</button>
            <button onClick={() => changeMode("forgot")}   style={{ background: "none", border: "none", color: "#7A6A40", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: 12 }}>Esqueci a senha</button>
          </>
        )}
        {(mode === "register" || mode === "forgot") && (
          <button onClick={() => changeMode("login")} style={{ background: "none", border: "none", color: "#C9A84C", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: 12 }}>← Voltar para login</button>
        )}
      </div>
    </AuthScreen>
  );
}
