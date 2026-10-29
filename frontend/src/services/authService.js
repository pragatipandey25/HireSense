import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = `${rawApiUrl.replace(/\/+$/, '')}/auth`;

export const registerUser = async (userData) => {
  const payload = {
    ...userData,
    email: (userData.email || '').trim().toLowerCase(),
    name: (userData.name || '').trim(),
  };

  const response = await axios.post(`${API_URL}/register`, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  });
  return response.data;
};

export const loginUser = async (userData) => {
  const payload = {
    email: (userData.email || '').trim().toLowerCase(),
    password: userData.password,
  };

  const response = await axios.post(`${API_URL}/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  });
  return response.data;
};
