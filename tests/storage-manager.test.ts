import { describe, expect, it, vi } from 'vitest';
import { StorageManager } from '../src/storage/StorageManager';

describe('StorageManager upload response adapter', () => {
  it.each(['id', '_id'])('unwraps the ESV record array and maps %s/filename/filesize/mimetype', async idField => {
    const post = vi.fn(async () => ({ data: [{ [idField]: 'file-1', filename: 'photo.png', filesize: 12, mimetype: 'image/png', location: 'uploads/photo.png' }] }));
    const storage = new StorageManager({ post } as any);
    const result = await storage.upload({ file: new Blob(['image']), uploadId: 'progress-1' });
    expect(result).toMatchObject({ id: 'file-1', name: 'photo.png', size: 12, mimeType: 'image/png', location: 'uploads/photo.png' });
    expect(Array.isArray(result)).toBe(false);
    expect(post).toHaveBeenCalledWith('/enfyra_file', expect.any(FormData), { headers: { 'x-enfyra-upload-id': 'progress-1' } });
  });

  it('preserves an already normalized single file response', async () => {
    const file = { id: 1, name: 'file.txt', size: 0, mimeType: 'text/plain' };
    const storage = new StorageManager({ post: async () => ({ data: file }) } as any);
    expect(await storage.upload({ file: new Blob(['']) })).toEqual(file);
  });

  it('rejects an empty upload receipt instead of returning an array as a file', async () => {
    const storage = new StorageManager({ post: async () => ({ data: [] }) } as any);
    await expect(storage.upload({ file: new Blob(['']) })).rejects.toThrow(/file|upload/i);
  });
});
