/* Função serverless (Netlify) — multi-cliente: Sheets + Meta Ads.
   Rotas (netlify.toml): /api/clients -> ?route=clients · /api/meta -> ?route=meta · /api/sheets -> dados */
const API_KEY=()=>process.env.GOOGLE_SHEETS_API_KEY, CONTROL_ID=()=>process.env.CONTROL_SHEET_ID;
const CONTROL_NAME=()=>process.env.CONTROL_SHEET_NAME||"Clientes", CONTROL_RANGE=()=>process.env.CONTROL_SHEET_RANGE||"A1:Z300";
const META_TOKEN=()=>process.env.META_ACCESS_TOKEN, META_VER=()=>process.env.META_API_VERSION||"v24.0";
let controlCache={at:0,clients:null}; const CONTROL_TTL=60*1000;

async function fetchSheet(id,name,range){
  const u=`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(`${name}!${range}`)}?key=${API_KEY()}`;
  const r=await fetch(u);
  if(!r.ok){const d=(await r.text()).substring(0,500);const e=new Error(`Google Sheets API ${r.status}`);e.status=r.status;e.detail=d;
    e.hint=r.status===403?"Planilha não pública OU API Key com restrição (deixe None).":r.status===404?"ID errado (sem /edit/espaços).":r.status===400?"Nome da ABA errado.":null;throw e;}
  return r.json();
}
function numBR(s){if(!s)return null;s=String(s).replace(/r\$/i,"").replace(/%/g,"").replace(/\s/g,"");if(s.includes(","))s=s.replace(/\./g,"").replace(",",".");else if(/^-?\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,"");const n=parseFloat(s);return isNaN(n)?null:n;}
async function getClients(force){
  if(!force&&controlCache.clients&&Date.now()-controlCache.at<CONTROL_TTL)return controlCache.clients;
  const data=await fetchSheet(CONTROL_ID(),CONTROL_NAME(),CONTROL_RANGE());const values=data.values||[];
  if(!values.length)throw Object.assign(new Error("Planilha de controle vazia"),{status:400});
  const h=values[0].map(x=>String(x).trim().toLowerCase());const idx=n=>h.indexOf(n);
  const col={slug:idx("slug"),nome:idx("nome"),sheet_id:idx("sheet_id"),aba:idx("aba"),range:idx("range"),mes_ref:idx("mes_ref"),orcamento:idx("orcamento"),meta_leads:idx("meta_leads"),meta_cpl:idx("meta_cpl"),orcamento_google:idx("orcamento_google"),orcamento_fb:idx("orcamento_fb"),meta_lead_google:idx("meta_lead_google"),meta_lead_fb:idx("meta_lead_fb"),meta_ad_account:idx("meta_ad_account")};
  if(col.slug===-1||col.sheet_id===-1)throw Object.assign(new Error("Faltam colunas 'slug'/'sheet_id'"),{status:400});
  const g=(r,c)=>(c>-1&&r[c]!=null?String(r[c]).trim():"");
  const clients=[];
  for(let i=1;i<values.length;i++){const r=values[i]||[];const slug=g(r,col.slug).toLowerCase();const sid=g(r,col.sheet_id);if(!slug||!sid)continue;
    clients.push({slug,nome:g(r,col.nome)||slug,sheetId:sid,aba:g(r,col.aba)||"Diário Performance",range:g(r,col.range)||"A1:Z200",mesRef:g(r,col.mes_ref)||"",metaAdAccount:g(r,col.meta_ad_account),
      metas:{orcamento:numBR(g(r,col.orcamento)),metaLeads:numBR(g(r,col.meta_leads)),metaCPL:numBR(g(r,col.meta_cpl)),orcamentoGoogle:numBR(g(r,col.orcamento_google)),orcamentoFB:numBR(g(r,col.orcamento_fb)),metaLeadGoogle:numBR(g(r,col.meta_lead_google)),metaLeadFB:numBR(g(r,col.meta_lead_fb))}});}
  controlCache={at:Date.now(),clients};return clients;
}
async function metaGet(p,params){const usp=new URLSearchParams({...params,access_token:META_TOKEN()});const r=await fetch(`https://graph.facebook.com/${META_VER()}/${p}?${usp}`);const j=await r.json().catch(()=>({}));if(!r.ok||(j&&j.error)){const e=new Error((j.error&&j.error.message)||`Meta API ${r.status}`);e.status=r.status;e.detail=j.error||null;throw e;}return j;}
const CONV=["lead","purchase","complete_registration","offsite_conversion","submit_application"];
function conv(a){if(!Array.isArray(a))return 0;let t=0;for(const x of a){const k=String(x.action_type||"").toLowerCase();if(CONV.some(c=>k.includes(c)))t+=Number(x.value)||0;}return t;}
function pickThumb(c,byHash){if(!c)return{thumb:"",isVideo:false};let v=false,th="";const afs=c.asset_feed_spec;if(afs){if(Array.isArray(afs.videos)&&afs.videos.length)v=true;if(Array.isArray(afs.images)&&afs.images[0])th=afs.images[0].url||(afs.images[0].hash&&byHash[afs.images[0].hash])||th;}const o=c.object_story_spec;if(o){if(o.video_data){v=true;th=th||o.video_data.image_url||"";}if(o.link_data){if(o.link_data.picture)th=th||o.link_data.picture;if(o.link_data.image_hash&&byHash[o.link_data.image_hash])th=th||byHash[o.link_data.image_hash];}}if(!th&&c.image_url)th=c.image_url;if(!th&&c.image_hash&&byHash[c.image_hash])th=byHash[c.image_hash];if(!th&&c.thumbnail_url)th=c.thumbnail_url;return{thumb:th,isVideo:v};}

exports.handler=async(event)=>{
  const headers={"Content-Type":"application/json; charset=utf-8","Access-Control-Allow-Origin":process.env.URL||"*"};
  if(event.httpMethod==="OPTIONS")return{statusCode:204,headers,body:""};
  const miss=[!API_KEY()&&"GOOGLE_SHEETS_API_KEY",!CONTROL_ID()&&"CONTROL_SHEET_ID"].filter(Boolean);
  if(miss.length)return{statusCode:500,headers,body:JSON.stringify({error:"Configuração incompleta no Netlify",missing:miss})};
  const q=event.queryStringParameters||{};
  try{
    if(q.route==="clients"){const c=await getClients(q.force==="1");return{statusCode:200,headers,body:JSON.stringify({clients:c.map(x=>({slug:x.slug,nome:x.nome,mesRef:x.mesRef,hasMeta:!!x.metaAdAccount}))})};}

    if(q.route==="meta"){
      const slug=String(q.cliente||"").trim().toLowerCase();if(!slug)return{statusCode:400,headers,body:JSON.stringify({error:"Cliente não informado"})};
      const cli=(await getClients(false)).find(c=>c.slug===slug);if(!cli)return{statusCode:404,headers,body:JSON.stringify({error:"Cliente não encontrado",slug})};
      if(!META_TOKEN())return{statusCode:200,headers,body:JSON.stringify({configured:false,reason:"META_ACCESS_TOKEN não definido."})};
      if(!cli.metaAdAccount)return{statusCode:200,headers,body:JSON.stringify({configured:false,reason:"Cliente sem 'meta_ad_account'."})};
      let act=cli.metaAdAccount.replace(/\s/g,"");if(!act.startsWith("act_"))act="act_"+act.replace(/^act_/,"");
      const today=new Date();const since=q.from||new Date(today.getTime()-30*864e5).toISOString().slice(0,10);const until=q.to||today.toISOString().slice(0,10);
      const [ads,ins]=await Promise.all([
        metaGet(`${act}/ads`,{fields:"id,name,status,creative{id,thumbnail_url,image_url,image_hash,object_story_spec,asset_feed_spec}",limit:"200"}),
        metaGet(`${act}/insights`,{level:"ad",time_range:JSON.stringify({since,until}),fields:"ad_id,spend,actions,clicks,impressions,ctr",limit:"500"})
      ]);
      const byAd={};(ins.data||[]).forEach(i=>byAd[i.ad_id]=i);
      const hashes=[];(ads.data||[]).forEach(a=>{const c=a.creative||{};if(c.image_hash)hashes.push(c.image_hash);if(c.object_story_spec&&c.object_story_spec.link_data&&c.object_story_spec.link_data.image_hash)hashes.push(c.object_story_spec.link_data.image_hash);});
      let byHash={};if(hashes.length){try{const im=await metaGet(`${act}/adimages`,{hashes:JSON.stringify([...new Set(hashes)]),fields:"hash,url,permalink_url"});(im.data||[]).forEach(x=>byHash[x.hash]=x.url||x.permalink_url);}catch(e){}}
      const creatives=(ads.data||[]).map(a=>{const i=byAd[a.id]||{};const cv=conv(i.actions);const sp=Number(i.spend)||0;const {thumb,isVideo}=pickThumb(a.creative,byHash);
        return{id:a.id,name:a.name||"(sem nome)",status:a.status||"UNKNOWN",thumb,isVideo,spend:sp,conversions:cv,cpl:cv>0?sp/cv:0,clicks:Number(i.clicks)||0,impressions:Number(i.impressions)||0,ctr:Number(i.ctr)||0};});
      const tS=creatives.reduce((s,c)=>s+c.spend,0),tC=creatives.reduce((s,c)=>s+c.conversions,0);
      return{statusCode:200,headers:{...headers,"Cache-Control":"public, max-age=300"},body:JSON.stringify({configured:true,cliente:cli.slug,nome:cli.nome,range:{since,until},creatives,summary:{count:creatives.length,spend:tS,conversions:tC,cpl:tC>0?tS/tC:0}})};
    }

    const slug=String(q.cliente||"").trim().toLowerCase();if(!slug)return{statusCode:400,headers,body:JSON.stringify({error:"Cliente não informado"})};
    const cli=(await getClients(false)).find(c=>c.slug===slug);if(!cli)return{statusCode:404,headers,body:JSON.stringify({error:"Cliente não encontrado",slug})};
    const range=q.range||cli.range;const data=await fetchSheet(cli.sheetId,cli.aba,range);
    return{statusCode:200,headers:{...headers,"Cache-Control":"public, max-age=300"},body:JSON.stringify({...data,_meta:{fetchedAt:new Date().toISOString(),cliente:cli.slug,nome:cli.nome,sheetName:cli.aba,range,mesRef:cli.mesRef,metas:cli.metas,hasMeta:!!cli.metaAdAccount,rowsCount:(data.values||[]).length}})};
  }catch(e){return{statusCode:e.status||500,headers,body:JSON.stringify({error:e.message,detail:e.detail,hint:e.hint})};}
};
