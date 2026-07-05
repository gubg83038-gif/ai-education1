import { useState } from 'react';
import { testAIConnection } from '../lib/ai';
import { Sparkles, Check, X, Zap } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function Settings({ onClose }: Props) {
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'fail'>('idle');

  const handleTest = async () => {
    setTesting(true);
    setStatus('idle');
    const ok = await testAIConnection();
    setStatus(ok ? 'ok' : 'fail');
    setTesting(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3><Sparkles size={16} /> AI 设置</h3>
        <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          AI 服务由 Cloudflare Pages Functions 提供，使用服务端 API Key。
        </p>

        {status === 'ok' && (
          <div className="ai-status ok" style={{ marginTop: 12 }}>
            <Check size={14} /> AI 服务正常，所有功能可用
          </div>
        )}
        {status === 'fail' && (
          <div className="ai-status fail" style={{ marginTop: 12 }}>
            <X size={14} /> AI 服务不可用，将使用基础规则引擎
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn btn-outline btn-sm" onClick={handleTest} disabled={testing}>
            <Zap size={14} /> {testing ? '测试中...' : '测试连接'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}
