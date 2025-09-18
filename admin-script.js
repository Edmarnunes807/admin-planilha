(function () {
  if (!SHEET_ENDPOINT) {
    alert("Configure SHEET_ENDPOINT em config.js");
    return;
  }

  // áreas
  const itemsArea = document.getElementById("itemsArea");
  const dadosArea = document.getElementById("dadosArea");
  const commentsArea = document.getElementById("commentsArea");
  const configArea = document.getElementById("configArea");

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

    // mais recentes primeiro
    items.slice().reverse().forEach((it) => {
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
      ${["id","label","list","limit","price"].map(f=>`
        <div class="field"><label>${f}</label><input class="input" data-f="${f}" value="${it[f]||""}"></div>
      `).join("")}
      <div class="field"><label>Visível</label>
        <select class="input" data-f="visible">
          <option value="TRUE" ${it.visible==="TRUE"?"selected":""}>Sim</option>
          <option value="FALSE" ${it.visible==="FALSE"?"selected":""}>Não</option>
        </select>
      </div>
      <div class="card-actions">
        <button class="btn save">💾 Salvar</button>
        <button class="btn cancel">✖️ Cancelar</button>
      </div>
    `;
    card.querySelector(".save").onclick = async () => {
      const payload = { action: "admin_updateItem", __row: it.__row };
      card.querySelectorAll("[data-f]").forEach(inp => payload[inp.dataset.f] = inp.value);
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
    const keys = Object.keys(dados[0]).filter(k => k !== "__row");

    // mais recentes primeiro
    dados.slice().reverse().forEach((row) => {
      const card = document.createElement("div");
      card.className = "data-card";
      card.innerHTML = `
        <h3>${row.name || "Registro"}</h3>
        ${keys.map(k=>`<div class="field"><label>${k}</label><span>${row[k]||""}</span></div>`).join("")}
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

  function enterEditData(card,row,keys){
    card.innerHTML = `
      <h3>Editando registro</h3>
      ${keys.map(k=>`<div class="field"><label>${k}</label><input class="input" data-f="${k}" value="${row[k]||""}"></div>`).join("")}
      <div class="card-actions">
        <button class="btn save">💾 Salvar</button>
        <button class="btn cancel">✖️ Cancelar</button>
      </div>
    `;
    card.querySelector(".save").onclick = async ()=>{
      const payload = { action:"admin_updateData", __row:row.__row };
      card.querySelectorAll("[data-f]").forEach(inp=>payload[inp.dataset.f]=inp.value);
      if(await post(payload)) loadDados();
    };
    card.querySelector(".cancel").onclick=()=>loadDados();
  }

  // ---------------- Comments ----------------
  async function loadComments() {
    commentsArea.innerHTML = "Carregando...";
    const j = await fetchJson(`${SHEET_ENDPOINT}?action=admin_getComments`);
    renderComments(j.comments || []);
  }

  function renderComments(comments) {
    if (!comments.length) {
      commentsArea.innerHTML = "Sem comentários.";
      return;
    }
    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    const keys = Object.keys(comments[0]).filter(k => k !== "__row");

    // mais recentes primeiro
    comments.slice().reverse().forEach((row) => {
      const card = document.createElement("div");
      card.className = "comment-card";
      card.innerHTML = `
        <h3>${row.name || "Comentário"}</h3>
        ${keys.map(k=>`<div class="field"><label>${k}</label><span>${row[k]||""}</span></div>`).join("")}
        <div class="card-actions">
          <button class="btn edit">✏️ Editar</button>
          <button class="btn del">🗑️ Excluir</button>
        </div>
      `;
      card.querySelector(".edit").onclick = () => enterEditComment(card,row,keys);
      card.querySelector(".del").onclick = async ()=>{
        if(confirm("Excluir comentário?") && (await post({action:"admin_deleteComment",__row:row.__row}))){
          loadComments();
        }
      };
      wrap.appendChild(card);
    });
    commentsArea.innerHTML="";
    commentsArea.appendChild(wrap);
  }

  function enterEditComment(card,row,keys){
    card.innerHTML=`
      <h3>Editando comentário</h3>
      ${keys.map(k=>`<div class="field"><label>${k}</label><input class="input" data-f="${k}" value="${row[k]||""}"></div>`).join("")}
      <div class="card-actions">
        <button class="btn save">💾 Salvar</button>
        <button class="btn cancel">✖️ Cancelar</button>
      </div>
    `;
    card.querySelector(".save").onclick=async()=>{
      const payload={action:"admin_updateComment",__row:row.__row};
      card.querySelectorAll("[data-f]").forEach(inp=>payload[inp.dataset.f]=inp.value);
      if(await post(payload)) loadComments();
    };
    card.querySelector(".cancel").onclick=()=>loadComments();
  }

  // ---------------- Config ----------------
  async function loadConfig(){
    configArea.innerHTML="Carregando...";
    const j = await fetchJson(`${SHEET_ENDPOINT}?action=admin_getConfig`);
    const conf=j.config||{};
    renderConfig(conf);
  }

  function renderConfig(conf){
    const wrap=document.createElement("div");
    wrap.className="table-wrap";
    Object.keys(conf).forEach(k=>{
      const card=document.createElement("div");
      card.className="config-card";
      card.innerHTML=`
        <h3>${k}</h3>
        <div class="field"><label>Valor</label><span>${conf[k]}</span></div>
        <div class="card-actions"><button class="btn edit">✏️ Editar</button></div>
      `;
      card.querySelector(".edit").onclick=()=>enterEditConfig(card,k,conf[k]);
      wrap.appendChild(card);
    });
    configArea.innerHTML="";
    configArea.appendChild(wrap);
  }

  function enterEditConfig(card,key,value){
    card.innerHTML=`
      <h3>${key}</h3>
      <div class="field"><label>Valor</label><input class="input" data-f="value" value="${value||""}"></div>
      <div class="card-actions">
        <button class="btn save">💾 Salvar</button>
        <button class="btn cancel">✖️ Cancelar</button>
      </div>
    `;
    card.querySelector(".save").onclick=async()=>{
      const payload={action:"admin_updateConfig",key,value:card.querySelector("[data-f]").value};
      if(await post(payload)) loadConfig();
    };
    card.querySelector(".cancel").onclick=()=>loadConfig();
  }

  // ---------------- Listeners ----------------
  document.getElementById("refreshItems").onclick=loadItems;
  document.getElementById("refreshDados").onclick=loadDados;
  document.getElementById("refreshComments").onclick=loadComments;
  document.getElementById("refreshConfig").onclick=loadConfig;
  document.getElementById("addItemBtn").onclick=async()=>{
    const id=prompt("ID do item:");
    const label=prompt("Label:");
    if(!id||!label)return;
    if(await post({action:"admin_addItem",id,label})) loadItems();
  };

  // Tabs
  document.querySelectorAll(".tab").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p=>p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-"+btn.dataset.tab).classList.add("active");
    });
  });

  // init
  loadItems();
  loadDados();
  loadComments();
  loadConfig();
})();
