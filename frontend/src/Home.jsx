import { useEffect, useRef, useState } from 'react';
import { deleteEvents, fetchMovies, fetchMyEvents, fetchRecommendations, fetchMe, postEvent } from './api';

// ============================================================
// 电影推荐 — 正式首页（全链路：真实后端数据 + 互动持久化）
// 互动机制：like+1.0(1次) fav+0.5(1次) thumbs_up+0.5/次(累积) bad-0.5/次
// 首页推荐流：读后端推荐 API（定时重算的缓存）
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

export default function Home({ user, onLogout }) {
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
  const [movies, setMovies] = useState([]);
  const [total, setTotal] = useState(0);
  const [recs, setRecs] = useState([]);          // 首页推荐（后端缓存）
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nickname, setNickname] = useState('');

  // 登录后拉取用户信息 + 互动状态（恢复持久化）
  useEffect(() => {
    fetchMe().then((me) => { if (me.nickname) setNickname(me.nickname); }).catch(() => {});
    fetchMyEvents()
      .then((data) => {
        const l = [], f = [], up = {}, b = {};
        for (const [midStr, acts] of Object.entries(data.events || {})) {
          const mid = Number(midStr);
          for (const [action, n] of Object.entries(acts)) {
            if (action === 'like') l.push(mid);
            else if (action === 'fav') f.push(mid);
            else if (action === 'thumbs_up') up[mid] = n;
            else if (action === 'bad') b[mid] = n;
          }
        }
        setLiked(l); setFavs(f); setLikes(up); setBads(b);
      })
      .catch(() => {});
  }, []);

  // 数据加载：搜索词优先（任何视图下搜索都生效）；无搜索词时首页走推荐，其他视图走列表
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    const load = () => {
      if (query.trim()) {
        // 有搜索词 → 全局搜索电影（覆盖当前视图）
        return fetchMovies({ q: query, pageSize: 50 })
          .then((data) => { if (!cancelled) { setMovies(data.items); setTotal(data.total); } });
      }
      if (activeNav === '首页') {
        return fetchRecommendations(20)
          .then((data) => { if (!cancelled) setRecs(data); });
      }
      return fetchMovies({ pageSize: 50 })
        .then((data) => { if (!cancelled) { setMovies(data.items); setTotal(data.total); } });
    };
    load()
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query, activeNav]);

  // 展示列表：搜索时用搜索结果；首页无搜索时用推荐；热门按评分排序
  const isSearching = query.trim() !== '';
  const viewList = isSearching
    ? movies
    : activeNav === '热门'
      ? [...movies].sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0))
      : activeNav === '首页' ? recs : movies;

  // ---------- 互动状态（真实后端持久化） ----------
  const [liked, setLiked] = useState([]);
  const [favs, setFavs] = useState([]);
  const [likes, setLikes] = useState({});
  const [bads, setBads] = useState({});

  // 互动操作：先乐观更新 UI，再调后端（失败回滚）
  const toggleLike = async (id) => {
    const isOn = liked.includes(id);
    setLiked(prev => isOn ? prev.filter(x => x !== id) : [...prev, id]);
    try {
      if (isOn) await deleteEvents(id, 'like');
      else await postEvent(id, 'like');
    } catch (e) {
      setLiked(prev => isOn ? [...prev, id] : prev.filter(x => x !== id));  // 回滚
      alert(e.message);
    }
  };
  const toggleFav = async (id) => {
    const isOn = favs.includes(id);
    setFavs(prev => isOn ? prev.filter(x => x !== id) : [...prev, id]);
    try {
      if (isOn) await deleteEvents(id, 'fav');
      else await postEvent(id, 'fav');
    } catch (e) {
      setFavs(prev => isOn ? [...prev, id] : prev.filter(x => x !== id));
      alert(e.message);
    }
  };
  const bumpCount = (setter, id, cur) => {
    const next = cur > 0 ? 0 : cur + 1;  // 点赞/差评：+1 累积，点已赞N归零
    setter(prev => ({ ...prev, [id]: next }));
    return next;
  };
  const onLikeCount = async (id) => {
    const cur = likes[id] || 0;
    bumpCount(setLikes, id, cur);
    try {
      if (cur > 0) await deleteEvents(id, 'thumbs_up');       // 归零
      else await postEvent(id, 'thumbs_up');                   // +1
    } catch (e) { setLikes(prev => ({ ...prev, [id]: cur })); alert(e.message); }
  };
  const onBadCount = async (id) => {
    const cur = bads[id] || 0;
    bumpCount(setBads, id, cur);
    try {
      if (cur > 0) await deleteEvents(id, 'bad');
      else await postEvent(id, 'bad');
    } catch (e) { setBads(prev => ({ ...prev, [id]: cur })); alert(e.message); }
  };

  const finalScore = (m) => {
    let s = m.avg_rating ?? 0;
    if (liked.includes(m.id)) s += 1.0;
    if (favs.includes(m.id)) s += 0.5;
    s += 0.5 * (likes[m.id] || 0);
    s -= 0.5 * (bads[m.id] || 0);
    return s;
  };

  const navItems = ['首页', '热门', '我的片单', '收藏', '设置'];
  const myList = movies.filter(m => liked.includes(m.id));
  const favList = movies.filter(m => favs.includes(m.id));

  // ---------- 设置页状态 ----------
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
            <div style={{ fontSize: 11, color: colors.sub }}>{nickname || user.username}</div>
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
          <div style={{ padding: '14px 28px', borderBottom: `1px solid ${colors.border}`, background: colors.panel, display: 'flex', justifyContent: 'center' }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索电影或类型"
              style={{
                width: '100%', maxWidth: 480, background: colors.bg, color: colors.text,
                border: `1px solid ${colors.border}`, borderRadius: 8, padding: '9px 14px', fontSize: 14, outline: 'none',
              }} />
          </div>
        )}

        <div style={{ padding: '20px 28px 8px' }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>{isSearching ? '搜索结果' : activeNav === '首页' ? '为你推荐' : activeNav}</h1>
          {activeNav !== '设置' && (
            <p style={{ fontSize: 12, color: colors.sub, margin: '6px 0 0' }}>
              {loading ? '加载中…' : error ? `加载失败：${error}` : isSearching ? `找到 ${total} 部匹配「${query}」` : activeNav === '首页' ? `个性化推荐（基于你的互动，每 5 分钟更新）` : `共 ${total} 部`}
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
                    {nickname || user.username} · 用户名 {user.username}
                  </div>
                  <div style={{ fontSize: 13, color: colors.sub }}>
                    喜欢 {liked.length} 部 · 收藏 {favs.length} 部
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
                  <button onClick={() => { onLogout(); }}
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
              {activeNav === '我的片单' ? '还没有喜欢的电影' : '还没有收藏的电影'}
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
                    <ActBtn colors={colors} active={likeN > 0} onClick={() => onLikeCount(m.id)} label={likeN > 0 ? `已赞 ${likeN}` : '点赞'} />
                    <ActBtn colors={colors} active={badN > 0} onClick={() => onBadCount(m.id)} label={badN > 0 ? `已差 ${badN}` : '差评'} />
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
