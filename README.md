# Carteira de Investimentos

App de registro financeiro com integração ao Supabase.

## Como rodar

### Pré-requisitos
- Node.js 18+ instalado (https://nodejs.org)

### Passos

1. Extraia a pasta e abra o terminal dentro dela

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor local:
```bash
npm run dev
```

4. Acesse no navegador:
```
http://localhost:5173
```

## Observações
- Os dados são salvos no Supabase (nuvem)
- Funciona em qualquer navegador moderno
- Para acessar de outro dispositivo na mesma rede, use o IP local exibido no terminal

## Hospedar online (opcional)
Para acessar de qualquer lugar:
```bash
npm run build
```
Faça o deploy da pasta `dist/` no Vercel, Netlify ou GitHub Pages.
