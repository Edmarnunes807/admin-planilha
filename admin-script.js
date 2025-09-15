// Variáveis globais
let sheetsData = {
    dados: [],
    itens: [],
    log: []
};

let originalData = {
    dados: [],
    itens: []
};

let editMode = {
    dados: false,
    itens: false
};

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Configurar eventos das abas
    setupTabs();
    
    // Configurar botões de edição
    setupEditButtons();
    
    // Carregar dados da planilha
    loadSheetData();
    
    // Configurar envio do formulário
    document.getElementById('data-form').addEventListener('submit', submitFormData);
});

// Configurar o sistema de abas
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remover a classe ativa de todas as abas e conteúdos
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Adicionar a classe ativa à aba clicada
            tab.classList.add('active');
            
            // Mostrar o conteúdo correspondente
            const tabName = tab.getAttribute('data-tab');
            document.getElementById(`${tabName}-content`).classList.add('active');
        });
    });
}

// Configurar botões de edição
function setupEditButtons() {
    // Botões para aba Dados
    document.getElementById('edit-dados-btn').addEventListener('click', () => toggleEditMode('dados'));
    document.getElementById('save-dados-btn').addEventListener('click', () => saveChanges('dados'));
    document.getElementById('cancel-dados-btn').addEventListener('click', () => cancelEdit('dados'));
    
    // Botões para aba Itens
    document.getElementById('edit-itens-btn').addEventListener('click', () => toggleEditMode('itens'));
    document.getElementById('save-itens-btn').addEventListener('click', () => saveChanges('itens'));
    document.getElementById('cancel-itens-btn').addEventListener('click', () => cancelEdit('itens'));
}

// Carregar dados da planilha do Google Sheets via Apps Script
async function loadSheetData() {
    showLoading(true);
    hideMessage();
    
    try {
        // Verificar se a URL do script está configurada
        if (!CONFIG.SCRIPT_URL || CONFIG.SCRIPT_URL === 'SUA_URL_DO_APPS_SCRIPT_AQUI') {
            throw new Error('URL do Apps Script não configurada. Atualize o arquivo config.js');
        }
        
        // Carregar dados de cada aba usando JSONP para evitar problemas de CORS
        const [dadosData, itensData, logData] = await Promise.all([
            fetchJsonp(`${CONFIG.SCRIPT_URL}?action=getData&sheet=Dados`),
            fetchJsonp(`${CONFIG.SCRIPT_URL}?action=getData&sheet=Itens`),
            fetchJsonp(`${CONFIG.SCRIPT_URL}?action=getData&sheet=Log`)
        ]);
        
        // Armazenar dados
        sheetsData.dados = processSheetData(dadosData);
        sheetsData.itens = processSheetData(itensData);
        sheetsData.log = processSheetData(logData);
        
        // Fazer cópia dos dados originais para edição
        originalData.dados = JSON.parse(JSON.stringify(sheetsData.dados));
        originalData.itens = JSON.parse(JSON.stringify(sheetsData.itens));
        
        // Preencher as tabelas com os dados
        populateTable('dados');
        populateTable('itens');
        populateTable('log');
        
        showLoading(false);
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showMessage('Erro ao carregar dados da planilha. Verifique o console para mais detalhes.', 'error');
        showLoading(false);
    }
}

// Função para fazer requisições JSONP (contorna problemas de CORS)
function fetchJsonp(url) {
    return new Promise((resolve, reject) => {
        // Criar um callback único
        const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
        
        // Adicionar o script à página
        const script = document.createElement('script');
        script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
        
        // Definir a função de callback global
        window[callbackName] = function(data) {
            delete window[callbackName];
            document.body.removeChild(script);
            resolve(data);
        };
        
        // Tratamento de erro
        script.onerror = function() {
            delete window[callbackName];
            document.body.removeChild(script);
            reject(new Error('JSONP request failed'));
        };
        
        document.body.appendChild(script);
    });
}

// Processar dados da planilha (converter array de arrays para array de objetos)
function processSheetData(data) {
    if (!data || !data.values || data.values.length < 2) return [];
    
    const headers = data.values[0];
    return data.values.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index] || '';
        });
        return obj;
    });
}

// Preencher uma tabela com os dados carregados
function populateTable(tableName) {
    const tableBody = document.getElementById(`${tableName}-body`);
    tableBody.innerHTML = '';
    
    if (!sheetsData[tableName] || sheetsData[tableName].length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = tableName === 'log' ? 3 : (tableName === 'itens' ? 7 : 11);
        td.textContent = 'Nenhum dado encontrado';
        td.style.textAlign = 'center';
        td.style.padding = '20px';
        tr.appendChild(td);
        tableBody.appendChild(tr);
        return;
    }
    
    sheetsData[tableName].forEach((row, index) => {
        const tr = document.createElement('tr');
        
        // Adicionar células com base nos dados
        Object.entries(row).forEach(([key, value]) => {
            const td = document.createElement('td');
            
            if (editMode[tableName] && tableName !== 'log') {
                // Modo de edição - criar campos de entrada
                const input = document.createElement('input');
                input.type = 'text';
                input.value = value;
                input.dataset.field = key;
                input.dataset.index = index;
                td.appendChild(input);
                td.classList.add('editable');
            } else {
                // Modo de visualização - mostrar texto simples
                td.textContent = value;
            }
            
            tr.appendChild(td);
        });
        
        // Adicionar coluna de ações para tabelas editáveis
        if (tableName !== 'log') {
            const actionsTd = document.createElement('td');
            actionsTd.className = 'actions';
            
            if (editMode[tableName]) {
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Excluir';
                deleteBtn.className = 'delete-btn';
                deleteBtn.addEventListener('click', () => deleteRow(tableName, index));
                actionsTd.appendChild(deleteBtn);
            }
            
            tr.appendChild(actionsTd);
        }
        
        tableBody.appendChild(tr);
    });
}

// Alternar modo de edição
function toggleEditMode(tableName) {
    editMode[tableName] = true;
    updateEditButtons(tableName);
    populateTable(tableName);
}

// Cancelar edição
function cancelEdit(tableName) {
    editMode[tableName] = false;
    // Restaurar dados originais
    sheetsData[tableName] = JSON.parse(JSON.stringify(originalData[tableName]));
    updateEditButtons(tableName);
    populateTable(tableName);
}

// Atualizar estado dos botões de edição
function updateEditButtons(tableName) {
    const editBtn = document.getElementById(`edit-${tableName}-btn`);
    const saveBtn = document.getElementById(`save-${tableName}-btn`);
    const cancelBtn = document.getElementById(`cancel-${tableName}-btn`);
    
    if (editMode[tableName]) {
        editBtn.disabled = true;
        saveBtn.disabled = false;
        cancelBtn.disabled = false;
    } else {
        editBtn.disabled = false;
        saveBtn.disabled = true;
        cancelBtn.disabled = true;
    }
}

// Salvar alterações
async function saveChanges(tableName) {
    showLoading(true);
    hideMessage();
    
    try {
        // Coletar dados editados
        const inputs = document.querySelectorAll(`#${tableName}-body input`);
        inputs.forEach(input => {
            const index = parseInt(input.dataset.index);
            const field = input.dataset.field;
            sheetsData[tableName][index][field] = input.value;
        });
        
        // Preparar dados para envio
        const headers = Object.keys(sheetsData[tableName][0] || {});
        const values = sheetsData[tableName].map(row => headers.map(header => row[header]));
        
        // Enviar dados para o servidor usando formulário (contorna CORS)
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = CONFIG.SCRIPT_URL;
        form.style.display = 'none';
        
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'data';
        input.value = JSON.stringify({
            action: 'updateData',
            sheet: tableName,
            headers: headers,
            values: values
        });
        
        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
        
        // Não esperamos resposta pois é um submit de formulário
        showMessage('Dados enviados para processamento. Recarregue a página para ver as alterações.', 'success');
        showLoading(false);
        
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        showMessage('Erro ao salvar dados. Verifique o console para mais detalhes.', 'error');
        showLoading(false);
    }
}

// Excluir linha
function deleteRow(tableName, index) {
    sheetsData[tableName].splice(index, 1);
    populateTable(tableName);
}

// Enviar dados do formulário para a planilha via Apps Script
async function submitFormData(event) {
    event.preventDefault();
    showLoading(true);
    hideMessage();
    
    try {
        // Verificar se a URL do script está configurada
        if (!CONFIG.SCRIPT_URL || CONFIG.SCRIPT_URL === 'SUA_URL_DO_APPS_SCRIPT_AQUI') {
            throw new Error('URL do Apps Script não configurada. Atualize o arquivo config.js');
        }
        
        // Coletar dados do formulário
        const formData = new FormData(event.target);
        const data = {
            timestamp: new Date().toISOString(),
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            item_id: formData.get('item_id'),
            item_label: formData.get('item_label'),
            comment: formData.get('comment'),
            type: formData.get('type'),
            amount: formData.get('amount'),
            comment_visible: formData.get('comment_visible')
        };
        
        // Enviar dados via formulário (contorna CORS)
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = CONFIG.SCRIPT_URL;
        form.style.display = 'none';
        
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'data';
        input.value = JSON.stringify({
            action: 'addRow',
            sheet: 'Dados',
            data: data
        });
        
        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
        
        showMessage('Dados enviados com sucesso! A página será recarregada.', 'success');
        
        // Recarregar a página após um breve delay
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('Erro ao enviar dados:', error);
        showMessage('Erro ao enviar dados. Verifique o console para mais detalhes.', 'error');
        showLoading(false);
    }
}

// Funções auxiliares para UI
function showMessage(message, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    
    // Auto-esconder mensagem após 5 segundos
    setTimeout(() => {
        hideMessage();
    }, 5000);
}

function hideMessage() {
    document.getElementById('message').style.display = 'none';
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}