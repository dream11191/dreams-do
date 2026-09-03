-- 在 Supabase SQL Editor 中执行以下 SQL 创建所有表

-- 日程
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  link TEXT,
  reminderTime TEXT,
  deadlineTime TEXT,
  repeatType TEXT DEFAULT 'none',
  priority TEXT DEFAULT 'medium',
  tags JSONB DEFAULT '[]',
  completed BOOLEAN DEFAULT false,
  overdue BOOLEAN DEFAULT false,
  createdAt TEXT,
  updatedAt TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own schedules" ON schedules FOR ALL USING (auth.uid() = user_id);

-- 记账表格
CREATE TABLE IF NOT EXISTS ledger_tables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT DEFAULT '',
  headers JSONB DEFAULT '[]',
  createdAt TEXT,
  updatedAt TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE ledger_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own ledger_tables" ON ledger_tables FOR ALL USING (auth.uid() = user_id);

-- 记账行
CREATE TABLE IF NOT EXISTS ledger_rows (
  id TEXT PRIMARY KEY,
  tableId TEXT NOT NULL,
  cells JSONB DEFAULT '{}',
  createdAt TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE ledger_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own ledger_rows" ON ledger_rows FOR ALL USING (auth.uid() = user_id);

-- 账户
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  balance REAL DEFAULT 0,
  icon TEXT DEFAULT '💰',
  color TEXT DEFAULT '#6366f1',
  note TEXT,
  createdAt TEXT,
  updatedAt TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own accounts" ON accounts FOR ALL USING (auth.uid() = user_id);

-- 学习项目
CREATE TABLE IF NOT EXISTS study_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  targetCount INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]',
  createdAt TEXT,
  updatedAt TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE study_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own study_projects" ON study_projects FOR ALL USING (auth.uid() = user_id);

-- 学习任务
CREATE TABLE IF NOT EXISTS study_tasks (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  name TEXT NOT NULL,
  startTime TEXT,
  deadlineTime TEXT,
  status TEXT DEFAULT 'pending',
  solutionLink TEXT,
  errorNotes TEXT,
  masteryLevel INTEGER,
  difficulty TEXT DEFAULT 'medium',
  tags JSONB DEFAULT '[]',
  duration INTEGER,
  completedAt TEXT,
  createdAt TEXT,
  updatedAt TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE study_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own study_tasks" ON study_tasks FOR ALL USING (auth.uid() = user_id);

-- 素材文件夹
CREATE TABLE IF NOT EXISTS material_folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📁',
  createdAt TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE material_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own material_folders" ON material_folders FOR ALL USING (auth.uid() = user_id);

-- 素材
CREATE TABLE IF NOT EXISTS material_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  folderId TEXT,
  type TEXT DEFAULT 'other',
  tags JSONB DEFAULT '[]',
  content TEXT DEFAULT '',
  links JSONB DEFAULT '[]',
  imageUrls JSONB DEFAULT '[]',
  status TEXT DEFAULT 'collected',
  createdAt TEXT,
  updatedAt TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE material_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own material_items" ON material_items FOR ALL USING (auth.uid() = user_id);

-- 速记
CREATE TABLE IF NOT EXISTS quick_notes (
  id TEXT PRIMARY KEY,
  content TEXT DEFAULT '',
  createdAt TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE quick_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own quick_notes" ON quick_notes FOR ALL USING (auth.uid() = user_id);

-- 任务素材关联
CREATE TABLE IF NOT EXISTS task_material_links (
  id TEXT PRIMARY KEY,
  taskId TEXT NOT NULL,
  materialId TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE task_material_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own task_material_links" ON task_material_links FOR ALL USING (auth.uid() = user_id);

-- 设置
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'app',
  darkMode BOOLEAN DEFAULT false,
  userName TEXT DEFAULT '同学',
  backgroundImage TEXT DEFAULT '',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own settings" ON settings FOR ALL USING (auth.uid() = user_id);

-- 生日
CREATE TABLE IF NOT EXISTS birthdays (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  createdAt TEXT,
  updatedAt TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE birthdays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own birthdays" ON birthdays FOR ALL USING (auth.uid() = user_id);

-- 账户交易流水
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  accountId TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  category TEXT DEFAULT '',
  amount REAL DEFAULT 0,
  note TEXT DEFAULT '',
  date TEXT DEFAULT '',
  createdAt TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);