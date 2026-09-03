import { useState, useEffect } from 'react';
import { scheduleDB, studyTaskDB } from '../db';
import type { ScheduleItem, StudyTask } from '../types';
import { formatDate, isOverdue, daysUntil, getPriorityBadge, getPriorityLabel } from '../utils';

export default function Overdue() {
  const [overdueSchedules, setOverdueSchedules] = useState<ScheduleItem[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<StudyTask[]>([]);

  useEffect(() => {
    loadOverdue();
  }, []);

  const loadOverdue = async () => {
    const schedules = await scheduleDB.getAll();
    setOverdueSchedules(
      schedules.filter((s) => !s.completed && isOverdue(s.deadlineTime)).sort((a, b) => new Date(a.deadlineTime).getTime() - new Date(b.deadlineTime).getTime())
    );

    const tasks = await studyTaskDB.getAll();
    setOverdueTasks(
      tasks.filter((t) => t.status === 'pending' && isOverdue(t.deadlineTime)).sort((a, b) => new Date(a.deadlineTime).getTime() - new Date(b.deadlineTime).getTime())
    );
  };

  const markScheduleComplete = async (item: ScheduleItem) => {
    item.completed = true;
    item.updatedAt = new Date().toISOString();
    await scheduleDB.save(item);
    loadOverdue();
  };

  const markTaskComplete = async (task: StudyTask) => {
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();
    const duration = prompt('本次学习耗时（分钟）：', '30');
    task.duration = duration ? parseInt(duration) || 30 : 30;
    await studyTaskDB.save(task);
    loadOverdue();
  };

  const total = overdueSchedules.length + overdueTasks.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">⚠️ 逾期任务专区</h2>
        <span className="badge badge-high text-sm px-3 py-1">{total} 个逾期</span>
      </div>

      {total === 0 && (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-gray-500">没有逾期任务，太棒了！</p>
        </div>
      )}

      {/* 逾期日程 */}
      {overdueSchedules.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 text-red-600 dark:text-red-400">📅 逾期日程 ({overdueSchedules.length})</h3>
          <div className="space-y-2">
            {overdueSchedules.map((s) => (
              <div key={s.id} className="card border-l-4 border-l-red-500 flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{s.title}</span>
                    <span className={getPriorityBadge(s.priority)}>{getPriorityLabel(s.priority)}</span>
                  </div>
                  {s.content && <p className="text-xs text-gray-500 mt-1">{s.content}</p>}
                  <div className="text-xs text-red-500 mt-1">
                    逾期 {Math.abs(daysUntil(s.deadlineTime))} 天 · 截止 {formatDate(s.deadlineTime)}
                  </div>
                  {s.link && (
                    <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-500 hover:underline mt-1 block">🔗 {s.link}</a>
                  )}
                </div>
                <button className="btn-primary btn-sm" onClick={() => markScheduleComplete(s)}>标记完成</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 逾期学习任务 */}
      {overdueTasks.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 text-red-600 dark:text-red-400">📚 逾期学习任务 ({overdueTasks.length})</h3>
          <div className="space-y-2">
            {overdueTasks.map((t) => (
              <div key={t.id} className="card border-l-4 border-l-red-500 flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{t.name}</span>
                    <span className={`badge ${t.difficulty === 'hard' ? 'badge-high' : t.difficulty === 'medium' ? 'badge-medium' : 'badge-low'}`}>
                      {t.difficulty === 'hard' ? '困难' : t.difficulty === 'medium' ? '中等' : '简单'}
                    </span>
                  </div>
                  <div className="text-xs text-red-500 mt-1">
                    逾期 {Math.abs(daysUntil(t.deadlineTime))} 天 · 截止 {formatDate(t.deadlineTime)}
                  </div>
                  {t.errorNotes && <p className="text-xs text-gray-500 mt-1">{t.errorNotes}</p>}
                </div>
                <button className="btn-primary btn-sm" onClick={() => markTaskComplete(t)}>标记完成</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}