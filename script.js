/* script.js
 Front-end logic updated:
 - Login agora pode usar CONFIG.USERS (lista no config.js)
 - Se CONFIG.USERS estiver vazia, faz fallback para ler a aba 'Usuarios' via API
 - Mantive o restante do comportamento (Dados/Itens/Config/Log CRUD, import Excel)
*/

// ---------- utilidades ----------
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

let currentUser = null;

// Simple wrapper to call your Apps Script WebApp
async function apiRequest(action, payload = {}) {
  const body = { action, ...payload };
  const res = await fetch(CONFIG.API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Erro na requisição: ' + res.status);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// ---------- init UI ----------
function initUI(){
  // navigation
  $$('.navbtn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.navbtn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      showView(btn.dataset.view);
    });
  });

  $('#logoutBtn').onclick = ()=>{
    currentUser = null;
    $('#userName').textContent = '';
    $('#logoutBtn').classList.add('hidden');
    $('#loginOverlay').style.display = 'flex';
  };

  $('#loginBtn').onclick = handleLogin;

  $('#searchDados').addEventListener('input', renderDadosTable);

  $('#addItemBtn').addEventListener('click', ()=>openItemModal('add'));
  $('#addConfigBtn').addEventListener('click', ()=>openConfigModal('add'));

  $('#closeModal').addEventListener('click', closeModal);

  $('#fileInput').addEventListener('change', handleFile);

  // initial view
  showView('dados');
  // show login overlay (if not already hidden)
  if (!$('#loginOverlay').style.display) $('#loginOverlay').style.display = 'flex';
}

// show view
function showView(name){
  $$('.view').forEach(v=>v.classList.add('hidden'));
  $(`#view-${name}`).classList.remove('hidden');
  // fetch when switching
  if (name === 'dados') fetchDados();
  if (name === 'itens') fetchItens();
  if (name === 'config') fetchConfig();
  if (name === 'log') fetchLog();
}

// ---------- Login ----------
// New logic: if CONFIG.USERS is present and non-empty, use it.
// Otherwise fallback to reading sheet (CONFIG.SHEETS.USUARIOS) via API action 'getUsers'.
async function getAvailableUsersFromSheet(){
  try {
    const resp = await apiRequest('getUsers', { sheet: CONFIG.SHEETS.USUARIOS });
    return resp.users || [];
  } catch (err) {
    console.warn('Falha ao buscar usuários da planilha:', err);
    return [];
  }
}

async function handleLogin(){
  const user = $('#loginUser').value.trim();
  const pass = $('#loginPass').value;
  $('#loginMsg').textContent = 'Verificando...';

  try {
    // 1) Try CONFIG.USERS first
    let users = Array.isArray(CONFIG.USERS) ? CONFIG.USERS.slice() : [];

    // 2) If CONFIG.USERS empty, try sheet users as fallback
    if (!users || users.length === 0) {
      users = await getAvailableUsersFromSheet();
    }

    // Normalize: ensure keys are strings
    users = users.map(u => ({
      name: (u.name ?? u.Name ?? '').toString(),
      password: (u.password ?? u.Password ?? u.senha ?? '').toString(),
      role: (u.role ?? u.Role ?? u.perfil ?? '').toString(),
      // keep any other fields
      ...u
    }));

    const found = users.find(u => u.name === user && u.password === pass);
    if (!found) {
      $('#loginMsg').textContent = 'Usuário ou senha inválidos.';
      return;
    }
    currentUser = found;
    $('#userName').textContent = currentUser.name || '';
    $('#logoutBtn').classList.remove('hidden');
    $('#loginOverlay').style.display = 'none';
    $('#loginMsg').textContent = '';
    // after login, refresh current view
    const active = document.querySelector('.navbtn.active').dataset.view;
    showView(active);
  } catch (err) {
    console.error(err);
    $('#loginMsg').textContent = 'Erro ao validar (ver console).';
  }
}

// ---------- Dados ----------
let DADOS_CACHE = [];
async function fetchDados(){
  try {
    const resp = await apiRequest('getSheet', { sheet: CONFIG.SHEETS.DADOS });
    DADOS_CACHE = resp.rows || [];
    renderDadosTable();
  } catch (err) {
    console.error(err);
    $('#dadosTableWrap').innerHTML = '<div class="msg">Erro ao carregar dados.</div>';
  }
}

function renderDadosTable(){
  const q = $('#searchDados').value.trim().toLowerCase();
  const rows = DADOS_CACHE.filter(r=>{
    if (!q) return true;
    return Object.values(r).join(' ').toLowerCase().includes(q);
  });

  const cols = ['timestamp','name','email','phone','item_id','item_label','comment','type','amount','comment_visible'];
  let html = `<table class="table"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}<th>Ações</th></tr></thead><tbody>`;
  rows.forEach((r, idx)=>{
    html += '<tr>';
    cols.forEach(c=> html += `<td>${escapeHtml(r[c] ?? '')}</td>`);
    html += `<td>
      <button onclick="openEditDados(${idx})">Editar</button>
      <button onclick="deleteDadosRow(${idx})">Excluir</button>
    </td></tr>`;
  });
  html += `</tbody></table>`;
  $('#dadosTableWrap').innerHTML = html;
}

window.openEditDados = function(idx){
  const row = DADOS_CACHE[idx];
  openModal(`
    <h3>Editar Dados</h3>
    <div class="form">
      ${Object.keys(row).map(k=>`<label>${k}<input id="fld_${k}" value="${escapeHtml(row[k]??'')}" /></label>`).join('')}
      <div style="margin-top:10px">
        <button id="saveDadosBtn">Salvar</button>
      </div>
    </div>
  `);
  $('#saveDadosBtn').onclick = async ()=>{
    const updated = {};
    Object.keys(row).forEach(k => updated[k] = $(`#fld_${k}`).value );
    try {
      await apiRequest('updateRow', { sheet: CONFIG.SHEETS.DADOS, rowIndex: idx, row: updated });
      await fetchDados();
      closeModal();
    } catch(err){ alert('Erro: ' + err.message); }
  };
};

window.deleteDadosRow = async function(idx){
  if(!confirm('Excluir esse registro?')) return;
  try {
    await apiRequest('deleteRow', { sheet: CONFIG.SHEETS.DADOS, rowIndex: idx });
    await fetchDados();
  } catch(err){ alert('Erro: ' + err.message); }
};

// ---------- Itens ----------
let ITENS_CACHE = [];
async function fetchItens(){
  try {
    const resp = await apiRequest('getSheet', { sheet: CONFIG.SHEETS.ITENS });
    ITENS_CACHE = resp.rows || [];
    renderItensTable();
  } catch(err){
    console.error(err);
    $('#itensTableWrap').innerHTML = '<div class="msg">Erro ao carregar itens.</div>';
  }
}

function renderItensTable(){
  const cols = ['id','label','list','limit','price','visible'];
  let html = `<table class="table"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}<th>Ações</th></tr></thead><tbody>`;
  ITENS_CACHE.forEach((r, idx)=>{
    html += '<tr>';
    cols.forEach(c=> html += `<td>${escapeHtml(r[c]??'')}</td>`);
    html += `<td><button onclick="openItemModal('edit',${idx})">Editar</button>
                 <button onclick="deleteItem(${idx})">Excluir</button></td></tr>`;
  });
  html += `</tbody></table>`;
  $('#itensTableWrap').innerHTML = html;
}

window.openItemModal = function(mode, idx){
  const isEdit = mode === 'edit';
  const row = isEdit ? ITENS_CACHE[idx] : { id:'',label:'',list:'',limit:'',price:'',visible:'TRUE' };
  openModal(`
    <h3>${isEdit ? 'Editar item' : 'Adicionar item'}</h3>
    <label>id<input id="itm_id" value="${escapeHtml(row.id||'')}" /></label>
    <label>label<input id="itm_label" value="${escapeHtml(row.label||'')}" /></label>
    <label>list<input id="itm_list" value="${escapeHtml(row.list||'')}" /></label>
    <label>limit<input id="itm_limit" value="${escapeHtml(row.limit||'')}" /></label>
    <label>price<input id="itm_price" value="${escapeHtml(row.price||'')}" /></label>
    <label>visible<select id="itm_visible"><option value="TRUE">TRUE</option><option value="FALSE">FALSE</option></select></label>
    <div style="margin-top:10px"><button id="saveItemBtn">${isEdit ? 'Salvar' : 'Adicionar'}</button></div>
  `);
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
      if(isEdit) {
        await apiRequest('updateRow', { sheet: CONFIG.SHEETS.ITENS, rowIndex: idx, row: payload });
      } else {
        await apiRequest('appendRow', { sheet: CONFIG.SHEETS.ITENS, row: payload });
      }
      await fetchItens();
      closeModal();
    } catch(err){ alert('Erro: '+err.message); }
  };
};

window.deleteItem = async function(idx){
  if(!confirm('Excluir item?')) return;
  try {
    await apiRequest('deleteRow', { sheet: CONFIG.SHEETS.ITENS, rowIndex: idx });
    await fetchItens();
  } catch(err){ alert('Erro: ' + err.message); }
};

// ---------- Config ----------
let CONFIG_CACHE = [];
async function fetchConfig(){
  try {
    const resp = await apiRequest('getSheet', { sheet: CONFIG.SHEETS.CONFIG });
    CONFIG_CACHE = resp.rows || [];
    renderConfigTable();
  } catch(err){
    console.error(err);
    $('#configTableWrap').innerHTML = '<div class="msg">Erro ao carregar configuração.</div>';
  }
}

function renderConfigTable(){
  const cols = ['Chave','Valor'];
  let html = `<table class="table"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}<th>Ações</th></tr></thead><tbody>`;
  CONFIG_CACHE.forEach((r, idx)=>{
    html += `<tr><td>${escapeHtml(r.Chave||'')}</td><td>${escapeHtml(r.Valor||'')}</td><td>
      <button onclick="openConfigModal('edit',${idx})">Editar</button>
      <button onclick="deleteConfig(${idx})">Excluir</button></td></tr>`;
  });
  html += '</tbody></table>';
  $('#configTableWrap').innerHTML = html;
}

window.openConfigModal = function(mode, idx){
  const isEdit = mode === 'edit';
  const row = isEdit ? CONFIG_CACHE[idx] : { Chave:'', Valor:'' };
  openModal(`
    <h3>${isEdit ? 'Editar' : 'Adicionar' } Config</h3>
    <label>Chave<input id="cfg_chave" value="${escapeHtml(row.Chave||'')}" /></label>
    <label>Valor<input id="cfg_valor" value="${escapeHtml(row.Valor||'')}" /></label>
    <div style="margin-top:10px"><button id="saveCfgBtn">${isEdit ? 'Salvar' : 'Adicionar'}</button></div>
  `);
  $('#saveCfgBtn').onclick = async ()=>{
    const payload = { Chave: $('#cfg_chave').value.trim(), Valor: $('#cfg_valor').value.trim() };
    try {
      if(isEdit) await apiRequest('updateRow', { sheet: CONFIG.SHEETS.CONFIG, rowIndex: idx, row: payload });
      else await apiRequest('appendRow', { sheet: CONFIG.SHEETS.CONFIG, row: payload });
      await fetchConfig();
      closeModal();
    } catch(err){ alert('Erro: ' + err.message); }
  };
};

window.deleteConfig = async function(idx){
  if(!confirm('Excluir configuração?')) return;
  try {
    await apiRequest('deleteRow', { sheet: CONFIG.SHEETS.CONFIG, rowIndex: idx });
    await fetchConfig();
  } catch(err){ alert('Erro: ' + err.message); }
};

// ---------- Log ----------
async function fetchLog(){
  try {
    const resp = await apiRequest('getSheet', { sheet: CONFIG.SHEETS.LOG });
    const rows = resp.rows || [];
    let html = `<table class="table"><thead><tr><th>timestamp</th><th>event</th><th>details</th></tr></thead><tbody>`;
    rows.forEach(r=> html += `<tr><td>${escapeHtml(r.timestamp||'')}</td><td>${escapeHtml(r.event||'')}</td><td>${escapeHtml(r.details||'')}</td></tr>`);
    html += `</tbody></table>`;
    $('#logTableWrap').innerHTML = html;
  } catch(err){ console.error(err); $('#logTableWrap').innerHTML = '<div class="msg">Erro ao carregar log.</div>'; }
}

// ---------- Import Excel (client) ----------
async function handleFile(ev){
  const f = ev.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = async (e)=>{
    const data = e.target.result;
    const workbook = XLSX.read(data, { type: 'binary' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    if(!confirm(`Importar ${json.length} linhas para a aba Itens?`)) return;
    try {
      await apiRequest('importRows', { sheet: CONFIG.SHEETS.ITENS, rows: json });
      alert('Importação solicitada com sucesso.');
      await fetchItens();
    } catch(err){ alert('Erro: ' + err.message); }
  };
  reader.readAsBinaryString(f);
}

// ---------- Modal helpers ----------
function openModal(html){
  $('#modalBody').innerHTML = html;
  $('#modal').classList.remove('hidden');
}
function closeModal(){
  $('#modal').classList.add('hidden');
}

// ---------- utils ----------
function escapeHtml(s){
  return (s===null||s===undefined)?'':String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}

// ---------- boot ----------
document.addEventListener('DOMContentLoaded', initUI);
