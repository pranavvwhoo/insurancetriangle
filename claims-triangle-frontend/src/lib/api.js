const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function parseJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export async function api(path, options = {}) {
  const { body, headers: hdr, ...rest } = options;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = {
    ...(isForm ? {} : { 'Content-Type': 'application/json' }),
    ...hdr,
  };
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'omit',
  });
  const data = await parseJson(res);
  if (!res.ok) {
    const msg = data.error || data.message || res.statusText || 'Request failed';
    const err = new Error(msg);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export function getApiBase() {
  return API_BASE;
}

export const projectsApi = {
  list: () => api('/api/projects'),
  get: (id) => api(`/api/projects/${id}`),
  create: (payload) => api('/api/projects', { method: 'POST', body: payload }),
  update: (id, payload) => api(`/api/projects/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => api(`/api/projects/${id}`, { method: 'DELETE' }),
};

export const mappingApi = {
  requiredFields: () => api('/api/mapping/fields/required'),
  get: (projectId) => api(`/api/mapping/${projectId}`),
  save: (projectId, mapping) =>
    api(`/api/mapping/${projectId}`, { method: 'POST', body: { mapping } }),
};

export const uploadApi = {
  parse: (file, sheet) => {
    const fd = new FormData();
    fd.append('file', file);
    const q = sheet ? `?sheet=${encodeURIComponent(sheet)}` : '';
    return api(`/api/upload/parse${q}`, { method: 'POST', body: fd });
  },
  validate: (file, mapping, sheet) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('mapping', JSON.stringify(mapping));
    if (sheet) fd.append('sheet', sheet);
    return api('/api/upload/validate', { method: 'POST', body: fd });
  },
  save: (projectId, file, mapping, sheet) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('mapping', JSON.stringify(mapping));
    if (sheet) fd.append('sheet', sheet);
    return api(`/api/upload/save/${projectId}`, { method: 'POST', body: fd });
  },
};

export const triangleApi = {
  build: (projectId, body) =>
    api(`/api/triangle/${projectId}`, { method: 'POST', body }),
  filters: (projectId) => api(`/api/triangle/${projectId}/filters`),
  viewState: (projectId) => api(`/api/triangle/${projectId}/viewstate`),
};
