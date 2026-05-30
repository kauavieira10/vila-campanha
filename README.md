# Dashboard de Performance · Vila Campanha

Painel de acompanhamento das campanhas de mídia (Google + Facebook), conectado direto à sua planilha do Google Sheets. Tema escuro por padrão, com botão para tema claro.

---

## 🚀 Como colocar no ar (Render — gratuito)

### Parte 1 — Subir o código no GitHub
1. Crie uma conta gratuita em https://github.com
2. Crie um repositório novo (pode ser **público** — as credenciais ficam protegidas no Render, nunca no código)
3. Suba os arquivos desta pasta (o arrastar-e-soltar do GitHub funciona)

### Parte 2 — Conectar no Render
1. Acesse https://render.com → **Get Started** (entre com o GitHub)
2. **New +** → **Web Service**
3. Conecte e escolha o repositório
4. Configurações:
   - **Name:** o que quiser (ex: `dashboard-vila-campanha`)
   - **Region:** Oregon (US West)
   - **Build Command:** *(deixe vazio)*
   - **Start Command:** `node server.js`
   - **Plan:** Free

### Parte 3 — Configurar as variáveis (ESSENCIAL)
No menu lateral → **Environment** → **Add Environment Variable**, adicione:

| Key | Value |
|---|---|
| `GOOGLE_SHEETS_API_KEY` | sua chave `AIzaSy...` (marque **secret**) |
| `GOOGLE_SHEETS_ID` | `16Q-f9sshSg-fE48baZqrjiEB3rn8NQlF-F7IEKOeCxM` |
| `GOOGLE_SHEETS_NAME` | `Diário Performance` |
| `GOOGLE_SHEETS_RANGE` | `A1:Z200` |

> ⚠️ A **API Key vai só aqui**, no Render. Nunca no código nem no GitHub.

### Parte 4 — Deploy
1. Salve as variáveis → o Render faz o deploy automático
2. Aguarde o status **"Live"** (~2 min)
3. Acesse a URL gerada (`https://seu-app.onrender.com`)

> Sempre que mudar uma variável, lembre de **Trigger deploy** (Manual Deploy) para o Render reler.

---

## ✅ Como testar se conectou
Abra o painel → tecla **F12** → aba **Console** → digite:
```js
debugSheets()
```
Deve aparecer algo como `Fonte: live | 30 linhas via proxy`. Se aparecer `demo` ou `offline`, confira as variáveis e se a planilha está pública.

---

## 🔓 A planilha precisa estar pública para leitura
1. Botão **Compartilhar** (canto superior direito)
2. **Acesso geral** → **Qualquer pessoa com o link**
3. Permissão: **Leitor**

---

## ⚙️ Ajustes rápidos
- **Metas / orçamento** (R$ 2.600, meta de 410 leads, etc.): edite o bloco `meta` em `data/dataset.js`. Os valores *realizados* (gasto e leads) são calculados ao vivo a partir das linhas diárias da planilha.
- **Dados de exemplo** (modo offline/demo): também ficam em `data/dataset.js`.
- **Cores / tema**: `css/variables.css`.

---

## ⚠️ Sobre o Render Free
O servidor "dorme" após ~15 min sem uso → a primeira pessoa do dia espera uns 30s para carregar. Para evitar, use o **UptimeRobot** (gratuito) fazendo um ping em `https://seu-app.onrender.com/health` a cada 5 min. Para uso interno e esporádico, conviver com o delay é tranquilo.

---

## 📁 Estrutura
```
server.js            servidor Node + proxy seguro do Sheets
index.html           página do dashboard
css/                 tokens, base, header, componentes, gráficos
js/                  config, sheets (parser), utils, theme, charts, table, report, main
data/dataset.js      dados de exemplo (fallback) + metas
```
