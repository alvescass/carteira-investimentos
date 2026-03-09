// =============================================================================
// UTILS
// Funções puras de formatação e cálculo financeiro.
// Não dependem de estado React nem de chamadas externas.
// =============================================================================

// --- Formatação de moeda ---

/** Formata um valor como moeda brasileira (R$) */
export const fmtBRL = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

/** Formata um valor como dólar americano (US$) */
export const fmtUSD = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);

/** Formata um valor na moeda especificada */
export const fmt = (value, moeda) =>
  moeda === "USD" ? fmtUSD(value) : fmtBRL(value);

// --- Formatação de data ---

/**
 * Converte data no formato ISO (YYYY-MM-DD) para o formato brasileiro (DD/MM/YYYY).
 * Retorna string vazia se a data for inválida.
 */
export const fmtDate = (isoDate) => {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
};

// --- Cálculos financeiros ---

/**
 * Converte um valor para BRL usando a cotação fornecida.
 * Valores já em BRL são retornados sem conversão.
 *
 * @param {number} value - Valor na moeda original
 * @param {string} moeda - "BRL" ou "USD"
 * @param {number} cotacaoUSD - Cotação atual do dólar em reais
 * @returns {number} Valor em BRL
 */
export const toBRL = (value, moeda, cotacaoUSD) => {
  if (moeda === "USD") return value * cotacaoUSD;
  return value;
};

/**
 * Calcula o total do patrimônio aplicado em BRL.
 * Exclui aplicações que são simplesmente reaplicações de proventos
 * para evitar dupla contagem.
 *
 * @param {Array} aplicacoes - Lista de aplicações
 * @param {number} cotacaoUSD - Cotação do dólar
 * @returns {number} Total em BRL
 */
export const calcPatrimonioBRL = (aplicacoes, cotacaoUSD) => 
  aplicacoes.reduce((total, a) => 
    total + toBRL(Number(a.valor), a.moeda, cotacaoUSD), 0
  );

/**
 * Calcula o total de proventos recebidos em BRL.
 *
 * @param {Array} proventos - Lista de proventos
 * @param {number} cotacaoUSD - Cotação do dólar
 * @returns {number} Total em BRL
 */
export const calcTotalProventosBRL = (proventos, cotacaoUSD) =>
  proventos.reduce((total, p) => total + toBRL(Number(p.valor), p.moeda, cotacaoUSD), 0);

/**
 * Calcula o total de proventos disponíveis (não reaplicados) em BRL.
 *
 * @param {Array} proventos - Lista de proventos
 * @param {number} cotacaoUSD - Cotação do dólar
 * @returns {number} Total disponível em BRL
 */
export const calcProventosDisponiveisBRL = (proventos, cotacaoUSD) =>
  proventos
    .filter((p) => !p.reaplicado)
    .reduce((total, p) => total + toBRL(Number(p.valor), p.moeda, cotacaoUSD), 0);

/**
 * Agrupa aplicações por categoria, retornando dados prontos para gráfico de pizza.
 *
 * @param {Array} aplicacoes - Lista de aplicações
 * @param {number} cotacaoUSD - Cotação do dólar
 * @returns {Array} Array de { name, value } ordenado por valor decrescente
 */
export const calcByCategoria = (aplicacoes, cotacaoUSD) => {
  const grupos = aplicacoes.reduce((acc, a) => {
    const key = a.categoria || "Outros";
    const valor = toBRL(Number(a.valor), a.moeda, cotacaoUSD);
    acc[key] = (acc[key] || 0) + valor;
    return acc;
  }, {});

  return Object.entries(grupos)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

/**
 * Agrupa proventos por mês para o gráfico de área temporal.
 *
 * @param {Array} proventos - Lista de proventos
 * @param {number} cotacaoUSD - Cotação do dólar
 * @returns {Array} Array de { mes, total } ordenado cronologicamente
 */
export const calcProventosPorMes = (proventos, cotacaoUSD) => {
  const grupos = proventos.reduce((acc, p) => {
    if (!p.data) return acc;
    const [year, month] = p.data.split("-");
    const key = `${year}-${month}`;
    const label = new Date(`${year}-${month}-01`).toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    });
    if (!acc[key]) acc[key] = { mes: label, total: 0, ordem: key };
    acc[key].total += toBRL(Number(p.valor), p.moeda, cotacaoUSD);
    return acc;
  }, {});

  return Object.values(grupos).sort((a, b) => a.ordem.localeCompare(b.ordem));
};
