# Painel de Performance · acesso (multi-cliente · Google Sheets + Meta Ads)

App único, estilo **glassmorphism**, que serve todos os clientes. Cada cliente abre por uma URL
(`.../?cliente=slug`). Os dados vêm da planilha do mês (via planilha de controle) e, opcionalmente,
os **criativos** vêm do Meta Ads.

- **Virar o mês** = atualizar a planilha de controle (sem redeploy).
- **Cliente novo** = uma linha na planilha de controle (sem deploy).

---

## 🗂️ Planilha de controle (aba `Clientes`)
Importe o `modelo-planilha-de-controle.csv`. Colunas (1ª linha = cabeçalho):

| coluna | obrigatória | o que é |
|---|---|---|
| slug | sim | apelido na URL (ex: `vila-campana`) |
| nome | — | nome exibido no cabeçalho |
| sheet_id | sim | ID da planilha do mês (troque ao virar o mês) |
| aba | — | aba dos dados (padrão `Diário Performance`) |
| range | — | padrão `A1:Z200` |
| mes_ref | — | texto exibição (ex: `Junho de 2026`) |
| orcamento / meta_leads / meta_cpl | — | metas do mês |
| orcamento_google / orcamento_fb / meta_lead_google / meta_lead_fb | — | metas por plataforma (senão 50/50) |
| **meta_ad_account** | só p/ criativos | conta de anúncios do Meta (`act_XXXXXXXXX`) |

> Planilha de controle **e** as planilhas de cada cliente precisam estar **públicas para leitura**.

---

## 🔑 Variáveis de ambiente (Render ou Netlify)

| Key | Value |
|---|---|
| `GOOGLE_SHEETS_API_KEY` | chave `AIzaSy...` (secret) |
| `CONTROL_SHEET_ID` | ID da planilha de controle |
| `CONTROL_SHEET_NAME` | `Clientes` |
| `CONTROL_SHEET_RANGE` | `A1:Z300` |
| `META_ACCESS_TOKEN` | token **System User** do Meta (secret) — só se for usar criativos |
| `META_API_VERSION` | `v24.0` (atualize quando o Meta lançar versão nova) |

### Render: New Web Service → Start `node server.js` → Free → variáveis acima → deploy.
### Netlify: Import repo → build vazio · publish `.` → variáveis → **Clear cache and deploy**.

---

## 🔗 Uso
- Lista de clientes: `https://seu-app/`
- Um cliente: `https://seu-app/?cliente=vila-campana`
- Demonstração: `?cliente=demo`

## 🎛️ Recursos
- **Glassmorphism**: blobs coloridos animados + cards de vidro (claro/escuro).
- **Calendário de período**: atalhos (Hoje/Ontem/7/14/30 dias/Mês todo) + seleção de intervalo. KPIs recalculam e metas escalam proporcionalmente.
- **Aba Criativos (Meta Ads)**: grid de criativos com investimento, conversões, CPL, cliques, CTR, impressões; filtros Todos/Ativos/Pausados; resumo no topo. Sincroniza com o período selecionado.
- Multi-cliente, tabela diária, exportação CSV (`;` + BOM), `debugSheets()` no console.

## 🔎 Meta Ads — notas importantes
- Use um **token de System User** (não expira). Tokens `EAA...` de usuário expiram.
- Permissões: `ads_read` (e `business_management`).
- Cada cliente tem **sua** `meta_ad_account` na planilha de controle; o token único do Business acessa todas as contas que ele administra.
- Testar: `seu-app/api/meta?cliente=vila-campana` → JSON com `creatives`/`summary` (ou `configured:false` com o motivo).

## 📁 Estrutura
```
server.js · netlify/functions/sheets-proxy.js   (proxies: sheets + meta)
index.html · css/ · js/ (config, sheets, meta, kpis, charts, table, period, date-filter, report, theme, main)
data/dataset.js (demo) · modelo-planilha-de-controle.csv · automacao-mensal.gs (bot mensal)
```
