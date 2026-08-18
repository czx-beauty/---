import { useEffect, useState } from 'react';
import { VariantA, VariantB, VariantC } from './variants';
import { VariantD } from './variantD';
import { movies, user } from './mockData';

const VARIANTS = [
  { key: 'D', name: '最终合成版（推荐）' },
  { key: 'A', name: 'Netflix 横滚式' },
  { key: 'B', name: '卡片瀑布流' },
  { key: 'C', name: '极简侧边栏' },
];

function PrototypeSwitcher({ current, onChange }) {
  const idx = VARIANTS.findIndex(v => v.key === current);
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: '#111', color: '#fff', borderRadius: 999, padding: '8px 18px',
      display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      zIndex: 999, fontFamily: 'system-ui', fontSize: 13,
    }}>
      <button onClick={() => onChange(VARIANTS[(idx - 1 + VARIANTS.length) % VARIANTS.length].key)}
        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}>◀</button>
      <span><strong style={{ color: '#fbbf24' }}>{current}</strong> — {VARIANTS[idx].name}</span>
      <button onClick={() => onChange(VARIANTS[(idx + 1) % VARIANTS.length].key)}
        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}>▶</button>
    </div>
  );
}

export default function App() {
  const [variant, setVariant] = useState(new URLSearchParams(window.location.search).get('variant') || 'D');
  const [liked, setLiked] = useState(user.liked);

  // 切变体 → 更新 URL（可分享、刷新保持）
  const changeVariant = (key) => {
    setVariant(key);
    const url = new URL(window.location);
    url.searchParams.set('variant', key);
    window.history.replaceState({}, '', url);
  };

  // 键盘 ← → 切换
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowLeft') changeVariant(VARIANTS[(VARIANTS.findIndex(v => v.key === variant) - 1 + 3) % 3].key);
      if (e.key === 'ArrowRight') changeVariant(VARIANTS[(VARIANTS.findIndex(v => v.key === variant) + 1) % 3].key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [variant]);

  const onLike = (id) => {
    setLiked(prev => prev.includes(id) ? prev : [...prev, id]);
    console.log(`[PROTOTYPE] 点击了电影 ${id} → 已加入喜好（mock，无持久化）`);
  };

  return (
    <>
      {variant === 'D' && <VariantD />}
      {variant === 'A' && <VariantA onLike={onLike} />}
      {variant === 'B' && <VariantB onLike={onLike} liked={liked} />}
      {variant === 'C' && <VariantC onLike={onLike} liked={liked} />}
      <PrototypeSwitcher current={variant} onChange={changeVariant} />
    </>
  );
}
