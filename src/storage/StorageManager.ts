import type { HttpClient } from '../client/HttpClient';
import type {
  FileRecord,
  FolderNode,
  StorageConfigRecord,
  UploadFileParams,
} from '../types';

export class StorageManager {
  constructor(private readonly client: HttpClient) {}

  async upload(params: UploadFileParams): Promise<FileRecord> {
    const formData = new FormData();
    formData.append('file', params.file);
    if (params.folder !== undefined) {
      formData.append('folder', String(params.folder));
    }
    if (params.title) formData.append('title', params.title);
    if (params.description) formData.append('description', params.description);
    if (params.storageConfig !== undefined) {
      formData.append('storageConfig', String(params.storageConfig));
    }

    const headers = params.uploadId
      ? { 'x-enfyra-upload-id': params.uploadId }
      : undefined;
    const response = await this.client.post<unknown>('/enfyra_file', formData, {
      headers,
    });
    const receipt = response.data;
    const record = Array.isArray(receipt) && receipt.length === 1 ? receipt[0] : receipt;
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw new Error('Upload did not return one file record');
    }
    const raw = record as Record<string, unknown>;
    const id = raw.id ?? raw._id;
    const name = raw.name ?? raw.filename;
    if ((typeof id !== 'string' && typeof id !== 'number') || typeof name !== 'string') {
      throw new Error('Upload returned an invalid file record');
    }
    const size = raw.size ?? raw.filesize;
    const mimeType = raw.mimeType ?? raw.mimetype;
    return {
      ...raw,
      id,
      name,
      ...(typeof size === 'number' ? { size } : {}),
      ...(typeof mimeType === 'string' ? { mimeType } : {}),
    };
  }

  getDownloadUrl(fileId: number | string): string {
    return this.client.resolveUrl(`/assets/${encodeURIComponent(String(fileId))}`);
  }

  async download(fileId: number | string): Promise<Blob> {
    const response = await this.client.get<Blob>(
      `/assets/${encodeURIComponent(String(fileId))}`,
      { responseType: 'blob' },
    );
    return response.data;
  }

  async getFolderTree(): Promise<FolderNode[]> {
    const response = await this.client.get<FolderNode[]>('/enfyra_folder/tree');
    return response.data;
  }

  async getStorageConfigs(): Promise<StorageConfigRecord[]> {
    const response = await this.client.get<StorageConfigRecord[]>('/enfyra_storage_config', {
      query: {
        fields: 'id,name,type,isEnabled',
        filter: JSON.stringify({ isEnabled: { _eq: true } }),
        limit: -1,
      },
    });
    return response.data;
  }
}
