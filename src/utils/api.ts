const getApiUrl = () => {
  const url = import.meta.env.VITE_API_URL || "";
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    return url;
  }
  return "";
};

const API_URL = getApiUrl();

export const apiFetch = (path: string, options?: RequestInit) => {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  console.log(`[API Fetch] ${url}`);
  return fetch(url, options);
};

export const safeJson = async (res: Response) => {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (e) {
    console.error(`JSON Parse Error for ${res.url}. Raw text:`, text);
    return { error: "Invalid JSON response from server", raw: text };
  }
};
