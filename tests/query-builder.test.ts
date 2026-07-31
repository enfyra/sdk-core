import { describe, expect, it, vi } from 'vitest';
import { QueryBuilder } from '../src/query/QueryBuilder';

function createHttp() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
}

describe('QueryBuilder', () => {
  it('uses canonical record paths for update and delete', async () => {
    const http = createHttp();
    http.patch.mockResolvedValue({ data: [{ id: 'a/b', name: 'Updated' }] });
    http.delete.mockResolvedValue({ data: { success: true } });
    const query = new QueryBuilder(http as never, 'articles').byId('a/b');

    await query.update({ name: 'Updated' });
    await query.delete();

    expect(http.patch).toHaveBeenCalledWith('/articles/a%2Fb', {
      name: 'Updated',
    });
    expect(http.delete).toHaveBeenCalledWith('/articles/a%2Fb');
  });

  it('does not pretend canonical HTTP supports filter-only deletes', async () => {
    const http = createHttp();
    const query = new QueryBuilder(http as never, 'articles').filter({
      status: { _eq: 'archived' },
    });

    await expect(query.delete()).rejects.toThrow('ID is required for delete');
    expect(http.delete).not.toHaveBeenCalled();
  });

  it('combines byId with an existing read filter', async () => {
    const http = createHttp();
    http.get.mockResolvedValue({ data: [], meta: { totalCount: 0 } });
    const query = new QueryBuilder(http as never, 'articles')
      .filter({ status: { _eq: 'published' } })
      .byId(0);

    await query.execute();

    expect(http.get).toHaveBeenCalledWith('/articles', {
      query: {
        filter: JSON.stringify({
          _and: [{ status: { _eq: 'published' } }, { id: { _eq: 0 } }],
        }),
        limit: 1,
      },
    });
  });
});
