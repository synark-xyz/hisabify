# Local AI + SQLite Implementation Plan

**Objective:** Integrate local ML models + on-device SQLite for smart transaction categorization and spending insights, with daily sync to Supabase.

**Architecture:**
- **Local Model:** TensorFlow.js + Universal Sentence Encoder Lite (300KB)
- **Local Database:** Capacitor SQLite for persistent storage
- **Client-side:** Instant suggestions when user creates transactions
- **Sync:** Daily background sync to Supabase
- **Platform:** Native mobile (iOS/Android via Capacitor) + Web (IndexedDB fallback)

---

## Phase 1: Smart Transaction Categorization (Week 1)

### 1.1 Install Dependencies
```bash
npm install @tensorflow/tfjs @tensorflow/tfjs-core universal-sentence-encoder-lite
npm install capacitor-sqlite @capacitor/splash-screen
npx cap sync
```

**Affected files:**
- `package.json` - Add deps

### 1.2 Create Local DB Hook (`src/hooks/useLocalDB.ts`)

**Purpose:** Wrapper around Capacitor SQLite, provides CRUD + sync operations

**Responsibilities:**
- Initialize database on app startup
- Create schema (transactions, categories, insights)
- CRUD operations (insert, query, update, mark synced)
- Batch sync to Supabase

**File:** `src/hooks/useLocalDB.ts`

**Key exports:**
```typescript
export function useLocalDB() {
  return {
    init(): Promise<void>
    query(sql: string, params?: any[]): Promise<any[]>
    insert(table: string, data: object): Promise<void>
    updateSynced(table: string, ids: string[]): Promise<void>
    getUnsyncedData(): Promise<{ transactions: [], insights: [] }>
  }
}
```

**Local schema:**
```sql
-- Transactions table (mirrors Supabase with local AI fields)
CREATE TABLE IF NOT EXISTS local_transactions (
  id TEXT PRIMARY KEY,
  merchant TEXT NOT NULL,
  amount REAL NOT NULL,
  category_id TEXT,
  category_predicted TEXT,
  category_confidence REAL,
  date TEXT NOT NULL,
  note TEXT,
  type TEXT DEFAULT 'expense',
  synced BOOLEAN DEFAULT FALSE,
  supabase_id TEXT UNIQUE,
  created_at TEXT,
  updated_at TEXT
);

-- Category samples (for embeddings comparison)
CREATE TABLE IF NOT EXISTS category_samples (
  id TEXT PRIMARY KEY,
  category_id TEXT,
  merchant TEXT,
  embedding BLOB,
  updated_at TEXT
);

-- Insights (spending patterns, anomalies)
CREATE TABLE IF NOT EXISTS local_insights (
  id TEXT PRIMARY KEY,
  type TEXT,
  category_id TEXT,
  title TEXT,
  description TEXT,
  metadata TEXT,
  synced BOOLEAN DEFAULT FALSE,
  computed_at TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_local_transactions_synced ON local_transactions(synced);
CREATE INDEX IF NOT EXISTS idx_local_insights_synced ON local_insights(synced);
```

### 1.3 Create AI Model Hook (`src/hooks/useLocalAI.ts`)

**Purpose:** Load TensorFlow.js + encoder, provide inference APIs

**Responsibilities:**
- Lazy-load TensorFlow and encoder model (~300KB total)
- Cache model in memory
- Compute embeddings for merchant names
- Find similar category based on merchant

**File:** `src/hooks/useLocalAI.ts`

**Key exports:**
```typescript
export function useLocalAI() {
  return {
    isReady: boolean,
    init(): Promise<void>,
    getEmbedding(text: string): Promise<Float32Array>,
    findSimilarCategory(
      merchant: string,
      existingSamples: CategorySample[]
    ): Promise<{ categoryId: string; confidence: number }>
  }
}
```

**Implementation details:**
- Load model on first use (singleton pattern with useRef)
- Cache embeddings in memory (merchant → embedding)
- Use cosine similarity to find closest category
- Fallback to rule-based categorization if confidence < 60%

### 1.4 Create Category Classifier (`src/lib/aiModels/categoryClassifier.ts`)

**Purpose:** Rule-based + embedding-based category suggestions

**Responsibilities:**
- Maintain merchant-to-category mappings (from Supabase)
- Rank categories by similarity to input merchant
- Return top suggestion with confidence score

**File:** `src/lib/aiModels/categoryClassifier.ts`

**Key exports:**
```typescript
export async function suggestCategory(
  merchant: string,
  categoryEmbeddings: Map<string, Float32Array>,
  confidenceThreshold?: number
): Promise<{ categoryId: string; confidence: number; name: string }>

export const merchantPatterns = {
  'Dining': ['restaurant', 'cafe', 'starbucks', 'pizza', 'uber eats', ...],
  'Groceries': ['whole foods', 'safeway', 'kroger', 'trader joes', ...],
  'Transportation': ['uber', 'lyft', 'gas', 'shell', 'chevron', ...],
  // ... more rules
}
```

**Algorithm:**
1. Try rule-based match first (fast, 0ms)
2. If match, check confidence is > threshold
3. If no rule match or low confidence, use embedding similarity
4. Return top category with confidence score

### 1.5 Integrate into TransactionForm (`src/components/TransactionForm.tsx`)

**Changes:**
- Import `useLocalAI()` + `useLocalDB()`
- On merchant input blur: call classifier to get suggestion
- Show suggestion chip with confidence badge
- On submit: store prediction + confidence in local DB
- Sync actual category when form saves to Supabase

**Key changes:**
```typescript
// In TransactionForm component:

const { user } = useAuth();
const localAI = useLocalAI();
const localDB = useLocalDB();

const [suggestedCategory, setSuggestedCategory] = useState<{
  id: string;
  confidence: number;
} | null>(null);

const handleMerchantBlur = async (merchant: string) => {
  if (!merchant.trim() || !localAI.isReady) return;

  const suggestion = await localAI.suggestCategory(merchant);
  setSuggestedCategory(suggestion);
};

const handleSubmit = async (values: TransactionFormValues) => {
  // ... existing validation ...

  // Store in local DB first (for sync)
  await localDB.insert('local_transactions', {
    id: crypto.randomUUID(),
    merchant: values.merchant,
    amount: parseFloat(values.amount),
    category_predicted: suggestedCategory?.id,
    category_confidence: suggestedCategory?.confidence,
    date: format(values.date, 'yyyy-MM-dd'),
    note: values.note,
    synced: false,
  });

  // Then save to Supabase as normal
  const result = await supabase.from('transactions').insert({...});

  // Mark as synced in local DB
  await localDB.updateSynced('local_transactions', [id]);
};
```

### 1.6 Initialize on App Startup (`src/App.tsx`)

**Changes:**
- Initialize local DB on AuthProvider mount
- Load AI model on app startup (non-blocking)
- Pre-fetch category embeddings from Supabase

**File:** `src/hooks/useAuth.tsx` (or new `src/hooks/useLocalInitialize.ts`)

```typescript
// In AuthProvider or new hook:
useEffect(() => {
  const initializeLocal = async () => {
    const localDB = useLocalDB();
    const localAI = useLocalAI();

    try {
      // Initialize database
      await localDB.init();

      // Load model in background (non-blocking)
      localAI.init().catch(err => console.warn('AI model load failed', err));

      // Pre-fetch category samples from Supabase
      const { data } = await supabase
        .from('category_embeddings')
        .select('*');
      // Store in local DB for classifier
    } catch (err) {
      Logger.error('Local initialization failed', err);
      // Continue - app still works, just without AI
    }
  };

  if (user) {
    initializeLocal();
  }
}, [user]);
```

---

## Phase 2: Spending Insights (Week 2)

### 2.1 Create Insight Analyzer (`src/lib/aiModels/insightAnalyzer.ts`)

**Purpose:** Detect patterns, anomalies, predictions

**Responsibilities:**
- Analyze spending by category week-over-week
- Detect unusual spikes (>50% above average)
- Predict next period spending
- Format insights for display

**File:** `src/lib/aiModels/insightAnalyzer.ts`

**Key exports:**
```typescript
export interface Insight {
  id: string;
  type: 'trend' | 'anomaly' | 'prediction';
  categoryId: string;
  categoryName: string;
  title: string;
  description: string;
  metadata: {
    percentChange?: number;
    currentAmount?: number;
    previousAmount?: number;
    anomalySeverity?: number; // 0-1
  };
}

export async function analyzeTransactions(
  transactions: LocalTransaction[],
  categories: Category[]
): Promise<Insight[]>
```

**Algorithm:**
1. Group transactions by category + week/month
2. Calculate spending per category per period
3. Compare to previous period → detect trends
4. Compare to rolling average → detect anomalies
5. Project forward → predict next period
6. Filter low-confidence insights
7. Return top 5 insights

### 2.2 Integrate Insights Hook (`src/hooks/useLocalInsights.ts`)

**Purpose:** Fetch + update insights, handle caching

**File:** `src/hooks/useLocalInsights.ts`

**Key exports:**
```typescript
export function useLocalInsights() {
  return {
    insights: Insight[],
    loading: boolean,
    refresh(): Promise<void>,
    // Called when new transactions added
    recomputeInsights(): Promise<void>
  }
}
```

**Logic:**
- On mount: fetch uncomputed transactions from local DB
- Run `analyzeTransactions()`
- Store insights in local DB (synced = false)
- Return results
- On transaction create: trigger recompute (debounced)

### 2.3 Add to Dashboard (`src/pages/Dashboard.tsx`)

**Changes:**
- Import `useLocalInsights()`
- Display top insights above or below spending summary
- Show trend badges, anomaly alerts
- Link to detailed analytics

**Example UI:**
```
┌─────────────────────────────────┐
│ 📊 Spending Insights            │
├─────────────────────────────────┤
│ 📈 Dining: +40% vs last month    │
│ ⚠️ Entertainment: $500 spike!    │
│ 💰 Groceries: On track          │
└─────────────────────────────────┘
```

---

## Phase 3: Daily Sync + Service Worker (Week 3)

### 3.1 Create Sync Service (`src/lib/localDB/sync.ts`)

**Purpose:** Sync unsynced data to Supabase daily

**Responsibilities:**
- Fetch unsynced transactions + insights from local DB
- Upload to Supabase tables (`transactions`, `spending_insights`)
- Handle conflicts (device offline, duplicate IDs)
- Mark as synced in local DB
- Return sync report

**File:** `src/lib/localDB/sync.ts`

**Key exports:**
```typescript
export async function syncToSupabase(
  localDB: LocalDB,
  supabaseClient: SupabaseClient
): Promise<{
  transactionsSynced: number;
  insightsSynced: number;
  errors: string[];
  lastSyncTime: Date;
}>
```

**Logic:**
```typescript
export async function syncToSupabase() {
  try {
    // 1. Get unsynced data from local DB
    const { transactions, insights } = await localDB.getUnsyncedData();

    if (transactions.length === 0 && insights.length === 0) {
      return { success: true, synced: 0 };
    }

    // 2. Upload transactions
    const { error: txError } = await supabase
      .from('transactions')
      .insert(transactions.map(tx => ({
        // Map local fields to Supabase schema
        merchant: tx.merchant,
        amount: tx.amount,
        category_id: tx.category_id,
        // Store AI predictions as metadata for training
        metadata: {
          predicted_category_id: tx.category_predicted,
          predicted_confidence: tx.category_confidence,
        },
        date: tx.date,
        note: tx.note,
      })));

    // 3. Upload insights
    const { error: insError } = await supabase
      .from('spending_insights')
      .insert(insights.map(i => ({
        user_id: user.id,
        type: i.type,
        category_id: i.category_id,
        title: i.title,
        description: i.description,
        metadata: i.metadata,
      })));

    // 4. Mark as synced locally
    if (!txError) {
      await localDB.updateSynced('local_transactions',
        transactions.map(t => t.id));
    }
    if (!insError) {
      await localDB.updateSynced('local_insights',
        insights.map(i => i.id));
    }

    return { success: true, synced: transactions.length + insights.length };
  } catch (err) {
    Logger.error('Sync failed', err);
    return { success: false, error: err.message };
  }
}
```

### 3.2 Service Worker Scheduler (`src/workers/syncWorker.ts`)

**Purpose:** Trigger daily sync via service worker or Capacitor background task

**Option A: Web Service Worker**
```typescript
// src/workers/syncWorker.ts
self.addEventListener('message', async (event) => {
  if (event.data.type === 'SYNC_TO_SUPABASE') {
    const result = await syncToSupabase();
    self.postMessage({ type: 'SYNC_COMPLETE', result });
  }
});
```

**Option B: Capacitor Background Task (for native)**
- Use `@capacitor-community/background-tasks` plugin
- Register task to run daily at 2 AM UTC
- Call sync function on schedule

---

## Insights Types (Detailed)

### 1. Predicted Expenses
- Forecast next month spending per category
- Based on historical spending patterns
- Format: "Based on your history, expect ~$450 dining next month"
- Update weekly

### 2. Anomaly Detection
- Spending spikes >50% above rolling average
- Format: "⚠️ Entertainment: $500 (usually ~$100)"
- Severity score (0-1) for UX emphasis

### 3. Savings Rate Optimization
- Calculate current savings rate
- Suggest categories to cut for target savings rate
- Format: "Cut dining by $50/month → +2% savings rate"
- Based on user's stated goals (from savings_goals table)

### 4. Goal Tracking Progress
- Real-time progress toward active savings goals
- Projection: Will you hit goal by deadline?
- Format: "Vacation: $3,500/$5,000 (70% • On track)"
- Color-coded: Green (on track), yellow (at risk), red (behind)

### 5. Trends & Spending Habits Frequency
- Week-over-week category trends (↑↓→)
- Most frequent merchants (internal, for AI training)
- Spending patterns (e.g., "Higher dining on weekends")
- **Internal use:** Feed into AI knowledgebase for future model improvements
- Not displayed to user (backend only)

---

## User Settings for AI

### Confidence Threshold (Editable)
- Default: 60% (suggest category if confidence ≥ 60%)
- User can adjust: 40% (more suggestions, less accurate) ↔ 80% (fewer, more accurate)
- Location: Settings → AI & Automation
- UX: Slider "How confident should AI be before suggesting?"

### Insights Preferences (Editable)
- Toggle each insight type on/off
- Notification frequency (daily, weekly, never)
- Display threshold (show insights only if severity > X)

---

**Integration:**
```typescript
// In App.tsx or new initialization hook:
useEffect(() => {
  // Web: Start service worker periodic sync
  if ('serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then(reg => {
      reg.periodicSync.register('sync-local-db', { minInterval: 24 * 60 * 60 * 1000 });
    });
  }

  // Mobile: Register background task
  if (Capacitor.isNativePlatform()) {
    BackgroundTask.enable();
    BackgroundTask.beforeExit(async () => {
      await syncToSupabase();
      BackgroundTask.finish({ requiresSuccess: true });
    });
  }
}, []);
```

### 3.3 Create Supabase Tables for Insights

**Migration:** `supabase/migrations/20260329000000_add_spending_insights.sql`

```sql
CREATE TABLE spending_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('trend', 'anomaly', 'prediction')),
  category_id UUID REFERENCES categories(id),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, category_id, type, created_at::date)
);

CREATE INDEX idx_insights_user ON spending_insights(user_id);
CREATE INDEX idx_insights_created ON spending_insights(created_at DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_insights_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_spending_insights_timestamp
BEFORE UPDATE ON spending_insights
FOR EACH ROW
EXECUTE FUNCTION update_insights_timestamp();
```

### 3.4 Optional: Category Embeddings Table

**Purpose:** Cache embeddings for faster similarity search

**Migration:** `supabase/migrations/20260329000001_add_category_embeddings.sql`

```sql
CREATE TABLE category_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  merchant TEXT NOT NULL,
  embedding VECTOR(512),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category_id, merchant)
);

CREATE INDEX idx_embeddings_category ON category_embeddings(category_id);

-- Build embeddings from existing transactions
-- This can be done via Edge Function periodically
```

---

## Files to Create

```
src/
├─ hooks/
│  ├─ useLocalDB.ts                    # Capacitor SQLite wrapper
│  ├─ useLocalAI.ts                    # TensorFlow.js + model loading
│  └─ useLocalInsights.ts              # Insights fetch + compute
├─ lib/
│  ├─ aiModels/
│  │  ├─ categoryClassifier.ts         # Rule-based + embedding categorization
│  │  └─ insightAnalyzer.ts            # Spending pattern detection
│  └─ localDB/
│     └─ sync.ts                       # Daily sync to Supabase
├─ workers/
│  └─ syncWorker.ts                    # Service worker for periodic sync
└─ types/
   └─ localAI.ts                       # Type definitions

supabase/migrations/
├─ 20260329000000_add_spending_insights.sql
└─ 20260329000001_add_category_embeddings.sql  (optional)
```

## Files to Modify

```
src/
├─ components/
│  └─ TransactionForm.tsx              # Add AI suggestion + local DB insert
├─ pages/
│  └─ Dashboard.tsx                    # Add insights section
├─ hooks/
│  └─ useAuth.tsx                      # Init local DB on auth
├─ App.tsx                             # Register sync worker, initialize
└─ index.css                           # (if needed for loading state)

package.json                           # Add dependencies
```

---

## Testing Plan

**Unit Tests:**
- `categoryClassifier.test.ts` - Embedding similarity + rule-based matching
- `insightAnalyzer.test.ts` - Trend detection, anomaly detection
- `sync.test.ts` - Conflict handling, retry logic

**Integration Tests:**
- `TransactionForm.integration.test.tsx` - AI suggestion + local DB save
- `useLocalDB.integration.test.ts` - DB operations + sync

**Manual Testing:**
- Create transaction → verify AI suggestion appears
- Check local DB via DevTools (IndexedDB)
- Check Supabase after daily sync
- Airplane mode → offline DB write → verify sync on reconnect

---

## Rollout Strategy

**Week 1:** Deploy Phase 1 (categorization) to dev
- Feature flag categorization suggestions off by default
- Enable for 10% of users (dogfooding)
- Monitor accuracy, latency, local DB size

**Week 2:** Deploy Phase 2 (insights) to dev
- Show insights on Dashboard
- Gather feedback on relevance

**Week 3:** Deploy Phase 3 (sync) to dev
- Enable periodic sync
- Monitor sync success rate, failures

**Week 4:** Soft launch to production
- Roll out to 25% of users
- Monitor performance, disk usage, battery impact
- Gather user feedback

**Week 5+:** Full rollout
- 100% of users
- Prepare Phase 2 (advanced models, chat assistant)

---

## Known Limitations & Future Work

1. **Model size:** TensorFlow.js + encoder = ~1-2MB total (acceptable for modern devices)
2. **Accuracy:** Embedding similarity ~70-80% accuracy for categorization. Plan AI upgrade in Phase 8.
3. **Language:** English only. Phase 2: Add language detection + multilingual models.
4. **Privacy:** All processing local. Zero data sent to external AI APIs (unlike Claude API approach).
5. **Battery:** Model inference + DB operations are minimal impact. Monitor on mobile.

**Future enhancements:**
- Fine-tune encoder with user's transaction history
- Add natural language parsing for voice input ("spent $45 on coffee" → extract merchant + amount)
- Receipt item extraction (beyond OCR total + date)
- Chat assistant for financial questions
- Predictive bill reminders based on recurring transactions

---

## Approval Checklist

Before coding:
- [ ] Confirm Phase 1 + 2 + 3 scope aligns with your vision
- [ ] Approve TensorFlow.js + Universal Sentence Encoder choice
- [ ] Approve daily sync timing (2 AM UTC)
- [ ] Confirm feature flags approach (if needed)
- [ ] Review Supabase schema changes

Ready to proceed?
