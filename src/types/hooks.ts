import type { EnfyraError } from '../errors/EnfyraError';
import type { FilterObject } from './query';

export type RequestStatus = 'pending' | 'success' | 'error';

export interface QueryOptions {
  select?: string | string[];
  filter?: FilterObject;
  sort?: string;
  limit?: number;
  page?: number;
  meta?: ('totalCount' | 'filterCount')[];
  deep?: Record<string, unknown>;
  immediate?: boolean;
}

export type MutationOperation = 'insert' | 'update' | 'delete';

export interface MutationOptions {
  operation?: MutationOperation;
  onSuccess?: (data: unknown) => void;
  onError?: (error: EnfyraError) => void;
  onSettled?: () => void;
}

export interface MutationParams {
  data?: unknown;
  id?: string | number;
  ids?: (string | number)[];
}
