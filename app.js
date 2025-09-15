// app.js

// Função genérica para fazer requests à API (Apps Script)
async function apiRequest(action, data = {}) {
  const body = { action, ...data };
  if (CONFIG.API_KEY) body.apiKey = CONFIG.API_KEY;

  console.log("Enviando requisição:", CONFIG.API_ENDPOINT, body);

  try {
    const res = await fetch(CONFIG.API_ENDPOINT, {
      method: "POST",
      // ⚠️ Não definimos Content-Type para evitar preflight (CORS 405)
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`Erro API (${res.status}): ${await res.text()}`);
    }

    const result = await res.json();
    console.log("Resposta API:", result);
    return result;

  } catch (err) {
    console.error("Erro ao chamar API:", err);
    throw err;
  }
}

// ---------------- LOGIN ----------------
function login(username, password) {
  const user = CONFIG.USERS.find(
    u => u.username === username && u.password === password
  );
  if (user) {
    localStorage.setItem("loggedUser", JSON.stringify(user));
    return true;
  }
  return false;
}

function logout() {
  localStorage.removeItem("loggedUser");
  location.reload();
}

function getLoggedUser() {
  const user = localStorage.getItem("loggedUser");
  return user ? JSON.parse(user) : null;
}

// ---------------- CARREGAR DADOS ----------------
async function carregarDados(sheet) {
  try {
    const data = await apiRequest("getSheet", { sheet });
    return data.rows || [];
  } catch (err) {
    console.error("Erro carregar dados:", err);
    return [];
  }
}

// ---------------- SALVAR E DELETAR ----------------
async function salvarLinha(sheet, rowIndex, row) {
  return await apiRequest("updateRow", { sheet, rowIndex, row });
}

async function adicionarLinha(sheet, row) {
  return await apiRequest("appendRow", { sheet, row });
}

async function deletarLinha(sheet, rowIndex) {
  return await apiRequest("deleteRow", { sheet, rowIndex });
}

// ---------------- IMPORTAR EM MASSA ----------------
async function importarLinhas(sheet, rows) {
  return await apiRequest("importRows", { sheet, rows });
}

// ---------------- INICIALIZAÇÃO ----------------
document.addEventListener("DOMContentLoaded", () => {
  const user = getLoggedUser();
  const loginForm = document.getElementById("loginForm");
  const appContent = document.getElementById("appContent");
  const logoutBtn = document.getElementById("logoutBtn");
  const userDisplay = document.getElementById("userDisplay");

  if (user) {
    loginForm.style.display = "none";
    appContent.style.display = "block";
    userDisplay.textContent = user.username;
  } else {
    loginForm.style.display = "block";
    appContent.style.display = "none";
  }

  document.getElementById("loginBtn")?.addEventListener("click", () => {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (login(username, password)) {
      location.reload();
    } else {
      alert("Usuário ou senha inválidos!");
    }
  });

  logoutBtn?.addEventListener("click", logout);
});
