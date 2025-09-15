// Variáveis globais
let sheetsData = {
    dados: [],
    itens: [],
    log: []
};

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Configurar eventos das abas
    setupTabs();
    
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

// Carregar dados da planilha do Google Sheets via Apps Script
async function loadSheetData() {
    showLoading(true);
    hideMessage();
    
    try {
        // Verificar se a URL do script está configurada
        if (!CONFIG.SCRIPT_URL || CONFIG.SCRIPT_URL === 'SUA_URL_DO_APPS_SCRIPT_AQUI') {
            throw new Error('URL do Apps Script não configurada. Atualize o arquivo config.js');
        }
        
        // Carregar dados de cada aba
        const [dadosResponse, itensResponse, logResponse] = await Promise.all([
            fetch(`${CONFIG.SCRIPT_URL}?sheet=Dados`),
            fetch(`${CONFIG.SCRIPT_URL}?sheet=Itens`),
            fetch(`${CONFIG.SCRIPT_URL}?sheet=Log`)
        ]);
        
        if (!dadosResponse.ok || !itensResponse.ok || !logResponse.ok) {
            throw new Error('Erro ao carregar dados da planilha');
        }
        
        // Processar respostas
        const [dadosData, itensData, logData] = await Promise.all([
            dadosResponse.json(),
            itensResponse.json(),
            logResponse.json()
        ]);
        
        // Armazenar dados
        sheetsData.dados = processSheetData(dadosData);
        sheetsData.itens = processSheetData(itensData);
        sheetsData.log = processSheetData(logData);
        
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
    
    sheetsData[tableName].forEach(row => {
        const tr = document.createElement('tr');
        
        // Adicionar células com base nos dados
        Object.values(row).forEach(value => {
            const td = document.createElement('td');
            td.textContent = value;
            tr.appendChild(td);
        });
        
        tableBody.appendChild(tr);
    });
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
        
        // Enviar dados via POST para o Apps Script
        const response = await fetch(CONFIG.SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error('Erro ao enviar dados para a planilha');
        }
        
        const result = await response.json();
        
        if (result.result === 'success') {
            // Limpar formulário
            event.target.reset();
            
            // Recarregar dados para mostrar a nova entrada
            await loadSheetData();
            
            showMessage('Dados enviados com sucesso!', 'success');
        } else {
            throw new Error(result.error || 'Erro desconhecido ao enviar dados');
        }
        
        showLoading(false);
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
}

function hideMessage() {
    document.getElementById('message').style.display = 'none';
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}