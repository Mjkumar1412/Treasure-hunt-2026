import { io } from "socket.io-client";

const getApiUrl = () => {
  const url = import.meta.env.VITE_API_URL || "";
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    return url;
  }
  return "";
};

const API_URL = getApiUrl();
const socket = io(API_URL);

export default socket;
