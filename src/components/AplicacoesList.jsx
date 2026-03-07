// =============================================================================
// COMPONENT — AplicacoesList
// Lista de aplicações em formato de cartões responsivos.
// Cada cartão exibe: nome, badges, data, valor e ações de editar/excluir.
// =============================================================================

import { DollarSign, Trash2, ArrowRightCircle } from "lucide-react";
import { CHART_COLORS, CATEGORIAS_ATIVO } from "../constants";
import { fmt, fmtBRL, fmtDate, toBRL } from "../utils/financeiro";
import { Badge } from "./UI";

export default function AplicacoesList({ aplicacoes, proventos, cotacaoUSD, onEdit, onDelete }) {
  if (aplicacoes.length === 0) {
    return (
      <div style={{ background: "#141000", border: "1px solid #2A2000", borderRadius: 12, color: "#3A3000", textAlign: "center", padding: "60px 0", fontSize: 14 }}>
        <DollarSign size={30} color="#2A2000" style={{ marginBottom: 10, display: "block", margin: "0 auto 10px" }} />
        <div>Nenhuma aplicação registrada</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {aplicacoes.map((a) => {
        const valBRL = toBRL(Number(a.valor), a.moeda, cotacaoUSD);

        // Soma os valores dos proventos vinculados (origem da aplicação)
        const origemTotal = proventos
          .filter((p) => a.origem_provento_ids?.includes(p.id))
          .reduce((s, p) => s + toBRL(Number(p.valor), p.moeda, cotacaoUSD), 0);

        return (
          <div key={a.id} style={{ background: "#141000", border: "1px solid #2A2000", borderRadius: 12, padding: "16px 18px" }}>

            {/* Cabeçalho do cartão: nome + botões */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, color: "#E8C97A", fontWeight: "bold", display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                  {a.nome}
                  {a.moeda === "USD" && (
                    <span style={{ fontSize: 10, background: "#1A2A3A", border: "1px solid #2A4A6A", borderRadius: 10, padding: "1px 7px", color: "#6AAFD4" }}>USD</span>
                  )}
                </div>
                {a.notas && <div style={{ fontSize: 11, color: "#5A4A20", marginTop: 3 }}>{a.notas}</div>}
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: 8 }}>
                <button onClick={() => onEdit(a)} title="Editar" style={{ background: "none", border: "none", cursor: "pointer", color: "#5A4A20", padding: 4 }}>✏️</button>
                <button onClick={() => onDelete(a.id)} title="Excluir" style={{ background: "none", border: "none", cursor: "pointer", color: "#3A2000", padding: 4 }}><Trash2 size={14} /></button>
              </div>
            </div>

            {/* Badges de categoria, corretora e rentabilidade */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <Badge text={a.categoria} color={CHART_COLORS[CATEGORIAS_ATIVO.indexOf(a.categoria) % CHART_COLORS.length]} />
              {a.corretora && <Badge text={a.corretora} color="#A09060" bg="#1A1800" border="#2A2800" />}
              {a.rentabilidade && <Badge text={`${a.rentabilidade}% CDI`} color="#6BBF6B" bg="#1A2A1A" border="#2A4A2A" />}
            </div>

            {/* Grid de detalhes: data + valor */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: "#5A4A20", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Data</div>
                <div style={{ fontSize: 13, color: "#7A6A40" }}>{fmtDate(a.data)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "#5A4A20", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Valor</div>
                <div style={{ fontSize: 15, color: a.moeda === "USD" ? "#6AAFD4" : "#C9A84C", fontWeight: "bold" }}>{fmt(a.valor, a.moeda)}</div>
                {a.moeda === "USD" && <div style={{ fontSize: 12, color: "#C9A84C" }}>{fmtBRL(valBRL)}</div>}
              </div>

              {/* Origem de proventos (se houver) */}
              {origemTotal > 0 && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 10, color: "#5A4A20", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Origem proventos</div>
                  <div style={{ fontSize: 13, color: "#A09060", display: "flex", alignItems: "center", gap: 4 }}>
                    <ArrowRightCircle size={13} />{fmtBRL(origemTotal)}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
