import { useEffect, useRef, useState } from 'react';
import { fetchMovies } from './api';
import { user } from './mockData';

// ============================================================
// 电影推荐 — 正式首页（真实后端数据版）
// 互动机制：喜欢+1.0(1次可取消) 收藏+0.5(1次可取消)
//           点赞+0.5/次(可连续累积，点「已赞N」归零) 差评-0.5/次(同上)
// 数据：/api/movies（Vite 代理到后端 8000）
// ============================================================

const THEME_COLORS = {
  dark: {
    bg: '#0f0f13', panel: '#1a1a20', text: '#e8e8ea', sub: '#8b8b93',
    border: '#26262e', red: '#e50914', redText: '#fff',
  },
  light: {
    bg: '#f5f5f0', panel: '#ffffff', text: '#111111', sub: '#666666',
    border: '#e2e2dd', red: '#e50914', redText: '#fff',
  },
};

export default function Home() {
  // ---------- 主题 ----------
  const [themeChoice, setThemeChoice] = useState(() => localStorage.getItem('theme') || 'system');
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  const isDark = themeChoice === 'system' ? systemDark : themeChoice === 'dark';
  const colors = THEME_COLORS[isDark ? 'dark' : 'light'];
  const changeTheme = (choice) => { setThemeChoice(choice); localStorage.setItem('theme', choice); };

  // ---------- 侧边栏 ----------
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [width, setWidth] = useState(220);
  const dragging = useRef(false);
  const startDrag = (e) => {
    dragging.current = true;
    const startX = e.clientX;
    const startW = width;
    const onMove = (ev) => setWidth(Math.max(200, Math.min(400, startW + (ev.clientX - startX))));
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ---------- 视图 / 搜索 / 数据 ----------
  const [activeNav, setActiveNav] = useState('首页');
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState([]);       // 真实数据
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 从后端拉数据：搜索词/视图切换时重新请求（useEffect 监听依赖）
  useEffect(() => {
    let cancelled = false;  // 防止快速切换时旧响应覆盖新响应（竞态保护）
    setLoading(true);
    setError('');
    fetchMovies({ q: query })
      .then((data) => {
        if (!cancelled) {
          setMovies(data.items);
          setTotal(data.total);
        }
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };  // 清理函数：组件卸载/依赖变化时标记取消
  }, [query, activeNav]);

  // 热门视图：按平均分降序（前端排序当前页；完整排序后续由后端/推荐引擎做）
  const viewList = activeNav === '热门'
    ? [...movies].sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0))
    : movies;

  // ---------- 互动状态（本地 mock，T6 接后端行为事件 API） ----------
  const [liked, setLiked] = useState(user.liked);
  const [favs, setFavs] = useState([]);
  const [likes, setLikes] = useState({});
  const [bads, setBads] = useState({});

  const toggleLike = (id) => setLiked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleFav = (id) => setFavs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const bump = (setter, id, count) => setter(prev => ({ ...prev, [id]: count }));
  const likeOnce = (id) => bump(setLikes, id, (likes[id] || 0) + 1);
  const badOnce = (id) => bump(setBads, id, (bads[id] || 0) + 1);

  // 最终星数 = 基础分(API avg_rating) + 互动加成
  const finalScore = (m) => {
    let s = m.avg_rating ?? 0;
    if (liked.includes(m.id)) s += 1.0;
    if (favs.includes(m.id)) s += 0.5;
    s += 0.5 * (likes[m.id] || 0);
    s -= 0.5 * (bads[m.id] || 0);
    return s;
  };

  const navItems = ['首页', '热门', '我的片单', '收藏', '设置'];

  const myList = activeNav === '我的片单' ? movies.filter(m => liked.includes(m.id)) : [];
  const favList = activeNav === '收藏' ? movies.filter(m => favs.includes(m.id)) : [];

  // ---------- 设置页状态（mock，后续接后端） ----------
  const [nickname, setNickname] = useState(user.name);
  const [pwdOld, setPwdOld] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdNew2, setPwdNew2] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const mockSave = (msg) => { setSavedMsg(msg); setTimeout(() => setSavedMsg(''), 2000); };

  return (
    <div style={{
      minHeight: '100vh', background: colors.bg, color: colors.text,
      fontFamily: 'system-ui', display: 'flex',
    }}>
      {/* ===== 侧边栏 ===== */}
      {sidebarOpen && (
        <aside style={{
          width, background: colors.panel, borderRight: `1px solid ${colors.border}`,
          display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0,
          zIndex: 100, boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: `1px solid ${colors.border}` }}>
            <span style={{ fontWeight: 800, fontSize: 17, color: colors.red }}>电影推荐</span>
            <button onClick={() => setSidebarOpen(false)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: colors.sub, fontSize: 15, cursor: 'pointer' }}>
              关闭
            </button>
          </div>
          <nav style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {navItems.map(item => (
              <button key={item}
                onClick={() => setActiveNav(item)}
                style={{
                  background: activeNav === item ? colors.red : 'transparent',
                  color: activeNav === item ? colors.redText : colors.text,
                  border: 'none', borderRadius: 6, padding: '8px 12px', fontSize: 14,
                  cursor: 'pointer', textAlign: 'left',
                }}>
                {item}
              </button>
            ))}
          </nav>
          <div style={{ marginTop: 'auto', padding: 12, borderTop: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, color: colors.sub }}>外观</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[['system', '跟随'], ['dark', '黑夜'], ['light', '白天']].map(([val, label]) => (
                <button key={val} onClick={() => changeTheme(val)}
                  style={{
                    flex: 1, background: themeChoice === val ? colors.red : 'transparent',
                    color: themeChoice === val ? colors.redText : colors.text,
                    border: `1px solid ${colors.border}`, borderRadius: 6, padding: '5px 0', fontSize: 12, cursor: 'pointer',
                  }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: colors.sub }}>{nickname}</div>
          </div>
          <div onMouseDown={startDrag} style={{ position: 'absolute', top: 0, right: -3, width: 6, height: '100%', cursor: 'col-resize', zIndex: 10 }} />
        </aside>
      )}

      {/* ===== ☰ 菜单入口 ===== */}
      {!sidebarOpen && (
        <button onClick={() => setSidebarOpen(true)} title="打开菜单"
          style={{
            position: 'fixed', top: 18, left: 18, zIndex: 200,
            background: 'transparent', color: colors.text,
            border: `1px solid ${colors.border}`, borderRadius: 6,
            width: 34, height: 34, fontSize: 16, lineHeight: 1, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          ☰
        </button>
      )}

      {/* ===== 主内容区 ===== */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {activeNav !== '设置' && (
          <div style={{ padding: '14px 28px', borderBottom: `1px solid ${colors.border}`, background: colors.panel }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索电影或类型（实时查后端）"
              style={{
                width: '100%', maxWidth: 420, background: colors.bg, color: colors.text,
                border: `1px solid ${colors.border}`, borderRadius: 8, padding: '9px 14px', fontSize: 14, outline: 'none',
              }} />
          </div>
        )}

        <div style={{ padding: '20px 28px 8px' }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>{activeNav}</h1>
          {activeNav !== '设置' && (
            <p style={{ fontSize: 12, color: colors.sub, margin: '6px 0 0' }}>
              {loading ? '加载中…' : error ? `加载失败：${error}` : `共 ${total} 部（真实数据）`}
            </p>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 28px 60px' }}>
          {activeNav === '设置' ? (
            <div style={{ maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 8 }}>
              <div>
                <div style={{ fontSize: 12, color: colors.sub, marginBottom: 6 }}>外观</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['system', '跟随系统'], ['dark', '黑夜'], ['light', '白天']].map(([val, label]) => (
                    <button key={val} onClick={() => changeTheme(val)}
                      style={{
                        flex: 1, background: themeChoice === val ? colors.red : colors.panel,
                        color: themeChoice === val ? colors.redText : colors.text,
                        border: `1px solid ${colors.border}`, borderRadius: 8, padding: '10px 0', fontSize: 13, cursor: 'pointer',
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: colors.sub, marginBottom: 6 }}>账号</div>
                <div style={{ background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 13 }}>
                    {nickname} · 用户名 czx-beauty · 注册于 2026-08-18
                  </div>
                  <div style={{ fontSize: 13, color: colors.sub }}>
                    喜欢 {liked.length} 部 · 收藏 {favs.length} 部 · 已看 165 部
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input value={nickname} onChange={(e) => setNickname(e.target.value)}
                      placeholder="昵称" style={inputStyle(colors)} />
                    <button onClick={() => mockSave('昵称已保存')} style={btnStyle(colors)}>保存昵称</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="password" value={pwdOld} onChange={(e) => setPwdOld(e.target.value)} placeholder="旧密码" style={inputStyle(colors)} />
                    <input type="password" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} placeholder="新密码" style={inputStyle(colors)} />
                    <input type="password" value={pwdNew2} onChange={(e) => setPwdNew2(e.target.value)} placeholder="确认新密码" style={inputStyle(colors)} />
                    <button onClick={() => { setPwdOld(''); setPwdNew(''); setPwdNew2(''); mockSave('密码已修改（mock）'); }} style={btnStyle(colors)}>保存</button>
                  </div>
                  <button onClick={() => mockSave('已退出登录（mock）')}
                    style={{ alignSelf: 'flex-start', background: 'transparent', border: `1px solid ${colors.red}`, color: colors.red, borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>
                    退出登录
                  </button>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: colors.sub, marginBottom: 6 }}>关于</div>
                <div style={{ background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '12px 14px', fontSize: 13 }}>
                  movie-recommender · 学习项目
                </div>
              </div>

              {savedMsg && <div style={{ fontSize: 13, color: colors.red }}>{savedMsg}</div>}
            </div>
          ) : loading ? (
            <div style={{ color: colors.sub, padding: '40px 0', textAlign: 'center', fontSize: 14 }}>加载中…</div>
          ) : error ? (
            <div style={{ color: colors.red, padding: '40px 0', textAlign: 'center', fontSize: 14 }}>{error}</div>
          ) : (activeNav === '我的片单' && myList.length === 0) || (activeNav === '收藏' && favList.length === 0) ? (
            <div style={{ color: colors.sub, padding: '40px 0', textAlign: 'center', fontSize: 14 }}>
              {activeNav === '我的片单' ? '还没有喜欢的电影（数据目前存本地，接后端后持久化）' : '还没有收藏的电影（数据目前存本地，接后端后持久化）'}
            </div>
          ) : (
            (activeNav === '我的片单' ? myList : activeNav === '收藏' ? favList : viewList).map(m => {
              const score = finalScore(m);
              const isLiked = liked.includes(m.id);
              const isFav = favs.includes(m.id);
              const likeN = likes[m.id] || 0;
              const badN = bads[m.id] || 0;
              return (
                <div key={m.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    background: colors.panel, borderRadius: 8, padding: '10px 16px',
                    marginBottom: 8, border: `1px solid ${isLiked ? colors.red : colors.border}`,
                  }}>
                  <div style={{ width: 30, textAlign: 'center', color: colors.sub, fontSize: 13 }}>{m.id}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.title} <span style={{ color: colors.sub, fontWeight: 400, fontSize: 12 }}>{m.rating_count ? `${m.rating_count} 人评分` : '暂无评分'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: colors.sub, marginTop: 2 }}>{m.genres.replaceAll('|', ' · ')}</div>
                  </div>

                  <span style={{ fontSize: 14, color: colors.red, fontWeight: 700, width: 52, textAlign: 'right' }}>
                    ★ {score.toFixed(1)}
                  </span>

                  <span style={{ fontSize: 12, color: colors.sub, width: 70, textAlign: 'right' }}>
                    赞 {likeN} · 差 {badN}
                  </span>

                  <div style={{ display: 'flex', gap: 4, width: 210, justifyContent: 'flex-end' }}>
                    <ActBtn colors={colors} active={likeN > 0} onClick={() => likeN > 0 ? bump(setLikes, m.id, 0) : likeOnce(m.id)} label={likeN > 0 ? `已赞 ${likeN}` : '点赞'} />
                    <ActBtn colors={colors} active={badN > 0} onClick={() => badN > 0 ? bump(setBads, m.id, 0) : badOnce(m.id)} label={badN > 0 ? `已差 ${badN}` : '差评'} />
                    <ActBtn colors={colors} active={isFav} onClick={() => toggleFav(m.id)} label={isFav ? '已收藏' : '收藏'} />
                    <ActBtn colors={colors} active={isLiked} onClick={() => toggleLike(m.id)} label={isLiked ? '已喜欢' : '喜欢'} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}

function ActBtn({ colors, active, onClick, label }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        background: active ? colors.red : 'transparent',
        color: active ? colors.redText : colors.sub,
        border: `1px solid ${active ? colors.red : colors.border}`,
        borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
      }}>
      {label}
    </button>
  );
}

function inputStyle(colors) {
  return {
    background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
    borderRadius: 6, padding: '7px 10px', fontSize: 13, outline: 'none', flex: 1, minWidth: 0,
  };
}
function btnStyle(colors) {
  return {
    background: colors.red, color: colors.redText, border: 'none',
    borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
  };
}
