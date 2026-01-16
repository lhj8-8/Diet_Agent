// src/api/Axios.jsx
import axios from "axios";

/* ===============================
   axios 기본 설정 -> 각 페이지에서 임포트 후 api.get or api.post 등으로 사용 가능
================================ */
const api = axios.create({
  baseURL: "http://127.0.0.1:5000",
  withCredentials: true
});

// 요청 보낼 때마다 자동으로 토큰 붙임
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  // 토큰이 "undefined"/"null" 문자열로 저장되는 케이스 방지
  if (token && token !== "undefined" && token !== "null") {
    // axios 버전에 따라 headers가 없을 수 있어 안전 처리
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;