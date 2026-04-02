import type { Response } from 'express';

export interface ApiMeta {
  page?:       number;
  limit?:      number;
  total?:      number;
  totalPages?: number;
  [key: string]: unknown;
}

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data:    T;
  meta?:   ApiMeta;
}

export interface ApiErrorResponse {
  success:  false;
  message:  string;
  code?:    string;
  errors?:  unknown;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  options: { message?: string; statusCode?: number; meta?: ApiMeta } = {},
): Response<ApiSuccessResponse<T>> => {
  const { message = 'Success', statusCode = 200, meta } = options;
  return res.status(statusCode).json({ success: true, message, data, ...(meta ? { meta } : {}) });
};

export const sendError = (
  res: Response,
  options: { message?: string; statusCode?: number; code?: string; errors?: unknown } = {},
): Response<ApiErrorResponse> => {
  const { message = 'An error occurred', statusCode = 500, code, errors } = options;
  return res.status(statusCode).json({
    success: false,
    message,
    ...(code   ? { code }   : {}),
    ...(errors ? { errors } : {}),
  });
};
