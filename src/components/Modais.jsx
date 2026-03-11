// =============================================================================
// COMPONENT — Modais de formulário
// ModalAplicacao: formulário para criar/editar uma aplicação
// ModalProvento:  formulário para criar/editar um provento
// ModalEdicao:    modal genérico de edição (reutiliza os formulários acima)
// =============================================================================

import { CATEGORIAS_ATIVO, CATEGORIAS_PROVENTO, MOEDAS, CATEGORIAS_COM_QUANTIDADE } from "../constants";
import { fmtBRL, fmt, toBRL } from "../utils/financeiro";
import { Modal, ButtonPrimary, CorretoraSelect, inputStyle, labelStyle } from "./UI";

// --- Campo de formulário reutilizável ---
const Field = ({ label, children }) => (
  <div>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

// =============================================================================
// Modal de aplicação
// =============================================================================
export function ModalAplicacao({ form, onChange, onSubmit, onClose, saving, proventos, corretoras, onAddCorretora, cotacaoUSD }) {
  const proventosDisponiveis = proventos.filter((p) => !p.reaplicado);
  const temQuantidade = CATEGORIAS_COM_QUANTIDADE.includes(form.categoria);

  const toggleProvento = (id) => {
    const ids = form.origemProventoIds || [];
    onChange("origemProventoIds", ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]);
  };

  return (
    <Modal title="Nova Aplicação" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        <Field label="Nome do Ativo *">
          <input type="text" value={form.nome} placeholder="Ex: Tesouro Selic, MXRF11..."
            onChange={(e) => onChange("nome", e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Valor *">
          <input type="number" value={form.valor} placeholder="0,00"
            onChange={(e) => onChange("valor", e.target.value)} style={inputStyle} />
        </Field>

        {/* Quantidade — exibido apenas para categorias com cotas/ações */}
        {temQuantidade && (
          <Field label="Quantidade">
            <input type="number" value={form.quantidade} placeholder="Ex: 10"
              onChange={(e) => onChange("quantidade", e.target.value)} style={inputStyle} />
          </Field>
        )}

        <Field label="Data *">
          <input type="date" value={form.data}
            onChange={(e) => onChange("data", e.target.value)} style={inputStyle} />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Categoria">
            <select value={form.categoria} onChange={(e) => onChange("categoria", e.target.value)} style={inputStyle}>
              {CATEGORIAS_ATIVO.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Moeda">
            <select value={form.moeda} onChange={(e) => onChange("moeda", e.target.value)} style={inputStyle}>
              {MOEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
        </div>

        {/* Preview de conversão USD → BRL */}
        {form.moeda === "USD" && (
          <div style={{ background: "#0D1A20", border: "1px solid #1A3A4A", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#6AAFD4" }}>
            1 USD = {fmtBRL(cotacaoUSD)} · Em BRL: {fmtBRL(Number(form.valor || 0) * cotacaoUSD)}
          </div>
        )}

        <Field label="Rentabilidade (%)">
          <input type="number" value={form.rentabilidade} placeholder="Ex: 100 (para 100% CDI)"
            onChange={(e) => onChange("rentabilidade", e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Corretora / Banco">
          <CorretoraSelect value={form.corretora} onChange={(v) => onChange("corretora", v)}
            corretoras={corretoras} onAddCorretora={onAddCorretora} />
        </Field>

        <Field label="Notas">
          <input type="text" value={form.notas} placeholder="Observações..."
            onChange={(e) => onChange("notas", e.target.value)} style={inputStyle} />
        </Field>

        {/* Vincular proventos disponíveis */}
        {proventosDisponiveis.length > 0 && (
          <Field label="Vincular proventos disponíveis">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {proventosDisponiveis.map((p) => (
                <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#A09060", cursor: "pointer" }}>
                  <input type="checkbox"
                    checked={(form.origemProventoIds || []).includes(p.id)}
                    onChange={() => toggleProvento(p.id)}
                    style={{ accentColor: "#C9A84C" }}
                  />
                  {p.ativo} — {p.tipo} — {fmt(p.valor, p.moeda)}
                </label>
              ))}
            </div>
          </Field>
        )}

        <ButtonPrimary onClick={onSubmit} disabled={saving} style={{ width: "100%", marginTop: 4 }}>
          {saving ? "Salvando..." : "Registrar aplicação"}
        </ButtonPrimary>
      </div>
    </Modal>
  );
}

// =============================================================================
// Modal de provento
// =============================================================================
export function ModalProvento({ form, onChange, onSubmit, onClose, saving, corretoras, onAddCorretora, cotacaoUSD }) {
  return (
    <Modal title="Novo Provento" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        <Field label="Ativo *">
          <input type="text" value={form.ativo} placeholder="Ex: VALE3, MXRF11..."
            onChange={(e) => onChange("ativo", e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Valor *">
          <input type="number" value={form.valor} placeholder="0,00"
            onChange={(e) => onChange("valor", e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Data *">
          <input type="date" value={form.data}
            onChange={(e) => onChange("data", e.target.value)} style={inputStyle} />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Tipo">
            <select value={form.tipo} onChange={(e) => onChange("tipo", e.target.value)} style={inputStyle}>
              {CATEGORIAS_PROVENTO.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Moeda">
            <select value={form.moeda} onChange={(e) => onChange("moeda", e.target.value)} style={inputStyle}>
              {MOEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
        </div>

        {/* Preview de conversão USD → BRL */}
        {form.moeda === "USD" && (
          <div style={{ background: "#0D1A20", border: "1px solid #1A3A4A", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#6AAFD4" }}>
            1 USD = {fmtBRL(cotacaoUSD)} · Em BRL: {fmtBRL(Number(form.valor || 0) * cotacaoUSD)}
          </div>
        )}

        <Field label="Corretora / Banco">
          <CorretoraSelect value={form.corretora} onChange={(v) => onChange("corretora", v)}
            corretoras={corretoras} onAddCorretora={onAddCorretora} />
        </Field>

        <ButtonPrimary onClick={onSubmit} disabled={saving} style={{ width: "100%", marginTop: 4 }}>
          {saving ? "Salvando..." : "Registrar provento"}
        </ButtonPrimary>
      </div>
    </Modal>
  );
}

// =============================================================================
// Modal de edição genérico
// Detecta o tipo (aplicacao ou provento) e renderiza o formulário adequado.
// =============================================================================
export function ModalEdicao({ editItem, onChangeField, onSave, onClose, saving, corretoras, onAddCorretora, cotacaoUSD }) {
  if (!editItem) return null;

  const { tipo, data: item } = editItem;
  const onChange = (key, value) => onChangeField(key, value);

  if (tipo === "aplicacao") {
    const temQuantidade = CATEGORIAS_COM_QUANTIDADE.includes(item.categoria);

    return (
      <Modal title="Editar Aplicação" onClose={onClose}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "Nome do Ativo", key: "nome", type: "text" },
            { label: "Valor", key: "valor", type: "number" },
            { label: "Data", key: "data", type: "date" },
            { label: "Rentabilidade (%)", key: "rentabilidade", type: "number" },
            { label: "Notas", key: "notas", type: "text" },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <input type={type} value={item[key] || ""} onChange={(e) => onChange(key, e.target.value)} style={inputStyle} />
            </div>
          ))}

          {/* Quantidade — exibido apenas para categorias com cotas/ações */}
          {temQuantidade && (
            <div>
              <label style={labelStyle}>Quantidade</label>
              <input type="number" value={item.quantidade || ""} placeholder="Ex: 10"
                onChange={(e) => onChange("quantidade", e.target.value)} style={inputStyle} />
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Categoria</label>
              <select value={item.categoria} onChange={(e) => onChange("categoria", e.target.value)} style={inputStyle}>
                {CATEGORIAS_ATIVO.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Moeda</label>
              <select value={item.moeda} onChange={(e) => onChange("moeda", e.target.value)} style={inputStyle}>
                {MOEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          {item.moeda === "USD" && (
            <div style={{ background: "#0D1A20", border: "1px solid #1A3A4A", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#6AAFD4" }}>
              Em BRL: {fmtBRL(toBRL(Number(item.valor || 0), "USD", cotacaoUSD))}
            </div>
          )}
          <div>
            <label style={labelStyle}>Corretora / Banco</label>
            <CorretoraSelect value={item.corretora || ""} onChange={(v) => onChange("corretora", v)}
              corretoras={corretoras} onAddCorretora={onAddCorretora} />
          </div>
          <ButtonPrimary onClick={onSave} disabled={saving} style={{ width: "100%", marginTop: 4 }}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </ButtonPrimary>
        </div>
      </Modal>
    );
  }

  // tipo === "provento"
  return (
    <Modal title="Editar Provento" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {[
          { label: "Ativo", key: "ativo", type: "text" },
          { label: "Valor", key: "valor", type: "number" },
          { label: "Data", key: "data", type: "date" },
        ].map(({ label, key, type }) => (
          <div key={key}>
            <label style={labelStyle}>{label}</label>
            <input type={type} value={item[key] || ""} onChange={(e) => onChange(key, e.target.value)} style={inputStyle} />
          </div>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Tipo</label>
            <select value={item.tipo} onChange={(e) => onChange("tipo", e.target.value)} style={inputStyle}>
              {CATEGORIAS_PROVENTO.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Moeda</label>
            <select value={item.moeda} onChange={(e) => onChange("moeda", e.target.value)} style={inputStyle}>
              {MOEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        {item.moeda === "USD" && (
          <div style={{ background: "#0D1A20", border: "1px solid #1A3A4A", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#6AAFD4" }}>
            Em BRL: {fmtBRL(toBRL(Number(item.valor || 0), "USD", cotacaoUSD))}
          </div>
        )}
        <div>
          <label style={labelStyle}>Corretora / Banco</label>
          <CorretoraSelect value={item.corretora || ""} onChange={(v) => onChange("corretora", v)}
            corretoras={corretoras} onAddCorretora={onAddCorretora} />
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select value={String(item.reaplicado)} onChange={(e) => onChange("reaplicado", e.target.value === "true")} style={inputStyle}>
            <option value="false">Disponível</option>
            <option value="true">Reaplicado</option>
          </select>
        </div>
        <ButtonPrimary onClick={onSave} disabled={saving} style={{ width: "100%", marginTop: 4 }}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </ButtonPrimary>
      </div>
    </Modal>
  );
}
