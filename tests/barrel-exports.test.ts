import { describe, expect, it } from 'vitest';
import {
  AuthManager,
  createTokenPersistence,
  EnfyraClient,
  EnfyraError,
  HttpClient,
  isEnfyraError,
  QueryBuilder,
  StorageManager,
  WebSocketClient,
} from '../src';
import type {
  AuthConfig,
  AuthTokens,
  EnfyraClientConfig,
  EnfyraFetch,
  ExecuteResult,
  FileRecord,
  FilterObject,
  FolderNode,
  HttpRequestOptions,
  HttpResponse,
  LoginCredentials,
  StorageConfigRecord,
  UploadFileParams,
  UserInfo,
  WebSocketConfig,
} from '../src';

describe('barrel exports', () => {
  it('exports all public classes', () => {
    expect(EnfyraClient).toBeTypeOf('function');
    expect(HttpClient).toBeTypeOf('function');
    expect(AuthManager).toBeTypeOf('function');
    expect(createTokenPersistence).toBeTypeOf('function');
    expect(QueryBuilder).toBeTypeOf('function');
    expect(StorageManager).toBeTypeOf('function');
    expect(WebSocketClient).toBeTypeOf('function');
    expect(EnfyraError).toBeTypeOf('function');
    expect(isEnfyraError).toBeTypeOf('function');
  });

  it('exports public types', () => {
    const config: EnfyraClientConfig = { baseUrl: 'http://localhost:3000' };
    const auth: AuthConfig = { strategy: 'token' };
    const tokens: AuthTokens = { accessToken: 'x', expTime: 0 };
    const creds: LoginCredentials = { email: 'a@b.c', password: 'x' };
    const filter: FilterObject = { status: { _eq: 'active' } };
    const wsConfig: WebSocketConfig = { gateway: 'chat' };
    const upload: UploadFileParams = { file: new Blob() };
    const file: FileRecord = { id: 1, name: 'f.txt' };
    const folder: FolderNode = { id: 1, name: 'root' };
    const storageCfg: StorageConfigRecord = {
      id: 1,
      name: 's3',
      type: 's3',
      isEnabled: true,
    };
    const user: UserInfo = { id: '1', email: 'a@b.c', name: 'A' };

    expect(config).toBeDefined();
    expect(auth).toBeDefined();
    expect(tokens).toBeDefined();
    expect(creds).toBeDefined();
    expect(filter).toBeDefined();
    expect(wsConfig).toBeDefined();
    expect(upload).toBeDefined();
    expect(file).toBeDefined();
    expect(folder).toBeDefined();
    expect(storageCfg).toBeDefined();
    expect(user).toBeDefined();
  });
});
