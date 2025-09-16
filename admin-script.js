(function(){
  if(!SHEET_ENDPOINT){ alert("Configure SHEET_ENDPOINT"); return; }
  const itemsArea = document.getElementById('itemsArea');
  const dadosArea = document.getElementById('dadosArea');

  async function fetchJson(url){ const r=await fetch(url); return r.json(); }
  async function post(obj){
    const form=new URLSearchParams(); for(const k in obj) form.append(k,obj[k]);
    const r=await fetch(SHEET_ENDPOINT,{method:'POST',body:form});
    try{const j=await r.json();return j.status==='ok';}catch{return false;}
  }

  async function loadItems(){
    itemsArea.innerHTML="Carregando...";
    const j=await fetchJson(`${SHEET_ENDPOINT}?action=admin_getItems`);
    renderItems(j.items||[]);
  }
  async function loadDados(){
    dadosArea.innerHTML="Carregando...";
    const j=await fetchJson(`${SHEET_ENDPOINT}?action=admin_getData`);
    renderDados(j.dados||[]);
  }

  function renderItems(items){
    if(!items.length){ itemsArea.innerHTML="Sem itens."; return; }
    const table=document.createElement("table"); table.className="table";
    table.innerHTML="<thead><tr><th>ID</th><th>Label</th><th>Lista</th><th>Limite</th><th>Preço</th><th>Visível</th><th>Ações</th></tr></thead>";
    const tbody=document.createElement("tbody");
    items.forEach(it=>{
      const tr=document.createElement("tr");
      tr.innerHTML=`
        <td><input class="input" data-f="id" value="${it.id||''}"></td>
        <td><input class="input" data-f="label" value="${it.label||''}"></td>
        <td><input class="input" data-f="list" value="${it.list||''}"></td>
        <td><input class="input" data-f="limit" value="${it.limit||''}"></td>
        <td><input class="input" data-f="price" value="${it.price||''}"></td>
        <td><select class="input" data-f="visible"><option value="TRUE" ${it.visible==='TRUE'?'selected':''}>Sim</option><option value="FALSE" ${it.visible==='FALSE'?'selected':''}>Não</option></select></td>
        <td><button class="btn save">Salvar</button><button class="btn del">Excluir</button></td>`;
      tr.querySelector(".save").onclick=async()=>{
        const payload={action:'admin_updateItem',__row:it.__row};
        tr.querySelectorAll("[data-f]").forEach(inp=>payload[inp.dataset.f]=inp.value);
        if(await post(payload)){alert("Salvo");loadItems();}
      };
      tr.querySelector(".del").onclick=async()=>{
        if(confirm("Excluir item?") && await post({action:'admin_deleteItem',__row:it.__row})){loadItems();}
      };
      tbody.appendChild(tr);
    });
    table.appendChild(tbody); itemsArea.innerHTML=""; itemsArea.appendChild(table);
  }

  function renderDados(dados){
    if(!dados.length){ dadosArea.innerHTML="Sem registros."; return; }
    const keys=Object.keys(dados[0]).filter(k=>k!=="__row");
    const table=document.createElement("table"); table.className="table";
    table.innerHTML="<thead><tr>"+keys.map(k=>`<th>${k}</th>`).join('')+"<th>Ações</th></tr></thead>";
    const tbody=document.createElement("tbody");
    dados.forEach(row=>{
      const tr=document.createElement("tr");
      tr.innerHTML=keys.map(k=>`<td><input class="input" data-f="${k}" value="${row[k]||''}"></td>`).join('')
        +`<td><button class="btn save">Salvar</button><button class="btn del">Excluir</button></td>`;
      tr.querySelector(".save").onclick=async()=>{
        const payload={action:'admin_updateData',__row:row.__row};
        tr.querySelectorAll("[data-f]").forEach(inp=>payload[inp.dataset.f]=inp.value);
        if(await post(payload)){alert("Atualizado");loadDados();}
      };
      tr.querySelector(".del").onclick=async()=>{
        if(confirm("Excluir registro?") && await post({action:'admin_deleteData',__row:row.__row})){loadDados();}
      };
      tbody.appendChild(tr);
    });
    table.appendChild(tbody); dadosArea.innerHTML=""; dadosArea.appendChild(table);
  }

  document.getElementById("refreshItems").onclick=loadItems;
  document.getElementById("refreshDados").onclick=loadDados;
  document.getElementById("addItemBtn").onclick=async()=>{
    const id=prompt("ID do item:"); const label=prompt("Label:"); if(!id||!label)return;
    if(await post({action:'admin_addItem',id,label})){loadItems();}
  };

  loadItems(); loadDados();
})();
