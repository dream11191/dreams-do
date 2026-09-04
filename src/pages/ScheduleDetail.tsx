import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { scheduleDB } from '../db';
import type { ScheduleItem } from '../types';
import { formatDate, formatTime, isOverdue, getPriorityBadge, getPriorityLabel } from '../utils';
import Modal from '../components/Modal';
import TagSelector from '../components/TagSelector';

export default function ScheduleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<ScheduleItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);

  useEffect(() => {
    if (id) loadSchedule(id);
  }, [id]);

  const loadSchedule = async (scheduleId: string) => {
    setLoading(true);
    const data = await scheduleDB.get(scheduleId);
    setSchedule(data || null);
    setLoading(false);
  };

  const toggleComplete = async () => {
    if (!schedule) return;
    schedule.completed = !schedule.completed;
    schedule.updatedAt = new Date().toISOString();
    await scheduleDB.save(schedule);
    setSchedule({ ...schedule });
  };

  const deleteSchedule = async () => {
    if (!schedule || !confirm('确定删除此日程？')) return;
    await scheduleDB.delete(schedule.id);
    navigate('/schedule');
  };

  const openEdit = () => {
    if (!schedule) return;
    setEditing({ ...schedule });
    setModalOpen(true);
  };

  const saveSchedule = async () => {
    if (!editing || !editing.title.trim()) return;
    editing.updatedAt = new Date().toISOString();
    await scheduleDB.save(editing);
    setModalOpen(false);
    setEditing(null);
    setSchedule(editing);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="text-4xl">📭</div>
        <p className="text-gray-400">日程不存在或已被删除</p>
        <button className="btn-primary" onClick={() => navigate('/schedule')}>返回日程列表</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* 返回按钮 */}
      <button
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-500 transition-colors"
        onClick={() => navigate('/schedule')}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回日程列表
      </button>

      {/* 标题和状态 */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className={`text-xl font-bold ${schedule.completed ? 'line-through text-gray-400' : ''}`}>
              {schedule.title}
            </h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={getPriorityBadge(schedule.priority)}>{getPriorityLabel(schedule.priority)}</span>
              {schedule.repeatType !== 'none' && (
                <span className="badge bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                  {schedule.repeatType === 'daily' ? '每日' : schedule.repeatType === 'weekly' ? '每周' : '每月'}
                </span>
              )}
              <span className={`badge ${schedule.completed ? 'badge-low' : 'badge-high'}`}>
                {schedule.completed ? '已完成' : '未完成'}
              </span>
              {isOverdue(schedule.deadlineTime) && !schedule.completed && (
                <span className="badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">已逾期</span>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <button className="btn-secondary btn-sm" onClick={openEdit}>✏️ 编辑</button>
            <button className="btn-danger btn-sm" onClick={deleteSchedule}>🗑 删除</button>
          </div>
        </div>
      </div>

      {/* 时间信息 */}
      <div className="card">
        <h3 className="font-semibold mb-3">⏰ 时间信息</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500 text-xs mb-1">提醒时间</div>
            <div className="font-medium">{formatDate(schedule.reminderTime)}</div>
            <div className="text-gray-400">{formatTime(schedule.reminderTime)}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs mb-1">截止时间</div>
            <div className="font-medium">{formatDate(schedule.deadlineTime)}</div>
            <div className="text-gray-400">{formatTime(schedule.deadlineTime)}</div>
          </div>
        </div>
      </div>

      {/* 完整备注 */}
      <div className="card">
        <h3 className="font-semibold mb-3">📝 备注内容</h3>
        {schedule.content ? (
          <div className="text-sm whitespace-pre-wrap break-words leading-relaxed text-gray-700 dark:text-gray-300">
            {schedule.content}
          </div>
        ) : (
          <p className="text-sm text-gray-400">暂无备注</p>
        )}
      </div>

      {/* 外部链接 */}
      {schedule.link && (
        <div className="card">
          <h3 className="font-semibold mb-3">🔗 外部链接</h3>
          <a
            href={schedule.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-500 hover:underline break-all"
          >
            {schedule.link}
          </a>
        </div>
      )}

      {/* 标签 */}
      {schedule.tags.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-3">🏷️ 标签</h3>
          <div className="flex gap-2 flex-wrap">
            {schedule.tags.map((t) => (
              <span key={t.id} className="badge text-white" style={{ backgroundColor: t.color }}>{t.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="card">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={schedule.completed}
              onChange={toggleComplete}
              className="w-4 h-4 accent-primary-500"
            />
            <span className="text-sm font-medium">{schedule.completed ? '已标记完成' : '标记为完成'}</span>
          </label>
          <div className="text-xs text-gray-400">
            创建于 {formatDate(schedule.createdAt)}
          </div>
        </div>
      </div>

      {/* 编辑弹窗 */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title="编辑日程">
        {editing && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">标题 *</label>
              <input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="日程标题" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">备注内容</label>
              <textarea className="input" rows={5} value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} placeholder="执行备注..." />
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