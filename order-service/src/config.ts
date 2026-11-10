import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type DbConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
};

const configPath = join(process.cwd(), 'local-config.json');

export const dbConfig: DbConfig = existsSync(configPath)
  ? JSON.parse(readFileSync(configPath, 'utf8'))
  : {
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 1433),
      username: process.env.DB_USERNAME ?? 'sa',
      password: process.env.DB_PASSWORD ?? '123456',
      database: process.env.DB_NAME ?? 'OrderDB',
    };

export const productServiceUrl = process.env.PRODUCT_SERVICE_URL ?? 'http://localhost:3001';
