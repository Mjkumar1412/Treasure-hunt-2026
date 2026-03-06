const API_URL = import.meta.env.VITE_API_URL || "";

export const apiFetch = (path: string, options?: RequestInit) => {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  return fetch(url, options);
};
