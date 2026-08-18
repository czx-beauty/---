// API 客户端——所有后端请求都走这里（fetch 封装）
// 走 Vite 代理：/api/* → localhost:8000/*

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `请求失败 (${res.status})`);
  }
  return res.json();
}

// 电影列表：q=搜索词 / genre=类型 / page / page_size
export function fetchMovies({ q = '', genre = '', page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({ page, page_size: pageSize });
  if (q) params.set('q', q);
  if (genre) params.set('genre', genre);
  return request(`/movies?${params}`);
}

// 电影详情
export function fetchMovieDetail(id) {
  return request(`/movies/${id}`);
}
