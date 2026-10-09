// Thong tin DB duoc doc tu local-config.json, khong can .env.
// File local-config.json duoc .gitignore de tranh lo mat khau.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type DbConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
};
export const dbConfig: DbConfig = JSON.parse(
  readFileSync(join(process.cwd(), 'local-config.json'), 'utf8'),
);
