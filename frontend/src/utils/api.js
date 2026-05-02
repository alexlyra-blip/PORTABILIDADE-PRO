const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const API_BASE_URL = BASE_URL.endsWith('/') ? `${BASE_URL}api` : `${BASE_URL}/api`;

export const getStaticUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  if (path.startsWith('/uploads')) return `${BASE_URL}${path}`;
  return `${BASE_URL}/uploads${path.startsWith('/') ? '' : '/'}${path}`;
};

const getHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (response, endpoint, method) => {
  if (response.status === 401 || response.status === 403) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    throw new Error(`Acesso negado (${response.status}): Sua sessão expirou ou você não tem permissão.`);
  }

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorData = await response.json();
      const rawDetail = errorData.detail || errorData.message || errorData;
      errorDetail = typeof rawDetail === 'object' ? JSON.stringify(rawDetail) : rawDetail;
    } catch (e) {
      try {
        errorDetail = await response.text();
      } catch (textErr) {
        errorDetail = response.statusText;
      }
    }

    const errorMessage = `Erro na API [${method}] ${endpoint}: ${response.status} ${response.statusText} - ${errorDetail}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  return response.json();
};

export const api = {
  async get(endpoint) {
    const url = `${API_BASE_URL}${endpoint}`;
    if (!url || url.includes('undefined')) {
      throw new Error("Configuração de API pendente ou URL inválida");
    }

    try {
      const response = await fetch(url, {
        headers: getHeaders(),
      });
      return await handleResponse(response, endpoint, 'GET');
    } catch (err) {
      if (err.message.includes('Erro na API')) throw err;
      console.error("Network error fetching API:", err);
      throw new Error(`Falha de conexão com o servidor em ${endpoint}. Verifique se o backend está rodando.`);
    }
  },
  async post(endpoint, data, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });

      if (options.responseType === 'blob' && response.ok) {
        return response.blob();
      }

      return await handleResponse(response, endpoint, 'POST');
    } catch (err) {
      if (err.message.includes('Erro na API')) throw err;
      console.error("POST Error:", err);
      throw new Error(`Erro ao enviar dados para ${endpoint}.`);
    }
  },
  async postFormData(endpoint, formData) {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });

      return await handleResponse(response, endpoint, 'POST');
    } catch (err) {
      if (err.message.includes('Erro na API')) throw err;
      console.error("POST FormData Error:", err);
      throw new Error(`Erro ao enviar arquivo para ${endpoint}.`);
    }
  },
  async patch(endpoint, data) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return await handleResponse(response, endpoint, 'PATCH');
    } catch (err) {
      if (err.message.includes('Erro na API')) throw err;
      console.error("PATCH Error:", err);
      throw new Error(`Erro ao atualizar dados em ${endpoint}.`);
    }
  },
  async delete(endpoint) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return await handleResponse(response, endpoint, 'DELETE');
    } catch (err) {
      if (err.message.includes('Erro na API')) throw err;
      console.error("DELETE Error:", err);
      throw new Error(`Erro ao deletar em ${endpoint}.`);
    }
  },
  async upload(endpoint, formData) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      return await handleResponse(response, endpoint, 'UPLOAD');
    } catch (err) {
      if (err.message.includes('Erro na API')) throw err;
      console.error("UPLOAD Error:", err);
      throw new Error(`Erro ao enviar arquivo para ${endpoint}.`);
    }
  },
};
