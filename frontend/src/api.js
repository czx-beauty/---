// API 客户端——所有后端请求都走这里（fetch 封装）
// 走 Vite 代理：/api/* → localhost:8000/*
// token 存 localStorage，请求自动带 Authorization 头

const TOKEN_KEY = 'mr_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `请求失败 (${res.status})`);
  }
  return res.json();
}

// ---------- 认证 ----------
export function register(username, password) {
  return request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) });
}
export function login(username, password) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
}
export function fetchMe() {
  return request('/auth/me');
}

// ---------- 电影 ----------
export function fetchMovies({ q = '', genre = '', page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({ page, page_size: pageSize });
  if (q) params.set('q', q);
  if (genre) params.set('genre', genre);
  return request(`/movies?${params}`);
}

export function fetchMovieDetail(id) {
  return request(`/movies/${id}`);
}

// ---------- 行为事件 ----------
export function postEvent(movieId, action) {
  return request('/events', { method: 'POST', body: JSON.stringify({ movie_id: movieId, action }) });
}
export function deleteEvents(movieId, action) {
  return request(`/events/${movieId}?action=${action}`, { method: 'DELETE' });
}
export function fetchMyEvents() {
  return request('/events/my');
}

// ---------- 推荐 ----------
export function fetchRecommendations(limit = 10) {
  return request(`/recommendations?limit=${limit}`);
}
