export interface UploadFileParams {
  file: File | Blob;
  folder?: number | string;
  title?: string;
  description?: string;
  storageConfig?: number | string;
  uploadId?: string;
}

export interface FileRecord {
  id: number | string;
  name: string;
  size?: number;
  mimeType?: string;
  folder?: number | string | null;
  [key: string]: unknown;
}

export interface FolderNode {
  id: number | string;
  name: string;
  parentId?: number | string | null;
  children?: FolderNode[];
  [key: string]: unknown;
}

export interface StorageConfigRecord {
  id: number | string;
  name: string;
  type: string;
  isEnabled: boolean;
  [key: string]: unknown;
}
