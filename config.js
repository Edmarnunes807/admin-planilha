// config.js - configure aqui
const CONFIG = {
  // URL do Web App (copie do deploy do Apps Script)
  API_ENDPOINT: 'https://script.google.com/macros/s/XXXXXXXXXXXX/exec',

  // Opcional: chave de API definida nas propriedades do Apps Script (recomendado)
  API_KEY: '',

  // Abas da planilha (case-sensitive)
  SHEETS: {
    DADOS: 'Dados',
    ITENS: 'Itens',
    CONFIG: 'Config',
    LOG: 'Log',
    USUARIOS: 'Usuarios'
  },

  // Lista local de usuários (prioritário sobre aba Usuarios). Exemplo:
  // USERS: [{ name: 'admin', password: 'senha123', role: 'admin' }]
  USERS: [{ name: 'edmar', password: '12345', role: 'admin' }
    // Adicione logins aqui se quiser (opcional)
    // { name: 'admin', password: 'admin123', role: 'admin' }
  ]
};
