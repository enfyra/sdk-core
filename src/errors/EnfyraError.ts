import type { EnfyraErrorData, EnfyraErrorCode } from '../types';

export class EnfyraError extends Error {
  public readonly code: EnfyraErrorCode;
  public readonly statusCode?: number;
  public readonly details?: unknown;

  constructor({ code, message, statusCode, details }: EnfyraErrorData) {
    super(message);
    this.name = 'EnfyraError';
    this.code = code || 'SERVER_ERROR';
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

export function isEnfyraError(error: unknown): error is EnfyraError {
  return error instanceof EnfyraError;
}
