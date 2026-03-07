// =============================================================================
// HOOK — useAuth
// Gerencia todo o estado de autenticação da aplicação.
//
// Responsabilidades:
//   - Persistir e recuperar sessão do localStorage
//   - Renovar token automaticamente (refresh)
//   - Deslogar após inatividade (SESSION_TIMEOUT_MS)
//   - Detectar retorno de OAuth Google e fluxo de reset de senha
// =============================================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { setAuthToken, authGetUser } from "../api/supabase";
import { SESSION_TIMEOUT_MS } from "../constants";

const STORAGE_TOKEN_KEY = "carteira_token";
const STORAGE_USER_KEY  = "carteira_user";

export function useAuth() {
  const [user, setUser]         = useState(null);
  const [authToken, setToken]   = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Fluxos especiais detectados na URL (OAuth Google, reset de senha)
  const [resetToken, setResetToken]   = useState(null);
  const [googlePending, setGooglePending] = useState(null); // { token, user }

  // Timer de inatividade
  const inactivityTimer = useRef(null);

  // --- Persistência de sessão ---

  const persistSession = useCallback((token, userData) => {
    localStorage.setItem(STORAGE_TOKEN_KEY, token);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
  }, []);

  // --- Logout ---

  const logout = useCallback(() => {
    clearSession();
    setAuthToken(null);
    setUser(null);
    setToken(null);
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
  }, [clearSession]);

  // --- Timer de inatividade ---
  // Reinicia o contador a cada interação do usuário.
  // Após SESSION_TIMEOUT_MS sem atividade, desloga automaticamente.

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      logout();
    }, SESSION_TIMEOUT_MS);
  }, [logout]);

  const startActivityListeners = useCallback(() => {
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    const handler = () => resetInactivityTimer();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetInactivityTimer();

    // Retorna função de cleanup para remover os listeners
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [resetInactivityTimer]);

  // --- Login ---

  const login = useCallback((token, userData) => {
    setAuthToken(token);
    setUser(userData);
    setToken(token);
    persistSession(token, userData);
    startActivityListeners();
  }, [persistSession, startActivityListeners]);

  // --- Inicialização ---
  // Na montagem, verifica se há sessão salva ou hash OAuth na URL.

  useEffect(() => {
    const initAuth = async () => {
      // 1. Verifica se há token OAuth na URL (retorno do Google ou reset de senha)
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        const params = new URLSearchParams(hash.substring(1));
        const token  = params.get("access_token");
        const type   = params.get("type");
        window.location.hash = ""; // Limpa a URL

        if (type === "recovery") {
          // Fluxo de redefinição de senha
          setResetToken(token);
          setAuthLoading(false);
          return;
        }

        if (token) {
          // Fluxo de login via Google OAuth
          // Sinaliza para o componente Auth tratar o convite se necessário
          const userData = await authGetUser(token);
          setGooglePending({ token, user: userData });
          setAuthLoading(false);
          return;
        }
      }

      // 2. Verifica se há sessão persistida no localStorage
      const savedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
      const savedUser  = localStorage.getItem(STORAGE_USER_KEY);

      if (savedToken && savedUser) {
        try {
          // Valida o token com o servidor antes de restaurar a sessão
          const userData = await authGetUser(savedToken);
          if (userData?.id) {
            login(savedToken, userData);
          } else {
            // Token expirado ou inválido
            clearSession();
          }
        } catch {
          clearSession();
        }
      }

      setAuthLoading(false);
    };

    initAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    user,
    authToken,
    authLoading,
    resetToken,
    googlePending,
    login,
    logout,
    setResetToken,
    setGooglePending,
  };
}
