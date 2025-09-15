const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

let currentUser = null;

async function apiRequest(action, payload = {}) {
  try {
    const body = { 
      action, 
      username: currentUser?.name || currentUser?.usuario, 
      password: currentUser?.password || currentUser?.senha,
      ...payload 
    };
    
    console.log('Enviando requisição:', { action, payload: { ...payload, password: '***' } });
    
    const res = await fetch(CONFIG.API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    console.log('Resposta status:', res.status);
    
    if (!res.ok) {
      if (res.status === 401) logout();
      throw new Error('Erro HTTP: ' + res.status);
    }
    
    const data = await res.json();
    console.log('Resposta data:', data);
    
    if (data.error) throw new Error(data.error);
    return data;
  } catch (error) {
    console.error('Erro completo na requisição:', error);
    throw error;
  }
}

function initUI(){
  $$('.navbtn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.navbtn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      showView(btn.dataset.view);
    });
  });

  $('#logoutBtn').onclick = logout;

  $('#loginBtn').onclick = handleLogin;

  $('#searchDados').addEventListener('input', renderDadosTable);

  $('#addItemBtn').addEventListener('click', ()=>openItemModal('add'));
  $('#addConfigBtn').addEventListener('click', ()=>openConfigModal('add'));

  $('#closeModal').addEventListener('click', closeModal);

  $('#fileInput').addEventListener('change', handleFile);

  showView('dados');
  if (!$('#loginOverlay').style.display) $('#loginOverlay').style.display = 'flex';
}

function showView(name){
  $$('.view').forEach(v=>v.classList.add('hidden'));
  $(`#view-${name}`).classList.remove('hidden');
  if (name === 'dados') fetchDados();
  if (name === 'itens') fetchItens();
  if (name === 'config') fetchConfig();
  if (name === 'log') fetchLog();
}

async function handleLogin(){
  const user = $('#loginUser').value.trim();
  const pass = $('#loginPass').value;
  $('#loginMsg').textContent = 'Verificando...';

  try {
    const resp = await apiRequest('getUsers', { sheet: CONFIG.SHEETS.USUARIOS });
    const users = resp.users || [];
    const found = users.find(u => 
      (u.name || u.usuario || '').toString() === user && 
      (u.password || u.senha || '').toString() === pass
    );
    if (!found) {
      $('#loginMsg').textContent = 'Usuário ou senha inválidos.';
      return;
    }
    currentUser = found;
    $('#userName').textContent = currentUser.name || currentUser.usuario;
    $('#logoutBtn').classList.remove('hidden');
    $('#loginOverlay').style.display = 'none';
    $('#loginMsg').textContent = '';
    const active = document.querySelector('.navbtn.active').dataset.view;
    showView(active);
  } catch (err) {
    console.error(err);
    $('#loginMsg').textContent = 'Erro ao validar (ver console).';
  }
}

function logout() {
  currentUser = null;
  $('#userName').textContent = '';
  $('#logoutBtn').classList.add('hidden');
  $('#loginOverlay').style.display = 'flex';
}

// ... (o restante das funções fetchDados, renderDadosTable, etc. permanecem iguais)
// Mantenha todo o resto do código do script.js original