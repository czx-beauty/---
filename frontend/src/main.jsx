import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import Home from './Home.jsx'
import AuthPage from './AuthPage.jsx'
import { getToken, clearToken } from './api.js'

function App() {
  const [user, setUser] = useState(() => {
    // 刷新时如果有 token，先假设已登录（用户信息由 Home 通过 /me 拉取）
    return getToken() ? { username: '' } : null;
  });

  const handleLogout = () => {
    clearToken();
    setUser(null);
  };

  if (!user) {
    return <AuthPage onAuthed={setUser} />;
  }
  return <Home user={user} onLogout={handleLogout} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
