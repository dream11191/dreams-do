import { v4 as uuidv4 } from 'uuid';
import type { ScheduleItem, LedgerTable, LedgerRow, Account, StudyProject, StudyTask, MaterialItem, MaterialFolder, QuickNote, TaskMaterialLink, Birthday, TransactionRecord } from '../types';

export function generateId(): string {
  return uuidv4();
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function isOverdue(deadline: string): boolean {
  return new Date(deadline) < new Date();
}

export function daysUntil(date: string): number {
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getWeekStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString();
}

export function getWeekRange(): string {
  const start = new Date(getWeekStart());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
}

export function createScheduleItem(partial: Partial<ScheduleItem>): ScheduleItem {
  const now = nowISO();
  return {
    id: generateId(),
    title: '',
    content: '',
    link: '',
    reminderTime: now,
    deadlineTime: now,
    repeatType: 'none',
    priority: 'medium',
    tags: [],
    completed: false,
    overdue: false,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function createLedgerTable(partial: Partial<LedgerTable>): LedgerTable {
  return {
    id: generateId(),
    name: '',
    category: '默认',
    headers: ['日期', '类别', '金额', '备注'],
    createdAt: nowISO(),
    updatedAt: nowISO(),
    ...partial,
  };
}

export function createLedgerRow(partial: Partial<LedgerRow>): LedgerRow {
  return {
    id: generateId(),
    tableId: '',
    cells: {},
    createdAt: nowISO(),
    ...partial,
  };
}

export function createAccount(partial: Partial<Account>): Account {
  return {
    id: generateId(),
    name: '',
    balance: 0,
    icon: '💰',
    color: '#84cc16',
    note: '',
    createdAt: nowISO(),
    updatedAt: nowISO(),
    ...partial,
  };
}

export function createStudyProject(partial: Partial<StudyProject>): StudyProject {
  return {
    id: generateId(),
    name: '',
    description: '',
    targetCount: 0,
    tags: [],
    createdAt: nowISO(),
    updatedAt: nowISO(),
    ...partial,
  };
}

export function createStudyTask(partial: Partial<StudyTask>): StudyTask {
  const now = nowISO();
  return {
    id: generateId(),
    projectId: '',
    name: '',
    startTime: now,
    deadlineTime: now,
    status: 'pending',
    difficulty: 'medium',
    tags: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function createMaterialFolder(partial: Partial<MaterialFolder>): MaterialFolder {
  return {
    id: generateId(),
    name: '',
    icon: '📁',
    createdAt: nowISO(),
    ...partial,
  };
}

export function createMaterialItem(partial: Partial<MaterialItem>): MaterialItem {
  return {
    id: generateId(),
    title: '',
    folderId: '',
    type: 'other',
    tags: [],
    content: '',
    links: [],
    files: [],
    status: 'collected',
    createdAt: nowISO(),
    updatedAt: nowISO(),
    ...partial,
  };
}

export function createQuickNote(partial: Partial<QuickNote>): QuickNote {
  return {
    id: generateId(),
    content: '',
    color: '#ffffff',
    createdAt: nowISO(),
    ...partial,
  };
}

export function createTaskMaterialLink(taskId: string, materialId: string): TaskMaterialLink {
  return {
    id: generateId(),
    taskId,
    materialId,
  };
}

export function exportJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCSV(headers: string[], rows: Record<string, string>[], filename: string) {
  const headerLine = headers.join(',');
  const dataLines = rows.map((row) =>
    headers.map((h) => `"${(row[h] || '').replace(/"/g, '""')}"`).join(',')
  );
  const csv = '\uFEFF' + [headerLine, ...dataLines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return 'text-red-600 dark:text-red-400';
    case 'medium': return 'text-yellow-600 dark:text-yellow-400';
    case 'low': return 'text-green-600 dark:text-green-400';
    default: return '';
  }
}

export function getPriorityBadge(priority: string): string {
  switch (priority) {
    case 'high': return 'badge badge-high';
    case 'medium': return 'badge badge-medium';
    case 'low': return 'badge badge-low';
    default: return 'badge';
  }
}

export function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'high': return '高';
    case 'medium': return '中';
    case 'low': return '低';
    default: return '';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'collected': return '已收藏';
    case 'planned': return '待使用';
    case 'used': return '已使用';
    default: return '';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'collected': return 'badge bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'planned': return 'badge bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'used': return 'badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    default: return 'badge';
  }
}

export function createBirthday(partial: Partial<Birthday>): Birthday {
  return {
    id: generateId(),
    name: '',
    month: 1,
    day: 1,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    ...partial,
  };
}

export function createTransactionRecord(partial: Partial<TransactionRecord>): TransactionRecord {
  return {
    id: generateId(),
    accountId: '',
    type: 'expense',
    category: '',
    amount: 0,
    note: '',
    date: formatDate(nowISO()),
    createdAt: nowISO(),
    ...partial,
  };
}

export function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
}