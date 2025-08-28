import api from './api';

export const authService = {
  // Login
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  // Cambiar contraseña
  changePassword: async (passwordData) => {
    const response = await api.post('/auth/change-password', passwordData);
    return response.data;
  },

  // Logout
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  // Obtener perfil
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  }
};

export const userService = {
  // Crear usuario
  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  // Obtener usuarios
  getUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },

  // Actualizar usuario
  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  // Eliminar usuario
  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  }
};

export const ticketService = {
  // Obtener tickets con filtros
  getTickets: async (params = {}) => {
    const response = await api.get('/tickets', { params });
    return response.data;
  },

  // Imprimir ticket
  printTicket: async (ticketId, printData) => {
    const response = await api.post(`/tickets/${ticketId}/print`, printData);
    return response.data;
  },

  // Reimprimir ticket
  reprintTicket: async (ticketId, reprintData) => {
    const response = await api.post(`/tickets/${ticketId}/reprint`, reprintData);
    return response.data;
  },

  // Obtener tickets por transacción
  getTicketsByTransaction: async (transactionId) => {
    const response = await api.get(`/tickets/transaction/${transactionId}`);
    return response.data;
  },

  // Obtener estadísticas
  getStats: async (params = {}) => {
    const response = await api.get('/tickets/stats', { params });
    return response.data;
  }
};

export const auditService = {
  // Obtener logs de auditoría
  getLogs: async (params = {}) => {
    const response = await api.get('/audit', { params });
    return response.data;
  },

  // Obtener resumen de auditoría
  getSummary: async (params = {}) => {
    const response = await api.get('/audit/summary', { params });
    return response.data;
  }
};

export const impresionService = {
  // Crear petición de impresión
  createRequest: async (requestData) => {
    const response = await api.post('/impresion/request', requestData);
    return response.data;
  },

  // Obtener cola de impresión (para impresores)
  getQueue: async () => {
    const response = await api.get('/impresion/queue');
    return response.data;
  },

  // Obtener mis peticiones de impresión (para staff/jefe)
  getMyRequests: async (params = {}) => {
    const response = await api.get('/impresion/my-requests', { params });
    return response.data;
  },

  // Obtener petición por transaction ID
  getByTransactionId: async (transactionId, puntoTrabajo = null) => {
    const url = puntoTrabajo 
      ? `/impresion/transaction/${transactionId}/${puntoTrabajo}`
      : `/impresion/transaction/${transactionId}`;
    const response = await api.get(url);
    return response.data;
  },

  // Actualizar estado de petición
  updateStatus: async (id, status) => {
    const response = await api.put(`/impresion/${id}/status`, { estado: status });
    return response.data;
  },

  // Obtener estadísticas
  getStats: async () => {
    const response = await api.get('/impresion/stats');
    return response.data;
  }
};
