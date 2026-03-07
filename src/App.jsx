// =============================================================================
// APP — Componente raiz
//
// Responsabilidade: orquestração.
// Este arquivo não deve conter lógica de negócio nem chamadas de API diretas.
// Toda a lógica está nos hooks (useAuth, useCarteira) e componentes filhos.
//
// Estrutura do projeto:
//   src/
//     api/         → cliente Supabase (supabase.js)
//     components/  → UI, Auth, Dashboard, AplicacoesList, ProventosList,
//                    Modais, ConvitesModal
//     constants/   → cores, categorias, configurações (index.js)
//     hooks/       → useAuth.js, useCarteira.js
//     utils/       → cálculos financeiros (financeiro.js)
//     App.jsx      → este arquivo
//     main.jsx     → entry point React
// =============================================================================

import { useState, useEffect } from "react";
import { TrendingUp, Plus, BarChart2, List, ArrowDownCircle, Settings } from "lucide-react";

import { useAuth }     from "./hooks/useAuth";
import { useCarteira } from "./hooks/useCarteira";
import { setAuthToken } from "./api/supabase";

import Auth           from "./components/Auth";
import Dashboard      from "./components/Dashboard";
import AplicacoesList from "./components/AplicacoesList";
import ProventosList  from "./components/ProventosList";
import ConvitesModal  from "./components/ConvitesModal";
import { ModalAplicacao, ModalProvento, ModalEdicao } from "./components/Modais";
import { LoadingScreen, ErrorScreen } from "./components/UI";

import { DEFAULT_APLICACAO, DEFAULT_PROVENTO } from "./constants";
import { fmtBRL } from "./utils/financeiro";

// =============================================================================

export default function App() {
  // --- Autenticação e sessão ---
  const {
    user, authToken, authLoading,
    resetToken, googlePending,
    login, logout,
    setResetToken, setGooglePending,
  } = useAuth();

  // Injeta o token no cliente de API sempre que ele mudar
  useEffect(() => {
    setAuthToken(authToken);
  }, [authToken]);

  // --- Dados da carteira ---
  const carteira = useCarteira(user);

  // Carrega dados ao autenticar
  useEffect(() => {
    if (user) carteira.loadAll();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Estado da UI ---
  const [tab,      setTab]      = useState("dashboard");
  const [modal,    setModal]    = useState(null); // "aplicacao" | "provento" | "convites" | null
  const [formA,    setFormA]    = useState(DEFAULT_APLICACAO);
  const [formP,    setFormP]    = useState(DEFAULT_PROVENTO);
  const [editItem, setEditItem] = useState(null); // { tipo: "aplicacao"|"provento", data: {...} }

  // --- Cotação editável no header ---
  const [editCotacao,  setEditCotacao]  = useState(false);
  const [tempCotacao,  setTempCotacao]  = useState("");

  // ==========================================================================
  // Handlers de formulário
  // ==========================================================================

  const handleSaveAplicacao = async () => {
    await carteira.addAplicacao(formA);
    setFormA(DEFAULT_APLICACAO);
    setModal(null);
  };

  const handleSaveProvento = async () => {
    await carteira.addProvento(formP);
    setFormP(DEFAULT_PROVENTO);
    setModal(null);
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    if (editItem.tipo === "aplicacao") await carteira.updateAplicacao(editItem.data);
    else                               await carteira.updateProvento(editItem.data);
    setEditItem(null);
  };

  const handleSaveCotacao = async () => {
    const valor = parseFloat(tempCotacao.replace(",", "."));
    if (!isNaN(valor) && valor > 0) await carteira.saveCotacao(valor);
    setEditCotacao(false);
  };

  // Atualiza um campo do item em edição
  const handleEditField = (key, value) => {
    setEditItem((prev) => ({ ...prev, data: { ...prev.data, [key]: value } }));
  };

  // ==========================================================================
  // Guardas de renderização
  // ==========================================================================

  // Aguarda verificação de sessão
  if (authLoading) return <LoadingScreen />;

  // Exibe tela de autenticação se não houver usuário
  if (!user || resetToken || googlePending) {
    return (
      <Auth
        onLogin={login}
        resetToken={resetToken}
        googlePending={googlePending}
        onClearSpecialFlow={(type) => {
          if (type === "reset")  setResetToken(null);
          if (type === "google") setGooglePending(null);
        }}
      />
    );
  }

  if (carteira.loading) return <LoadingScreen />;
  if (carteira.error)   return <ErrorScreen message={carteira.error} onRetry={carteira.loadAll} />;

  // ==========================================================================
  // Render principal
  // ==========================================================================

  const tabs = [
    { id: "dashboard",  label: "Dashboard",  Icon: BarChart2 },
    { id: "aplicacoes", label: "Aplicações", Icon: List },
    { id: "proventos",  label: "Proventos",  Icon: ArrowDownCircle },
  ];

  return (
    <div style={{ background: "#0D0D0D", minHeight: "100vh", fontFamily: "Georgia, serif", color: "#F5EDD6" }}>

      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ borderBottom: "1px solid #2A2200", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#C9A84C,#7A5C20)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={18} color="#0D0D0D" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: "bold", color: "#E8C97A" }}>Carteira de Investimentos</div>
            <div style={{ fontSize: 11, color: "#7A6A40", letterSpacing: 2, textTransform: "uppercase" }}>Registro & Análise</div>
          </div>
        </div>

        {/* Ações do header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>

          {/* Cotação USD */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#1A1200", border: "1px solid #3A2800", borderRadius: 8, padding: "7px 14px" }}>
            <span style={{ fontSize: 11, color: "#7A6A40", textTransform: "uppercase", letterSpacing: 1 }}>USD/BRL</span>
            {editCotacao ? (
              <>
                <input autoFocus value={tempCotacao} onChange={(e) => setTempCotacao(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveCotacao(); if (e.key === "Escape") setEditCotacao(false); }}
                  style={{ width: 64, background: "transparent", border: "none", outline: "none", color: "#E8C97A", fontSize: 13, fontFamily: "Georgia, serif", textAlign: "right" }} />
                <button onClick={handleSaveCotacao} style={{ background: "none", border: "none", color: "#6BBF6B", cursor: "pointer", fontSize: 12 }}>
                  {carteira.saving ? "..." : "✓"}
                </button>
              </>
            ) : (
              <>
                <span style={{ fontSize: 13, color: "#E8C97A", fontWeight: "bold" }}>{fmtBRL(carteira.cotacaoUSD)}</span>
                <button onClick={() => { setTempCotacao(String(carteira.cotacaoUSD)); setEditCotacao(true); }}
                  style={{ background: "none", border: "none", color: "#5A4A20", cursor: "pointer", padding: 0 }}>
                  <Settings size={13} />
                </button>
              </>
            )}
          </div>

          {/* Botão registrar provento */}
          <button onClick={() => setModal("provento")}
            style={{ background: "#1A1200", border: "1px solid #3A2800", borderRadius: 8, padding: "9px 16px", color: "#C9A84C", cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif", display: "flex", alignItems: "center", gap: 6 }}>
            <ArrowDownCircle size={15} /> Provento
          </button>

          {/* Botão registrar aplicação */}
          <button onClick={() => setModal("aplicacao")}
            style={{ background: "linear-gradient(135deg,#C9A84C,#A07830)", border: "none", borderRadius: 8, padding: "9px 16px", color: "#0D0D0D", fontWeight: "bold", cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif", display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={15} /> Aplicação
          </button>

          <button onClick={() => setModal("convites")}
            style={{ background: "#1A1200", border: "1px solid #3A2800", borderRadius: 8, padding: "9px 14px", color: "#7A6A40", cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif" }}>
            Convites
          </button>

          <button onClick={logout}
            style={{ background: "#1A0D0D", border: "1px solid #3A1A1A", borderRadius: 8, padding: "9px 14px", color: "#C07070", cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif" }}>
            Sair
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Tabs de navegação                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ display: "flex", padding: "0 16px", borderBottom: "1px solid #1A1500" }}>
        {tabs.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ background: "none", border: "none", borderBottom: tab === id ? "2px solid #C9A84C" : "2px solid transparent", color: tab === id ? "#C9A84C" : "#5A4A20", cursor: "pointer", padding: "13px 18px", fontSize: 13, fontFamily: "Georgia, serif", display: "flex", alignItems: "center", gap: 7 }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Conteúdo principal                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ padding: 16 }}>
        {tab === "dashboard" && (
          <Dashboard
            aplicacoes={carteira.aplicacoes}
            proventos={carteira.proventos}
            cotacaoUSD={carteira.cotacaoUSD}
          />
        )}

        {tab === "aplicacoes" && (
          <AplicacoesList
            aplicacoes={carteira.aplicacoes}
            proventos={carteira.proventos}
            cotacaoUSD={carteira.cotacaoUSD}
            onEdit={(item) => setEditItem({ tipo: "aplicacao", data: { ...item } })}
            onDelete={carteira.deleteAplicacao}
          />
        )}

        {tab === "proventos" && (
          <ProventosList
            proventos={carteira.proventos}
            cotacaoUSD={carteira.cotacaoUSD}
            onEdit={(item) => setEditItem({ tipo: "provento", data: { ...item } })}
            onDelete={carteira.deleteProvento}
          />
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Modais                                                              */}
      {/* ------------------------------------------------------------------ */}

      {modal === "aplicacao" && (
        <ModalAplicacao
          form={formA}
          onChange={(key, value) => setFormA((f) => ({ ...f, [key]: value }))}
          onSubmit={handleSaveAplicacao}
          onClose={() => setModal(null)}
          saving={carteira.saving}
          proventos={carteira.proventos}
          corretoras={carteira.corretoras}
          onAddCorretora={carteira.addCorretora}
          cotacaoUSD={carteira.cotacaoUSD}
        />
      )}

      {modal === "provento" && (
        <ModalProvento
          form={formP}
          onChange={(key, value) => setFormP((f) => ({ ...f, [key]: value }))}
          onSubmit={handleSaveProvento}
          onClose={() => setModal(null)}
          saving={carteira.saving}
          corretoras={carteira.corretoras}
          onAddCorretora={carteira.addCorretora}
          cotacaoUSD={carteira.cotacaoUSD}
        />
      )}

      {modal === "convites" && (
        <ConvitesModal
          onClose={() => setModal(null)}
          userId={user.id}
        />
      )}

      {editItem && (
        <ModalEdicao
          editItem={editItem}
          onChangeField={handleEditField}
          onSave={handleSaveEdit}
          onClose={() => setEditItem(null)}
          saving={carteira.saving}
          corretoras={carteira.corretoras}
          onAddCorretora={carteira.addCorretora}
          cotacaoUSD={carteira.cotacaoUSD}
        />
      )}
    </div>
  );
}
