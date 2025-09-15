/* app.js - controlador frontend
   Usa: config.js -> CONFIG
*/
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

let currentUser = null;
let DADOS_CACHE = [], ITENS_CACHE = [], CONFIG_CACHE = [];

function logDebug(...args){ console.debug('[APP]', ...args); }

// Small helper: show toast-ish message in place of loginMsg or container
function showMessage(selector, msg, isError=false){
  const el = $(selector);
  if(!el) return;
  el.textContent = msg;
  el.style.color = isError ? '#ffbaba' : '';
}

// API caller (adds apiKey automatically)
async function apiRequest(action, payload = {}) {
  if (!CONFIG || !CONFIG.API_ENDPOINT) throw new Error('CONFIG.API_ENDPOINT não definido em config.js');
  const body = { action, apiKey: CONFIG.API_KEY || '', ...payload };
  try {
    const res = await fetch(CONFIG.API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'omit',
      mode: 'cors'
    });
    const txt = await res.text();
    let data;
    try { data = JSON.parse(txt); } catch(e){ throw new Error('Resposta inválida do servidor: ' + txt); }
    if (!res.ok || data.error) {
      throw new Error(data.error || ('HTTP ' + res.status));
    }
    return data;
  } catch (err) {
    logDebug('apiRequest error', err);
    throw err;
  }
}

/* ------------------ UI Init ------------------ */
function initUI(){
  $$('.navbtn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.navbtn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      showView(btn.dataset.view);
    });
  });

  $('#loginBtn').addEventListener('click', handleLogin);
  $('#logoutBtn').addEventListener('click', handleLogout);
  $('#loginPass').addEventListener('keydown', (e)=>{ if(e.key === 'Enter') handleLogin(); });

  $('#searchDados')?.addEventListener('input', debounce(renderDados, 220));

  $('#addItemBtn')?.addEventListener('click', ()=> openItemModal('add'));
  $('#addConfigBtn')?.addEventListener('click', ()=> openConfigModal('add'));
  $('#closeModal')?.addEventListener('click', closeModal);
  $('#fileInput')?.addEventListener('change', handleFile);

  showView('dados');

  // ensure mobile keyboard doesn't hide overlay: focus first input
  setTimeout(()=> $('#loginUser')?.focus(), 300);
}

function showView(name){
  $$('.view').forEach(v=>v.classList.add('hidden'));
  $(`#view-${name}`).classList.remove('hidden');

  // fetch data when view shown
  if (name === 'dados') fetchDados();
  if (name === 'itens') fetchItens();
  if (name === 'config') fetchConfig();
  if (name === 'log') fetchLog();
}

/* ------------------ Login ------------------ */
async function getUsersFromSheet(){
  try {
    const resp = await apiRequest('getUsers', { sheet: CONFIG.SHEETS.USUARIOS });
    return resp.users || [];
  } catch (e) {
    console.warn('getUsersFromSheet failed', e);
    return [];
  }
}

async function handleLogin(){
  const user = $('#loginUser').value.trim();
  const pass = $('#loginPass').value;
  showMessage('#loginMsg','Verificando...');

  try {
    let users = Array.isArray(CONFIG.USERS) ? CONFIG.USERS.slice() : [];
    if (!users || users.length === 0) {
      users = await getUsersFromSheet();
    }
    users = users.map(u => ({
      name: (u.name ?? u.Name ?? '').toString(),
      password: (u.password ?? u.Password ?? u.senha ?? '').toString(),
      role: (u.role ?? u.Role ?? '').toString(),
      ...u
    }));
    const found = users.find(u => u.name === user && u.password === pass);
    if (!found) {
      showMessage('#loginMsg','Usuário ou senha inválidos.', true);
      return;
    }
    currentUser = found;
    $('#userName').textContent = currentUser.name;
    $('#logoutBtn').classList.remove('hidden');
    $('#loginOverlay').classList.add('hidden');
    showMessage('#loginMsg','');
    // refresh current view
    const active = document.querySelector('.navbtn.active').dataset.view;
    showView(active);
  } catch (err) {
    console.error(err);
    showMessage('#loginMsg','Erro ao validar (ver console).', true);
  }
}

function handleLogout(){
  currentUser = null;
  $('#userName').textContent = '';
  $('#logoutBtn').classList.add('hidden');
  $('#loginOverlay').classList.remove('hidden');
}

/* ------------------ DADOS ------------------ */
async function fetchDados(){
  $('#dadosTableWrap').innerHTML = 'Carregando...';
  try {
    const resp = await apiRequest('getSheet', { sheet: CONFIG.SHEETS.DADOS });
    DADOS_CACHE = resp.rows || [];
    renderDados();
  } catch (err) {
    console.error(err);
    $('#dadosTableWrap').innerHTML = `<div class="msg">Erro ao carregar dados: ${escapeHtml(err.message)}</div>`;
  }
}

function renderDados(){
  const q = ($('#searchDados')?.value || '').trim().toLowerCase();
  const rows = DADOS_CACHE.filter(r => {
    if (!q) return true;
    return Object.values(r).join(' ').toLowerCase().includes(q);
  });
  if (rows.length === 0) {
    $('#dadosTableWrap').innerHTML = `<div class="msg">Nenhum registro encontrado.</div>`;
    return;
  }
  const cols = ['timestamp','name','email','phone','item_id','item_label','comment','type','amount','comment_visible'];
  let html = `<table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}<th>Ações</th></tr></thead><tbody>`;
  rows.forEach((r, idx)=>{
    html += '<tr>';
    cols.forEach(c => html += `<td>${escapeHtml(r[c] ?? '')}</td>`);
    html += `<td><button onclick="window.__editDados(${idx})">Editar</button>
                 <button onclick="window.__deleteDados(${idx})">Excluir</button></td></tr>`;
  });
  html += '</tbody></table>';
  $('#dadosTableWrap').innerHTML = html;
}

window.__editDados = async function(idx){
  const row = DADOS_CACHE[idx];
  // build editable form dynamically
  const fields = Object.keys(row);
  openModal(`<h3>Editar Dados</h3>
    <div class="form">${fields.map(k=>`<label>${escapeHtml(k)}<input id="fld_${k}" value="${escapeHtml(row[k]??'')}" /></label>`).join('')}
      <div style="margin-top:10px"><button id="saveDadosBtn" class="btn">Salvar</button></div>
    </div>`);
  $('#saveDadosBtn').onclick = async ()=>{
    const updated = {};
    fields.forEach(f => updated[f] = $(`#fld_${f}`).value);
    try {
      await apiRequest('updateRow', { sheet: CONFIG.SHEETS.DADOS, rowIndex: idx, row: updated });
      closeModal();
      await fetchDados();
    } catch (err) { alert('Erro: ' + err.message); }
  };
};

window.__deleteDados = async function(idx){
  if(!confirm('Excluir este registro?')) return;
  try {
    await apiRequest('deleteRow', { sheet: CONFIG.SHEETS.DADOS, rowIndex: idx });
    await fetchDados();
  } catch (err) { alert('Erro: ' + err.message); }
}

/* ------------------ ITENS ------------------ */
async function fetchItens(){
  $('#itensTableWrap').innerHTML = 'Carregando...';
  try {
    const resp = await apiRequest('getSheet', { sheet: CONFIG.SHEETS.ITENS });
    ITENS_CACHE = resp.rows || [];
    renderItens();
  } catch (err) {
    console.error(err);
    $('#itensTableWrap').innerHTML = `<div class="msg">Erro ao carregar itens: ${escapeHtml(err.message)}</div>`;
  }
}

function renderItens(){
  if (!ITENS_CACHE.length) { $('#itensTableWrap').innerHTML = `<div class="msg">Nenhum item.</div>`; return; }
  const cols = ['id','label','list','limit','price','visible'];
  let html = `<table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}<th>Ações</th></tr></thead><tbody>`;
  ITENS_CACHE.forEach((r, idx)=>{
    html += '<tr>';
    cols.forEach(c=> html += `<td>${escapeHtml(r[c] ?? '')}</td>`);
    html += `<td><button onclick="window.__editItem(${idx})">Editar</button>
                 <button onclick="window.__delItem(${idx})">Excluir</button></td></tr>`;
  });
  html += '</tbody></table>';
  $('#itensTableWrap').innerHTML = html;
}

window.__editItem = function(idx){ openItemModal('edit', idx); }
window.__delItem = async function(idx){
  if(!confirm('Excluir item?')) return;
  try {
    await apiRequest('deleteRow', { sheet: CONFIG.SHEETS.ITENS, rowIndex: idx });
    await fetchItens();
  } catch(err){ alert('Erro: ' + err.message); }
}

function openItemModal(mode='add', idx=0){
  const isEdit = mode === 'edit';
  const row = isEdit ? ITENS_CACHE[idx] : { id:'',label:'',list:'',limit:'',price:'',visible:'TRUE' };
  openModal(`<h3>${isEdit ? 'Editar' : 'Adicionar'} Item</h3>
    <label>id<input id="itm_id" value="${escapeHtml(row.id||'')}" /></label>
    <label>label<input id="itm_label" value="${escapeHtml(row.label||'')}" /></label>
    <label>list<input id="itm_list" value="${escapeHtml(row.list||'')}" /></label>
    <label>limit<input id="itm_limit" value="${escapeHtml(row.limit||'')}" /></label>
    <label>price<input id="itm_price" value="${escapeHtml(row.price||'')}" /></label>
    <label>visible<select id="itm_visible"><option value="TRUE">TRUE</option><option value="FALSE">FALSE</option></select></label>
    <div style="margin-top:10px"><button id="saveItemBtn" class="btn">${isEdit?'Salvar':'Adicionar'}</button></div>`);
  $('#itm_visible').value = row.visible ?? 'TRUE';
  $('#saveItemBtn').onclick = async ()=>{
    const payload = {
      id: $('#itm_id').value.trim(),
      label: $('#itm_label').value.trim(),
      list: $('#itm_list').value.trim(),
      limit: $('#itm_limit').value.trim(),
      price: $('#itm_price').value.trim(),
      visible: $('#itm_visible').value
    };
    try {
      if(isEdit) await apiRequest('updateRow', { sheet: CONFIG.SHEETS.ITENS, rowIndex: idx, row: payload });
      else await apiRequest('appendRow', { sheet: CONFIG.SHEETS.ITENS, row: payload });
      closeModal(); await fetchItens();
    } catch (err) { alert('Erro: ' + err.message); }
  };
}

/* ------------------ CONFIG ------------------ */
async function fetchConfig(){
  $('#configTableWrap').innerHTML = 'Carregando...';
  try {
    const resp = await apiRequest('getSheet', { sheet: CONFIG.SHEETS.CONFIG });
    CONFIG_CACHE = resp.rows || [];
    renderConfig();
  } catch (err) {
    console.error(err);
    $('#configTableWrap').innerHTML = `<div class="msg">Erro: ${escapeHtml(err.message)}</div>`;
  }
}

function renderConfig(){
  if (!CONFIG_CACHE.length) { $('#configTableWrap').innerHTML = `<div class="msg">Nenhuma configuração.</div>`; return; }
  let html = `<table><thead><tr><th>Chave</th><th>Valor</th><th>Ações</th></tr></thead><tbody>`;
  CONFIG_CACHE.forEach((r, idx)=>{
    html += `<tr><td>${escapeHtml(r.Chave||'')}</td><td>${escapeHtml(r.Valor||'')}</td><td>
      <button onclick="window.__editCfg(${idx})">Editar</button>
      <button onclick="window.__delCfg(${idx})">Excluir</button></td></tr>`;
  });
  html += '</tbody></table>';
  $('#configTableWrap').innerHTML = html;
}

window.__editCfg = function(idx){ openConfigModal('edit', idx); }
window.__delCfg = async function(idx){
  if(!confirm('Excluir configuração?')) return;
  try { await apiRequest('deleteRow', { sheet: CONFIG.SHEETS.CONFIG, rowIndex: idx }); await fetchConfig(); }
  catch(err){ alert('Erro: ' + err.message); }
}

function openConfigModal(mode='add', idx=0){
  const isEdit = mode === 'edit';
  const row = isEdit ? CONFIG_CACHE[idx] : { Chave:'', Valor:'' };
  openModal(`<h3>${isEdit ? 'Editar' : 'Adicionar'} Config</h3>
    <label>Chave<input id="cfg_chave" value="${escapeHtml(row.Chave||'')}" /></label>
    <label>Valor<input id="cfg_valor" value="${escapeHtml(row.Valor||'')}" /></label>
    <div style="margin-top:10px"><button id="saveCfgBtn" class="btn">${isEdit?'Salvar':'Adicionar'}</button></div>`);
  $('#saveCfgBtn').onclick = async ()=>{
    const payload = { Chave: $('#cfg_chave').value.trim(), Valor: $('#cfg_valor').value.trim() };
    try {
      if(isEdit) await apiRequest('updateRow', { sheet: CONFIG.SHEETS.CONFIG, rowIndex: idx, row: payload });
      else await apiRequest('appendRow', { sheet: CONFIG.SHEETS.CONFIG, row: payload });
      closeModal(); await fetchConfig();
    } catch (err) { alert('Erro: ' + err.message); }
  };
}

/* ------------------ LOG ------------------ */
async function fetchLog(){
  $('#logTableWrap').innerHTML = 'Carregando...';
  try {
    const resp = await apiRequest('getSheet', { sheet: CONFIG.SHEETS.LOG });
    const rows = resp.rows || [];
    if (!rows.length) { $('#logTableWrap').innerHTML = `<div class="msg">Nenhum log.</div>`; return; }
    let html = `<table><thead><tr><th>timestamp</th><th>event</th><th>details</th></tr></thead><tbody>`;
    rows.forEach(r => html += `<tr><td>${escapeHtml(r.timestamp||'')}</td><td>${escapeHtml(r.event||'')}</td><td>${escapeHtml(r.details||'')}</td></tr>`);
    html += '</tbody></table>';
    $('#logTableWrap').innerHTML = html;
  } catch (err) { console.error(err); $('#logTableWrap').innerHTML = `<div class="msg">Erro: ${escapeHtml(err.message)}</div>`; }
}

/* ------------------ Import Excel handler ------------------ */
async function handleFile(ev){
  const f = ev.target.files[0];
  if(!f) return;
  showMessage('#dadosTableWrap', 'Lendo arquivo...');
  try {
    // requires xlsx library to exist on page if you want to parse locally.
    // Here we send file to server not implemented; so we parse client-side if XLSX is available.
    if (typeof XLSX === 'undefined') {
      alert('Import precisa da biblioteca XLSX (SheetJS). Se deseja import pelo frontend, adicione a lib XLSX.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async e => {
      const data = e.target.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const first = workbook.SheetNames[0];
      const json = XLSX.utils.sheet_to_json(workbook.Sheets[first], { defval: '' });
      if (!confirm(`Importar ${json.length} linhas para a aba ${CONFIG.SHEETS.ITENS}?`)) return;
      await apiRequest('importRows', { sheet: CONFIG.SHEETS.ITENS, rows: json });
      alert('Importação enviada com sucesso.');
      await fetchItens();
    };
    reader.readAsBinaryString(f);
  } catch (err) { alert('Erro na importação: ' + err.message); }
}

/* ------------------ Modal helpers ------------------ */
function openModal(html){
  $('#modalBody').innerHTML = html;
  $('#modal').classList.remove('hidden');
  $('#modal').focus();
}
function closeModal(){ $('#modal').classList.add('hidden'); $('#modalBody').innerHTML = ''; }

/* ------------------ utils ------------------ */
function escapeHtml(s){ return (s===null||s===undefined)?'':String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
function debounce(fn, wait=200){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }

/* ------------------ Boot ------------------ */
document.addEventListener('DOMContentLoaded', initUI);
