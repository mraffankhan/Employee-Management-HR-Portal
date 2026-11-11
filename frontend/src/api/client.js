const BASE_URL = '/api';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    ...options,
    credentials: 'include', // sends httpOnly cookies
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
  };

  if (config.body && !(config.body instanceof FormData) && typeof config.body === 'object') {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);

  if (response.status === 204) {
    return null;
  }

  // Handle file downloads
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/octet-stream') || 
      contentType.includes('application/x-sqlite3') || 
      contentType.includes('text/csv') || 
      contentType.includes('application/pdf')) {
    if (!response.ok) {
      throw new ApiError('Failed to download file', response.status);
    }
    return response.blob();
  }

  let data = null;
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const errorMsg = data?.detail || data?.message || response.statusText || 'Request failed';
    throw new ApiError(errorMsg, response.status, data);
  }

  return data;
}

export const api = {
  get: (endpoint, options) => request(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => request(endpoint, { method: 'POST', body, ...options }),
  put: (endpoint, body, options) => request(endpoint, { method: 'PUT', body, ...options }),
  delete: (endpoint, options) => request(endpoint, { method: 'DELETE', ...options }),
  
  upload: (endpoint, formData, options) => {
    return request(endpoint, {
      method: 'POST',
      body: formData,
      ...options,
    });
  },
};

