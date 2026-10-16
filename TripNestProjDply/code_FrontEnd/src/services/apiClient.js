import axios from "axios";

/**
 * Centralized Axios instance for TripNest Frontend.
 * Automatically attaches the JWT Bearer token from localStorage
 * to every outgoing request.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach JWT token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Extract clean error message
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = "An unexpected error occurred";
    const resData = error.response?.data;

    if (typeof resData === "string" && resData) {
      message = resData;
    } else if (resData?.message) {
      message = resData.message;
    } else if (resData && typeof resData === "object") {
      const values = Object.values(resData);
      if (values.length > 0 && typeof values[0] === "string") {
        message = values[0];
      }
    } else if (error.message) {
      message = error.message;
    }

    return Promise.reject(new Error(message));
  }
);

export default apiClient;
