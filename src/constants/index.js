// =============================================================================
// CONSTANTS
// Centraliza todas as constantes da aplicação.
// Qualquer valor fixo que apareça em mais de um lugar deve vir daqui.
// =============================================================================

// --- Supabase ---
export const SUPABASE_URL = "https://fvsojxozbvyznlzseboz.supabase.co";
export const SUPABASE_KEY = "sb_publishable_8g5sy2fm1lWJNn3_VuEjOg_blrmAkVJ";

// --- Sessão ---
// Tempo de inatividade em ms antes de deslogar automaticamente (30 minutos)
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// --- Dados do domínio ---
export const CATEGORIAS_ATIVO = [
  "Ações",
  "FIIs",
  "Renda Fixa",
  "Tesouro Direto",
  "Criptomoedas",
  "ETFs",
  "Fundos",
  "Outros",
];

export const CATEGORIAS_PROVENTO = [
  "Dividendos",
  "JCP",
  "Rendimento",
  "Aluguel",
  "Cupom",
  "Outros",
];

export const MOEDAS = ["BRL", "USD"];

export const CORRETORAS_DEFAULT = [
  "Banco Inter",
  "Inter Global",
  "XP Investimentos",
  "Rico",
  "Clear",
  "Nu Invest",
  "BTG Pactual",
  "Toro",
  "Avenue",
];

// --- Paleta de cores (gráficos e badges) ---
export const CHART_COLORS = [
  "#C9A84C",
  "#E8C97A",
  "#A07830",
  "#F0DFA0",
  "#7A5C20",
  "#D4B060",
  "#8B6914",
  "#FFE8A0",
];

// --- Valores padrão para formulários ---
const today = () => new Date().toISOString().split("T")[0];

export const DEFAULT_APLICACAO = {
  nome: "",
  categoria: "Renda Fixa",
  moeda: "BRL",
  valor: "",
  data: today(),
  rentabilidade: "",
  notas: "",
  corretora: "",
  origemProventoIds: [],
};

export const DEFAULT_PROVENTO = {
  ativo: "",
  tipo: "Dividendos",
  moeda: "BRL",
  valor: "",
  data: today(),
  corretora: "",
};
