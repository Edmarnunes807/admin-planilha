// CONFIG - edite aqui
const CONFIG = {
  // URL do seu Google Apps Script Web App (deploy > "Executar app como: Eu" > "Quem tem acesso: Anyone")
  // Exemplo: 'https://script.google.com/macros/s/AKfy.../exec'
  API_ENDPOINT: 'https://script.google.com/macros/s/AKfycby6H3AP_b3ht1KFUiRixwUhyWZZFwNsQzwbUboNfSm2bFo1jUZIz5nq4CGf59yhMHs_/exec',

  // Nomes das abas na sua planilha (case-sensitive)
  SHEETS: {
    DADOS: 'Dados',
    ITENS: 'Itens',
    CONFIG: 'Config',
    LOG: 'Log',
    USUARIOS: 'Usuarios' // crie essa aba para logins: colunas: name,password,role
  },

  // Se quiser forçar TLS/https checar origin no backend também
};
