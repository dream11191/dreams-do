-- ========================================
-- 先删除所有旧表，再重建（列名加引号保持大小写）
-- ========================================

DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS birthdays CASCADE;
DROP TABLE IF EXISTS task_material_links CASCADE;
DROP TABLE IF EXISTS material_items CASCADE;
DROP TABLE IF EXISTS material_folders CASCADE;
DROP TABLE IF EXISTS study_tasks CASCADE;
DROP TABLE IF EXISTS study_projects CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS ledger_rows CASCADE;
DROP TABLE IF EXISTS ledger_tables CASCADE;
DROP TABLE IF EXISTS quick_notes CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;

-- 日程
CREATE TABLE schedules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  link TEXT,
  "reminderTime" TEXT,
  "deadlineTime" TEXT,
  "repeatType" TEXT DEFAULT 'none',
  priority TEXT DEFAULT 'medium',
  tags JSONB DEFAULT '[]',
  completed BOOLEAN DEFAULT false,
  overdue BOOLEAN DEFAULT false,
  "createdAt" TEXT,
  "updatedAt" TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own schedules" ON schedules FOR ALL USING (auth.uid() = user_id);

-- 记账表格
CREATE TABLE ledger_tables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT DEFAULT '',
  headers JSONB DEFAULT '[]',
  "createdAt" TEXT,
  "updatedAt" TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE ledger_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own ledger_tables" ON ledger_tables FOR ALL USING (auth.uid() = user_id);

-- 记账行
CREATE TABLE ledger_rows (
  id TEXT PRIMARY KEY,
  "tableId" TEXT NOT NULL,
  cells JSONB DEFAULT '{}',
  "createdAt" TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE ledger_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own ledger_rows" ON ledger_rows FOR ALL USING (auth.uid() = user_id);

-- 账户
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  balance REAL DEFAULT 0,
  icon TEXT DEFAULT '💰',
  color TEXT DEFAULT '#84cc16',
  note TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own accounts" ON accounts FOR ALL USING (auth.uid() = user_id);

-- 学习项目
CREATE TABLE study_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  "targetCount" INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]',
  "createdAt" TEXT,
  "updatedAt" TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE study_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own study_projects" ON study_projects FOR ALL USING (auth.uid() = user_id);

-- 学习任务
CREATE TABLE study_tasks (
  id TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  name TEXT NOT NULL,
  "startTime" TEXT,
  "deadlineTime" TEXT,
  status TEXT DEFAULT 'pending',
  "solutionLink" TEXT,
  "errorNotes" TEXT,
  "masteryLevel" INTEGER,
  difficulty TEXT DEFAULT 'medium',
  tags JSONB DEFAULT '[]',
  duration INTEGER,
  "completedAt" TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE study_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own study_tasks" ON study_tasks FOR ALL USING (auth.uid() = user_id);

-- 素材文件夹
CREATE TABLE material_folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📁',
  "createdAt" TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE material_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own material_folders" ON material_folders FOR ALL USING (auth.uid() = user_id);

-- 素材
CREATE TABLE material_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  "folderId" TEXT,
  type TEXT DEFAULT 'other',
  tags JSONB DEFAULT '[]',
  content TEXT DEFAULT '',
  links JSONB DEFAULT '[]',
  "files" JSONB DEFAULT '[]',
  status TEXT DEFAULT 'collected',
  "createdAt" TEXT,
  "updatedAt" TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE material_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own material_items" ON material_items FOR ALL USING (auth.uid() = user_id);

-- 速记
CREATE TABLE quick_notes (
  id TEXT PRIMARY KEY,
  content TEXT DEFAULT '',
  "color" TEXT DEFAULT '#ffffff',
  "createdAt" TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE quick_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own quick_notes" ON quick_notes FOR ALL USING (auth.uid() = user_id);

-- 任务素材关联
CREATE TABLE task_material_links (
  id TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL,
  "materialId" TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE task_material_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own task_material_links" ON task_material_links FOR ALL USING (auth.uid() = user_id);

-- 设置
CREATE TABLE settings (
  id TEXT PRIMARY KEY DEFAULT 'app',
  "darkMode" BOOLEAN DEFAULT false,
  "userName" TEXT DEFAULT '同学',
  "avatar" TEXT DEFAULT '',
  "backgroundImage" TEXT DEFAULT '',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own settings" ON settings FOR ALL USING (auth.uid() = user_id);

-- 生日
CREATE TABLE birthdays (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  "createdAt" TEXT,
  "updatedAt" TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE birthdays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own birthdays" ON birthdays FOR ALL USING (auth.uid() = user_id);

-- 账户交易流水
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  category TEXT DEFAULT '',
  amount REAL DEFAULT 0,
  note TEXT DEFAULT '',
  date TEXT DEFAULT '',
  "createdAt" TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);

-- ==================== 存储桶 ====================
-- 在 Supabase SQL Editor 中执行以下命令创建存储桶
-- INSERT INTO storage.buckets (id, name, public) VALUES ('materials', 'materials', true);
-- 然后为该存储桶创建策略：
-- CREATE POLICY "Users can upload materials" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'materials' AND auth.uid() = owner);
-- CREATE POLICY "Users can read materials" ON storage.objects FOR SELECT USING (bucket_id = 'materials');
-- CREATE POLICY "Users can update own materials" ON storage.objects FOR UPDATE USING (bucket_id = 'materials' AND auth.uid() = owner);
-- CREATE POLICY "Users can delete own materials" ON storage.objects FOR DELETE USING (bucket_id = 'materials' AND auth.uid() = owner);