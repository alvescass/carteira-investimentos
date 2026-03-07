# Changelog

Todas as mudanças relevantes do projeto serão documentadas aqui.  
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [2.0.0] — 2026-03-07

### Refatoração completa da arquitetura

Esta versão não adiciona funcionalidades visíveis ao usuário, mas reescreve toda
a base de código seguindo boas práticas de engenharia de software. O objetivo é
facilitar manutenção, leitura e evolução futura por qualquer desenvolvedor.

#### Estrutura anterior (v1)
```
src/
  App.jsx      ← 660+ linhas: API, estado, cálculos, UI e modais misturados
  Auth.jsx     ← autenticação
  main.jsx     ← entry point + lógica de OAuth embutida
```

#### Nova estrutura (v2)
```
src/
  api/
    supabase.js          ← todas as chamadas ao Supabase centralizadas
  components/
    Auth.jsx             ← tela de autenticação
    Dashboard.jsx        ← gráficos e cards de resumo
    AplicacoesList.jsx   ← listagem de aplicações (cards responsivos)
    ProventosList.jsx    ← listagem de proventos (cards responsivos)
    Modais.jsx           ← formulários de criação e edição
    ConvitesModal.jsx    ← gestão de convites
    UI.jsx               ← componentes reutilizáveis (Badge, Modal, Buttons...)
  constants/
    index.js             ← constantes centralizadas (URLs, categorias, cores, defaults)
  hooks/
    useAuth.js           ← sessão, timeout de inatividade, OAuth, reset de senha
    useCarteira.js       ← estado e operações da carteira (aplicações, proventos, configs)
  utils/
    financeiro.js        ← funções puras de cálculo e formatação financeira
  App.jsx                ← orquestração apenas, sem lógica de negócio
  main.jsx               ← entry point limpo
```

### Adicionado
- **Timeout de sessão**: logout automático após 30 minutos de inatividade
- **Validação de sessão ao iniciar**: token é verificado no servidor antes de restaurar a sessão salva
- **Comentários detalhados** em todos os arquivos explicando responsabilidades, parâmetros e decisões arquiteturais
- **Componentes reutilizáveis** em `UI.jsx`: `Badge`, `Modal`, `ButtonPrimary`, `ButtonSecondary`, `LoadingScreen`, `ErrorScreen`, `CorretoraSelect`
- **Funções financeiras documentadas** em `utils/financeiro.js` com JSDoc

### Alterado
- Lógica de OAuth movida do `main.jsx` para o hook `useAuth.js`
- Cálculos de patrimônio e proventos extraídos para `utils/financeiro.js`
- Constantes (`COLORS`, `CATEGORIAS_*`, `CORRETORAS_DEFAULT` etc.) centralizadas em `constants/index.js`
- Token de autenticação injetado via `setAuthToken()` em vez de variável global solta
- Nomes de variáveis renomeados para maior clareza (`formA` → `formA` com campo explícito, `H` → `getHeaders()` etc.)

### Corrigido
- Sessões salvas com token expirado agora são detectadas e limpas ao reabrir o app

---

## [1.4.0] — 2026-03-07

### Responsividade mobile

#### Adicionado
- Cards do dashboard com grid responsivo (`auto-fit`) — não saem mais da tela em mobile
- Listagens de aplicações e proventos convertidas de tabelas para cartões empilhados
- Padding e espaçamentos ajustados para telas pequenas

#### Removido
- Tabelas HTML com scroll horizontal nas abas de aplicações e proventos

---

## [1.3.0] — 2026-03-07

### E-mails personalizados

#### Adicionado
- Templates HTML customizados para todos os e-mails do Supabase:
  - `confirm-signup` — confirmação de cadastro
  - `reset-password` — redefinição de senha
  - `magic-link` — acesso por link
  - `change-email` — alteração de e-mail
  - `invite-user` — convite para novo usuário
- Estética dark/gold consistente com o app
- Tom amigável e descontraído em todos os textos

#### Alterado
- SMTP configurado com conta iCloud+ e domínio personalizado (substitui limite de 2 e-mails/hora do Supabase)

---

## [1.2.0] — 2026-03-07

### Sistema de convites e isolamento por usuário

#### Adicionado
- Tabela `convites` no banco com códigos únicos de uso único
- Cadastro por e-mail/senha exige código de convite válido
- Cadastro via Google OAuth intercepta novos usuários e exige convite antes de liberar acesso
- Contas Google sem convite válido são removidas automaticamente
- Painel de convites no header: gerar, visualizar status e copiar código
- Coluna `user_id` adicionada em `aplicacoes`, `proventos` e `configuracoes`
- Políticas RLS atualizadas para isolamento completo por usuário (`auth.uid() = user_id`)
- Política de leitura pública na tabela `convites` (necessária para validação pré-login)

#### Corrigido
- Tela de redefinição de senha agora detecta o token `type=recovery` na URL corretamente

---

## [1.1.0] — 2026-03-06

### Autenticação e deploy

#### Adicionado
- Login com e-mail e senha via Supabase Auth
- Login com Google OAuth
- Tela de recuperação de senha ("Esqueci a senha")
- Tela de redefinição de senha via link por e-mail
- Sessão persistida em `localStorage`
- Deploy contínuo via GitHub + Cloudflare Pages (build automático a cada push)

#### Alterado
- Deploy migrado de Direct Upload para integração Git no Cloudflare Pages

---

## [1.0.0] — 2026-03-06

### Lançamento inicial

#### Adicionado
- Registro de **aplicações** com: nome, categoria, moeda (BRL/USD), valor, data, rentabilidade, notas, corretora e vínculo com proventos
- Registro de **proventos** com: ativo, tipo, moeda, valor, data, corretora e status (disponível/reaplicado)
- Lógica de **reaplicação**: vincular proventos a uma aplicação evita dupla contagem no patrimônio
- Dashboard com cards de resumo (patrimônio, proventos totais, proventos disponíveis)
- Gráfico de pizza por categoria de ativo
- Gráfico de área de proventos por mês
- Ranking das maiores posições
- Cotação USD/BRL editável e persistida no banco
- Gerenciamento de corretoras (lista dinâmica, salva por usuário)
- Edição e exclusão de aplicações e proventos
- Estética dark com paleta dourada (dark gold)
- Banco de dados PostgreSQL via Supabase com políticas RLS
- Suporte a múltiplas moedas com conversão automática
