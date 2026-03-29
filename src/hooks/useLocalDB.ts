import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { LocalTransaction, LocalInsight, DBConfig, SyncResult, CategorySample } from '@/types/localAI';
import { logger } from '@/lib/logger';

const DB_CONFIG: DBConfig = {
  dbName: 'hisabify_ai.db',
  version: 1,
};

export function useLocalDB() {
  const dbRef = useRef<SQLiteDBConnection | null>(null);
  const isInitializedRef = useRef(false);
  const isWebRef = useRef(!Capacitor.isNativePlatform());

  /**
   * Initialize the local database with schema
   */
  const init = useCallback(async (): Promise<void> => {
    if (isInitializedRef.current) {
      return; // Already initialized (or attempted)
    }

    // Mark as attempted to prevent retries
    isInitializedRef.current = true;

    try {
      // Skip on web platform - local DB only works on native
      if (isWebRef.current) {
        logger.debug('Local DB skipped on web platform');
        return;
      }

      const sqlite = CapacitorSQLite;

      try {
        // Check if database exists, if not create it
        const result = await sqlite.checkConnectionsConsistency();
        const dbExists = result.result && Array.isArray(result.result) && result.result.find((conn: any) => conn.dbname === DB_CONFIG.dbName);

        if (!dbExists) {
          await sqlite.createConnection({
            database: DB_CONFIG.dbName,
            version: DB_CONFIG.version,
            encrypted: false,
            mode: 'no-encryption',
          });
        }

        // Get connection
        const db = await sqlite.retrieveConnection({ database: DB_CONFIG.dbName });
        dbRef.current = db;

        // Ensure database is open
        await db.open();

        // Create schema
        await createSchema(db);

        logger.debug('Local DB initialized successfully');
      } catch (sqliteErr) {
        logger.warn('SQLite initialization failed (DB will be unavailable)', sqliteErr);
        // Continue - app still works without local DB
      }
    } catch (err) {
      logger.warn('Failed to initialize local DB', err);
      // Continue - app still works without local DB
    }
  }, []);

  /**
   * Create database schema
   */
  const createSchema = useCallback(async (db: SQLiteDBConnection): Promise<void> => {
    const schema = [
      // Transactions table
      `CREATE TABLE IF NOT EXISTS local_transactions (
        id TEXT PRIMARY KEY,
        merchant TEXT NOT NULL,
        amount REAL NOT NULL,
        category_id TEXT,
        category_predicted TEXT,
        category_confidence REAL,
        date TEXT NOT NULL,
        note TEXT,
        type TEXT DEFAULT 'expense',
        synced BOOLEAN DEFAULT 0,
        supabase_id TEXT UNIQUE,
        created_at TEXT,
        updated_at TEXT
      )`,

      // Category samples
      `CREATE TABLE IF NOT EXISTS category_samples (
        id TEXT PRIMARY KEY,
        category_id TEXT,
        merchant TEXT,
        embedding BLOB,
        updated_at TEXT
      )`,

      // Insights
      `CREATE TABLE IF NOT EXISTS local_insights (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        category_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        metadata TEXT,
        synced BOOLEAN DEFAULT 0,
        computed_at TEXT
      )`,

      // Indexes for performance
      `CREATE INDEX IF NOT EXISTS idx_local_transactions_synced ON local_transactions(synced)`,
      `CREATE INDEX IF NOT EXISTS idx_local_transactions_date ON local_transactions(date DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_local_insights_synced ON local_insights(synced)`,
      `CREATE INDEX IF NOT EXISTS idx_category_samples_category ON category_samples(category_id)`,
    ];

    for (const sql of schema) {
      try {
        await db.execute(sql);
      } catch (err) {
        logger.debug(`Schema creation skipped (may already exist): ${sql.substring(0, 50)}...`);
      }
    }

    logger.debug('Local DB schema initialized');
  }, []);

  /**
   * Query database - returns empty array if DB not initialized
   */
  const query = useCallback(
    async (sql: string, params: any[] = []): Promise<any[]> => {
      if (!dbRef.current) {
        logger.debug('DB not initialized, returning empty results');
        return [];
      }

      try {
        const result = await dbRef.current.query(sql, params);
        return result.values || [];
      } catch (err) {
        logger.warn(`Query failed: ${sql}`, err);
        return [];
      }
    },
    []
  );

  /**
   * Insert transaction
   */
  const insertTransaction = useCallback(
    async (transaction: Partial<LocalTransaction>): Promise<void> => {
      if (!dbRef.current) return; // DB not available

      const sql = `
        INSERT INTO local_transactions (
          id, merchant, amount, category_id, category_predicted,
          category_confidence, date, note, type, synced, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        transaction.id || crypto.randomUUID(),
        transaction.merchant || '',
        transaction.amount || 0,
        transaction.category_id || null,
        transaction.category_predicted || null,
        transaction.category_confidence || null,
        transaction.date || new Date().toISOString(),
        transaction.note || '',
        transaction.type || 'expense',
        0,
        new Date().toISOString(),
        new Date().toISOString(),
      ];

      try {
        await dbRef.current.run(sql, values);
      } catch (err) {
        logger.warn('Failed to insert transaction to local DB', err);
      }
    },
    []
  );

  /**
   * Get unsynced data
   */
  const getUnsyncedData = useCallback(
    async (
      limit: number = 100
    ): Promise<{
      transactions: LocalTransaction[];
      insights: LocalInsight[];
    }> => {
      if (!dbRef.current) {
        return { transactions: [], insights: [] };
      }

      try {
        const txResults = await query(
          'SELECT * FROM local_transactions WHERE synced = 0 LIMIT ?',
          [limit]
        );
        const insightResults = await query(
          'SELECT * FROM local_insights WHERE synced = 0 LIMIT ?',
          [limit]
        );

        return {
          transactions: (txResults || []) as LocalTransaction[],
          insights: (insightResults || []) as LocalInsight[],
        };
      } catch (err) {
        logger.warn('Failed to get unsynced data', err);
        return { transactions: [], insights: [] };
      }
    },
    [query]
  );

  /**
   * Mark records as synced
   */
  const updateSynced = useCallback(
    async (table: 'local_transactions' | 'local_insights', ids: string[]): Promise<void> => {
      if (!dbRef.current || ids.length === 0) return;

      const placeholders = ids.map(() => '?').join(',');
      const sql = `UPDATE ${table} SET synced = 1 WHERE id IN (${placeholders})`;

      try {
        await dbRef.current.run(sql, ids);
      } catch (err) {
        logger.warn(`Failed to mark ${table} as synced`, err);
      }
    },
    []
  );

  /**
   * Get category samples for AI matching
   */
  const getCategorySamples = useCallback(
    async (categoryId?: string): Promise<CategorySample[]> => {
      if (!dbRef.current) {
        return [];
      }

      try {
        const sql = categoryId
          ? `SELECT * FROM category_samples WHERE category_id = ? ORDER BY updated_at DESC`
          : `SELECT * FROM category_samples ORDER BY category_id, updated_at DESC`;

        const params = categoryId ? [categoryId] : [];
        const results = await query(sql, params);

        return (results || []).map((row: any) => ({
          ...row,
          embedding: row.embedding
            ? new Float32Array(Buffer.from(row.embedding).buffer)
            : undefined,
        })) as CategorySample[];
      } catch (err) {
        logger.warn('Failed to get category samples', err);
        return [];
      }
    },
    [query]
  );

  /**
   * Insert category sample
   */
  const insertCategorySample = useCallback(
    async (sample: CategorySample): Promise<void> => {
      if (!dbRef.current) return;

      const sql = `
        INSERT OR REPLACE INTO category_samples (id, category_id, merchant, embedding, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `;

      const embeddingBuffer = sample.embedding
        ? Buffer.from(sample.embedding.buffer)
        : null;

      try {
        await dbRef.current.run(sql, [
          sample.id,
          sample.category_id,
          sample.merchant,
          embeddingBuffer,
          sample.updated_at || new Date().toISOString(),
        ]);
      } catch (err) {
        logger.warn('Failed to insert category sample', err);
      }
    },
    []
  );

  /**
   * Get insights
   */
  const getInsights = useCallback(
    async (limit: number = 10): Promise<LocalInsight[]> => {
      if (!dbRef.current) {
        return [];
      }

      try {
        const results = await query(
          'SELECT * FROM local_insights ORDER BY computed_at DESC LIMIT ?',
          [limit]
        );
        return (results || []) as LocalInsight[];
      } catch (err) {
        logger.warn('Failed to get insights', err);
        return [];
      }
    },
    [query]
  );

  /**
   * Insert insight
   */
  const insertInsight = useCallback(
    async (insight: LocalInsight): Promise<void> => {
      if (!dbRef.current) return;

      const sql = `
        INSERT INTO local_insights (id, type, category_id, title, description, metadata, synced, computed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      try {
        await dbRef.current.run(sql, [
          insight.id,
          insight.type,
          insight.category_id || null,
          insight.title,
          insight.description,
          JSON.stringify(insight.metadata || {}),
          0,
          insight.computed_at || new Date().toISOString(),
        ]);
      } catch (err) {
        logger.warn('Failed to insert insight', err);
      }
    },
    []
  );

  return {
    init,
    query,
    insertTransaction,
    insertCategorySample,
    getCategorySamples,
    getUnsyncedData,
    updateSynced,
    insertInsight,
    getInsights,
  };
}
