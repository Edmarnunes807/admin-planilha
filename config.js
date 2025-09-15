// CONFIG - edite aqui
const CONFIG = {
  // URL do seu Google Apps Script Web App (deploy > "Executar app como: Eu" > "Quem tem acesso: Anyone")
  // Exemplo: 'https://script.google.com/macros/s/AKfy.../exec'
  API_ENDPOINT: 'https://script.google.com/macros/s/AKfycbyS8sInMMHb1hazQRalYm6YIntBpMkymqOSHyRiO8dXbill2K4djRh8CVRLXnMGSb7JEw/exec',

  // Nomes das abas na sua planilha (case-sensitive)
  SHEETS: {
    DADOS: 'Dados',
    ITENS: 'Itens',
    CONFIG: 'Config',
    LOG: 'Log',
    USUARIOS: 'Usuarios' // se quiser usar a aba de usuários, mantenha/complete ela
  },

  // --- LOGIN: Defina aqui os usuários (prioritário sobre a aba Usuarios) ---
  // Exemplo:
  // USERS: [
  //   { name: 'admin', password: 'senha123', role: 'admin' },
  //   { name: 'edmar', password: 'minhaSenha', role: 'editor' },
  // ]
  //
  // Se USERS estiver vazio ou ausente, o script tentará ler a aba 'Usuarios' da planilha (campo SHEETS.USUARIOS).
  USERS: [{ name: 'admin', password: 'senha123', role: 'admin' }
    // coloque aqui os logins que quiser:
    // { name: 'admin', password: 'admin123', role: 'admin' },
  ],

  // Se quiser forçar TLS/https checar origin no backend também
};
