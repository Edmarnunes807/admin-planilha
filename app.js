// ---------------- API REQUEST ----------------
async function apiRequest(action, data = {}) {
  const body = { action, ...data };
  if (CONFIG.API_KEY) body.apiKey = CONFIG.API_KEY;

  console.log("Enviando requisição:", CONFIG.API_ENDPOINT, body);

  try {
    const res = await fetch(CONFIG.API_ENDPOINT, {
      method: "POST",
      // ⚠️ não setamos Content-Type para evitar preflight CORS (405 error)
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

// ---------------- DADOS ----------------
async function carregarDados(sheet) {
  try {
    const data = await apiRequest("getSheet", { sheet });
    return data.rows || [];
  } catch (err) {
    console.error("Erro carregar dados:", err);
    return [];
  }
}

async function salvarLinha(sheet, rowIndex, row) {
  return await apiRequest("updateRow", { sheet, rowIndex, row });
}

async function adicionarLinha(sheet, row) {
  return await apiRequest("appendRow", { sheet, row });
}

async function deletarLinha(sheet, rowIndex) {
  return await apiRequest("deleteRow", { sheet, rowIndex });
}

async function importarLinhas(sheet, rows) {
  return await apiRequest("importRows", { sheet, rows });
}

// ---------------- UI: renderização ----------------
async function renderTabela(sheet) {
  // 🔽🔽🔽 MODIFICAR ESTA PARTE 🔽🔽🔽
  let container;
  if (sheet === 'Dados') {
    container = document.getElementById("dadosTableWrap");
  } else if (sheet === 'Itens') {
    container = document.getElementById("itensTableWrap");
  } else if (sheet === 'Config') {
    container = document.getElementById("configTableWrap");
  } else if (sheet === 'Log') {
    container = document.getElementById("logTableWrap");
  } else {
    container = document.getElementById("dadosTableWrap");
  }
  // 🔼🔼🔼 FIM DA MODIFICAÇÃO 🔼🔼🔼

  container.innerHTML = "<p>Carregando...</p>";

  try {
    const rows = await carregarDados(sheet);
    if (rows.length === 0) {
      container.innerHTML = "<p>Nenhum dado encontrado.</p>";
      return;
    }

    const headers = Object.keys(rows[0]);
    let html = "<table><thead><tr>";
    headers.forEach(h => {
      html += `<th>${h}</th>`;
    });
    html += "<th>Ações</th></tr></thead><tbody>";

    rows.forEach((row, i) => {
      html += "<tr>";
      headers.forEach(h => {
        html += `<td contenteditable="true" data-row="${i}" data-col="${h}">${row[h] || ""}</td>`;
      });
      html += `<td>
        <button onclick="btnSalvar('${sheet}', ${i})">💾</button>
        <button onclick="btnDeletar('${sheet}', ${i})">🗑</button>
      </td>`;
      html += "</tr>";
    });

    html += "</tbody></table>";
    container.innerHTML = html;

  } catch (err) {
    container.innerHTML = `<p class="error">Erro ao carregar dados: ${err.message}</p>`;
  }
}

async function btnSalvar(sheet, rowIndex) {
  const cells = document.querySelectorAll(`[data-row="${rowIndex}"]`);
  const row = {};
  cells.forEach(cell => {
    row[cell.dataset.col] = cell.textContent.trim();
  });

  try {
    await salvarLinha(sheet, rowIndex, row);
    alert("Linha salva com sucesso!");
  } catch (err) {
    alert("Erro ao salvar: " + err.message);
  }
}

async function btnDeletar(sheet, rowIndex) {
  if (!confirm("Tem certeza que deseja excluir esta linha?")) return;
  try {
    await deletarLinha(sheet, rowIndex);
    alert("Linha excluída!");
    renderTabela(sheet);
  } catch (err) {
    alert("Erro ao excluir: " + err.message);
  }
}

// ---------------- IMPORTAR EXCEL ----------------
document.getElementById("importFile")?.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (evt) {
    const data = new Uint8Array(evt.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet);

    if (rows.length > 0) {
      if (confirm(`Importar ${rows.length} linhas para Itens?`)) {
        try {
          await importarLinhas("Itens", rows);
          alert("Importação concluída!");
          renderTabela("Itens");
        } catch (err) {
          alert("Erro ao importar: " + err.message);
        }
      }
    }
  };
  reader.readAsArrayBuffer(file);
});

// ---------------- INICIALIZAÇÃO ----------------
document.addEventListener("DOMContentLoaded", () => {
  // 🔽🔽🔽 MODIFICAR ESTA PARTE 🔽🔽🔽
  const user = getLoggedUser();
  const loginForm = document.getElementById("loginOverlay"); // ID CORRETO
  const appContent = document.getElementById("appContent");
  const logoutBtn = document.getElementById("logoutBtn");
  const userDisplay = document.getElementById("userName"); // ID CORRETO

  if (user) {
    loginForm.style.display = "none";
    appContent.style.display = "block";
    userDisplay.textContent = user.username; // USAR username EM VEZ DE name
    renderTabela("Dados"); // carrega a aba padrão
  } else {
    loginForm.style.display = "block";
    appContent.style.display = "none";
  }
  // 🔼🔼🔼 FIM DA MODIFICAÇÃO 🔼🔼🔼

  document.getElementById("loginBtn")?.addEventListener("click", () => {
    const username = document.getElementById("loginUser").value.trim();
    const password = document.getElementById("loginPass").value.trim();

    if (login(username, password)) {
      location.reload();
    } else {
      alert("Usuário ou senha inválidos!");
    }
  });

  logoutBtn?.addEventListener("click", logout);

  // navegação pelas abas
  document.querySelectorAll("[data-sheet]").forEach(btn => {
    btn.addEventListener("click", () => {
      renderTabela(btn.dataset.sheet);
    });
  });
});