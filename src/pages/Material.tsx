import { useState, useEffect } from 'react';
import { materialFolderDB, materialItemDB } from '../db';
import type { MaterialFolder, MaterialItem } from '../types';
import { createMaterialFolder, createMaterialItem, getStatusLabel, getStatusColor, formatDate, generateId } from '../utils';
import Modal from '../components/Modal';
import TagSelector from '../components/TagSelector';

const typeIcons: Record<string, string> = {
  design: '🎨',
  editing: '✂️',
  tech: '💻',
  life: '🌟',
  other: '📦',
};

const typeLabels: Record<string, string> = {
  design: '美工设计',
  editing: '剪辑参考',
  tech: '计算机干货',
  life: '生活收集',
  other: '其他',
};

export default function Material() {
  const [folders, setFolders] = useState<MaterialFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<MaterialFolder | null>(null);
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<MaterialFolder | null>(null);
  const [editingItem, setEditingItem] = useState<MaterialItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    if (selectedFolder) {
      loadItems(selectedFolder.id);
    }
  }, [selectedFolder]);

  const loadFolders = async () => {
    const data = await materialFolderDB.getAll();
    setFolders(data);
    if (data.length > 0 && !selectedFolder) setSelectedFolder(data[0]);
  };

  const loadItems = async (folderId: string) => {
    const data = await materialItemDB.getByFolder(folderId);
    setItems(data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
  };

  const openNewFolder = () => {
    setEditingFolder(createMaterialFolder({}));
    setFolderModalOpen(true);
  };

  const saveFolder = async () => {
    if (!editingFolder || !editingFolder.name.trim()) return;
    await materialFolderDB.save(editingFolder);
    setFolderModalOpen(false);
    setEditingFolder(null);
    loadFolders();
  };

  const deleteFolder = async (id: string) => {
    if (!confirm('确定删除此文件夹及所有素材？')) return;
    await materialFolderDB.delete(id);
    if (selectedFolder?.id === id) setSelectedFolder(null);
    loadFolders();
  };

  const openNewItem = () => {
    if (!selectedFolder) return;
    setEditingItem(createMaterialItem({ folderId: selectedFolder.id }));
    setItemModalOpen(true);
  };

  const openEditItem = (item: MaterialItem) => {
    setEditingItem({ ...item });
    setItemModalOpen(true);
  };

  const saveItem = async () => {
    if (!editingItem || !editingItem.title.trim()) return;
    editingItem.updatedAt = new Date().toISOString();
    await materialItemDB.save(editingItem);
    setItemModalOpen(false);
    setEditingItem(null);
    if (selectedFolder) loadItems(selectedFolder.id);
  };

  const deleteItem = async (id: string) => {
    if (!confirm('确定删除此素材？')) return;
    await materialItemDB.delete(id);
    if (selectedFolder) loadItems(selectedFolder.id);
  };

  const changeStatus = async (item: MaterialItem, status: MaterialItem['status']) => {
    item.status = status;
    item.updatedAt = new Date().toISOString();
    await materialItemDB.save(item);
    if (selectedFolder) loadItems(selectedFolder.id);
  };

  const filteredItems = items.filter((item) => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (filterType !== 'all' && item.type !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">🎨 素材收藏库</h2>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={openNewFolder}>+ 新建文件夹</button>
          {selectedFolder && <button className="btn-primary" onClick={openNewItem}>+ 添加素材</button>}
        </div>
      </div>

      {/* 文件夹选择 */}
      <div className="flex gap-2 flex-wrap">
        {folders.map((f) => (
          <div key={f.id} className="relative group">
            <button
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedFolder?.id === f.id ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
              onClick={() => setSelectedFolder(f)}
            >
              {f.icon} {f.name}
            </button>
            <button
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] hidden group-hover:flex items-center justify-center"
              onClick={() => deleteFolder(f.id)}
            >×</button>
          </div>
        ))}
        {folders.length === 0 && <p className="text-sm text-gray-400">暂无文件夹</p>}
      </div>

      {selectedFolder && (
        <>
          {/* 筛选 */}
          <div className="flex gap-2 flex-wrap">
            <select className="input w-auto text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">全部状态</option>
              <option value="collected">已收藏</option>
              <option value="planned">待使用</option>
              <option value="used">已使用</option>
            </select>
            <select className="input w-auto text-sm" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">全部类型</option>
              <option value="design">美工设计</option>
              <option value="editing">剪辑参考</option>
              <option value="tech">计算机干货</option>
              <option value="life">生活收集</option>
              <option value="other">其他</option>
            </select>
          </div>

          {/* 素材卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredItems.map((item) => (
              <div key={item.id} className="card hover:shadow-md transition-shadow">
                {/* 图片预览 */}
                {item.imageUrls.length > 0 && (
                  <div className="mb-3 -mx-4 -mt-4 rounded-t-xl overflow-hidden">
                    <img src={item.imageUrls[0]} alt={item.title} className="w-full h-32 object-cover" />
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{typeIcons[item.type] || '📦'}</span>
                      <span className="font-medium text-sm truncate">{item.title}</span>
                    </div>
                    <span className="text-xs text-gray-500">{typeLabels[item.type] || '其他'}</span>
                  </div>
                  <span className={getStatusColor(item.status)}>{getStatusLabel(item.status)}</span>
                </div>

                {item.content && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{item.content}</p>}

                {item.links.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {item.links.map((link, i) => (
                      <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-500 hover:underline block truncate">
                        🔗 {link}
                      </a>
                    ))}
                  </div>
                )}

                {item.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {item.tags.map((t) => (
                      <span key={t.id} className="badge text-white text-[10px]" style={{ backgroundColor: t.color }}>{t.name}</span>
                    ))}
                  </div>
                )}

                <div className="flex gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <select
                    className="input text-xs py-1 px-2 flex-1"
                    value={item.status}
                    onChange={(e) => changeStatus(item, e.target.value as MaterialItem['status'])}
                  >
                    <option value="collected">已收藏</option>
                    <option value="planned">待使用</option>
                    <option value="used">已使用</option>
                  </select>
                  <button className="btn-secondary btn-sm" onClick={() => openEditItem(item)}>✏️</button>
                  <button className="btn-danger btn-sm" onClick={() => deleteItem(item.id)}>🗑</button>
                </div>
              </div>
            ))}
          </div>
          {filteredItems.length === 0 && (
            <p className="text-center text-gray-400 py-8">暂无素材</p>
          )}
        </>
      )}

      {/* 文件夹弹窗 */}
      <Modal open={folderModalOpen} onClose={() => { setFolderModalOpen(false); setEditingFolder(null); }} title="编辑文件夹">
        {editingFolder && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">文件夹名称</label>
              <input className="input" value={editingFolder.name} onChange={(e) => setEditingFolder({ ...editingFolder, name: e.target.value })} placeholder="如：美工物料库" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">图标</label>
              <div className="flex gap-2 flex-wrap">
                {['📁','🎨','✂️','💻','🌟','📦','📷','🎬','📝','🔖'].map((icon) => (
                  <button
                    key={icon}
                    className={`w-10 h-10 text-xl rounded-lg flex items-center justify-center ${editingFolder.icon === icon ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    onClick={() => setEditingFolder({ ...editingFolder, icon })}
                  >{icon}</button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => { setFolderModalOpen(false); setEditingFolder(null); }}>取消</button>
              <button className="btn-primary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveFolder(); }}>保存</button>
            </div>
          </div>
        )}
      </Modal>

      {/* 素材弹窗 */}
      <Modal open={itemModalOpen} onClose={() => { setItemModalOpen(false); setEditingItem(null); }} title="编辑素材" maxWidth="max-w-xl">
        {editingItem && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">标题</label>
              <input className="input" value={editingItem.title} onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })} placeholder="素材标题" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">素材类型</label>
              <select className="input" value={editingItem.type} onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value as MaterialItem['type'] })}>
                <option value="design">🎨 美工设计</option>
                <option value="editing">✂️ 剪辑参考</option>
                <option value="tech">💻 计算机干货</option>
                <option value="life">🌟 生活收集</option>
                <option value="other">📦 其他</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">文字内容</label>
              <textarea className="input" rows={3} value={editingItem.content} onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })} placeholder="记录灵感、描述..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">外部链接（每行一个）</label>
              <textarea
                className="input"
                rows={2}
                value={editingItem.links.join('\n')}
                onChange={(e) => setEditingItem({ ...editingItem, links: e.target.value.split('\n').filter(Boolean) })}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">图片链接（每行一个）</label>
              <textarea
                className="input"
                rows={2}
                value={editingItem.imageUrls.join('\n')}
                onChange={(e) => setEditingItem({ ...editingItem, imageUrls: e.target.value.split('\n').filter(Boolean) })}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">使用状态</label>
              <select className="input" value={editingItem.status} onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value as MaterialItem['status'] })}>
                <option value="collected">已收藏</option>
                <option value="planned">待使用</option>
                <option value="used">已使用</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">标签</label>
              <TagSelector tags={editingItem.tags} onChange={(tags) => setEditingItem({ ...editingItem, tags })} />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => { setItemModalOpen(false); setEditingItem(null); }}>取消</button>
              <button className="btn-primary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveItem(); }}>保存</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}