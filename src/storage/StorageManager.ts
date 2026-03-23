import { HttpClient } from '../client/HttpClient';
import type { UploadFileParams } from '../types';

export class StorageManager {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }

  async upload(params: UploadFileParams) {
    const formData = new FormData();
    formData.append('file', params.file);

    if (params.folder) {
      formData.append('folder', params.folder.toString());
    }
    if (params.title) {
      formData.append('title', params.title);
    }
    if (params.description) {
      formData.append('description', params.description);
    }
    if (params.storageConfig) {
      formData.append('storageConfig', params.storageConfig.toString());
    }

    const response = await this.client.post('/file_definition', formData, {
      headers: {},
    });

    return response.data;
  }

  getDownloadUrl(fileId: number | string): string {
    return `${this.client['baseUrl']}/assets/${fileId}`;
  }

  async download(fileId: number | string) {
    const response = await this.client.get<Blob>(`/assets/${fileId}`);
    return response.data;
  }

  async getFolderTree() {
    const response = await this.client.get('/folder_definition/tree');
    return response.data;
  }

  async getStorageConfigs() {
    const response = await this.client.get('/storage_config_definition', {
      query: {
        fields: 'id,name,type,isEnabled',
        filter: { isEnabled: { _eq: true } },
        limit: 0
      },
    });
    return response.data;
  }
}
