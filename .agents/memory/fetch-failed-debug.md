# Debug: fetch failed — API Gemini (Clara AI)
> Salvo em: 2026-07-23 — Retomar amanhã

## Problema
`[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent: fetch failed`

Acontece sempre que o chat da Clara tenta chamar a API Gemini em produção.

---

## Infraestrutura do Servidor (Cloudez)

| Item | Valor |
|------|-------|
| Host SSH | `emptum@ip-45-56-79-242.cloudezapp.io` |
| Diretório da app | `/srv/demo-copiloto-compras.2d384ff2.configr.cloud/www/` |
| Arquivo principal | `app.cjs` (configurado no painel Cloudez → Aba Aplicação) |
| Deploy | Upload de `app.cjs` via SCP/FileZilla para `www/` → clicar **Confirmar** no painel |
| Runtime gerenciado | Cloudez copia `app.cjs` → `dist/app.js` e roda como usuário `eapi1` |
| **NUNCA mexer** | Pasta `dist/` — gerenciada por root, o Cloudez popula automaticamente |
| Node.js | Mudado para **20.12.0** no painel (era 18.11.0) |
| URL produção | https://emptum.mulinotech.com |

---

## O que já foi descartado
- ✅ **Rede/Firewall**: `curl -4` retorna HTTP 404 em 0.003s → servidor alcança googleapis.com normalmente
- ✅ **API Key**: chave presente e válida no `.env`
- ✅ **Código novo em produção**: intent mudou de `erro_de_ti` → `erro_servidor` (novo formato de erro ativo)

---

## Correções já aplicadas (no código)

### `server.ts`
- `import dns from "dns"` + `dns.setDefaultResultOrder('ipv4first')` adicionado logo após `dotenv.config()`

### `geminiService.cjs`
- `dns.setDefaultResultOrder('ipv4first')` no topo
- Patch `setGlobalDispatcher` do undici com `family: 4` (tenta forçar IPv4 no fetch do Node.js)

### `package.json`
- `start`: `NODE_OPTIONS=--dns-result-order=ipv4first node app.cjs`
- `build`: gera `app.cjs` (CJS) e `app.js` (ESM) via esbuild

---

## Próximos passos para amanhã

### 1. Verificar se o patch do undici carregou nos logs
```bash
journalctl -u nodejs --since "today" | tail -50
# ou
journalctl -u nodejs -n 100 --no-pager
```
Procurar por: `[DNS] ✅ undici dispatcher configurado para IPv4 exclusivo`
- Se aparecer → patch carregou mas não resolveu → ir para passo 3
- Se NÃO aparecer → undici não disponível no bundle → ir para passo 2

### 2. Se undici não disponível: testar com fetch customizado via https nativo
Substituir o trecho do undici em `geminiService.cjs` por:
```javascript
// Sobrescreve o fetch global com implementação via https nativo (sem undici)
const https = require('https');
const http = require('http');

global.fetch = function customFetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const lib = urlObj.protocol === 'https:' ? https : http;
        const reqOptions = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {},
            family: 4, // Força IPv4
        };
        const req = lib.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    json: () => Promise.resolve(JSON.parse(data)),
                    text: () => Promise.resolve(data),
                });
            });
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
};
```

### 3. Se nada funcionar: trocar SDK
- Mudar de `@google/generative-ai` para `@google/genai` (já instalado no projeto)
- `@google/genai` usa fetch diferente e pode ter melhor compatibilidade

### 4. Verificar se o processo foi reiniciado após o Confirmar
```bash
ps aux | grep node | grep -v grep
# PID diferente de 1556 = reiniciou com código novo
```

---

## Fluxo de deploy (correto)
1. Editar código localmente
2. `npm run build` (gera `app.cjs` e `app.js`)
3. `scp app.cjs emptum@ip-45-56-79-242.cloudezapp.io:/srv/demo-copiloto-compras.2d384ff2.configr.cloud/www/app.cjs`
4. Painel Cloudez → Aba **Aplicação** → clicar **Confirmar ✓**
5. Reiniciar o servidor pelo painel
