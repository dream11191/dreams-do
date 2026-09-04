import { useState, useEffect, useRef } from 'react';
import { materialFolderDB, materialItemDB } from '../db';
import { supabase } from '../supabase/client';
import type { MaterialFolder, MaterialItem, MaterialFile } from '../types';
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

const MATERIAL_BUCKET = 'materials';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<{ file: File; customName: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setFolders(Array.isArray(data) ? data : []);
    if (Array.isArray(data) && data.length > 0 && !selectedFolder) setSelectedFolder(data[0]);
  };

  const loadItems = async (folderId: string) => {
    const data = await materialItemDB.getByFolder(folderId);
    const safeData = Array.isArray(data) ? data : [];
    setItems(safeData.map(normalizeItem).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
  };

  const normalizeItem = (item: MaterialItem): MaterialItem => ({
    ...item,
    files: Array.isArray(item.files) ? item.files : [],
    links: Array.isArray(item.links) ? item.links : [],
    tags: Array.isArray(item.tags) ? item.tags : [],
  });

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
    setPendingFiles([]);
    setItemModalOpen(true);
  };

  const openEditItem = (item: MaterialItem) => {
    setEditingItem(normalizeItem(item));
    setPendingFiles([]);
    setItemModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPending: { file: File; customName: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      newPending.push({ file: f, customName: f.name });
    }
    setPendingFiles((prev) => [...prev, ...newPending]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updatePendingFileName = (index: number, name: string) => {
    setPendingFiles((prev) => prev.map((pf, i) => (i === index ? { ...pf, customName: name } : pf)));
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<MaterialFile[]> => {
    if (pendingFiles.length === 0) return [];
    setUploading(true);
    const uploaded: MaterialFile[] = [];
    try {
      for (const pf of pendingFiles) {
        const ext = pf.file.name.split('.').pop() || '';
        const safeName = pf.customName || pf.file.name;
        const storagePath = `${generateId()}/${safeName}`;
        const { data, error } = await supabase.storage
          .from(MATERIAL_BUCKET)
          .upload(storagePath, pf.file, { upsert: true });
        if (error) {
          console.error('Upload error:', error);
          alert(`上传失败: ${error.message}`);
          continue;
        }
        const { data: urlData } = supabase.storage
          .from(MATERIAL_BUCKET)
          .getPublicUrl(data.path);
        const isImage = pf.file.type.startsWith('image/');
        uploaded.push({
          name: safeName,
          originalName: pf.file.name,
          path: data.path,
          url: urlData.publicUrl,
          type: isImage ? 'image' : 'document',
          size: pf.file.size,
        });
      }
    } finally {
      setUploading(false);
    }
    return uploaded;
  };

  const removeUploadedFile = (index: number) => {
    if (!editingItem) return;
    const safeFiles = Array.isArray(editingItem.files) ? editingItem.files : [];
    const newFiles = safeFiles.filter((_, i) => i !== index);
    setEditingItem({ ...editingItem, files: newFiles });
  };

  const saveItem = async () => {
    if (!editingItem || !editingItem.title.trim()) return;
    const newFiles = await uploadFiles();
    const safeExisting = Array.isArray(editingItem.files) ? editingItem.files : [];
    editingItem.files = [...safeExisting, ...newFiles];
    editingItem.updatedAt = new Date().toISOString();
    await materialItemDB.save(editingItem);
    setItemModalOpen(false);
    setEditingItem(null);
    setPendingFiles([]);
    if (selectedFolder) loadItems(selectedFolder.id);
  };

  const deleteItem = async (id: string) => {
    if (!confirm('确定删除此素材？')) return;
    await materialItemDB.delete(id);
    if (selectedFolder) loadItems(selectedFolder.id);
  };

  const changeStatus = async (item: MaterialItem, status: MaterialItem['status']) => {
    const normalized = normalizeItem(item);
    normalized.status = status;
    normalized.updatedAt = new Date().toISOString();
    await materialItemDB.save(normalized);
    if (selectedFolder) loadItems(selectedFolder.id);
  };

  const filteredItems = items.filter((item) => {
    if (!item) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchContent = (item.content || '').toLowerCase().includes(q);
      const matchTags = (item.tags || []).some((t) => t && t.name && t.name.toLowerCase().includes(q));
      const matchFiles = (item.files || []).some((f) => f && ((f.name || '').toLowerCase().includes(q) || (f.originalName || '').toLowerCase().includes(q)));
      if (!matchTitle && !matchContent && !matchTags && !matchFiles) return false;
    }
    return true;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">🎨 素材收藏库</h2>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={openNewFolder}>+ 新建文件夹</button>
          {selectedFolder && <button className="btn-primary" onClick={openNewItem}>+ 添加素材</button>}
        </div>
      </div>

      {/* 搜索 */}
      <div className="relative">
        <input
          className="input pl-9"
          placeholder="搜索素材标题、内容、标签、文件名..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
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
            {searchQuery && (
              <span className="text-xs text-gray-500 self-center">找到 {filteredItems.length} 个结果</span>
            )}
          </div>

          {/* 素材卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredItems.map((item) => (
              <div key={item.id} className="card hover:shadow-md transition-shadow">
                {/* 图片预览 */}
                {(item.files || []).filter((f) => f && f.type === 'image').length > 0 && (
                  <div className="mb-3 -mx-4 -mt-4 rounded-t-xl overflow-hidden">
                    <img src={(item.files || []).filter((f) => f && f.type === 'image')[0].url} alt={item.title} className="w-full h-32 object-cover" />
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

                {(item.links || []).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {(item.links || []).map((link, i) => (
                      <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-500 hover:underline block truncate">
                        🔗 {link}
                      </a>
                    ))}
                  </div>
                )}

                {/* 文件列表 */}
                {(item.files || []).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {(item.files || []).map((f, i) => (
                      <a
                        key={i}
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary-500 hover:underline"
                      >
                        <span>{f.type === 'image' ? '🖼️' : '📄'}</span>
                        <span className="truncate">{f.name}</span>
                        <span className="text-gray-400 shrink-0">{formatFileSize(f.size)}</span>
                      </a>
                    ))}
                  </div>
                )}

                {(item.tags || []).length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {(item.tags || []).map((t) => (
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
            <p className="text-center text-gray-400 py-8">{searchQuery ? '未找到匹配的素材' : '暂无素材'}</p>
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
                value={(editingItem.links || []).join('\n')}
                onChange={(e) => setEditingItem({ ...editingItem, links: e.target.value.split('\n').filter(Boolean) })}
                placeholder="https://..."
              />
            </div>

            {/* 文件上传区域 */}
            <div>
              <label className="text-sm font-medium mb-1 block">上传文件（图片/文档）</label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-primary-400 dark:hover:border-primary-500 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.pptx,.zip,.rar"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📎 选择文件
                </button>
                <p className="text-xs text-gray-400 mt-1">支持图片、PDF、Word、Excel、PPT、TXT、压缩包等</p>
              </div>
            </div>

            {/* 已上传的文件列表 */}
            {(editingItem.files || []).length > 0 && (
              <div>
                <label className="text-sm font-medium mb-1 block">已上传文件</label>
                <div className="space-y-1">
                  {(editingItem.files || []).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
                      <span>{f.type === 'image' ? '🖼️' : '📄'}</span>
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-gray-400">{formatFileSize(f.size)}</span>
                      <button
                        className="text-red-400 hover:text-red-600 text-xs"
                        onClick={() => removeUploadedFile(i)}
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 待上传文件列表 */}
            {pendingFiles.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-1 block">待上传文件（可自定义名称）</label>
                <div className="space-y-2">
                  {pendingFiles.map((pf, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                      <span>{pf.file.type.startsWith('image/') ? '🖼️' : '📄'}</span>
                      <input
                        className="input text-xs py-1 flex-1 min-w-0"
                        value={pf.customName}
                        onChange={(e) => updatePendingFileName(i, e.target.value)}
                        placeholder="自定义文件名"
                      />
                      <span className="text-xs text-gray-400 shrink-0">{formatFileSize(pf.file.size)}</span>
                      <button
                        className="text-red-400 hover:text-red-600 text-xs shrink-0"
                        onClick={() => removePendingFile(i)}
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
              <button className="btn-primary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveItem(); }} disabled={uploading}>
                {uploading ? '上传中...' : '保存'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}