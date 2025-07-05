export interface ICacheClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
} 