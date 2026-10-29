import api from './api';

export const uploadResume = async (file) => {
  const formData = new FormData();
  formData.append('resume', file);
  const response = await api.post('/resumes/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const uploadBulkResumes = async (files) => {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('resumes', files[i]);
  }
  const response = await api.post('/resumes/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const parseResume = async (id) => {
  const response = await api.post(`/resumes/parse/${id}`);
  return response.data;
};

export const analyzeResume = async (id, jobDescription) => {
  const response = await api.post(`/resumes/analyze/${id}`, { jobDescription });
  return response.data;
};

export const getResumes = async () => {
  const response = await api.get('/resumes');
  return response.data;
};

export const getResumeById = async (id) => {
  const response = await api.get(`/resumes/${id}`);
  return response.data;
};

export const deleteResume = async (id) => {
  const response = await api.delete(`/resumes/${id}`);
  return response.data;
};
