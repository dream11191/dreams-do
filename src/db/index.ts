import { openDB, IDBPDatabase } from 'idb';
import { supabase } from '../supabase/client';
import type {
  ScheduleItem, LedgerTable, LedgerRow, Account, StudyProject, StudyTask,
  MaterialItem, MaterialFolder, QuickNote, AppSettings, TaskMaterialLink,
  Birthday, TransactionRecord
} from '../types';

const DB_NAME = 'life-assistant-db';
const DB_VERSION = 3;

let dbInstance: IDBPDatabase | null = null;

// ==================== 本地 IndexedDB ====================

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('schedules')) {
        db.createObjectStore('schedules', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('ledger_tables')) {
        db.createObjectStore('ledger_tables', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('ledger_rows')) {
        const store = db.createObjectStore('ledger_rows', { keyPath: 'id' });
        store.createIndex('tableId', 'tableId');
      }
      if (!db.objectStoreNames.contains('study_projects')) {
        db.createObjectStore('study_projects', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('study_tasks')) {
        const store = db.createObjectStore('study_tasks', { keyPath: 'id' });
        store.createIndex('projectId', 'projectId');
      }
      if (!db.objectStoreNames.contains('material_folders')) {
        db.createObjectStore('material_folders', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('material_items')) {
        const store = db.createObjectStore('material_items', { keyPath: 'id' });
        store.createIndex('folderId', 'folderId');
      }
      if (!db.objectStoreNames.contains('quick_notes')) {
        db.createObjectStore('quick_notes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('task_material_links')) {
        const store = db.createObjectStore('task_material_links', { keyPath: 'id' });
        store.createIndex('taskId', 'taskId');
      }
      if (!db.objectStoreNames.contains('accounts')) {
        db.createObjectStore('accounts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('birthdays')) {
        db.createObjectStore('birthdays', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('transactions')) {
        const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
        txStore.createIndex('accountId', 'accountId');
      }
    },
  });

  return dbInstance;
}

// ==================== 通用 CRUD（本地） ====================

async function localGetAll<T>(storeName: string): Promise<T[]> {
  const db = await getDB();
  return db.getAll(storeName);
}

async function localGetOne<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await getDB();
  return db.get(storeName, id);
}

async function localPut<T>(storeName: string, item: T): Promise<void> {
  const db = await getDB();
  await db.put(storeName, item);
}

async function localRemove(storeName: string, id: string): Promise<void> {
  const db = await getDB();
  await db.delete(storeName, id);
}

async function localGetByIndex<T>(storeName: string, indexName: string, value: string): Promise<T[]> {
  const db = await getDB();
  return db.getAllFromIndex(storeName, indexName, value);
}

// ==================== 云同步：数据与 Supabase 双向同步 ====================

const TABLE_MAP: Record<string, string> = {
  schedules: 'schedules',
  ledger_tables: 'ledger_tables',
  ledger_rows: 'ledger_rows',
  accounts: 'accounts',
  study_projects: 'study_projects',
  study_tasks: 'study_tasks',
  material_folders: 'material_folders',
  material_items: 'material_items',
  quick_notes: 'quick_notes',
  task_material_links: 'task_material_links',
  birthdays: 'birthdays',
  transactions: 'transactions',
  settings: 'settings',
};

async function getUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

async function cloudGetAll<T>(storeName: string): Promise<T[] | null> {
  const userId = await getUserId();
  if (!userId) { console.warn('cloudGetAll: not logged in, skipping'); return null; }
  const table = TABLE_MAP[storeName];
  if (!table) { console.warn('cloudGetAll: no table for', storeName); return null; }
  const { data, error } = await supabase.from(table).select('*');
  if (error) { console.error('cloudGetAll error:', error); return null; }
  console.log(`cloudGetAll: ${table} returned ${data?.length ?? 0} rows`);
  return (data as unknown[]).map((item) => {
    const { user_id, ...rest } = item as Record<string, unknown>;
    return rest as unknown as T;
  });
}

async function cloudGetByIndex<T>(storeName: string, indexName: string, value: string): Promise<T[] | null> {
  const userId = await getUserId();
  if (!userId) return null;
  const table = TABLE_MAP[storeName];
  if (!table) return null;
  const { data, error } = await supabase.from(table).select('*').eq(`"${indexName}"`, value);
  if (error) { console.error('cloudGetByIndex error:', error); return null; }
  return (data as unknown[]).map((item) => {
    const { user_id, ...rest } = item as Record<string, unknown>;
    return rest as unknown as T;
  });
}

async function cloudPut<T>(storeName: string, item: T): Promise<boolean> {
  const userId = await getUserId();
  if (!userId) { console.warn('cloudPut: not logged in, skipping'); return false; }
  const table = TABLE_MAP[storeName];
  if (!table) { console.warn('cloudPut: no table for', storeName); return false; }
  const { error } = await supabase.from(table).upsert({ ...(item as Record<string, unknown>), user_id: userId });
  if (error) { console.error('cloudPut error:', error); return false; }
  console.log(`cloudPut: saved to ${table}, id=${(item as Record<string, unknown>).id}`);
  return true;
}

async function cloudRemove(storeName: string, id: string): Promise<boolean> {
  const userId = await getUserId();
  if (!userId) return false;
  const table = TABLE_MAP[storeName];
  if (!table) return false;
  const { error } = await supabase.from(table).delete().eq('"id"', id);
  if (error) { console.error('cloudRemove error:', error); return false; }
  return true;
}

async function cloudGetOne<T>(storeName: string, id: string): Promise<T | undefined | null> {
  const userId = await getUserId();
  if (!userId) return null;
  const table = TABLE_MAP[storeName];
  if (!table) return null;
  const { data, error } = await supabase.from(table).select('*').eq('"id"', id).single();
  if (error) { console.error('cloudGetOne error:', error); return null; }
  if (!data) return null;
  const { user_id, ...rest } = data as Record<string, unknown>;
  return rest as unknown as T;
}

// 登录后：把本地数据全部上传到云端
export async function pushLocalToCloud(): Promise<void> {
  const userId = await getUserId();
  console.log('pushLocalToCloud: userId=', userId);
  if (!userId) return;
  const db = await getDB();
  for (const storeName of Object.keys(TABLE_MAP)) {
    const items = await db.getAll(storeName);
    console.log(`pushLocalToCloud: ${storeName} has ${items.length} local items`);
    for (const item of items) {
      await cloudPut(storeName, item);
    }
  }
  const settings = await localGetOne<AppSettings & { id: string }>('settings', 'app');
  if (settings) {
    await cloudPut('settings', settings);
  }
  console.log('pushLocalToCloud: done');
}

// 登录后：从云端拉取数据到本地
export async function pullCloudToLocal(): Promise<void> {
  const userId = await getUserId();
  console.log('pullCloudToLocal: userId=', userId);
  if (!userId) return;
  const db = await getDB();
  for (const storeName of Object.keys(TABLE_MAP)) {
    const cloudItems = await cloudGetAll(storeName);
    console.log(`pullCloudToLocal: ${storeName} has ${cloudItems?.length ?? 0} cloud items`);
    if (cloudItems !== null && Array.isArray(cloudItems) && cloudItems.length > 0) {
      await db.clear(storeName);
      const tx = db.transaction(storeName, 'readwrite');
      for (const item of cloudItems) {
        await tx.store.put(item);
      }
      await tx.done;
    }
  }
  // 同步设置
  const cloudSettings = await cloudGetOne<AppSettings>('settings', 'app');
  if (cloudSettings) {
    const localSettings = await localGetOne<AppSettings & { id: string }>('settings', 'app');
    await localPut('settings', {
      id: 'app',
      darkMode: cloudSettings.darkMode ?? localSettings?.darkMode ?? false,
      userName: cloudSettings.userName || localSettings?.userName || '同学',
      avatar: cloudSettings.avatar || localSettings?.avatar || '',
      backgroundImage: cloudSettings.backgroundImage || localSettings?.backgroundImage || '',
    });
  }
  console.log('pullCloudToLocal: done');
}

// 合并本地和云端数据，按 id 去重，优先保留 updatedAt 较新的
function mergeData<T>(local: T[], cloud: T[]): T[] {
  const map = new Map<string, T>();
  const safeLocal = Array.isArray(local) ? local : [];
  const safeCloud = Array.isArray(cloud) ? cloud : [];
  for (const item of safeLocal) {
    map.set((item as Record<string, unknown>).id as string, item);
  }
  for (const item of safeCloud) {
    const id = (item as Record<string, unknown>).id as string;
    const existing = map.get(id);
    if (!existing) {
      map.set(id, item);
    } else {
      const localTime = (existing as Record<string, unknown>).updatedAt as string || (existing as Record<string, unknown>).createdAt as string || '';
      const cloudTime = (item as Record<string, unknown>).updatedAt as string || (item as Record<string, unknown>).createdAt as string || '';
      if (cloudTime > localTime) {
        map.set(id, item);
      }
    }
  }
  return Array.from(map.values());
}

// 带同步的通用操作
async function syncedGetAll<T>(storeName: string): Promise<T[]> {
  const local = await localGetAll<T>(storeName);
  const safeLocal = Array.isArray(local) ? local : [];
  const userId = await getUserId();
  console.log(`syncedGetAll: ${storeName} local=${safeLocal.length}, userId=${userId}`);
  if (userId) {
    const cloud = await cloudGetAll<T>(storeName);
    if (cloud !== null && Array.isArray(cloud)) {
      const merged = mergeData(safeLocal, cloud);
      console.log(`syncedGetAll: ${storeName} merged=${merged.length} (local=${safeLocal.length}, cloud=${cloud.length})`);
      return merged.filter(Boolean);
    }
  }
  return safeLocal.filter(Boolean);
}

async function syncedGetOne<T>(storeName: string, id: string): Promise<T | undefined> {
  const local = await localGetOne<T>(storeName, id);
  const userId = await getUserId();
  if (userId) {
    const cloud = await cloudGetOne<T>(storeName, id);
    if (cloud !== null && cloud !== undefined) {
      if (!local) return cloud;
      const localTime = (local as Record<string, unknown>).updatedAt as string || (local as Record<string, unknown>).createdAt as string || '';
      const cloudTime = (cloud as Record<string, unknown>).updatedAt as string || (cloud as Record<string, unknown>).createdAt as string || '';
      return cloudTime > localTime ? cloud : local;
    }
  }
  return local;
}

async function syncedPut<T>(storeName: string, item: T): Promise<void> {
  await localPut(storeName, item);
  const userId = await getUserId();
  if (userId) {
    await cloudPut(storeName, item);
  }
}

async function syncedRemove(storeName: string, id: string): Promise<void> {
  await localRemove(storeName, id);
  const userId = await getUserId();
  if (userId) {
    await cloudRemove(storeName, id);
  }
}

async function syncedGetByIndex<T>(storeName: string, indexName: string, value: string): Promise<T[]> {
  const local = await localGetByIndex<T>(storeName, indexName, value);
  const safeLocal = Array.isArray(local) ? local : [];
  const userId = await getUserId();
  if (userId) {
    const cloud = await cloudGetByIndex<T>(storeName, indexName, value);
    if (cloud !== null && Array.isArray(cloud)) {
      return mergeData(safeLocal, cloud).filter(Boolean);
    }
  }
  return safeLocal.filter(Boolean);
}

// ==================== 日程 CRUD ====================

export const scheduleDB = {
  getAll: () => syncedGetAll<ScheduleItem>('schedules'),
  get: (id: string) => syncedGetOne<ScheduleItem>('schedules', id),
  save: (item: ScheduleItem) => syncedPut('schedules', item),
  delete: (id: string) => syncedRemove('schedules', id),
};

// ==================== 记账表格 CRUD ====================

export const ledgerTableDB = {
  getAll: () => syncedGetAll<LedgerTable>('ledger_tables'),
  get: (id: string) => syncedGetOne<LedgerTable>('ledger_tables', id),
  save: (item: LedgerTable) => syncedPut('ledger_tables', item),
  delete: async (id: string) => {
    await syncedRemove('ledger_tables', id);
    const rows = await ledgerRowDB.getByTable(id);
    for (const row of rows) {
      await ledgerRowDB.delete(row.id);
    }
  },
};

export const ledgerRowDB = {
  getAll: () => syncedGetAll<LedgerRow>('ledger_rows'),
  get: (id: string) => syncedGetOne<LedgerRow>('ledger_rows', id),
  save: (item: LedgerRow) => syncedPut('ledger_rows', item),
  delete: (id: string) => syncedRemove('ledger_rows', id),
  getByTable: (tableId: string) => syncedGetByIndex<LedgerRow>('ledger_rows', 'tableId', tableId),
};

export const accountDB = {
  getAll: () => syncedGetAll<Account>('accounts'),
  get: (id: string) => syncedGetOne<Account>('accounts', id),
  save: (item: Account) => syncedPut('accounts', item),
  delete: (id: string) => syncedRemove('accounts', id),
};

// ==================== 学习打卡 CRUD ====================

export const studyProjectDB = {
  getAll: () => syncedGetAll<StudyProject>('study_projects'),
  get: (id: string) => syncedGetOne<StudyProject>('study_projects', id),
  save: (item: StudyProject) => syncedPut('study_projects', item),
  delete: async (id: string) => {
    await syncedRemove('study_projects', id);
    const tasks = await studyTaskDB.getByProject(id);
    for (const task of tasks) {
      await studyTaskDB.delete(task.id);
    }
  },
};

export const studyTaskDB = {
  getAll: () => syncedGetAll<StudyTask>('study_tasks'),
  get: (id: string) => syncedGetOne<StudyTask>('study_tasks', id),
  save: (item: StudyTask) => syncedPut('study_tasks', item),
  delete: (id: string) => syncedRemove('study_tasks', id),
  getByProject: (projectId: string) => syncedGetByIndex<StudyTask>('study_tasks', 'projectId', projectId),
};

// ==================== 素材收藏 CRUD ====================

export const materialFolderDB = {
  getAll: () => syncedGetAll<MaterialFolder>('material_folders'),
  get: (id: string) => syncedGetOne<MaterialFolder>('material_folders', id),
  save: (item: MaterialFolder) => syncedPut('material_folders', item),
  delete: async (id: string) => {
    await syncedRemove('material_folders', id);
    const items = await materialItemDB.getByFolder(id);
    for (const item of items) {
      await materialItemDB.delete(item.id);
    }
  },
};

export const materialItemDB = {
  getAll: () => syncedGetAll<MaterialItem>('material_items'),
  get: (id: string) => syncedGetOne<MaterialItem>('material_items', id),
  save: (item: MaterialItem) => syncedPut('material_items', item),
  delete: (id: string) => syncedRemove('material_items', id),
  getByFolder: (folderId: string) => syncedGetByIndex<MaterialItem>('material_items', 'folderId', folderId),
};

// ==================== 速记板 CRUD ====================

export const quickNoteDB = {
  getAll: () => syncedGetAll<QuickNote>('quick_notes'),
  save: (item: QuickNote) => syncedPut('quick_notes', item),
  delete: (id: string) => syncedRemove('quick_notes', id),
};

// ==================== 设置 ====================

export const settingsDB = {
  get: async (): Promise<AppSettings> => {
    const local = await localGetOne<AppSettings & { id: string }>('settings', 'app');
    const defaults: AppSettings = { darkMode: false, userName: '同学', avatar: '', backgroundImage: '' };
    const localSettings = local ? { darkMode: local.darkMode, userName: local.userName, avatar: local.avatar || '', backgroundImage: local.backgroundImage } : defaults;
    const userId = await getUserId();
    if (userId) {
      const cloud = await cloudGetOne<AppSettings>('settings', 'app');
      if (cloud) {
        return {
          darkMode: cloud.darkMode ?? localSettings.darkMode,
          userName: cloud.userName || localSettings.userName,
          avatar: cloud.avatar || localSettings.avatar,
          backgroundImage: cloud.backgroundImage || localSettings.backgroundImage,
        };
      }
    }
    return localSettings;
  },
  save: async (settings: AppSettings) => {
    const item = { ...settings, id: 'app' };
    await localPut('settings', item);
    const userId = await getUserId();
    if (userId) {
      await cloudPut('settings', item);
    }
  },
};

// ==================== 任务-素材联动 ====================

export const taskMaterialLinkDB = {
  getAll: () => syncedGetAll<TaskMaterialLink>('task_material_links'),
  save: (item: TaskMaterialLink) => syncedPut('task_material_links', item),
  delete: (id: string) => syncedRemove('task_material_links', id),
  getByTask: (taskId: string) => syncedGetByIndex<TaskMaterialLink>('task_material_links', 'taskId', taskId),
};

// ==================== 生日提醒 ====================

export const birthdayDB = {
  getAll: () => syncedGetAll<Birthday>('birthdays'),
  save: (item: Birthday) => syncedPut('birthdays', item),
  delete: (id: string) => syncedRemove('birthdays', id),
};

// ==================== 交易流水 ====================

export const transactionDB = {
  getAll: () => syncedGetAll<TransactionRecord>('transactions'),
  save: (item: TransactionRecord) => syncedPut('transactions', item),
  delete: (id: string) => syncedRemove('transactions', id),
  getByAccount: (accountId: string) => syncedGetByIndex<TransactionRecord>('transactions', 'accountId', accountId),
};

// ==================== 全局搜索 ====================

export async function globalSearch(query: string) {
  const lowerQuery = query.toLowerCase();
  const results: { type: string; title: string; id: string; snippet: string }[] = [];

  const schedules = await scheduleDB.getAll();
  for (const s of schedules) {
    if (s.title.toLowerCase().includes(lowerQuery) || s.content.toLowerCase().includes(lowerQuery)) {
      results.push({ type: '日程', title: s.title, id: s.id, snippet: s.content.slice(0, 80) });
    }
  }

  const tables = await ledgerTableDB.getAll();
  for (const t of tables) {
    if (t.name.toLowerCase().includes(lowerQuery)) {
      results.push({ type: '记账表格', title: t.name, id: t.id, snippet: t.category });
    }
  }

  const tasks = await studyTaskDB.getAll();
  for (const t of tasks) {
    if (t.name.toLowerCase().includes(lowerQuery) || (t.errorNotes && t.errorNotes.toLowerCase().includes(lowerQuery))) {
      results.push({ type: '学习任务', title: t.name, id: t.id, snippet: t.errorNotes?.slice(0, 80) || '' });
    }
  }

  const materials = await materialItemDB.getAll();
  for (const m of materials) {
    if (m.title.toLowerCase().includes(lowerQuery) || m.content.toLowerCase().includes(lowerQuery)) {
      results.push({ type: '素材', title: m.title, id: m.id, snippet: m.content.slice(0, 80) });
    }
  }

  return results;
}

// ==================== 数据导出导入 ====================

export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const data: Record<string, unknown> = {};

  for (const name of db.objectStoreNames) {
    data[name] = await db.getAll(name);
  }

  return JSON.stringify(data, null, 2);
}

export async function importAllData(jsonStr: string): Promise<void> {
  const data = JSON.parse(jsonStr);
  const db = await getDB();

  for (const storeName of db.objectStoreNames) {
    await db.clear(storeName);
    if (data[storeName] && Array.isArray(data[storeName])) {
      const tx = db.transaction(storeName, 'readwrite');
      for (const item of data[storeName]) {
        await tx.store.put(item);
      }
      await tx.done;
    }
  }
}