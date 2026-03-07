// =============================================================================
// API — Supabase Client
// Camada de acesso a dados. Todas as chamadas ao Supabase passam por aqui.
// O token de autenticação é injetado via setAuthToken() após o login.
// =============================================================================

import { SUPABASE_URL, SUPABASE_KEY } from "../constants";

// Token atual do usuário autenticado.
// Atualizado pelo hook useAuth após login/logout.
let currentToken = null;

/** Define o token de autenticação para as requisições subsequentes */
export const setAuthToken = (token) => {
  currentToken = token;
};

/** Retorna os headers padrão para requisições autenticadas */
const getHeaders = () => ({
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${currentToken || SUPABASE_KEY}`,
});

// --- Operações genéricas REST ---

/**
 * Busca registros de uma tabela com query string opcional.
 * @param {string} table - Nome da tabela
 * @param {string} queryString - Filtros e ordenação (ex: "order=created_at.desc")
 * @returns {Promise<Array>} Lista de registros
 */
export const dbGet = (table, queryString = "") =>
  fetch(`${SUPABASE_URL}/rest/v1/${table}?${queryString}`, {
    headers: { ...getHeaders(), "Prefer": "return=representation" },
  }).then((r) => r.json());

/**
 * Insere um novo registro em uma tabela.
 * @param {string} table - Nome da tabela
 * @param {Object} body - Dados a inserir
 * @returns {Promise<Array>} Registro criado
 */
export const dbPost = (table, body) =>
  fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...getHeaders(), "Prefer": "return=representation" },
    body: JSON.stringify(body),
  }).then((r) => r.json());

/**
 * Atualiza um registro pelo ID.
 * @param {string} table - Nome da tabela
 * @param {number|string} id - ID do registro
 * @param {Object} body - Campos a atualizar
 * @returns {Promise<Array>} Registro atualizado
 */
export const dbPatch = (table, id, body) =>
  fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...getHeaders(), "Prefer": "return=representation" },
    body: JSON.stringify(body),
  }).then((r) => r.json());

/**
 * Remove um registro pelo ID.
 * @param {string} table - Nome da tabela
 * @param {number|string} id - ID do registro
 * @returns {Promise<Response>}
 */
export const dbDelete = (table, id) =>
  fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

// --- Operações de autenticação ---

/**
 * Login com e-mail e senha.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} { access_token, user } ou { error }
 */
export const authSignIn = (email, password) =>
  fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
    body: JSON.stringify({ email, password }),
  }).then((r) => r.json());

/**
 * Cadastro com e-mail e senha.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>}
 */
export const authSignUp = (email, password) =>
  fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
    body: JSON.stringify({ email, password }),
  }).then((r) => r.json());

/**
 * Envia e-mail de recuperação de senha.
 * @param {string} email
 */
export const authRecover = (email) =>
  fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
    body: JSON.stringify({ email }),
  }).then((r) => r.json());

/**
 * Atualiza a senha do usuário autenticado (usado no fluxo de reset).
 * @param {string} token - Token de recuperação da URL
 * @param {string} newPassword
 */
export const authUpdatePassword = (token, newPassword) =>
  fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ password: newPassword }),
  }).then((r) => r.json());

/**
 * Busca os dados do usuário a partir de um token.
 * @param {string} token
 */
export const authGetUser = (token) =>
  fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` },
  }).then((r) => r.json());

/**
 * Remove a conta do usuário autenticado.
 * Usado para limpar contas Google sem convite válido.
 * @param {string} token
 */
export const authDeleteUser = (token) =>
  fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "DELETE",
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` },
  });

/** Retorna a URL de redirecionamento para login com Google OAuth */
export const getGoogleAuthUrl = () =>
  `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${window.location.origin}`;

// --- Operações específicas do domínio ---

/**
 * Verifica se um código de convite é válido e está disponível.
 * Esta consulta usa a chave pública (sem autenticação) intencionalmente,
 * pois ocorre antes do login.
 * @param {string} codigo - Código do convite (será normalizado para maiúsculas)
 * @returns {Promise<Object|null>} Convite encontrado ou null
 */
export const checkConvite = async (codigo) => {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/convites?codigo=eq.${codigo.trim().toUpperCase()}&usado=eq.false&select=id,codigo`,
    { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
  ).then((r) => r.json());
  return res[0] || null;
};

/**
 * Marca um convite como utilizado após cadastro bem-sucedido.
 * @param {string} id - ID do convite
 * @param {string} token - Token do usuário recém-cadastrado
 */
export const marcarConviteUsado = (id, token) =>
  fetch(`${SUPABASE_URL}/rest/v1/convites?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${token || SUPABASE_KEY}`,
    },
    body: JSON.stringify({ usado: true }),
  });

/**
 * Verifica se o usuário já possui dados cadastrados.
 * Usado para distinguir usuários novos de existentes no fluxo Google OAuth.
 * @param {string} userId
 * @param {string} token
 * @returns {Promise<boolean>}
 */
export const userHasData = async (userId, token) => {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/aplicacoes?user_id=eq.${userId}&select=id&limit=1`,
    { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` } }
  ).then((r) => r.json());
  return Array.isArray(res) && res.length > 0;
};
