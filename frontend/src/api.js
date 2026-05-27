import axios from "axios";

const RENDER_API_URL = "https://sistema-logistico-zpcf.onrender.com";
const isLocalHost =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);
const API_BASE = (import.meta.env.VITE_API_URL || (isLocalHost ? "http://localhost:8000" : RENDER_API_URL)).replace(/\/$/, "");
const TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "user";

const http = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

function readJSON(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function getUser() {
  return readJSON(USER_KEY);
}

function setSession(token, user, refreshToken) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function toApiError(error) {
  const detail = error?.response?.data?.detail;
  const message = Array.isArray(detail)
    ? detail.map((item) => item.msg).filter(Boolean).join(". ")
    : detail || error?.message || "Error inesperado";
  return {
    message,
    status: error?.response?.status,
    data: error?.response?.data,
  };
}

let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");

  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE}/token/refresh`, null, {
        params: { refresh_token: refreshToken },
        timeout: 15000,
      })
      .then((response) => {
        const token = response.data?.token;
        if (!token) throw new Error("Refresh token invalido");
        localStorage.setItem(TOKEN_KEY, token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return http(original);
      } catch {
        clearSession();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }

    error.normalized = toApiError(error);
    return Promise.reject(error);
  }
);

function withParams(path, params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.append(key, value);
    }
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

function uploadFile(path, file, fieldName = "archivo", options = {}) {
  const formData = new FormData();
  formData.append(fieldName, file);
  return http
    .post(path, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      ...options,
    })
    .then((response) => response.data);
}

const api = {
  http,
  getToken,
  getRefreshToken,
  getUser,
  setSession,
  clearSession,
  getBaseUrl: () => API_BASE,
  toApiError,

  login: (usuario, password) =>
    http.post("/login", { usuario, password }).then((response) => response.data),

  getColaboradores: (area, estado = "activo") =>
    http.get(withParams("/colaboradores", { area, estado })).then((response) => response.data),

  getColaborador: (dni) => http.get(`/colaborador/${dni}`).then((response) => response.data),
  updateColaborador: (dni, datos) => http.put(`/colaborador/${dni}`, datos).then((response) => response.data),

  subirExcel: (file) => uploadFile("/sincronizar-excel", file),
  subirTareoExcel: (file) => uploadFile("/tareo/subir-excel", file, "archivo", { timeout: 120000 }),

  getHistorial: (dni, tipo_cambio, limite = 100) =>
    http.get(withParams("/historial", { dni, tipo_cambio, limite })).then((response) => response.data),

  getAreas: () => http.get("/areas").then((response) => response.data),
  getMiPerfil: () => http.get("/mi-perfil").then((response) => response.data),
  getDashboardStats: () => http.get("/dashboard/stats").then((response) => response.data),

  getTareo: (dni, fechaInicio, fechaFin, limit) =>
    http
      .get(withParams("/tareo", { dni, fecha_inicio: fechaInicio, fecha_fin: fechaFin, limit }))
      .then((response) => response.data),

  getTareoEstadisticas: () => http.get("/tareo/estadisticas").then((response) => response.data),

  get: (path) => http.get(path).then((response) => response.data),
  post: (path, data) => http.post(path, data).then((response) => response.data),
  put: (path, data) => http.put(path, data).then((response) => response.data),
  delete: (path) => http.delete(path).then((response) => response.data),
  upload: uploadFile,
};

export default api;
