const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Register or get user by telegram ID
const findOrCreateUser = async (telegramId, telegramUsername, fullName) => {
  try {
    // Try to find user by telegramId via a special bot endpoint
    const { data } = await apiClient.post('/auth/telegram', {
      telegramId: String(telegramId),
      telegramUsername,
      fullName,
    });
    return data;
  } catch (error) {
    console.error('API error (findOrCreateUser):', error.response?.data || error.message);
    return null;
  }
};

const getCategories = async () => {
  try {
    // Public categories endpoint for bot
    const { data } = await apiClient.get('/categories/public');
    return data;
  } catch (error) {
    console.error('API error (getCategories):', error.response?.data || error.message);
    return [];
  }
};

const createTicket = async (token, ticketData) => {
  try {
    const { data } = await apiClient.post('/tickets', ticketData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  } catch (error) {
    console.error('API error (createTicket):', error.response?.data || error.message);
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
    console.error('API error (getUserTickets):', error.response?.data || error.message);
    return [];
  }
};

module.exports = { findOrCreateUser, getCategories, createTicket, getUserTickets };
