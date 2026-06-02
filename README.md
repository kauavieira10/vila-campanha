# Painel de Performance · acesso (multi-cliente)

Um **único app** que serve todos os seus clientes. Cada cliente abre por uma URL própria
(`.../?cliente=slug`) e os dados vêm da planilha de mídia daquele mês.

A grande sacada: **o app não tem o ID das planilhas "chumbado"**. Ele lê uma **planilha de
controle** (uma só) que diz, para cada cliente, qual planilha do mês carregar. Então:

- **Virar o mês** = atualizar a planilha de controle (um lugar só). **Sem redeploy.**
- **Cliente novo** = adicionar uma linha na planilha de controle. **Sem deploy.**

---

## 🗂️ A planilha de controle (o coração de tudo)

Crie **uma** planilha no Google (ex: "Painel de Controle — acesso") com uma aba chamada
`Clientes`. A primeira linha são os cabeçalhos (podem estar em qualquer ordem):

| slug | nome | sheet_id | aba | range | mes_ref | orcamento | meta_leads | meta_cpl |
|---|---|---|---|---|---|---|---|---|
| vila-campana | Vila Campana | `16Q-f9ss...` | Diário Performance | A1:Z200 | Junho de 2026 | 2.600 | 410 | 6,34 |
| acomix | Açomix | `1AbC...` | Diário Performance | A1:Z200 | Junho de 2026 | 5.000 | 800 | 6,25 |

**O que cada coluna significa:**
- **slug** *(obrigatório)* — o "apelido" do cliente que vai na URL. Use minúsculas, sem espaço (ex: `vila-campana`). É o que aparece em `?cliente=vila-campana`.
- **nome** — nome de exibição no cabeçalho (ex: "Vila Campana").
- **sheet_id** *(obrigatório)* — o ID da planilha de mídia **daquele mês** (a parte entre `/d/` e `/edit` do link). **É só este campo que você troca quando o mês vira.**
- **aba** — nome da aba dentro da planilha de mídia (padrão: `Diário Performance`).
- **range** — padrão `A1:Z200` (use `A1:AZ200` se a planilha for bem larga).
- **mes_ref** — texto livre só pra exibição (ex: "Junho de 2026").
- **orcamento / meta_leads / meta_cpl** — as metas do mês (os *realizados* são calculados sozinhos a partir das linhas diárias).
- *(opcionais)* **orcamento_google, orcamento_fb, meta_lead_google, meta_lead_fb** — se quiser as metas por plataforma exatas; se deixar em branco, o app divide 50/50.

> ⚠️ A planilha de controle **e** as planilhas de cada cliente precisam estar **públicas para leitura** (Compartilhar → Qualquer pessoa com o link → Leitor).

**Rotina mensal:** quando criar as planilhas novas do mês, é só colar o `sheet_id` novo (e atualizar `mes_ref` e as metas, se mudaram) na linha de cada cliente. Pronto — todos os dashboards passam a mostrar o mês novo. Dá pra automatizar isso com um Google Apps Script que, ao criar a planilha do mês, já escreve o ID na linha do cliente.

---

## 🚀 Deploy — Render (gratuito)

1. Suba o código num repositório **público** no GitHub.
2. https://render.com → **New +** → **Web Service** → escolha o repo.
3. **Build Command** vazio · **Start Command** `node server.js` · **Plan** Free.
4. **Environment** → adicione:

| Key | Value |
|---|---|
| `GOOGLE_SHEETS_API_KEY` | sua chave `AIzaSy...` (marque **secret**) |
| `CONTROL_SHEET_ID` | ID da **planilha de controle** |
| `CONTROL_SHEET_NAME` | `Clientes` |
| `CONTROL_SHEET_RANGE` | `A1:Z300` |

5. Deploy → aguarde **"Live"**.

> 💤 Render Free dorme após ~15 min. Use o **UptimeRobot** pingando `/health` a cada 5 min pra evitar o atraso do primeiro acesso.

## 🚀 Deploy — Netlify (não dorme — recomendado)

1. Repo público no GitHub → https://app.netlify.com → **Add new site** → **Import**.
2. **Build command** vazio · **Publish directory** `.` → Deploy.
3. **Environment variables** → as **mesmas 4** acima (chave como secret).
4. ⚠️ **Deploys → Trigger deploy → Clear cache and deploy site** (variáveis só valem após novo deploy).

---

## 🔗 Como usar
- **Lista de clientes:** abra a URL raiz (`https://seu-app/`) — aparece um seletor com busca.
- **Um cliente direto:** `https://seu-app/?cliente=vila-campana`.
- Você pode salvar/enviar para cada cliente o link com o `?cliente=` dele.

## ✅ Testar
- `https://seu-app/api/clients` → deve listar seus clientes.
- `https://seu-app/api/sheets?cliente=vila-campana` → deve trazer os dados (e em `_meta`, o nome e as metas).
- No painel: **F12 → Console → `debugSheets()`** → `Fonte: live | N linhas via proxy`.
- Diagnóstico de erro: o JSON dessas URLs traz `error`/`detail`/`hint` (403 = não-pública, 404 = ID errado, 400 = aba errada).

---

## 🆕 Recursos
- KPIs que respondem ao filtro de período (meta proporcional), aba "Por período", CSV com `;` + BOM (Excel BR), tema escuro padrão + claro, favicon, deploy duplo.
- Modo demonstração: `?cliente=demo` (ou sem configuração) mostra dados de exemplo.

## 📁 Estrutura
```
server.js                       servidor multi-cliente (Render)
netlify.toml + netlify/...       função serverless (Netlify)
index.html                       seletor de clientes + dashboard
assets/                          logos e favicon
css/ js/                         estilos e lógica
data/dataset.js                  dados de exemplo (modo demo)
```
