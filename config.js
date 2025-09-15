// config.js - configure aqui
const CONFIG = {
  // URL do Web App (copie do deploy do Apps Script)
  API_ENDPOINT: 'https://script.google.com/macros/s/AKfycbyMVaSKetrmHJ2mMZLbrmKbOaXEABHW23r56CSGQQNTlECEuKZ-MUDR5e5Y1NDfMmwXKw/exec',

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

  // 🔽🔽🔽 MODIFICAR ESTA LINHA 🔽🔽🔽
  // Lista local de usuários (prioritário sobre aba Usuarios). Exemplo:
  USERS: [{ username: 'edmar', password: '12345', role: 'admin' }
    // Adicione logins aqui se quiser (opcional)
    // { username: 'admin', password: 'admin123', role: 'admin' }
  ]
  // 🔼🔼🔼 FIM DA MODIFICAÇÃO 🔼🔼🔼
};