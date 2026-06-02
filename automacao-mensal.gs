/**
 * ============================================================
 *  AUTOMAÇÃO MENSAL — acesso
 *  Na virada do mês, para cada cliente da planilha de controle:
 *    1. Copia um TEMPLATE (a planilha padrão "Diário Performance")
 *    2. Deixa a cópia PÚBLICA para leitura
 *    3. Escreve o ID novo (e o mês) de volta na planilha de controle
 *  Resultado: os dashboards passam a mostrar o mês novo sozinhos.
 *
 *  COMO USAR:
 *  1. Abra https://script.google.com → Novo projeto
 *  2. Cole este código
 *  3. Preencha os 3 IDs em CONFIG abaixo
 *  4. Rode "rolarMes" uma vez (vai pedir autorização — aceite)
 *  5. Rode "criarGatilhoMensal" uma vez para agendar todo dia 1º
 * ============================================================ */

// ===== CONFIG (preencha) =====
const CONTROL_SHEET_ID   = 'COLE_O_ID_DA_PLANILHA_DE_CONTROLE';
const CONTROL_TAB        = 'Clientes';
const DEFAULT_TEMPLATE_ID = 'COLE_O_ID_DO_TEMPLATE_PADRAO'; // planilha modelo "Diário Performance"
const DEST_FOLDER_ID     = ''; // (opcional) ID de uma pasta no Drive p/ salvar as planilhas do mês. Deixe '' p/ raiz.

// ===== Função principal =====
function rolarMes() {
  const sh = SpreadsheetApp.openById(CONTROL_SHEET_ID).getSheetByName(CONTROL_TAB);
  const data = sh.getDataRange().getValues();
  const header = data[0].map(h => String(h).trim().toLowerCase());
  const col = name => header.indexOf(name);

  const cSlug = col('slug'), cNome = col('nome'), cSheetId = col('sheet_id'),
        cMesRef = col('mes_ref'), cTemplate = col('template_id');

  if (cSlug === -1 || cSheetId === -1) {
    throw new Error("A planilha de controle precisa ter as colunas 'slug' e 'sheet_id'.");
  }

  const mesRef = nomeDoMes(new Date());
  const folder = DEST_FOLDER_ID ? DriveApp.getFolderById(DEST_FOLDER_ID) : null;
  let feitos = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const slug = String(row[cSlug] || '').trim();
    if (!slug) continue;

    // qual template usar (coluna template_id por cliente, ou o padrão)
    const templateId = (cTemplate > -1 && String(row[cTemplate] || '').trim()) || DEFAULT_TEMPLATE_ID;
    if (!templateId || templateId.indexOf('COLE_') === 0) continue;

    try {
      // 1. copia o template
      const tmpl = DriveApp.getFileById(templateId);
      const nome = `${row[cNome] || slug} — ${mesRef}`;
      const novo = folder ? tmpl.makeCopy(nome, folder) : tmpl.makeCopy(nome);

      // 2. deixa pública para leitura
      novo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      // 3. atualiza a planilha de controle
      sh.getRange(i + 1, cSheetId + 1).setValue(novo.getId());
      if (cMesRef > -1) sh.getRange(i + 1, cMesRef + 1).setValue(mesRef);

      feitos++;
      Utilities.sleep(400); // respira entre clientes (cotas do Google)
    } catch (e) {
      console.error(`Falha no cliente "${slug}": ${e.message}`);
    }
  }
  console.log(`Pronto: ${feitos} cliente(s) atualizados para ${mesRef}.`);
}

// ===== "Junho de 2026" =====
function nomeDoMes(d) {
  const m = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return `${m[d.getMonth()]} de ${d.getFullYear()}`;
}

// ===== Rode UMA vez para agendar (dia 1º, ~3h da manhã) =====
function criarGatilhoMensal() {
  // remove gatilhos antigos da mesma função para não duplicar
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'rolarMes')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('rolarMes').timeBased().onMonthDay(1).atHour(3).create();
  console.log('Gatilho mensal criado: rolarMes roda todo dia 1º.');
}
