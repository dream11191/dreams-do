import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { globalSearch } from '../db';
import { supabase } from '../supabase/client';
import { generateId } from '../utils';

const navItems = [
  { path: '/', label: '仪表盘', icon: '📊' },
  { path: '/schedule', label: '日程', icon: '📅' },
  { path: '/ledger', label: '记账', icon: '💰' },
  { path: '/study', label: '学习打卡', icon: '📚' },
  { path: '/material', label: '素材收藏', icon: '🎨' },
  { path: '/overdue', label: '逾期', icon: '⚠️' },
];

export default function Layout() {
  const { darkMode, toggleDarkMode, backgroundImage, setBackgroundImage, userName, setUserName, avatar, setAvatar } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ type: string; title: string; id: string; snippet: string }[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bgInput, setBgInput] = useState(backgroundImage);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(userName);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      globalSearch(searchQuery).then(setSearchResults);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    setSidebarOpen(false);
    setSearchOpen(false);
  }, [location]);

  return (
    <div className={`min-h-screen text-gray-900 dark:text-gray-100 ${backgroundImage ? 'bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm' : 'bg-gray-50 dark:bg-gray-900'}`}>
      {/* 顶部导航 */}
      <header className={`fixed top-0 left-0 right-0 z-40 border-b border-gray-200 dark:border-gray-700 h-14 flex items-center px-4 shadow-sm ${backgroundImage ? 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-md' : 'bg-white dark:bg-gray-800'}`}>
        <button
          className="md:hidden mr-3 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-primary-600 dark:text-primary-400">生活助手</h1>

        <div className="flex-1" />

        {/* 搜索 */}
        <button
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 mr-2"
          onClick={() => setSearchOpen(!searchOpen)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" onClick={toggleDarkMode}>
          {darkMode ? '☀️' : '🌙'}
        </button>
        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ml-1" onClick={() => { setBgInput(backgroundImage); setNicknameInput(userName); setSettingsOpen(true); }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        {user ? (
          <div className="flex items-center gap-1 ml-1 relative">
            <button
              className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-xs"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              {avatar ? (
                <img src={avatar} alt="头像" className="w-7 h-7 rounded-full object-cover border border-gray-300 dark:border-gray-600" />
              ) : (
                <span className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-sm">
                  {(userName || '同').charAt(0)}
                </span>
              )}
              <span className="hidden sm:inline text-gray-600 dark:text-gray-300">{userName || '同学'}</span>
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 py-1">
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => { setUserMenuOpen(false); setBgInput(backgroundImage); setNicknameInput(userName); setSettingsOpen(true); }}
                  >⚙️ 个人设置</button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500"
                    onClick={() => { setUserMenuOpen(false); setLogoutConfirmOpen(true); }}
                  >🚪 退出登录</button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            className="ml-1 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
            onClick={() => navigate('/auth')}
          >
            登录同步
          </button>
        )}
      </header>

      {/* 搜索弹窗 */}
      {searchOpen && (
        <div className="fixed top-14 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 shadow-lg">
          <input
            className="input"
            placeholder="全局搜索日程、记账、任务、素材..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-60 overflow-y-auto">
              {searchResults.map((r) => (
                <div key={r.id} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                  <span className="text-xs text-primary-500 font-medium">{r.type}</span>
                  <div className="font-medium text-sm">{r.title}</div>
                  {r.snippet && <div className="text-xs text-gray-500 truncate">{r.snippet}</div>}
                </div>
              ))}
            </div>
          )}
          {searchQuery.length >= 2 && searchResults.length === 0 && (
            <div className="mt-2 text-sm text-gray-500 text-center py-4">未找到结果</div>
          )}
        </div>
      )}

      <div className="flex pt-14">
        {/* 侧边栏 */}
        <aside
          className={`fixed top-14 left-0 bottom-0 z-30 w-56 border-r border-gray-200 dark:border-gray-700 transition-transform duration-200 overflow-y-auto
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:sticky md:top-14
            ${backgroundImage ? 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-md' : 'bg-white dark:bg-gray-800'}`}
        >
          <nav className="p-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium
                  ${isActive ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`
                }
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* 遮罩 */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-20 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* 主内容 */}
        <main className="flex-1 p-4 md:p-6 min-h-[calc(100vh-3.5rem)]">
          <Outlet />
        </main>
      </div>

      {/* 设置弹窗 */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSettingsOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">⚙️ 设置</h2>
              <button onClick={() => setSettingsOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-5">
              {/* 头像 */}
              <div>
                <div className="font-medium text-sm mb-2">个人头像</div>
                <div className="flex items-center gap-3">
                  {avatar ? (
                    <img src={avatar} alt="头像" className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600" />
                  ) : (
                    <span className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-2xl">
                      {(nicknameInput || '同').charAt(0)}
                    </span>
                  )}
                  <div className="flex-1 space-y-2">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setAvatarUploading(true);
                        try {
                          const ext = file.name.split('.').pop() || 'png';
                          const path = `avatars/${generateId()}.${ext}`;
                          const { error } = await supabase.storage
                            .from('materials')
                            .upload(path, file, { upsert: true });
                          if (error) {
                            console.error('Avatar upload error:', error);
                            alert('头像上传失败: ' + error.message);
                            return;
                          }
                          const { data: urlData } = supabase.storage
                            .from('materials')
                            .getPublicUrl(path);
                          setAvatar(urlData.publicUrl);
                        } finally {
                          setAvatarUploading(false);
                        }
                      }}
                    />
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                    >
                      {avatarUploading ? '上传中...' : '📁 上传头像'}
                    </button>
                    {avatar && (
                      <button
                        className="btn-danger btn-sm ml-2"
                        onClick={() => setAvatar('')}
                      >清除头像</button>
                    )}
                    <p className="text-xs text-gray-400">支持 JPG、PNG 等图片格式</p>
                  </div>
                </div>
              </div>

              {/* 昵称 */}
              <div>
                <div className="font-medium text-sm mb-2">个人昵称</div>
                <div className="flex gap-2">
                  <input
                    className="input flex-1 text-sm"
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    placeholder="请输入昵称"
                  />
                  <button
                    className="btn-primary btn-sm"
                    onClick={() => { setUserName(nicknameInput.trim() || '同学'); }}
                  >保存</button>
                </div>
              </div>

              {/* 暗色模式 */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">暗色模式</div>
                  <div className="text-xs text-gray-500">切换亮色/暗色主题</div>
                </div>
                <button
                  className={`relative w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-primary-500' : 'bg-gray-300'}`}
                  onClick={toggleDarkMode}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* 背景图 */}
              <div>
                <div className="font-medium text-sm mb-2">背景图片</div>
                <div className="text-xs text-gray-500 mb-2">粘贴图片链接，或上传本地图片</div>
                <input
                  className="input text-sm"
                  placeholder="https://example.com/bg.jpg"
                  value={bgInput}
                  onChange={(e) => setBgInput(e.target.value)}
                />
                <div className="flex gap-2 mt-2">
                  <label className="btn-secondary btn-sm cursor-pointer flex-1 text-center">
                    📁 本地上传
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => setBgInput(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  <button
                    className="btn-primary btn-sm flex-1"
                    onClick={() => { setBackgroundImage(bgInput.trim()); setSettingsOpen(false); }}
                  >应用</button>
                  {backgroundImage && (
                    <button
                      className="btn-danger btn-sm"
                      onClick={() => { setBgInput(''); setBackgroundImage(''); setSettingsOpen(false); }}
                    >清除背景</button>
                  )}
                </div>
                {bgInput && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img src={bgInput} alt="预览" className="w-full h-24 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 退出登录确认弹窗 */}
      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setLogoutConfirmOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="text-center">
              <div className="text-4xl mb-3">🚪</div>
              <h3 className="text-lg font-semibold mb-2">确定要退出当前账号吗？</h3>
              <p className="text-sm text-gray-500 mb-6">退出后数据仍保留在本地，重新登录后可同步</p>
              <div className="flex gap-3">
                <button
                  className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  onClick={() => setLogoutConfirmOpen(false)}
                >取消</button>
                <button
                  className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition"
                  onClick={async () => {
                    setLogoutConfirmOpen(false);
                    await signOut();
                    navigate('/auth');
                  }}
                >确认退出</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}