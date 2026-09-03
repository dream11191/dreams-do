import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { scheduleDB, birthdayDB } from '../db';
import type { ScheduleItem, Birthday } from '../types';
import { createScheduleItem, formatDate, formatTime, getPriorityBadge, getPriorityLabel, isOverdue, generateId } from '../utils';
import Modal from '../components/Modal';
import TagSelector from '../components/TagSelector';

export default function Schedule() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [calendarDate, setCalendarDate] = useState(new Date());

  useEffect(() => {
    loadSchedules();
    loadBirthdays();
  }, []);

  const loadSchedules = async () => {
    const data = await scheduleDB.getAll();
    setSchedules(data.sort((a, b) => new Date(a.deadlineTime).getTime() - new Date(b.deadlineTime).getTime()));
  };

  const loadBirthdays = async () => {
    const data = await birthdayDB.getAll();
    setBirthdays(data);
  };

  const openNew = () => {
    setEditing(createScheduleItem({}));
    setModalOpen(true);
  };

  const openEdit = (item: ScheduleItem) => {
    setEditing({ ...item });
    setModalOpen(true);
  };

  const saveSchedule = async () => {
    console.log('saveSchedule called, editing=', editing);
    if (!editing || !editing.title.trim()) { console.warn('saveSchedule: invalid editing'); return; }
    editing.updatedAt = new Date().toISOString();
    console.log('saveSchedule: calling scheduleDB.save');
    await scheduleDB.save(editing);
    console.log('saveSchedule: save complete');
    setModalOpen(false);
    setEditing(null);
    loadSchedules();
  };

  const toggleComplete = async (item: ScheduleItem) => {
    item.completed = !item.completed;
    item.updatedAt = new Date().toISOString();
    await scheduleDB.save(item);
    loadSchedules();
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm('确定删除此日程？')) return;
    await scheduleDB.delete(id);
    loadSchedules();
  };

  const filtered = schedules.filter((s) => {
    if (filter === 'active') return !s.completed;
    if (filter === 'completed') return s.completed;
    return true;
  });

  // 日历视图
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const getSchedulesForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return schedules.filter((s) => formatDate(s.reminderTime) === dateStr || formatDate(s.deadlineTime) === dateStr);
  };

  const hasBirthday = (day: number) => {
    return birthdays.some((b) => b.month === month + 1 && b.day === day);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">📅 日程提醒</h2>
        <button className="btn-primary" onClick={openNew}>+ 新建日程</button>
      </div>

      {/* 筛选 */}
      <div className="flex gap-2">
        {(['active', 'completed', 'all'] as const).map((f) => (
          <button
            key={f}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
            onClick={() => setFilter(f)}
          >
            {f === 'active' ? '未完成' : f === 'completed' ? '已完成' : '全部'}
          </button>
        ))}
      </div>

      {/* 日历视图 */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <button className="btn-secondary btn-sm" onClick={() => setCalendarDate(new Date(year, month - 1, 1))}>◀</button>
          <span className="font-semibold">{year}年{month + 1}月</span>
          <button className="btn-secondary btn-sm" onClick={() => setCalendarDate(new Date(year, month + 1, 1))}>▶</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
            <div key={d} className="text-xs text-gray-500 font-medium py-1">{d}</div>
          ))}
          {calendarDays.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} className="py-2" />;
            const daySchedules = getSchedulesForDay(day);
            const hasHigh = daySchedules.some((s) => s.priority === 'high');
            const dayHasBirthday = hasBirthday(day);
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            return (
              <div
                key={day}
                className={`py-1.5 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-xs relative ${hasHigh ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
                onClick={() => navigate(`/day/${dateStr}`)}
              >
                <div className={`font-medium ${daySchedules.length > 0 ? 'text-primary-600 dark:text-primary-400' : ''}`}>{day}</div>
                {daySchedules.length > 0 && (
                  <div className={`w-1.5 h-1.5 mx-auto rounded-full ${hasHigh ? 'bg-red-500' : 'bg-primary-500'}`} />
                )}
                {dayHasBirthday && (
                  <div className="absolute -top-0.5 -right-0.5 text-[10px]" title="生日">🎂</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 日程列表 */}
      <div className="space-y-2">
        {filtered.map((s) => (
          <div
            key={s.id}
            className={`card flex items-start gap-3 ${s.completed ? 'opacity-60' : ''} ${s.priority === 'high' && !s.completed ? 'border-l-4 border-l-red-500' : ''}`}
          >
            <input
              type="checkbox"
              checked={s.completed}
              onChange={() => toggleComplete(s)}
              className="mt-1 w-4 h-4 accent-primary-500"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-medium text-sm ${s.completed ? 'line-through text-gray-400' : ''}`}>{s.title}</span>
                <span className={getPriorityBadge(s.priority)}>{getPriorityLabel(s.priority)}</span>
                {s.repeatType !== 'none' && (
                  <span className="badge bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                    {s.repeatType === 'daily' ? '每日' : s.repeatType === 'weekly' ? '每周' : '每月'}
                  </span>
                )}
              </div>
              {s.content && <p className="text-xs text-gray-500 mt-1 truncate">{s.content}</p>}
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                <span>⏰ {formatDate(s.reminderTime)} {formatTime(s.reminderTime)}</span>
                <span>📌 {formatDate(s.deadlineTime)} 截止</span>
                {isOverdue(s.deadlineTime) && !s.completed && (
                  <span className="text-red-500 font-medium">已逾期</span>
                )}
              </div>
              {s.link && (
                <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-500 hover:underline mt-1 block">
                  🔗 {s.link}
                </a>
              )}
              {s.tags.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {s.tags.map((t) => (
                    <span key={t.id} className="badge text-white text-[10px]" style={{ backgroundColor: t.color }}>{t.name}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-1">
              <button className="btn-secondary btn-sm" onClick={() => openEdit(s)}>✏️</button>
              <button className="btn-danger btn-sm" onClick={() => deleteSchedule(s.id)}>🗑</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-8">暂无日程</p>
        )}
      </div>

      {/* 编辑弹窗 */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing?.id && schedules.find((s) => s.id === editing.id) ? '编辑日程' : '新建日程'}>
        {editing && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">标题 *</label>
              <input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="日程标题" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">备注内容</label>
              <textarea className="input" rows={3} value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} placeholder="执行备注..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">外部链接</label>
              <input className="input" value={editing.link || ''} onChange={(e) => setEditing({ ...editing, link: e.target.value })} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">提醒时间</label>
                <input type="datetime-local" className="input" value={editing.reminderTime.slice(0, 16)} onChange={(e) => setEditing({ ...editing, reminderTime: new Date(e.target.value).toISOString() })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">截止时间</label>
                <input type="datetime-local" className="input" value={editing.deadlineTime.slice(0, 16)} onChange={(e) => setEditing({ ...editing, deadlineTime: new Date(e.target.value).toISOString() })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">优先级</label>
                <select className="input" value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: e.target.value as ScheduleItem['priority'] })}>
                  <option value="high">🔴 高</option>
                  <option value="medium">🟡 中</option>
                  <option value="low">🟢 低</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">重复</label>
                <select className="input" value={editing.repeatType} onChange={(e) => setEditing({ ...editing, repeatType: e.target.value as ScheduleItem['repeatType'] })}>
                  <option value="none">不重复</option>
                  <option value="daily">每日</option>
                  <option value="weekly">每周</option>
                  <option value="monthly">每月</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">标签</label>
              <TagSelector tags={editing.tags} onChange={(tags) => setEditing({ ...editing, tags })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => { setModalOpen(false); setEditing(null); }}>取消</button>
              <button className="btn-primary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveSchedule(); }}>保存</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}