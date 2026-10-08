import { Pool, QueryResult } from 'pg';
declare const pool: Pool;
export declare function query(text: string, params?: any[]): Promise<QueryResult>;
export declare function getClient(): Promise<import("pg").PoolClient>;
export declare function testConnection(): Promise<boolean>;
export default pool;
//# sourceMappingURL=db.d.ts.map