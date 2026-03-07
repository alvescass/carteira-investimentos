// =============================================================================
// COMPONENT — ProventosList
// Lista de proventos em formato de cartões responsivos.
// Exibe: ativo, tipo, corretora, status (disponível/reaplicado), data e valor.
// =============================================================================

import { ArrowDownCircle, Trash2 } from "lucide-react";
import { fmt, fmtBRL, fmtDate, toBRL } from "../utils/financeiro";
import { Badge } from "./UI";

export default function ProventosList({ proventos, cotacaoUSD, onEdit, onDelete }) {
  if (proventos.length === 0) {
    return (
      <div style={{ background: "#141000", border: "1px solid #2A2000", borderRadius: 12, color: "#3A3000", textAlign: "center", padding: "60px 0", fontSize: 14 }}>
        <ArrowDownCircle size={30} color="#2A2000" style={{ display: "block", margin: "0 auto 10px" }} />
        <div>Nenhum provento registrado</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {proventos.map((p) => (
        <div key={p.id} style={{ background: "#141000", border: "1px solid #2A2000", borderRadius: 12, padding: "16px 18px" }}>

          {/* Cabeçalho: ativo + botões */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, color: "#E8C97A", fontWeight: "bold", display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                {p.ativo}
                {p.moeda === "USD" && (
                  <span style={{ fontSize: 10, background: "#1A2A3A", border: "1px solid #2A4A6A", borderRadius: 10, padding: "1px 7px", color: "#6AAFD4" }}>USD</span>
                )}
              </div>
              {p.notas && <div style={{ fontSize: 11, color: "#5A4A20", marginTop: 3 }}>{p.notas}</div>}
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: 8 }}>
              <button onClick={() => onEdit(p)} title="Editar" style={{ background: "none", border: "none", cursor: "pointer", color: "#5A4A20", padding: 4 }}>✏️</button>
              <button onClick={() => onDelete(p.id)} title="Excluir" style={{ background: "none", border: "none", cursor: "pointer", color: "#3A2000", padding: 4 }}><Trash2 size={14} /></button>
            </div>
          </div>

          {/* Badges de tipo, corretora e status */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            <Badge text={p.tipo} />
            {p.corretora && <Badge text={p.corretora} color="#A09060" bg="#1A1800" border="#2A2800" />}
            <Badge
              text={p.reaplicado ? "Reaplicado" : "Disponível"}
              color={p.reaplicado ? "#6BBF6B" : "#A09060"}
              bg={p.reaplicado ? "#1A2A1A" : "#2A2000"}
              border={p.reaplicado ? "#2A4A2A" : "#3A3000"}
            />
          </div>

          {/* Grid de detalhes: data + valor */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: "#5A4A20", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Data</div>
              <div style={{ fontSize: 13, color: "#7A6A40" }}>{fmtDate(p.data)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#5A4A20", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Valor</div>
              <div style={{ fontSize: 15, color: p.moeda === "USD" ? "#6AAFD4" : "#C9A84C", fontWeight: "bold" }}>{fmt(p.valor, p.moeda)}</div>
              {p.moeda === "USD" && <div style={{ fontSize: 12, color: "#C9A84C" }}>{fmtBRL(toBRL(Number(p.valor), p.moeda, cotacaoUSD))}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
