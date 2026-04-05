const axios = require('axios');
const fs = require('fs');
const path = require('path');

const logFile = path.resolve(__dirname, '../bot.log');
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(logFile, line + '\n');
}

const API_URL = process.env.API_URL || 'http://localhost:5000/api';
log(`API client initialized. BASE_URL=${API_URL}`);

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

const findOrCreateUser = async (telegramId, telegramUsername, fullName) => {
  try {
    const url = `${API_URL}/auth/telegram`;
    log(`POST ${url} telegramId=${telegramId}`);
    const { data } = await apiClient.post('/auth/telegram', {
      telegramId: String(telegramId),
      telegramUsername,
      fullName,
    });
    log(`findOrCreateUser OK: userId=${data.user?.id}`);
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

module.exports = { findOrCreateUser, getCategories, createTicket, getUserTickets };
