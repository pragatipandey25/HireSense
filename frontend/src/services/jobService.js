import api from './api';

export const createJob = async (jobData) => {
  const response = await api.post('/jobs', jobData);
  return response.data;
};

export const getJobs = async (params = {}) => {
  const response = await api.get('/jobs', { params });
  return response.data;
};

export const getEmployerJobs = async () => {
  const response = await api.get('/jobs/employer');
  return response.data;
};

export const getJobById = async (id) => {
  const response = await api.get(`/jobs/${id}`);
  return response.data;
};

export const updateJob = async (id, jobData) => {
  const response = await api.put(`/jobs/${id}`, jobData);
  return response.data;
};

export const deleteJob = async (id) => {
  const response = await api.delete(`/jobs/${id}`);
  return response.data;
};

export const closeJob = async (id) => {
  const response = await api.patch(`/jobs/${id}/close`);
  return response.data;
};

export const reopenJob = async (id) => {
  const response = await api.patch(`/jobs/${id}/reopen`);
  return response.data;
};
