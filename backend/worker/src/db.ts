// src/db.ts
import { neon, NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<any, any> | null = null;

export function getDb(connectionString: string) {
  if (!_sql) {
    _sql = neon(connectionString);
  }
  return _sql;
}
