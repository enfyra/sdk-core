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
    const response = await this.client.post<FileRecord>('/enfyra_file', formData, {
      headers,
    });
    return response.data;
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
