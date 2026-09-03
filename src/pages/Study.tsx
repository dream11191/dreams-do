import { useState, useEffect } from 'react';
import { studyProjectDB, studyTaskDB, taskMaterialLinkDB, materialItemDB } from '../db';
import type { StudyProject, StudyTask, MaterialItem, TaskMaterialLink } from '../types';
import { createStudyProject, createStudyTask, createTaskMaterialLink, formatDate, formatTime, isOverdue, generateId, parseCSV } from '../utils';
import Modal from '../components/Modal';
import TagSelector from '../components/TagSelector';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Study() {
  const [projects, setProjects] = useState<StudyProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<StudyProject | null>(null);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [links, setLinks] = useState<TaskMaterialLink[]>([]);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<StudyProject | null>(null);
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [linkMaterialOpen, setLinkMaterialOpen] = useState<string | null>(null); // taskId
  const [view, setView] = useState<'tasks' | 'stats'>('tasks');
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [csvPreviewOpen, setCsvPreviewOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadProjects();
    materialItemDB.getAll().then(setMaterials);
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadTasks(selectedProject.id);
      taskMaterialLinkDB.getAll().then(setLinks);
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    const data = await studyProjectDB.getAll();
    setProjects(data);
    if (data.length > 0 && !selectedProject) setSelectedProject(data[0]);
  };

  const loadTasks = async (projectId: string) => {
    const data = await studyTaskDB.getByProject(projectId);
    setTasks(data.sort((a, b) => new Date(a.deadlineTime).getTime() - new Date(b.deadlineTime).getTime()));
  };

  const openNewProject = () => {
    setEditingProject(createStudyProject({}));
    setProjectModalOpen(true);
  };

  const saveProject = async () => {
    if (!editingProject) { console.warn('saveProject: editingProject is null'); return; }
    if (!editingProject.name.trim()) { console.warn('saveProject: name is empty'); return; }
    try {
      editingProject.updatedAt = new Date().toISOString();
      await studyProjectDB.save(editingProject);
      console.log('saveProject: saved successfully, id=', editingProject.id);
      setProjectModalOpen(false);
      setEditingProject(null);
      await loadProjects();
      console.log('saveProject: projects reloaded');
    } catch (err) {
      console.error('saveProject error:', err);
      alert('保存失败：' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm('确定删除此项目及所有任务？')) return;
    await studyProjectDB.delete(id);
    if (selectedProject?.id === id) setSelectedProject(null);
    loadProjects();
  };

  const openNewTask = () => {
    if (!selectedProject) return;
    setEditingTask(createStudyTask({ projectId: selectedProject.id }));
    setTaskModalOpen(true);
  };

  const openEditTask = (task: StudyTask) => {
    setEditingTask({ ...task });
    setTaskModalOpen(true);
  };

  const saveTask = async () => {
    if (!editingTask || !editingTask.name.trim()) return;
    editingTask.updatedAt = new Date().toISOString();
    await studyTaskDB.save(editingTask);
    setTaskModalOpen(false);
    setEditingTask(null);
    if (selectedProject) loadTasks(selectedProject.id);
  };

  const toggleTask = async (task: StudyTask) => {
    task.status = task.status === 'completed' ? 'pending' : 'completed';
    task.updatedAt = new Date().toISOString();
    if (task.status === 'completed') {
      task.completedAt = new Date().toISOString();
      const duration = prompt('本次学习耗时（分钟）：', '30');
      task.duration = duration ? parseInt(duration) || 30 : 30;
    }
    await studyTaskDB.save(task);
    if (selectedProject) loadTasks(selectedProject.id);
  };

  const deleteTask = async (id: string) => {
    if (!confirm('确定删除此任务？')) return;
    await studyTaskDB.delete(id);
    if (selectedProject) loadTasks(selectedProject.id);
  };

  const linkMaterial = async (taskId: string, materialId: string) => {
    const link = createTaskMaterialLink(taskId, materialId);
    await taskMaterialLinkDB.save(link);
    setLinks([...links, link]);
    setLinkMaterialOpen(null);
  };

  const unlinkMaterial = async (linkId: string) => {
    await taskMaterialLinkDB.delete(linkId);
    setLinks(links.filter((l) => l.id !== linkId));
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const data = parseCSV(text);
      setCsvData(data);
      setCsvPreviewOpen(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmCSVImport = async () => {
    if (!selectedProject || csvData.length === 0) return;
    setImporting(true);
    for (const row of csvData) {
      const taskName = row['任务名称'] || row['name'] || row['Name'] || '';
      const deadline = row['截止日期'] || row['deadline'] || row['Deadline'] || '';
      const tagsStr = row['标签类型'] || row['tags'] || row['Tags'] || '';
      if (!taskName.trim()) continue;
      const task = createStudyTask({
        projectId: selectedProject.id,
        name: taskName.trim(),
        deadlineTime: deadline ? new Date(deadline).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      if (tagsStr) {
        task.tags = tagsStr.split(/[,;，；]/).map((t: string) => ({
          id: generateId(),
          name: t.trim(),
          color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
        }));
      }
      await studyTaskDB.save(task);
    }
    setImporting(false);
    setCsvPreviewOpen(false);
    setCsvData([]);
    loadTasks(selectedProject.id);
  };

  const getLinkedMaterials = (taskId: string) => {
    const taskLinks = links.filter((l) => l.taskId === taskId);
    return taskLinks.map((l) => materials.find((m) => m.id === l.materialId)).filter(Boolean) as MaterialItem[];
  };

  // 统计数据
  const projectStats = () => {
    if (!selectedProject) return null;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const total = tasks.length;
    const totalDuration = tasks.reduce((sum, t) => sum + (t.duration || 0), 0);

    // 每周统计
    const weekMap: Record<string, { completed: number; duration: number }> = {};
    tasks.filter((t) => t.status === 'completed' && t.completedAt).forEach((t) => {
      const d = new Date(t.completedAt!);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = formatDate(weekStart.toISOString());
      if (!weekMap[key]) weekMap[key] = { completed: 0, duration: 0 };
      weekMap[key].completed += 1;
      weekMap[key].duration += t.duration || 0;
    });
    const weeklyData = Object.entries(weekMap).map(([k, v]) => ({ name: k.slice(5), 完成: v.completed, 时长: v.duration })).sort((a, b) => a.name.localeCompare(b.name));

    // 标签统计
    const tagMap: Record<string, { completed: number; total: number }> = {};
    tasks.forEach((t) => {
      t.tags.forEach((tag) => {
        if (!tagMap[tag.name]) tagMap[tag.name] = { completed: 0, total: 0 };
        tagMap[tag.name].total += 1;
        if (t.status === 'completed') tagMap[tag.name].completed += 1;
      });
    });
    const tagData = Object.entries(tagMap).map(([k, v], i) => ({ name: k, 已完成: v.completed, 未完成: v.total - v.completed, color: COLORS[i % COLORS.length] }));

    // 累计趋势
    const sortedCompleted = tasks.filter((t) => t.status === 'completed' && t.completedAt).sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime());
    let cumulative = 0;
    const trendData = sortedCompleted.map((t) => {
      cumulative += 1;
      return { date: formatDate(t.completedAt!), 累计: cumulative };
    });

    return { completed, total, totalDuration, weeklyData, tagData, trendData };
  };

  const stats = projectStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">📚 学习打卡</h2>
        <div className="flex gap-2">
          {selectedProject && (
            <>
              <button className={`btn-sm ${view === 'tasks' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('tasks')}>任务列表</button>
              <button className={`btn-sm ${view === 'stats' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('stats')}>统计看板</button>
            </>
          )}
          <button className="btn-primary" onClick={openNewProject}>+ 新建项目</button>
        </div>
      </div>

      {/* 项目选择 */}
      <div className="flex gap-2 flex-wrap">
        {projects.map((p) => (
          <div key={p.id} className="relative group">
            <button
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedProject?.id === p.id ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
              onClick={() => setSelectedProject(p)}
            >
              {p.name}
            </button>
            <button
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] hidden group-hover:flex items-center justify-center"
              onClick={() => deleteProject(p.id)}
            >×</button>
          </div>
        ))}
        {projects.length === 0 && <p className="text-sm text-gray-400">暂无项目，请新建</p>}
      </div>

      {selectedProject && view === 'tasks' && (
        <>
          {/* 进度条 */}
          {selectedProject.targetCount > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">目标进度：{tasks.filter((t) => t.status === 'completed').length} / {selectedProject.targetCount}</span>
                <span className="text-xs text-gray-500">{Math.round((tasks.filter((t) => t.status === 'completed').length / selectedProject.targetCount) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-primary-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (tasks.filter((t) => t.status === 'completed').length / selectedProject.targetCount) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">{tasks.length} 个任务</span>
            <div className="flex gap-2">
              <label className="btn-secondary btn-sm cursor-pointer">
                📥 批量导入
                <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
              </label>
              <button className="btn-primary btn-sm" onClick={openNewTask}>+ 添加任务</button>
            </div>
          </div>

          {/* 任务列表 */}
          <div className="space-y-2">
            {tasks.map((task) => {
              const linkedMaterials = getLinkedMaterials(task.id);
              return (
                <div
                  key={task.id}
                  className={`card flex items-start gap-3 ${task.status === 'completed' ? 'opacity-60' : ''} ${isOverdue(task.deadlineTime) && task.status === 'pending' ? 'border-l-4 border-l-red-500' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={() => toggleTask(task)}
                    className="mt-1 w-4 h-4 accent-primary-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>{task.name}</span>
                      <span className={`badge ${task.difficulty === 'hard' ? 'badge-high' : task.difficulty === 'medium' ? 'badge-medium' : 'badge-low'}`}>
                        {task.difficulty === 'hard' ? '困难' : task.difficulty === 'medium' ? '中等' : '简单'}
                      </span>
                      {task.masteryLevel && (
                        <span className="badge bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">掌握度 {task.masteryLevel}/5</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>⏰ {formatDate(task.startTime)}</span>
                      <span>📌 {formatDate(task.deadlineTime)} 截止</span>
                      {task.duration && <span>⏱ {task.duration}分钟</span>}
                      {isOverdue(task.deadlineTime) && task.status === 'pending' && (
                        <span className="text-red-500 font-medium">已逾期</span>
                      )}
                    </div>
                    {task.solutionLink && (
                      <a href={task.solutionLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-500 hover:underline mt-1 block">🔗 题解链接</a>
                    )}
                    {task.errorNotes && <p className="text-xs text-gray-500 mt-1">{task.errorNotes}</p>}
                    {task.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {task.tags.map((t) => (
                          <span key={t.id} className="badge text-white text-[10px]" style={{ backgroundColor: t.color }}>{t.name}</span>
                        ))}
                      </div>
                    )}
                    {/* 联动素材 */}
                    {linkedMaterials.length > 0 && (
                      <div className="mt-1 flex gap-1 flex-wrap">
                        {linkedMaterials.map((m) => (
                          <span key={m.id} className="badge bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 text-[10px]">
                            🎨 {m.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-col">
                    {task.status === 'pending' ? (
                      <button className="btn-primary btn-sm" onClick={() => toggleTask(task)}>✅ 完成</button>
                    ) : (
                      <button className="btn-secondary btn-sm" onClick={() => toggleTask(task)}>↩ 撤销</button>
                    )}
                    <button className="btn-secondary btn-sm" onClick={() => openEditTask(task)}>✏️</button>
                    <button className="btn-secondary btn-sm" onClick={() => setLinkMaterialOpen(task.id)}>🔗</button>
                    <button className="btn-danger btn-sm" onClick={() => deleteTask(task.id)}>🗑</button>
                  </div>
                </div>
              );
            })}
            {tasks.length === 0 && <p className="text-center text-gray-400 py-8">暂无任务</p>}
          </div>
        </>
      )}

      {/* 统计看板 */}
      {selectedProject && view === 'stats' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-3">
            <div className="card text-center">
              <div className="text-2xl font-bold text-primary-600">{stats.completed}</div>
              <div className="text-xs text-gray-500">已完成</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-gray-400">{stats.total - stats.completed}</div>
              <div className="text-xs text-gray-500">未完成</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-green-500">{stats.totalDuration}</div>
              <div className="text-xs text-gray-500">总时长(分)</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-yellow-500">{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</div>
              <div className="text-xs text-gray-500">完成率</div>
            </div>
          </div>

          {/* 饼图 */}
          <div className="card">
            <h3 className="font-semibold mb-3">已完成 / 未完成任务占比</h3>
            {stats.total === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无数据</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={[{ name: '已完成', value: stats.completed }, { name: '未完成', value: stats.total - stats.completed }]} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    <Cell fill="#6366f1" />
                    <Cell fill="#e5e7eb" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 柱状图 */}
          {stats.weeklyData.length > 0 && (
            <div className="card">
              <h3 className="font-semibold mb-3">每周任务完成量 & 学习时长</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="完成" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="时长" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 折线趋势图 */}
          {stats.trendData.length > 0 && (
            <div className="card">
              <h3 className="font-semibold mb-3">完成累计趋势</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats.trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip />
                  <Line type="monotone" dataKey="累计" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 分类统计 */}
          {stats.tagData.length > 0 && (
            <div className="card">
              <h3 className="font-semibold mb-3">标签分类统计</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={stats.tagData} cx="50%" cy="50%" outerRadius={90} dataKey="已完成" nameKey="name" label={({ name, 已完成 }) => `${name}: ${已完成}`}>
                    {stats.tagData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* 项目编辑弹窗 */}
      <Modal open={projectModalOpen} onClose={() => { setProjectModalOpen(false); setEditingProject(null); }} title="编辑项目">
        {editingProject && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">项目名称</label>
              <input className="input" value={editingProject.name} onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })} placeholder="如：LeetCode 100题" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">描述</label>
              <textarea className="input" rows={2} value={editingProject.description} onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })} placeholder="项目描述..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">目标数量（用于进度条）</label>
              <input type="number" className="input" value={editingProject.targetCount} onChange={(e) => setEditingProject({ ...editingProject, targetCount: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">标签</label>
              <TagSelector tags={editingProject.tags} onChange={(tags) => setEditingProject({ ...editingProject, tags })} />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => { setProjectModalOpen(false); setEditingProject(null); }}>取消</button>
              <button className="btn-primary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); console.log('saveProject button clicked'); saveProject(); }}>保存</button>
            </div>
          </div>
        )}
      </Modal>

      {/* 任务编辑弹窗 */}
      <Modal open={taskModalOpen} onClose={() => { setTaskModalOpen(false); setEditingTask(null); }} title="编辑任务">
        {editingTask && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">任务名称</label>
              <input className="input" value={editingTask.name} onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })} placeholder="如：两数之和" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">开始时间</label>
                <input type="datetime-local" className="input" value={editingTask.startTime.slice(0, 16)} onChange={(e) => setEditingTask({ ...editingTask, startTime: new Date(e.target.value).toISOString() })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">截止时间</label>
                <input type="datetime-local" className="input" value={editingTask.deadlineTime.slice(0, 16)} onChange={(e) => setEditingTask({ ...editingTask, deadlineTime: new Date(e.target.value).toISOString() })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">难度</label>
                <select className="input" value={editingTask.difficulty} onChange={(e) => setEditingTask({ ...editingTask, difficulty: e.target.value as StudyTask['difficulty'] })}>
                  <option value="easy">简单</option>
                  <option value="medium">中等</option>
                  <option value="hard">困难</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">掌握度 (1-5)</label>
                <input type="number" min="1" max="5" className="input" value={editingTask.masteryLevel || ''} onChange={(e) => setEditingTask({ ...editingTask, masteryLevel: parseInt(e.target.value) || undefined })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">题解链接</label>
              <input className="input" value={editingTask.solutionLink || ''} onChange={(e) => setEditingTask({ ...editingTask, solutionLink: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">错题笔记</label>
              <textarea className="input" rows={2} value={editingTask.errorNotes || ''} onChange={(e) => setEditingTask({ ...editingTask, errorNotes: e.target.value })} placeholder="记录错题心得..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">标签</label>
              <TagSelector tags={editingTask.tags} onChange={(tags) => setEditingTask({ ...editingTask, tags })} />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => { setTaskModalOpen(false); setEditingTask(null); }}>取消</button>
              <button className="btn-primary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); console.log('saveTask button clicked'); saveTask(); }}>保存</button>
            </div>
          </div>
        )}
      </Modal>

      {/* 绑定素材弹窗 */}
      <Modal open={!!linkMaterialOpen} onClose={() => setLinkMaterialOpen(null)} title="绑定素材库条目">
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {materials.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">暂无素材，请先在素材收藏中添加</p>
          ) : (
            materials.map((m) => {
              const alreadyLinked = links.some((l) => l.taskId === linkMaterialOpen && l.materialId === m.id);
              return (
                <div
                  key={m.id}
                  className={`p-2 rounded-lg flex items-center justify-between ${alreadyLinked ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  <span className="text-sm">{m.title}</span>
                  {alreadyLinked ? (
                    <span className="text-xs text-primary-500">已绑定</span>
                  ) : (
                    <button className="btn-primary btn-sm" onClick={() => linkMaterial(linkMaterialOpen!, m.id)}>绑定</button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Modal>

      {/* CSV 导入预览弹窗 */}
      <Modal open={csvPreviewOpen} onClose={() => { setCsvPreviewOpen(false); setCsvData([]); }} title="CSV 导入预览">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">共解析 {csvData.length} 条数据，将导入到项目「{selectedProject?.name}」</p>
          <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  {csvData.length > 0 && Object.keys(csvData[0]).map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvData.map((row, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-700/50">
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="px-3 py-1.5 text-xs text-gray-500">{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400">支持字段：任务名称、截止日期、标签类型（逗号分隔）</p>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => { setCsvPreviewOpen(false); setCsvData([]); }}>取消</button>
            <button className="btn-primary" onClick={confirmCSVImport} disabled={importing}>
              {importing ? '导入中...' : `确认导入 ${csvData.length} 条`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}