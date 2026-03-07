// =============================================================================
// COMPONENTS — UI
// Componentes visuais reutilizáveis sem lógica de negócio.
// =============================================================================

import { useState } from "react";

// --- Estilos compartilhados ---

export const inputStyle = {
  width: "100%",
  background: "#0D0D0D",
  border: "1px solid #2A2000",
  borderRadius: 8,
  padding: "10px 14px",
  color: "#E8C97A",
  fontSize: 14,
  fontFamily: "Georgia, serif",
  outline: "none",
  boxSizing: "border-box",
};

export const labelStyle = {
  display: "block",
  fontSize: 11,
  color: "#7A6A40",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: 1,
};

// --- Badge colorido ---

/**
 * Exibe um texto estilizado como badge/etiqueta.
 */
export const Badge = ({
  text,
  color = "#C9A84C",
  bg = "#1E1800",
  border = "#3A3000",
}) => (
  <span
    style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 20,
      padding: "3px 10px",
      fontSize: 11,
      color,
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </span>
);

// --- Loading screen ---

export const LoadingScreen = () => (
  <div
    style={{
      background: "#0D0D0D",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      fontFamily: "Georgia, serif",
    }}
  >
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: "linear-gradient(135deg,#C9A84C,#7A5C20)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span style={{ fontSize: 18 }}>📈</span>
    </div>
    <div style={{ color: "#C9A84C", fontSize: 15 }}>Conectando ao banco de dados...</div>
  </div>
);

// --- Error screen ---

export const ErrorScreen = ({ message, onRetry }) => (
  <div
    style={{
      background: "#0D0D0D",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      fontFamily: "Georgia, serif",
    }}
  >
    <div style={{ color: "#C04040", fontSize: 15 }}>Erro: {message}</div>
    <button
      onClick={onRetry}
      style={{
        background: "#1A1200",
        border: "1px solid #C9A84C",
        borderRadius: 8,
        padding: "10px 20px",
        color: "#C9A84C",
        cursor: "pointer",
        fontFamily: "Georgia, serif",
      }}
    >
      Tentar novamente
    </button>
  </div>
);

// --- Seletor de corretora com opção de adicionar nova ---

export const CorretoraSelect = ({ value, onChange, corretoras, onAddCorretora }) => {
  const [adding, setAdding] = useState(false);
  const [nova, setNova] = useState("");

  const confirmar = () => {
    const nome = nova.trim();
    if (nome) {
      onAddCorretora(nome);
      onChange(nome);
    }
    setNova("");
    setAdding(false);
  };

  if (adding) {
    return (
      <div style={{ display: "flex", gap: 8 }}>
        <input
          autoFocus
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirmar();
            if (e.key === "Escape") setAdding(false);
          }}
          placeholder="Nome da corretora..."
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          onClick={confirmar}
          style={{
            background: "#1A2A1A",
            border: "1px solid #2A4A2A",
            borderRadius: 8,
            padding: "0 14px",
            color: "#6BBF6B",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          ✓
        </button>
        <button
          onClick={() => setAdding(false)}
          style={{
            background: "none",
            border: "1px solid #2A2000",
            borderRadius: 8,
            padding: "0 10px",
            color: "#5A4A20",
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, flex: 1 }}
      >
        <option value="">— Selecionar —</option>
        {corretoras.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <button
        onClick={() => setAdding(true)}
        title="Adicionar corretora"
        style={{
          background: "#1A1200",
          border: "1px solid #3A2800",
          borderRadius: 8,
          padding: "0 12px",
          color: "#C9A84C",
          cursor: "pointer",
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        +
      </button>
    </div>
  );
};

// --- Modal base (overlay + card centralizado) ---

export const Modal = ({ onClose, title, children, maxWidth = 480 }) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.85)",
      zIndex: 100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}
  >
    <div
      style={{
        background: "#141000",
        border: "1px solid #3A3000",
        borderRadius: 16,
        padding: 28,
        width: "100%",
        maxWidth,
        position: "relative",
        maxHeight: "90vh",
        overflowY: "auto",
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#5A4A20",
          fontSize: 18,
          lineHeight: 1,
        }}
      >
        ✕
      </button>

      {title && (
        <div
          style={{
            fontSize: 17,
            color: "#E8C97A",
            marginBottom: 22,
            fontWeight: "bold",
          }}
        >
          {title}
        </div>
      )}

      {children}
    </div>
  </div>
);

// --- Botão primário (dourado) ---

export const ButtonPrimary = ({ onClick, disabled, children, style = {} }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: "linear-gradient(135deg,#C9A84C,#A07830)",
      border: "none",
      borderRadius: 8,
      padding: "12px 20px",
      color: "#0D0D0D",
      fontWeight: "bold",
      cursor: "pointer",
      fontSize: 14,
      fontFamily: "Georgia, serif",
      opacity: disabled ? 0.6 : 1,
      ...style,
    }}
  >
    {children}
  </button>
);

// --- Botão secundário (transparente com borda) ---

export const ButtonSecondary = ({ onClick, children, style = {} }) => (
  <button
    onClick={onClick}
    style={{
      background: "#1A1200",
      border: "1px solid #3A2800",
      borderRadius: 8,
      padding: "9px 14px",
      color: "#C9A84C",
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "Georgia, serif",
      display: "flex",
      alignItems: "center",
      gap: 6,
      ...style,
    }}
  >
    {children}
  </button>
);
