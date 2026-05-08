import axios, { AxiosError } from "axios";

export type ApiError = {
  fields?: string[];
  details?: string;
  message: string;
  status?: number;
};

export const apiClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10_000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ database?: { message?: string }; details?: string; fields?: string[]; message?: string }>) => {
    const normalizedError: ApiError = {
      details: error.response?.data?.details,
      fields: error.response?.data?.fields,
      message:
        error.response?.data?.database?.message ??
        error.response?.data?.details ??
        error.response?.data?.message ??
        error.message ??
        "Request failed.",
      status: error.response?.status,
    };

    return Promise.reject(normalizedError);
  },
);