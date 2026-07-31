export interface FilterOperators {
  _eq?: unknown;
  _neq?: unknown;
  _gt?: unknown;
  _gte?: unknown;
  _lt?: unknown;
  _lte?: unknown;
  _in?: unknown[];
  _not_in?: unknown[];
  _contains?: string;
  _icontains?: string;
  _starts_with?: string;
  _ends_with?: string;
  _is_null?: boolean;
  _is_not_null?: boolean;
  _between?: [unknown, unknown];
  _not?: FilterObject;
}

export type FilterValue = FilterOperators | string | number | boolean | null;

export interface FilterObject {
  [key: string]: FilterValue | FilterObject | FilterObject[] | undefined;
  _and?: FilterObject[];
  _or?: FilterObject[];
  _not?: FilterObject;
}

export interface QueryConfig {
  select?: string;
  filter?: FilterObject;
  sort?: string;
  limit?: number;
  page?: number;
  deep?: Record<string, unknown>;
  meta?: ('totalCount' | 'filterCount')[];
}

export interface ExecuteResult<T = unknown> {
  data: T | T[];
  meta?: {
    totalCount?: number;
    filterCount?: number;
    page?: number;
    limit?: number;
    aggregate?: Record<string, unknown>;
  };
}
