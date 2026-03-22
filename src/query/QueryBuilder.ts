import { HttpClient } from '../client/HttpClient';
import type { FilterObject, QueryConfig, ExecuteResult } from '../types';

export class QueryBuilder<T = any> {
  private client: HttpClient;
  private table: string;
  private config: QueryConfig = {};
  private resourceId: number | string | null = null;

  constructor(client: HttpClient, table: string) {
    this.client = client;
    this.table = table;
  }

  select(fields: string): this {
    this.config.select = fields;
    return this;
  }

  filter(filter: FilterObject): this {
    this.config.filter = filter;
    return this;
  }

  sort(field: string): this {
    this.config.sort = field;
    return this;
  }

  limit(count: number): this {
    this.config.limit = count;
    return this;
  }

  page(pageNum: number): this {
    this.config.page = pageNum;
    return this;
  }

  deep(config: Record<string, any>): this {
    this.config.deep = config;
    return this;
  }

  meta(fields: ('totalCount' | 'filterCount')[]): this {
    this.config.meta = fields;
    return this;
  }

  byId(id: number | string): this {
    this.resourceId = id;
    return this;
  }

  private buildQuery(): Record<string, any> {
    const query: Record<string, any> = {};

    if (this.config.select) {
      query.fields = this.config.select;
    }
    if (this.config.filter) {
      query.filter = JSON.stringify(this.config.filter);
    }
    if (this.config.sort) {
      query.sort = this.config.sort;
    }
    if (this.config.limit !== undefined) {
      query.limit = this.config.limit;
    }
    if (this.config.page !== undefined) {
      query.page = this.config.page;
    }
    if (this.config.deep) {
      query.deep = JSON.stringify(this.config.deep);
    }
    if (this.config.meta) {
      query.meta = this.config.meta.join(',');
    }

    return query;
  }

  async execute(): Promise<ExecuteResult<T>> {
    const query = this.buildQuery();
    const endpoint = this.resourceId ? `/${this.table}/${this.resourceId}` : `/${this.table}`;
    const response = await this.client.get<T | T[]>(endpoint, { query });
    
    const result: ExecuteResult<T> = {
      data: response.data as T,
    };

    if (response.meta) {
      result.meta = response.meta;
    }

    return result;
  }

  async insert(data: Partial<T>): Promise<ExecuteResult<T>> {
    const response = await this.client.post<T>(`/${this.table}`, data);
    
    return {
      data: response.data,
    };
  }

  async update(data: Partial<T>): Promise<ExecuteResult<T>> {
    if (!this.resourceId) {
      throw new Error('ID is required for update. Use .byId() before .update()');
    }
    
    const response = await this.client.patch<T>(`/${this.table}/${this.resourceId}`, data);
    
    return {
      data: response.data,
    };
  }

  async delete(): Promise<void> {
    if (this.resourceId) {
      await this.client.delete(`/${this.table}/${this.resourceId}`);
    } else {
      await this.client.delete(`/${this.table}`);
    }
  }
}
