(function () {
  if (!SHEET_ENDPOINT) {
    alert("Configure SHEET_ENDPOINT em config.js");
    return;
  }

  const itemsArea = document.getElementById("itemsArea");
  const dadosArea = document.getElementById("dadosArea");

  async function fetchJson(url) {
    const r = await fetch(url);
    return r.json();
  }

  async function post(obj) {
    const form = new URLSearchParams();
    for (const k in obj) form.append(k, obj[k]);
    const r = await fetch(SHEET_ENDPOINT, { method: "POST", body: form });
    try {
      const j = await r.json();
      return j.status === "ok";
    } catch {
      return false;
    }
  }

  // ---------------- Itens ----------------
  async function loadItems() {
    itemsArea.innerHTML = "Carregando...";
    const j = await fetchJson(`${SHEET_ENDPOINT}?action=admin_getItems`);
    renderItems(j.items || []);
  }

  function renderItems(items) {
    if (!items.length) {
      itemsArea.innerHTML = "Sem itens.";
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "table-wrap";

    items.forEach((it) => {
      const card = document.createElement("div");
      card.className = "item-card";

      card.innerHTML = `
        <h3>${it.label || "(sem nome)"}</h3>
        <div class="field"><label>ID</label><span>${it.id || ""}</span></div>
        <div class="field"><label>Lista</label><span>${it.list || ""}</span></div>
        <div class="field"><label>Limite</label><span>${it.limit || ""}</span></div>
        <div class="field"><label>Preço</label><span>${it.price || ""}</span></div>
        <div class="field"><label>Visível</label><span>${it.visible || "TRUE"}</span></div>
        <div class="card-actions">
          <button class="btn edit">✏️ Editar</button>
          <button class="btn del">🗑️ Excluir</button>
        </div>
      `;

      card.querySelector(".edit").onclick = () => enterEditItem(card, it);
      card.querySelector(".del").onclick = async () => {
        if (confirm("Excluir item?") && (await post({ action: "admin_deleteItem", __row: it.__row }))) {
          loadItems();
        }
      };

      wrap.appendChild(card);
    });

    itemsArea.innerHTML = "";
    itemsArea.appendChild(wrap);
  }

  function enterEditItem(card, it) {
    card.innerHTML = `
      <h3>Editando: ${it.label}</h3>
      <div class="field"><label>ID</label><input class="input" data-f="id" value="${it.id || ""}"></div>
      <div class="field"><label>Label</label><input class="input" data-f="label" value="${it.label || ""}"></div>
      <div class="field"><label>Lista</label><input class="input" data-f="list" value="${it.list || ""}"></div>
      <div class="field"><label>Limite</label><input class="input" data-f="limit" value="${it.limit || ""}"></div>
      <div class="field"><label>Preço</label><input class="input" data-f="price" value="${it.price || ""}"></div>
      <div class="field"><label>Visível</label>
        <select class="input" data-f="visible">
          <option value="TRUE" ${it.visible === "TRUE" ? "selected" : ""}>Sim</option>
          <option value="FALSE" ${it.visible === "FALSE" ? "selected" : ""}>Não</option>
        </select>
      </div>
      <div class="card-actions">
        <button class="btn save">💾 Salvar</button>
        <button class="btn cancel">✖️ Cancelar</button>
      </div>
    `;

    card.querySelector(".save").onclick = async () => {
      const payload = { action: "admin_updateItem", __row: it.__row };
      card.querySelectorAll("[data-f]").forEach((inp) => (payload[inp.dataset.f] = inp.value));
      if (await post(payload)) loadItems();
    };
    card.querySelector(".cancel").onclick = () => loadItems();
  }

  // ---------------- Dados ----------------
  async function loadDados() {
    dadosArea.innerHTML = "Carregando...";
    const j = await fetchJson(`${SHEET_ENDPOINT}?action=admin_getData`);
    renderDados(j.dados || []);
  }

  function renderDados(dados) {
    if (!dados.length) {
      dadosArea.innerHTML = "Sem registros.";
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "table-wrap";

    const keys = Object.keys(dados[0]).filter((k) => k !== "__row");

    dados.forEach((row) => {
      const card = document.createElement("div");
      card.className = "data-card";

      card.innerHTML = `
        <h3>${row.name || "Registro"}</h3>
        ${keys
          .map(
            (k) =>
              `<div class="field"><label>${k}</label><span>${row[k] || ""}</span></div>`
          )
          .join("")}
        <div class="card-actions">
          <button class="btn edit">✏️ Editar</button>
          <button class="btn del">🗑️ Excluir</button>
        </div>
      `;

      card.querySelector(".edit").onclick = () => enterEditData(card, row, keys);
      card.querySelector(".del").onclick = async () => {
        if (confirm("Excluir registro?") && (await post({ action: "admin_deleteData", __row: row.__row }))) {
          loadDados();
        }
      };

      wrap.appendChild(card);
    });

    dadosArea.innerHTML = "";
    dadosArea.appendChild(wrap);
  }

  function enterEditData(card, row, keys) {
    card.innerHTML = `
      <h3>Editando registro</h3>
      ${keys
        .map(
          (k) =>
            `<div class="field"><label>${k}</label><input class="input" data-f="${k}" value="${row[k] || ""}"></div>`
        )
        .join("")}
      <div class="card-actions">
        <button class="btn save">💾 Salvar</button>
        <button class="btn cancel">✖️ Cancelar</button>
      </div>
    `;

    card.querySelector(".save").onclick = async () => {
      const payload = { action: "admin_updateData", __row: row.__row };
      card.querySelectorAll("[data-f]").forEach((inp) => (payload[inp.dataset.f] = inp.value));
      if (await post(payload)) loadDados();
    };
    card.querySelector(".cancel").onclick = () => loadDados();
  }

  // ---------------- Listeners ----------------
  document.getElementById("refreshItems").onclick = loadItems;
  document.getElementById("refreshDados").onclick = loadDados;
  document.getElementById("addItemBtn").onclick = async () => {
    const id = prompt("ID do item:");
    const label = prompt("Label:");
    if (!id || !label) return;
    if (await post({ action: "admin_addItem", id, label })) {
      loadItems();
    }
  };

  // init
  loadItems();
  loadDados();
})();
