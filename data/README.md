# Dashboard de Performance · Vila Campana

Painel de acompanhamento das campanhas de mídia (Google + Facebook), conectado direto à sua planilha do Google Sheets. Tema escuro por padrão, com botão para tema claro.

Você pode publicar de **duas formas** — escolha uma:
- **Render** (Node) — simples; "dorme" após 15 min de inatividade no plano free.
- **Netlify** (função serverless) — não dorme no plano free; recomendado para acesso frequente.

---

## 🚀 Opção A — Render (gratuito)

### Parte 1 — Subir o código no GitHub
1. Crie uma conta gratuita em https://github.com
2. Crie um repositório novo (pode ser **público** — as credenciais ficam protegidas no servidor, nunca no código)
3. Suba os arquivos desta pasta (o arrastar-e-soltar do GitHub funciona)

### Parte 2 — Conectar no Render
1. https://render.com → **Get Started** (entre com o GitHub)
2. **New +** → **Web Service** → escolha o repositório
3. Configurações: **Build Command** vazio · **Start Command** `node server.js` · **Plan** Free · **Region** Oregon

### Parte 3 — Variáveis de ambiente (ESSENCIAL)
Menu lateral → **Environment** → **Add Environment Variable**:

| Key | Value |
|---|---|
| `GOOGLE_SHEETS_API_KEY` | sua chave `AIzaSy...` (marque **secret**) |
| `GOOGLE_SHEETS_ID` | `16Q-f9sshSg-fE48baZqrjiEB3rn8NQlF-F7IEKOeCxM` |
| `GOOGLE_SHEETS_NAME` | `Diário Performance` |
| `GOOGLE_SHEETS_RANGE` | `A1:Z200` |

### Parte 4 — Deploy
Salve → deploy automático → aguarde **"Live"** (~2 min) → acesse a URL.
> Mudou alguma variável? **Manual Deploy → Trigger deploy** para o Render reler.

> 💤 O Render Free dorme após ~15 min. Para evitar o atraso de ~30s no primeiro acesso, use o **UptimeRobot** (gratuito) pingando `https://seu-app.onrender.com/health` a cada 5 min.

---

## 🚀 Opção B — Netlify (não dorme)

1. Suba o código num repositório **público** no GitHub (mesmo da Opção A).
2. https://app.netlify.com → **Add new site** → **Import an existing project** → escolha o repo.
3. **Build command** vazio · **Publish directory** `.` → **Deploy**.
4. **Site configuration → Environment variables** → crie as 4 variáveis (mesmas da tabela acima); marque a chave como **secret**.
5. ⚠️ **Deploys → Trigger deploy → Clear cache and deploy site** (as variáveis só valem após um novo deploy!).

> No Netlify, o `server.js` não é usado — a função em `netlify/functions/sheets-proxy.js` é detectada automaticamente (configurada em `netlify.toml`).

---

## ✅ Como testar se conectou
Abra o painel → **F12** → **Console** → digite `debugSheets()`.
Deve aparecer `Fonte: live | 30 linhas via proxy`.

**Diagnóstico rápido:** abra `https://seu-app/api/sheets` direto no navegador. O JSON traz `error`/`detail`/`hint` apontando o problema:
- **403** → planilha não pública **ou** API Key com restrição de site/referrer (deixe a restrição de aplicativo como **None**)
- **404** → ID errado (cole sem `/edit` e sem espaços)
- **400** → `GOOGLE_SHEETS_NAME` está com o nome do arquivo (deve ser o nome da **aba**, no rodapé)

---

## 🔓 A planilha precisa estar pública para leitura
Compartilhar → **Acesso geral: Qualquer pessoa com o link** → **Leitor**. (Sem isso = erro 403.)

> Range largo? Se a planilha tiver muitas colunas, troque `A1:Z200` por `A1:AZ200`.

---

## 🆕 O que esta versão (v3) traz
- **KPIs que respondem ao filtro** de período: ao escolher 7/14 dias, o valor passa a ser só daquela janela e a meta é ajustada proporcionalmente.
- **Aba "Por período"**: blocos por plataforma (Google × Facebook) nas janelas Mensal / 15 dias / 7 dias.
- **CSV com `;`** e BOM UTF-8 (o Excel BR não joga tudo numa coluna só, acentos preservados).
- **Favicon** com a logo (em `assets/favicon.png`) — troque pela arte oficial quando tiver.
- Cabeçalho minimalista e deploy duplo (Render + Netlify).

## ⚙️ Ajustes rápidos
- **Metas / orçamento**: bloco `meta` em `data/dataset.js`. Os *realizados* (gasto e leads) são calculados ao vivo das linhas diárias da planilha.
- **Cores / tema**: `css/variables.css`.
- **Logo/favicon**: a logo da agência (`assets/logo-acesso.png`) já vem recolorida em branco para o cabeçalho azul. Para trocar o ícone da aba, substitua `assets/favicon.png`.

## 📁 Estrutura
```
server.js                       servidor Node + proxy (Opção Render)
netlify.toml + netlify/...      função serverless (Opção Netlify)
index.html                      página do dashboard
assets/favicon.png              ícone da aba
css/                            tokens, base, header, componentes, gráficos
js/                             config, sheets, utils, theme, kpis, charts, table, period, report, main
data/dataset.js                 dados de exemplo (fallback) + metas
```
