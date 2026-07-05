import { useState, useEffect } from 'react';
import { saveApiKey } from '../lib/ai';
import { Key, Check } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function Settings({ onClose }: Props) {
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem('user_deepseek_key');
    if (existing) setKey(existing);
  }, []);

  const handleSave = () => {
    saveApiKey(key.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3><Key size={16} /> AI 设置</h3>
        <p style={{ marginTop: 8 }}>输入你的 DeepSeek API Key，即可使用 AI 生成详细计划。Key 仅保存在你的浏览器中。</p>

        <div className="log-field" style={{ marginTop: 16 }}>
          <label>DeepSeek API Key</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type={showKey ? 'text' : 'password'}
              className="input-text"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="sk-xxxxxxxx"
              style={{ flex: 1 }}
            />
            <button className="btn btn-ghost btn-sm" onClick={() => setShowKey(!showKey)}>
              {showKey ? '隐藏' : '显示'}
            </button>
          </div>
          <p className="dimension-hint" style={{ marginTop: 4 }}>
            前往 <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer">platform.deepseek.com</a> 创建 Key，充值10元可用很久
          </p>
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>关闭</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!key.trim()}>
            {saved ? <><Check size={14} /> 已保存</> : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
