// =============================================================================
// COMPONENT — ConvitesModal
// Permite ao usuário autenticado gerar e visualizar códigos de convite.
// Cada convite é de uso único. Convites usados ficam marcados como "Usado".
// =============================================================================

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { dbGet, dbPost } from "../api/supabase";
import { Modal } from "./UI";

export default function ConvitesModal({ onClose, userId }) {
  const [convites, setConvites] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [gerando,  setGerando]  = useState(false);

  // Carrega os convites do usuário ao abrir o modal
  useEffect(() => {
    loadConvites();
  }, []);

  const loadConvites = async () => {
    setLoading(true);
    const res = await dbGet("convites", `criado_por=eq.${userId}&order=created_at.desc`);
    if (Array.isArray(res)) setConvites(res);
    setLoading(false);
  };

  /** Gera um novo código aleatório de 6 caracteres (letras e números) */
  const gerarConvite = async () => {
    setGerando(true);
    const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
    await dbPost("convites", { codigo, criado_por: userId, usado: false });
    await loadConvites();
    setGerando(false);
  };

  const copiarCodigo = (codigo) => {
    navigator.clipboard.writeText(codigo);
  };

  return (
    <Modal title="Convites" onClose={onClose} maxWidth={460}>
      <p style={{ fontSize: 12, color: "#5A4A20", marginTop: -10, marginBottom: 22 }}>
        Gere códigos para convidar outros usuários. Cada código é de uso único.
      </p>

      {/* Botão de gerar */}
      <button
        onClick={gerarConvite}
        disabled={gerando}
        style={{ background: "linear-gradient(135deg,#C9A84C,#A07830)", border: "none", borderRadius: 8, padding: "11px 20px", color: "#0D0D0D", fontWeight: "bold", cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif", marginBottom: 20, display: "flex", alignItems: "center", gap: 8, opacity: gerando ? 0.6 : 1 }}
      >
        <Plus size={15} /> {gerando ? "Gerando..." : "Gerar novo convite"}
      </button>

      {/* Lista de convites */}
      {loading ? (
        <div style={{ color: "#5A4A20", textAlign: "center", padding: "20px 0" }}>Carregando...</div>
      ) : convites.length === 0 ? (
        <div style={{ color: "#3A3000", textAlign: "center", padding: "20px 0", fontSize: 13 }}>Nenhum convite gerado ainda</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {convites.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#0D0D0D", border: "1px solid #2A2000", borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, color: "#E8C97A", letterSpacing: 3, fontWeight: "bold" }}>{c.codigo}</div>
                <div style={{ fontSize: 11, color: "#5A4A20", marginTop: 3 }}>
                  {new Date(c.created_at).toLocaleDateString("pt-BR")}
                </div>
              </div>

              {/* Badge de status */}
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: c.usado ? "#2A1A1A" : "#1A2A1A", color: c.usado ? "#C07070" : "#6BBF6B", border: `1px solid ${c.usado ? "#4A2A2A" : "#2A4A2A"}` }}>
                {c.usado ? "Usado" : "Disponível"}
              </span>

              {/* Botão copiar (apenas para convites disponíveis) */}
              {!c.usado && (
                <button
                  onClick={() => copiarCodigo(c.codigo)}
                  title="Copiar código"
                  style={{ background: "#1A1800", border: "1px solid #3A3000", borderRadius: 8, padding: "6px 10px", color: "#C9A84C", cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif" }}
                >
                  Copiar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
