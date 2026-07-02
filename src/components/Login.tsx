import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, Key, User } from 'lucide-react';

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');
    const result = mode === 'login' ? login(username, password) : register(username, password);
    if (!result.success && result.error) {
      setError(result.error);
    }
  };

  return (
    <div className="onboarding">
      <div className="onboarding-card login-card">
        <div className="login-icon">
          {mode === 'login' ? <LogIn size={40} /> : <UserPlus size={40} />}
        </div>
        <h2>{mode === 'login' ? '欢迎回来' : '创建账号'}</h2>
        <p className="dimension-hint">
          {mode === 'login' ? '登录以查看你的学习计划' : '注册后即可创建和管理多个学习计划'}
        </p>

        <div className="form-group">
          <label><User size={14} /> 用户名</label>
          <input
            type="text"
            className="input-text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="输入用户名"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <div className="form-group">
          <label><Key size={14} /> 密码</label>
          <input
            type="password"
            className="input-text"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="输入密码"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {error && <p className="error-msg">{error}</p>}

        <button className="btn btn-primary login-btn" onClick={handleSubmit}>
          {mode === 'login' ? '登录' : '注册'}
        </button>

        <p className="switch-mode">
          {mode === 'login' ? '还没有账号？' : '已有账号？'}
          <button
            className="btn-link"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          >
            {mode === 'login' ? '立即注册' : '去登录'}
          </button>
        </p>
      </div>
    </div>
  );
}
