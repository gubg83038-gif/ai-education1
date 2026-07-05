import { useState, useEffect } from 'react';
import { saveApiKey } from '../lib/ai';
import { Check, Sparkles } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function Settings({ onClose }: Props) {
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);

  useEffect(() => {
    const existing = localStorage.getItem('user_deepseek_key');
    if (existing) setKey(existing);
  }, []);

  const handleSave = () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    saveApiKey(trimmed);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  const handleTest = async () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    saveApiKey(trimmed);
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trimmed}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: '回复"OK"' }],
          max_tokens: 5,
        }),
      });
      if (res.ok) {
        setTestResult('ok');
      } else {
        const err = await res.text();
        setTestResult('fail');
        console.error('API test failed:', err);
      }
    } catch {
      setTestResult('fail');
    }
    setTesting(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3><Sparkles size={16} /> AI 设置</h3>
        <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          输入 DeepSeek API Key 即可用 AI 生成详细学习计划。<br/>
          Key 仅保存在你的浏览器中，不会上传。
        </p>

        <div className="log-field" style={{ marginTop: 16 }}>
          <label>DeepSeek API Key</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type={showKey ? 'text' : 'password'}
              className="input-text"
              value={key}
              onChange={e => { setKey(e.target.value); setTestResult(null); }}
              placeholder="sk-xxxxxxxx"
              style={{ flex: 1 }}
            />
            <button className="btn btn-ghost btn-sm" onClick={() => setShowKey(!showKey)}>
              {showKey ? '隐藏' : '显示'}
            </button>
          </div>
          <p className="dimension-hint" style={{ marginTop: 4 }}>
            前往 <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer">platform.deepseek.com</a> 创建
          </p>
          {testResult === 'ok' && <p style={{ color: 'var(--success)', fontSize: 12, marginTop: 4 }}>✓ API Key 可用</p>}
          {testResult === 'fail' && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>✗ Key 无效或网络错误，请检查</p>}
        </div>

        <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
          <button className="btn btn-outline btn-sm" onClick={handleTest} disabled={!key.trim() || testing}>
            {testing ? '测试中...' : '测试连接'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>关闭</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={!key.trim()}>
              {saved ? <><Check size={14} /> 已保存</> : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
