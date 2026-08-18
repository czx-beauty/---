import { useState } from 'react';
import { login, register, setToken } from './api';

// 登录/注册页（极简纯文字，红黑配色）
export default function AuthPage({ onAuthed }) {
  const [mode, setMode] = useState('login'); // login | register
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) { setError('用户名和密码不能为空'); return; }
    setBusy(true);
    setError('');
    try {
      const res = mode === 'login' ? await login(username, password) : await register(username, password);
      setToken(res.access_token);
      onAuthed({ id: res.user_id, username: res.username });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', background: '#1a1a20', color: '#e8e8ea',
    border: '1px solid #26262e', borderRadius: 8, padding: '11px 14px', fontSize: 14,
    outline: 'none', marginBottom: 12,
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0f0f13', color: '#e8e8ea', fontFamily: 'system-ui',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <form onSubmit={submit} style={{ width: 320 }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: '#e50914', marginBottom: 4 }}>电影推荐</div>
        <div style={{ fontSize: 13, color: '#8b8b93', marginBottom: 24 }}>
          {mode === 'login' ? '登录以继续' : '创建新账号'}
        </div>

        <input
          value={username} onChange={(e) => setUsername(e.target.value)}
          placeholder="用户名" style={inputStyle} autoFocus
        />
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="密码" style={inputStyle}
        />

        {error && <div style={{ fontSize: 13, color: '#e50914', marginBottom: 12 }}>{error}</div>}

        <button type="submit" disabled={busy} style={{
          width: '100%', background: '#e50914', color: '#fff', border: 'none', borderRadius: 8,
          padding: '11px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 16,
        }}>
          {busy ? '请稍候…' : mode === 'login' ? '登录' : '注册'}
        </button>

        <div style={{ fontSize: 13, color: '#8b8b93', textAlign: 'center' }}>
          {mode === 'login' ? '没有账号？' : '已有账号？'}{' '}
          <a
            href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            style={{ color: '#e8e8ea' }}
          >
            {mode === 'login' ? '去注册' : '去登录'}
          </a>
        </div>
      </form>
    </div>
  );
}
