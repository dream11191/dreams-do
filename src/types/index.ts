// ==================== 基础类型 ====================

export type Priority = 'high' | 'medium' | 'low';
export type Tag = {
  id: string;
  name: string;
  color: string;
};

// ==================== 模块一：日程提醒 ====================

export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface ScheduleItem {
  id: string;
  title: string;
  content: string;
  link?: string;
  reminderTime: string; // ISO datetime
  deadlineTime: string; // ISO datetime
  repeatType: RepeatType;
  priority: Priority;
  tags: Tag[];
  completed: boolean;
  overdue: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==================== 模块二：记账表格 ====================

export interface LedgerTable {
  id: string;
  name: string;
  category: string;
  headers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LedgerRow {
  id: string;
  tableId: string;
  cells: Record<string, string>; // header name -> value
  createdAt: string;
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  icon: string;
  color: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== 模块三：学习打卡 ====================

export type TaskStatus = 'pending' | 'completed';
export type TaskDifficulty = 'easy' | 'medium' | 'hard';

export interface StudyLink {
  name: string;
  url: string;
}

export interface StudyTask {
  id: string;
  projectId: string;
  name: string;
  startTime: string;
  deadlineTime: string;
  status: TaskStatus;
  solutionLinks: StudyLink[];
  errorNotes?: string;
  masteryLevel?: number; // 1-5
  difficulty: TaskDifficulty;
  tags: Tag[];
  favorite?: boolean;
  duration?: number; // 学习时长(分钟)
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudyProject {
  id: string;
  name: string;
  description: string;
  targetCount: number;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

// ==================== 模块四：素材收藏 ====================

export type MaterialStatus = 'collected' | 'planned' | 'used';
export type MaterialType = 'design' | 'editing' | 'tech' | 'life' | 'other';

export interface MaterialFile {
  name: string;
  originalName: string;
  path: string;
  url: string;
  type: 'image' | 'document';
  size: number;
}

export interface MaterialItem {
  id: string;
  title: string;
  folderId: string;
  type: MaterialType;
  tags: Tag[];
  content: string;
  links: string[];
  files: MaterialFile[];
  status: MaterialStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialFolder {
  id: string;
  name: string;
  icon: string;
  createdAt: string;
}

export interface QuickNote {
  id: string;
  content: string;
  color: string;
  createdAt: string;
}

// ==================== 生日提醒 ====================

export interface Birthday {
  id: string;
  name: string;
  month: number; // 1-12
  day: number; // 1-31
  createdAt: string;
  updatedAt: string;
}

// ==================== 账户交易流水 ====================

export type TransactionType = 'expense' | 'income';

export interface TransactionRecord {
  id: string;
  accountId: string;
  type: TransactionType;
  category: string;
  amount: number;
  note: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

// ==================== 全局 ====================

export interface AppSettings {
  darkMode: boolean;
  userName: string;
  avatar: string;
  backgroundImage: string;
}

export interface TaskMaterialLink {
  id: string;
  taskId: string;
  materialId: string;
}

// ==================== 统计数据 ====================

export interface WeeklyStats {
  weekStart: string;
  completedCount: number;
  totalDuration: number;
  dateRange: string;
}

export interface CategoryStats {
  tag: string;
  completed: number;
  total: number;
  color: string;
}