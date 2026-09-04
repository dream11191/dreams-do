import { useState, useEffect } from 'react';
import { scheduleDB, studyTaskDB, studyProjectDB, materialItemDB, quickNoteDB, transactionDB } from '../db';
import type { ScheduleItem, StudyTask, StudyProject, QuickNote, TransactionRecord } from '../types';
import { formatDate, isOverdue, getWeekRange, daysUntil } from '../utils';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#84cc16', '#d9f99d', '#ef4444', '#f59e0b', '#10b981'];

export default function Dashboard() {
  const [todaySchedules, setTodaySchedules] = useState<ScheduleItem[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<(ScheduleItem | StudyTask)[]>([]);
  const [studyStats, setStudyStats] = useState({ completed: 0, total: 0 });
  const [weeklyData, setWeeklyData] = useState<{ name: string; 完成: number; 学习时长: number }[]>([]);
  const [dailyTaskData, setDailyTaskData] = useState<{ date: string; 刷题任务: number; 日程事务: number; 美工剪辑: number; 生活记账: number }[]>([]);
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [noteColor, setNoteColor] = useState('#84cc16');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const today = formatDate(new Date().toISOString());

    const schedules = await scheduleDB.getAll();
    const activeSchedules = schedules.filter((s) => !s.completed);
    setTodaySchedules(activeSchedules.filter((s) => formatDate(s.reminderTime) === today || formatDate(s.deadlineTime) === today));

    const allOverdue: (ScheduleItem | StudyTask)[] = [];
    for (const s of activeSchedules) {
      if (isOverdue(s.deadlineTime)) {
        allOverdue.push({ ...s, overdue: true } as ScheduleItem);
      }
    }
    const tasks = await studyTaskDB.getAll();
    for (const t of tasks) {
      if (t.status === 'pending' && isOverdue(t.deadlineTime)) {
        allOverdue.push(t);
      }
    }
    setOverdueTasks(allOverdue.slice(0, 5));

    const allTasks = await studyTaskDB.getAll();
    const completed = allTasks.filter((t) => t.status === 'completed').length;
    setStudyStats({ completed, total: allTasks.length });

    // 本周数据
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const wd: { name: string; 完成: number; 学习时长: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const ds = formatDate(d.toISOString());
      const dayTasks = allTasks.filter((t) => t.status === 'completed' && t.completedAt && formatDate(t.completedAt) === ds);
      wd.push({
        name: weekDays[i],
        完成: dayTasks.length,
        学习时长: dayTasks.reduce((sum, t) => sum + (t.duration || 0), 0),
      });
    }
    setWeeklyData(wd);

    const notes = await quickNoteDB.getAll();
    setQuickNotes(notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

    const transactions = await transactionDB.getAll();
    const materials = await materialItemDB.getAll();
    const completedSchedules = schedules.filter((s) => s.completed);

    const dateMap: Record<string, { 刷题任务: number; 日程事务: number; 美工剪辑: number; 生活记账: number }> = {};
    const addToDate = (date: string, key: '刷题任务' | '日程事务' | '美工剪辑' | '生活记账') => {
      if (!dateMap[date]) dateMap[date] = { 刷题任务: 0, 日程事务: 0, 美工剪辑: 0, 生活记账: 0 };
      dateMap[date][key] += 1;
    };

    allTasks.filter((t) => t.status === 'completed' && t.completedAt).forEach((t) => {
      addToDate(formatDate(t.completedAt!), '刷题任务');
    });

    completedSchedules.forEach((s) => {
      const date = formatDate(s.updatedAt);
      addToDate(date, '日程事务');
    });

    materials.filter((m) => m.createdAt).forEach((m) => {
      addToDate(formatDate(m.createdAt), '美工剪辑');
    });

    transactions.forEach((tx) => {
      addToDate(tx.date, '生活记账');
    });

    const sortedDates = Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, values]) => ({ date: date.slice(5), ...values }));
    setDailyTaskData(sortedDates);
  };

  const addQuickNote = async () => {
    if (!newNote.trim()) return;
    const note: QuickNote = { id: '', content: newNote.trim(), color: noteColor, createdAt: new Date().toISOString() };
    note.id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9);
    await quickNoteDB.save(note);
    setNewNote('');
    loadData();
  };

  const deleteNote = async (id: string) => {
    await quickNoteDB.delete(id);
    loadData();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">📊 仪表盘</h2>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card">
          <div className="text-2xl mb-1">📅</div>
          <div className="text-2xl font-bold text-primary-600">{todaySchedules.length}</div>
          <div className="text-xs text-gray-500">今日待办</div>
        </div>
        <div className="card">
          <div className="text-2xl mb-1">⚠️</div>
          <div className="text-2xl font-bold text-red-500">{overdueTasks.length}</div>
          <div className="text-xs text-gray-500">即将/已逾期</div>
        </div>
        <div className="card">
          <div className="text-2xl mb-1">✅</div>
          <div className="text-2xl font-bold text-green-500">{studyStats.completed}/{studyStats.total}</div>
          <div className="text-xs text-gray-500">学习任务完成</div>
        </div>
        <div className="card">
          <div className="text-2xl mb-1">📅</div>
          <div className="text-sm font-bold text-gray-600 dark:text-gray-400">{getWeekRange()}</div>
          <div className="text-xs text-gray-500">本周</div>
        </div>
      </div>

      {/* 今日待办 */}
      <div className="card">
        <h3 className="font-semibold mb-3 flex items-center justify-between">
          <span>📋 今日待办</span>
          <Link to="/schedule" className="text-xs text-primary-500 hover:underline">查看全部</Link>
        </h3>
        {todaySchedules.length === 0 ? (
          <p className="text-sm text-gray-400 py-3 text-center">今日暂无待办事项</p>
        ) : (
          <div className="space-y-2">
            {todaySchedules.map((s) => (
              <div key={s.id} className={`p-3 rounded-lg border ${s.priority === 'high' ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10' : 'border-gray-100 dark:border-gray-700'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{s.title}</span>
                  <span className={`badge ${s.priority === 'high' ? 'badge-high' : s.priority === 'medium' ? 'badge-medium' : 'badge-low'}`}>
                    {s.priority === 'high' ? '高' : s.priority === 'medium' ? '中' : '低'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{formatDate(s.deadlineTime)} 截止</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 逾期提醒 */}
      {overdueTasks.length > 0 && (
        <div className="card border-red-300 dark:border-red-700">
          <h3 className="font-semibold mb-3 flex items-center justify-between">
            <span className="text-red-600 dark:text-red-400">⚠️ 逾期任务</span>
            <Link to="/overdue" className="text-xs text-red-500 hover:underline">查看全部</Link>
          </h3>
          <div className="space-y-2">
            {overdueTasks.map((item) => (
              <div key={item.id} className="p-2 bg-red-50 dark:bg-red-900/10 rounded-lg">
                <div className="text-sm font-medium text-red-700 dark:text-red-400">{(item as ScheduleItem).title || (item as StudyTask).name}</div>
                <div className="text-xs text-red-500">
                  逾期 {Math.abs(daysUntil((item as ScheduleItem).deadlineTime || (item as StudyTask).deadlineTime))} 天
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 本周统计图 */}
      <div className="card">
        <h3 className="font-semibold mb-3">📈 本周速览</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <Tooltip />
            <Bar dataKey="完成" fill="#84cc16" radius={[4, 4, 0, 0]} />
            <Bar dataKey="学习时长" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 每日完成任务多色柱状图 */}
      {dailyTaskData.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-3">📊 每日完成事项分类统计</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailyTaskData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="刷题任务" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="日程事务" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="美工剪辑" fill="#ec4899" radius={[4, 4, 0, 0]} />
              <Bar dataKey="生活记账" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3 justify-center text-xs text-gray-500 flex-wrap">
            <span>🔵 刷题任务</span>
            <span>🟠 日程事务</span>
            <span>🩷 美工剪辑</span>
            <span>🟢 生活记账</span>
          </div>
        </div>
      )}

      {/* 学习任务完成占比 */}
      <div className="card">
        <h3 className="font-semibold mb-3">🎯 学习任务完成占比</h3>
        {studyStats.total === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">暂无学习任务</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={[
                  { name: '已完成', value: studyStats.completed },
                  { name: '未完成', value: studyStats.total - studyStats.completed },
                ]}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                <Cell fill={COLORS[0]} />
                <Cell fill={COLORS[1]} />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 灵感速记板 */}
      <div className="card">
        <h3 className="font-semibold mb-3">💡 灵感速记板</h3>
        <div className="flex gap-2 mb-3">
          <div className="relative">
            <input
              type="color"
              value={noteColor}
              onChange={(e) => setNoteColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
              title="选择文字颜色"
            />
          </div>
          <input
            className="input flex-1 text-sm"
            placeholder="记录一闪而过的灵感..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addQuickNote(); } }}
          />
          <button className="btn-primary btn-sm" onClick={addQuickNote}>记录</button>
        </div>
        {quickNotes.length === 0 ? (
          <p className="text-sm text-gray-400 py-2 text-center">暂无灵感记录</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {quickNotes.map((note) => (
              <div key={note.id} className="flex items-start justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm flex-1" style={{ color: note.color || '#84cc16' }}>{note.content}</p>
                <button onClick={() => deleteNote(note.id)} className="text-gray-400 hover:text-red-500 ml-2 text-xs">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}