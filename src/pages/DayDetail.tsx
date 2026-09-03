import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { scheduleDB, birthdayDB } from '../db';
import type { ScheduleItem, Birthday } from '../types';
import { createScheduleItem, createBirthday, formatDate, formatTime, isOverdue, getPriorityBadge, getPriorityLabel } from '../utils';
import Modal from '../components/Modal';
import TagSelector from '../components/TagSelector';

export default function DayDetail() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [birthdayModalOpen, setBirthdayModalOpen] = useState(false);
  const [editingBirthday, setEditingBirthday] = useState<Birthday | null>(null);

  const displayDate = date || formatDate(new Date().toISOString());
  const [year, monthStr, dayStr] = displayDate.split('-');
  const month = parseInt(monthStr);
  const day = parseInt(dayStr);

  useEffect(() => {
    loadData();
  }, [date]);

  const loadData = async () => {
    const allSchedules = await scheduleDB.getAll();
    const daySchedules = allSchedules.filter((s) =>
      formatDate(s.reminderTime) === displayDate || formatDate(s.deadlineTime) === displayDate
    );
    setSchedules(daySchedules.sort((a, b) => new Date(a.deadlineTime).getTime() - new Date(b.deadlineTime).getTime()));

    const allBirthdays = await birthdayDB.getAll();
    setBirthdays(allBirthdays.filter((b) => b.month === month && b.day === day));
  };

  const activeSchedules = schedules.filter((s) => !s.completed);
  const completedSchedules = schedules.filter((s) => s.completed);

  const openNew = () => {
    const deadlineDate = new Date(parseInt(year), month - 1, day, 23, 59);
    setEditing(createScheduleItem({
      reminderTime: new Date(parseInt(year), month - 1, day, 9, 0).toISOString(),
      deadlineTime: deadlineDate.toISOString(),
    }));
    setModalOpen(true);
  };

  const openEdit = (item: ScheduleItem) => {
    setEditing({ ...item });
    setModalOpen(true);
  };

  const saveSchedule = async () => {
    if (!editing || !editing.title.trim()) return;
    editing.updatedAt = new Date().toISOString();
    await scheduleDB.save(editing);
    setModalOpen(false);
    setEditing(null);
    loadData();
  };

  const toggleComplete = async (item: ScheduleItem) => {
    item.completed = !item.completed;
    item.updatedAt = new Date().toISOString();
    await scheduleDB.save(item);
    loadData();
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm('确定删除此日程？')) return;
    await scheduleDB.delete(id);
    loadData();
  };

  const openNewBirthday = () => {
    setEditingBirthday(createBirthday({ month, day }));
    setBirthdayModalOpen(true);
  };

  const saveBirthday = async () => {
    if (!editingBirthday || !editingBirthday.name.trim()) return;
    editingBirthday.updatedAt = new Date().toISOString();
    await birthdayDB.save(editingBirthday);
    setBirthdayModalOpen(false);
    setEditingBirthday(null);
    loadData();
  };

  const deleteBirthday = async (id: string) => {
    if (!confirm('确定删除此生日提醒？')) return;
    await birthdayDB.delete(id);
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="btn-secondary btn-sm" onClick={() => navigate('/schedule')}>◀ 返回</button>
          <h2 className="text-xl font-bold">
            📅 {year}年{month}月{day}日
            {birthdays.length > 0 && <span className="ml-2">🎂</span>}
          </h2>
        </div>
        <button className="btn-primary" onClick={openNew}>+ 添加当日日程</button>
      </div>

      {/* 生日蛋糕区域 */}
      {birthdays.length > 0 && (
        <div className="card bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 border-pink-200 dark:border-pink-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎂</span>
            <h3 className="font-semibold text-pink-700 dark:text-pink-400">今日生日</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {birthdays.map((b) => (
              <div key={b.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full shadow-sm">
                <span className="text-sm font-medium">{b.name}</span>
                <button
                  className="text-gray-400 hover:text-red-500 text-xs"
                  onClick={() => deleteBirthday(b.id)}
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {birthdays.length === 0 && (
        <button
          className="card border-dashed border-2 border-pink-200 dark:border-pink-800 hover:border-pink-400 text-center py-3 cursor-pointer transition-colors"
          onClick={openNewBirthday}
        >
          <span className="text-2xl">🎂</span>
          <p className="text-sm text-pink-500 mt-1">添加生日提醒</p>
        </button>
      )}

      {/* 未完成事项 */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span>
          未完成事项 ({activeSchedules.length})
        </h3>
        <div className="space-y-2">
          {activeSchedules.map((s) => (
            <div
              key={s.id}
              className={`card flex items-start gap-3 ${s.priority === 'high' ? 'border-l-4 border-l-red-500' : ''}`}
            >
              <input
                type="checkbox"
                checked={false}
                onChange={() => toggleComplete(s)}
                className="mt-1 w-4 h-4 accent-primary-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{s.title}</span>
                  <span className={getPriorityBadge(s.priority)}>{getPriorityLabel(s.priority)}</span>
                </div>
                {s.content && <p className="text-xs text-gray-500 mt-1 truncate">{s.content}</p>}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span>⏰ {formatTime(s.reminderTime)}</span>
                  <span>📌 {formatTime(s.deadlineTime)} 截止</span>
                  {isOverdue(s.deadlineTime) && (
                    <span className="text-red-500 font-medium">已逾期</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button className="btn-secondary btn-sm" onClick={() => openEdit(s)}>✏️</button>
                <button className="btn-danger btn-sm" onClick={() => deleteSchedule(s.id)}>🗑</button>
              </div>
            </div>
          ))}
          {activeSchedules.length === 0 && (
            <p className="text-center text-gray-400 py-4 text-sm">暂无未完成事项 🎉</p>
          )}
        </div>
      </div>

      {/* 已完成事项 */}
      {completedSchedules.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-400 inline-block"></span>
            已完成事项 ({completedSchedules.length})
          </h3>
          <div className="space-y-2">
            {completedSchedules.map((s) => (
              <div key={s.id} className="card flex items-start gap-3 opacity-60">
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => toggleComplete(s)}
                  className="mt-1 w-4 h-4 accent-primary-500"
                />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm line-through text-gray-400">{s.title}</span>
                  {s.content && <p className="text-xs text-gray-400 mt-1 line-through truncate">{s.content}</p>}
                </div>
                <button className="btn-danger btn-sm" onClick={() => deleteSchedule(s.id)}>🗑</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 日程编辑弹窗 */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title="编辑日程">
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

      {/* 生日编辑弹窗 */}
      <Modal open={birthdayModalOpen} onClose={() => { setBirthdayModalOpen(false); setEditingBirthday(null); }} title="生日提醒">
        {editingBirthday && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">姓名 *</label>
              <input className="input" value={editingBirthday.name} onChange={(e) => setEditingBirthday({ ...editingBirthday, name: e.target.value })} placeholder="如：张三" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">月份</label>
                <select className="input" value={editingBirthday.month} onChange={(e) => setEditingBirthday({ ...editingBirthday, month: parseInt(e.target.value) })}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}月</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">日期</label>
                <select className="input" value={editingBirthday.day} onChange={(e) => setEditingBirthday({ ...editingBirthday, day: parseInt(e.target.value) })}>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}日</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-400">🎂 生日提醒为每年循环提醒，无需每年重新录入</p>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => { setBirthdayModalOpen(false); setEditingBirthday(null); }}>取消</button>
              <button className="btn-primary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveBirthday(); }}>保存</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}