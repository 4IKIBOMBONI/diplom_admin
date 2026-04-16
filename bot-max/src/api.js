const axios = require('axios');
const fs = require('fs');
const path = require('path');

const logFile = path.resolve(__dirname, '../bot.log');
function log(msg) {
  const line = `[${new Date().toISOString()}] [api] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(logFile, line + '\n'); } catch (_) {}
}

const API_URL = process.env.API_URL || 'http://localhost:5000/api';
log(`API client initialized. BASE_URL=${API_URL}`);

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

const findOrCreateUser = async (maxId, maxUsername, fullName) => {
  try {
    const { data } = await apiClient.post('/auth/max', {
      maxId: String(maxId),
      maxUsername,
      fullName,
    });
    log(`findOrCreateUser OK: userId=${data.user?.id}, role=${data.user?.role}`);
    return data;
  } catch (error) {
    log(`findOrCreateUser ERROR: status=${error.response?.status} data=${JSON.stringify(error.response?.data)} msg=${error.message}`);
    return null;
  }
};

const getCategories = async () => {
  try {
    const { data } = await apiClient.get('/categories/public');
    return data;
  } catch (error) {
    log(`getCategories ERROR: ${error.response?.status} ${error.message}`);
    return [];
  }
};

const createTicket = async (token, ticketData) => {
  try {
    log(`POST /tickets ${JSON.stringify(ticketData)}`);
    const { data } = await apiClient.post('/tickets', ticketData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    log(`createTicket OK: ticketId=${data.id}`);
    return data;
  } catch (error) {
    log(`createTicket ERROR: ${error.response?.status} ${JSON.stringify(error.response?.data)}`);
    return null;
  }
};

const getUserTickets = async (token) => {
  try {
    const { data } = await apiClient.get('/tickets?limit=5&sortBy=createdAt&order=desc', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data.tickets || [];
  } catch (error) {
    log(`getUserTickets ERROR: ${error.response?.status} ${error.message}`);
    return [];
  }
};

const getPendingTickets = async (token) => {
  try {
    const { data } = await apiClient.get('/tickets/pending?limit=10', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data.tickets || [];
  } catch (error) {
    log(`getPendingTickets ERROR: ${error.response?.status} ${error.message}`);
    return [];
  }
};

const approveTicket = async (token, ticketId) => {
  try {
    const { data } = await apiClient.post(`/tickets/${ticketId}/approve`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  } catch (error) {
    log(`approveTicket ERROR: ${error.response?.status} ${JSON.stringify(error.response?.data)}`);
    return null;
  }
};

const rejectTicket = async (token, ticketId) => {
  try {
    const { data } = await apiClient.post(`/tickets/${ticketId}/reject`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  } catch (error) {
    log(`rejectTicket ERROR: ${error.response?.status} ${JSON.stringify(error.response?.data)}`);
    return null;
  }
};

const getAllTickets = async (token, status) => {
  try {
    let url = '/tickets?limit=10&sortBy=createdAt&order=desc';
    if (status) url += `&status=${status}`;
    const { data } = await apiClient.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data.tickets || [];
  } catch (error) {
    log(`getAllTickets ERROR: ${error.response?.status} ${error.message}`);
    return [];
  }
};

const updateTicketStatus = async (token, ticketId, status) => {
  try {
    const { data } = await apiClient.patch(`/tickets/${ticketId}`, { status }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  } catch (error) {
    log(`updateTicketStatus ERROR: ${error.response?.status} ${JSON.stringify(error.response?.data)}`);
    return null;
  }
};

const assignTicket = async (token, ticketId, assigneeId) => {
  try {
    const { data } = await apiClient.patch(`/tickets/${ticketId}`, { assigneeId }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  } catch (error) {
    log(`assignTicket ERROR: ${error.response?.status} ${JSON.stringify(error.response?.data)}`);
    return null;
  }
};

const getAdmins = async (token) => {
  try {
    const { data: adminData } = await apiClient.get('/users?role=ADMIN&limit=50', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { data: superData } = await apiClient.get('/users?role=SUPERADMIN&limit=50', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return [...(adminData.users || []), ...(superData.users || [])];
  } catch (error) {
    log(`getAdmins ERROR: ${error.response?.status} ${error.message}`);
    return [];
  }
};

const getTicketDetail = async (token, ticketId) => {
  try {
    const { data } = await apiClient.get(`/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  } catch (error) {
    log(`getTicketDetail ERROR: ${error.response?.status} ${error.message}`);
    return null;
  }
};

const uploadAttachment = async (token, ticketId, fileBuffer, filename) => {
  try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('files', fileBuffer, filename);

    const { data } = await apiClient.post(`/tickets/${ticketId}/attachments`, form, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...form.getHeaders(),
      },
    });
    return data;
  } catch (error) {
    log(`uploadAttachment ERROR: ${error.response?.status} ${error.message}`);
    return null;
  }
};

module.exports = {
  findOrCreateUser,
  getCategories,
  createTicket,
  getUserTickets,
  getPendingTickets,
  approveTicket,
  rejectTicket,
  getAllTickets,
  updateTicketStatus,
  assignTicket,
  getAdmins,
  getTicketDetail,
  uploadAttachment,
};
