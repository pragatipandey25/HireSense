import api from './api';

export const registerUser = async (userData) => {
  const payload = {
    ...userData,
    email: (userData.email || '').trim().toLowerCase(),
    name: (userData.name || '').trim(),
  };

  const response = await api.post('/auth/register', payload, {
    timeout: 15000,
  });
  return response.data;
};

export const loginUser = async (userData) => {
  const payload = {
    email: (userData.email || '').trim().toLowerCase(),
    password: userData.password,
  };

  const response = await api.post('/auth/login', payload, {
    timeout: 15000,
  });
  return response.data;
};
