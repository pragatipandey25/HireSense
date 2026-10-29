import api from './api';

export const analyzeJobCandidates = async (jobId) => {
  const response = await api.post(`/analysis/${jobId}/analyze`);
  return response.data;
};

export const getJobRankings = async (jobId, params = {}) => {
  const response = await api.get(`/analysis/${jobId}/rankings`, { params });
  return response.data;
};

export const getRankingDetail = async (rankingId) => {
  const response = await api.get(`/analysis/ranking/${rankingId}`);
  return response.data;
};

export const updateRankingStatus = async (rankingId, status) => {
  const response = await api.patch(`/analysis/ranking/${rankingId}/status`, { status });
  return response.data;
};

export const getAvailableCandidates = async () => {
  const response = await api.get('/analysis/candidates');
  return response.data;
};

export const getEmployerAnalysisAnalytics = async () => {
  const response = await api.get('/analysis/analytics');
  return response.data;
};

export const exportJobRankingsCSV = async (jobId) => {
  const response = await api.get(`/analysis/${jobId}/export/csv`, {
    responseType: 'blob'
  });
  return response.data;
};
