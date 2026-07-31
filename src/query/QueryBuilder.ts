import { EnfyraError } from '../errors/EnfyraError';
import type { HttpClient } from '../client/HttpClient';
import type { ExecuteResult, FilterObject, QueryConfig } from '../types';

export class QueryBuilder<T = unknown> {
  private readonly config: QueryConfig = {};
  private resourceId: number | string | null = null;

  constructor(
    private readonly client: HttpClient,
    private readonly table: string,
  ) {}

  select(fields: string | string[]): this {
    this.config.select = Array.isArray(fields) ? fields.join(',') : fields;
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

  deep(config: Record<string, unknown>): this {
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

  async execute(): Promise<ExecuteResult<T>> {
    const query = this.buildQuery();
    if (this.resourceId !== null) {
      const idFilter = { id: { _eq: this.resourceId } };
      query.filter = JSON.stringify(
        this.config.filter
          ? { _and: [this.config.filter, idFilter] }
          : idFilter,
      );
      query.limit = 1;
    }

    const response = await this.client.get<T | T[]>(`/${this.table}`, {
      query,
    });
    return {
      data: response.data,
      ...(response.meta ? { meta: response.meta } : {}),
    };
  }

  async insert(data: Partial<T>): Promise<ExecuteResult<T>> {
    const response = await this.client.post<T | T[]>(`/${this.table}`, data);
    return { data: response.data };
  }

  async update(data: Partial<T>): Promise<ExecuteResult<T>> {
    const id = this.requireResourceId('update');
    const response = await this.client.patch<T | T[]>(
      `/${this.table}/${encodeURIComponent(String(id))}`,
      data,
    );
    return { data: response.data };
  }

  async delete(): Promise<void> {
    const id = this.requireResourceId('delete');
    await this.client.delete(
      `/${this.table}/${encodeURIComponent(String(id))}`,
    );
  }

  private buildQuery(): Record<string, unknown> {
    const query: Record<string, unknown> = {};
    if (this.config.select) query.fields = this.config.select;
    if (this.config.filter) query.filter = JSON.stringify(this.config.filter);
    if (this.config.sort) query.sort = this.config.sort;
    if (this.config.limit !== undefined) query.limit = this.config.limit;
    if (this.config.page !== undefined) query.page = this.config.page;
    if (this.config.deep) query.deep = JSON.stringify(this.config.deep);
    if (this.config.meta) query.meta = this.config.meta.join(',');
    return query;
  }

  private requireResourceId(operation: 'update' | 'delete'): number | string {
    if (this.resourceId === null) {
      throw new EnfyraError({
        code: 'VALIDATION_ERROR',
        message: `ID is required for ${operation}. Use .byId() first.`,
      });
    }
    return this.resourceId;
  }
}
