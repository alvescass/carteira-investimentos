# Changelog

Todas as mudanças relevantes do projeto serão documentadas aqui.  
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [2.2.0] — 2026-03-09

### Favicon, consistência de dados e correção de patrimônio

#### Adicionado
- **Favicon dark gold** (`favicon.svg`) — ícone com gráfico de linha dourado sobre fundo escuro, consistente com a identidade visual do app

#### Corrigido
- **Reversão de reaplicado ao excluir aplicação** (`useCarteira.js`)
  - Ao excluir uma aplicação, os proventos vinculados a ela voltam automaticamente para o status "Disponível"
  - Antes, os proventos ficavam presos como "Reaplicado" indefinidamente após a exclusão da aplicação de origem
- **Verificação de consistência no carregamento** (`useCarteira.js`)
  - Ao iniciar o app, `checkConsistenciaProventos` verifica se há proventos marcados como reaplicados sem nenhuma aplicação vinculada
  - Caso encontre inconsistências, corrige automaticamente no banco e no estado local
- **Cálculo do patrimônio aplicado** (`financeiro.js` + `Dashboard.jsx`)
  - Removida a lógica que excluía aplicações originadas de proventos reaplicados do patrimônio
  - Agora todas as aplicações contam no patrimônio — o dinheiro foi reinvestido e é patrimônio de fato
  - `calcPatrimonioBRL` simplificada: não recebe mais `proventos` como parâmetro
  - `Dashboard.jsx` atualizado para refletir a nova assinatura da função

---

## [2.1.0] — 2026-03-08

### Painel Administrativo

#### Adicionado
- **Cloudflare Worker** como API intermediária segura entre o painel admin e o Supabase
  - Service Role Key protegida no servidor, nunca exposta no frontend
  - Validação de token JWT em todas as requisições
  - Proteção contra acesso não autorizado (apenas o admin pode chamar as rotas)
  - CORS configurado para aceitar apenas o domínio do app
- **Painel admin** acessível em `/admin` com login próprio restrito ao administrador
- **Aba Estatísticas** — visão geral do sistema: total de usuários, aplicações, proventos e convites
- **Aba Usuários** — lista todos os usuários com data de cadastro, último acesso, provider (e-mail/Google), quantidade de aplicações e proventos; ações de banir, reativar e remover
- **Aba Logs** — histórico de últimos acessos por usuário com provider e timestamp
- **Aba Convites** — visão completa de todos os convites gerados no sistema com status
- **Aba Listas** — edição da lista global de corretoras (adicionar e remover)
- Roteamento simples em `main.jsx`: `/admin` carrega o painel, qualquer outra rota carrega o app normal
- Modal de confirmação para ações destrutivas (banir/remover usuário)

#### Rotas do Worker
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/admin/users` | Lista todos os usuários enriquecidos |
| POST | `/api/admin/users/:id/ban` | Bane um usuário |
| POST | `/api/admin/users/:id/unban` | Reativa um usuário banido |
| POST | `/api/admin/users/:id/delete` | Remove usuário e todos os seus dados |
| GET | `/api/admin/stats` | Estatísticas consolidadas |
| GET | `/api/admin/logs` | Logs de acesso |
| GET | `/api/admin/convites` | Todos os convites do sistema |
| GET | `/api/admin/listas` | Listas globais editáveis |
| PUT | `/api/admin/listas` | Atualiza listas globais |

---

## [2.0.0] — 2026-03-07

### Refatoração completa da arquitetura

#### Estrutura anterior (v1)
```
src/
  App.jsx      <- 660+ linhas: API, estado, calculos, UI e modais misturados
  Auth.jsx     <- autenticacao
  main.jsx     <- entry point + logica de OAuth embutida
```

#### Nova estrutura (v2)
```
src/
  api/
    supabase.js          <- todas as chamadas ao Supabase centralizadas
  components/
    Auth.jsx             <- tela de autenticacao
    Dashboard.jsx        <- graficos e cards de resumo
    AplicacoesList.jsx   <- listagem de aplicacoes (cards responsivos)
    ProventosList.jsx    <- listagem de proventos (cards responsivos)
    Modais.jsx           <- formularios de criacao e edicao
    ConvitesModal.jsx    <- gestao de convites
    UI.jsx               <- componentes reutilizaveis
  constants/
    index.js             <- constantes centralizadas
  hooks/
    useAuth.js           <- sessao, timeout de inatividade, OAuth, reset de senha
    useCarteira.js       <- estado e operacoes da carteira
  utils/
    financeiro.js        <- funcoes puras de calculo e formatacao financeira
  admin/
    AdminPanel.jsx       <- painel administrativo
  App.jsx                <- orquestracao apenas, sem logica de negocio
  main.jsx               <- entry point com roteamento /admin
```

#### Adicionado
- Timeout de sessao: logout automatico apos 30 minutos de inatividade
- Validacao de sessao ao iniciar: token verificado no servidor antes de restaurar sessao salva
- Comentarios detalhados em todos os arquivos
- Componentes reutilizaveis em `UI.jsx`
- Funcoes financeiras documentadas em `utils/financeiro.js` com JSDoc

#### Alterado
- Logica de OAuth movida do `main.jsx` para o hook `useAuth.js`
- Calculos de patrimonio e proventos extraidos para `utils/financeiro.js`
- Constantes centralizadas em `constants/index.js`
- Token de autenticacao injetado via `setAuthToken()`

#### Corrigido
- Sessoes salvas com token expirado agora sao detectadas e limpas ao reabrir o app

---

## [1.4.0] — 2026-03-07

### Responsividade mobile

#### Adicionado
- Cards do dashboard com grid responsivo
- Listagens convertidas de tabelas para cartoes empilhados
- Padding e espacamentos ajustados para telas pequenas

#### Removido
- Tabelas HTML com scroll horizontal

---

## [1.3.0] — 2026-03-07

### E-mails personalizados

#### Adicionado
- Templates HTML customizados para todos os e-mails do Supabase
- Estetica dark/gold consistente com o app
- SMTP configurado com iCloud+ e dominio personalizado

---

## [1.2.0] — 2026-03-07

### Sistema de convites e isolamento por usuario

#### Adicionado
- Tabela `convites` com codigos unicos de uso unico
- Cadastro por e-mail/senha exige codigo de convite valido
- Google OAuth intercepta novos usuarios e exige convite
- Contas Google sem convite valido sao removidas automaticamente
- Politicas RLS com isolamento completo por usuario

---

## [1.1.0] — 2026-03-06

### Autenticacao e deploy

#### Adicionado
- Login com e-mail/senha e Google OAuth
- Recuperacao e redefinicao de senha
- Sessao persistida em localStorage
- Deploy continuo via GitHub e Cloudflare Pages

---

## [1.0.0] — 2026-03-06

### Lancamento inicial

#### Adicionado
- Registro de aplicacoes e proventos
- Logica de reaplicacao sem dupla contagem
- Dashboard com cards, graficos e ranking
- Cotacao USD/BRL editavel e persistida
- Gerenciamento de corretoras por usuario
- Estetica dark gold
- Banco PostgreSQL via Supabase com RLS
- Suporte a multiplas moedas com conversao automatica
