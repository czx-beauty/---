import { movies, user } from './mockData';

// 三个变体共用的小组件
function GenreChip({ g }) {
  return <span style={{ background: '#1f2937', color: '#93c5fd', borderRadius: 999, padding: '2px 10px', fontSize: 12 }}>{g}</span>;
}

function Star({ n }) {
  // 评分是 10 分制（IMDb 风格），按比例折算成 5 颗星，并夹在 0~5 之间防止崩溃
  const stars = Math.max(0, Math.min(5, Math.round(n / 2)));
  return <span style={{ color: '#fbbf24' }}>{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</span>;
}

// ============ 变体 A：Netflix 式 横滚海报行 ============
export function VariantA({ onLike }) {
  const rows = [
    ['为你推荐', movies.slice(0, 6)],
    ['高分经典', movies.slice(1, 7)],
    ['动画奇幻', movies.filter(m => m.genres.includes('Animation'))],
    ['科幻冒险', movies.filter(m => m.genres.includes('Sci-Fi'))],
  ];
  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'system-ui' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px' }}>
        <div style={{ color: '#e50914', fontWeight: 900, fontSize: 24, letterSpacing: 1 }}>CINEMA</div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 13 }}>
          <span style={{ opacity: 0.8 }}>首页</span>
          <span style={{ opacity: 0.8 }}>电影</span>
          <span style={{ opacity: 0.8 }}>我的收藏</span>
          <span style={{ background: '#e50914', borderRadius: 999, padding: '4px 12px', fontWeight: 600 }}>{user.avatar} {user.name}</span>
        </div>
      </header>
      <div style={{ padding: '60px 24px 20px' }}>
        <h1 style={{ fontSize: 44, margin: 0 }}>Inception</h1>
        <p style={{ color: '#aaa', maxWidth: 460 }}>盗梦团队进入他人梦境窃取秘密。</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button onClick={() => onLike(1)} style={{ background: '#fff', color: '#000', border: 'none', borderRadius: 6, padding: '10px 28px', fontWeight: 700, cursor: 'pointer' }}>▶ 喜欢这部</button>
          <button style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 28px', cursor: 'pointer' }}>ⓘ 详情</button>
        </div>
      </div>
      {rows.map(([title, list]) => (
        <section key={title} style={{ padding: '20px 0' }}>
          <h2 style={{ fontSize: 18, margin: '0 24px 10px', fontWeight: 600 }}>{title}</h2>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 24px' }}>
            {list.map(m => (
              <div key={m.id} onClick={() => onLike(m.id)} style={{ minWidth: 150, aspectRatio: '2/3', background: '#181818', borderRadius: 8, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 12, cursor: 'pointer', fontSize: 42 }}>
                <div>{m.poster}</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{m.title}</div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ============ 变体 B：卡片瀑布流（豆瓣/IMDb 风格） ============
export function VariantB({ onLike, liked }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', color: '#111', fontFamily: 'system-ui' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e5e0', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 900, fontSize: 22, color: '#00b51d' }}>豆瓣电影</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input placeholder="搜索电影…" style={{ border: '1px solid #ccc', borderRadius: 4, padding: '6px 12px', width: 220, fontSize: 13 }} />
          <span style={{ fontSize: 13, color: '#666' }}>{user.avatar} {user.name}</span>
        </div>
      </header>
      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['全部', '科幻', '动画', '剧情', '动作', '爱情'].map(t => (
            <span key={t} style={{ padding: '5px 16px', borderRadius: 999, border: '1px solid #ddd', fontSize: 13, cursor: 'pointer', background: t === '全部' ? '#00b51d' : '#fff', color: t === '全部' ? '#fff' : '#333' }}>{t}</span>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
          {movies.map(m => (
            <div key={m.id} style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', cursor: 'pointer' }} onClick={() => onLike(m.id)}>
              <div style={{ height: 130, background: 'linear-gradient(135deg,#1e3a5f,#4a90d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>{m.poster}</div>
              <div style={{ padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{m.title} <span style={{ color: '#999', fontWeight: 400, fontSize: 12 }}>{m.year}</span></div>
                <div style={{ fontSize: 13, margin: '6px 0' }}><Star n={m.rating} /> <span style={{ color: '#e09015', fontWeight: 700 }}>{m.rating}</span></div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{m.genres.map(g => <GenreChip key={g} g={g} />)}</div>
                {liked.includes(m.id) && <div style={{ color: '#00b51d', fontSize: 12, marginTop: 6 }}>✓ 已标记喜欢</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ 变体 C：极简侧边栏（YouTube Music / Spotify 风） ============
export function VariantC({ onLike, liked }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0f0f13', color: '#e8e8ea', fontFamily: 'system-ui' }}>
      <aside style={{ width: 200, borderRight: '1px solid #222', padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 18, padding: '0 8px 16px', color: '#fff' }}>☰ FLIX</div>
        {['🏠 首页', '🔥 热门', '🎞️ 我的片单', '⭐ 收藏', '⚙️ 设置'].map(item => (
          <div key={item} style={{ padding: '8px 10px', borderRadius: 6, cursor: 'pointer', background: item.includes('首页') ? '#282830' : 'transparent' }}>{item}</div>
        ))}
        <div style={{ marginTop: 'auto', borderTop: '1px solid #222', paddingTop: 12, fontSize: 13, color: '#999' }}>
          {user.avatar} {user.name}<div style={{ fontSize: 11 }}>已看 165 部 · 喜欢 {liked.length} 部</div>
        </div>
      </aside>
      <main style={{ flex: 1, padding: '28px 36px', overflowY: 'auto' }}>
        <h1 style={{ fontSize: 24, margin: '0 0 6px' }}>晚上好，{user.name} 👋</h1>
        <p style={{ color: '#888', fontSize: 13, margin: '0 0 24px' }}>根据你的行为推荐 · 点击卡片表达喜欢，推荐会随之更新</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {movies.map(m => (
            <div key={m.id} onClick={() => onLike(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#1a1a20', borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}>
              <div style={{ width: 40, height: 40, borderRadius: 6, background: '#282830', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{m.poster}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.title} <span style={{ color: '#666', fontWeight: 400, fontSize: 12 }}>{m.year}</span></div>
                <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>{m.genres.join(' · ')}</div>
              </div>
              <Star n={m.rating} />
              <span style={{ fontSize: 13, color: liked.includes(m.id) ? '#4ade80' : '#555', width: 60, textAlign: 'right' }}>{liked.includes(m.id) ? '❤️ 已喜欢' : '+ 喜欢'}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
