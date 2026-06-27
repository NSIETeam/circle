'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { SearchIcon, MicIcon, SendIcon } from './icons';

export default function AIFloatingButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{id: string; name: string; region: string; rent_min: number; reason: string}>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别，请使用Chrome或Safari');
      return;
    }
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleSubmit(transcript);
    };
    recognition.start();
  };

  const handleSubmit = async (text?: string) => {
    const query = text || input;
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      const res = await api.recommend.match({ keyword: query, page_size: '5' });
      if (res.data && res.data.length > 0) {
        setResults(res.data.slice(0, 5).map((b: any) => ({
          id: b.id,
          name: b.name,
          region: b.region,
          rent_min: b.rent_min,
          reason: b.match_reason || '符合您的需求',
        })));
      } else {
        setResults([{ id: '', name: '暂无匹配房源', region: '', rent_min: 0, reason: '请尝试其他关键词' }]);
      }
    } catch {
      setResults([{ id: '', name: '搜索失败', region: '', rent_min: 0, reason: '请稍后重试' }]);
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  const handleClick = (id: string) => {
    if (id) {
      router.push(`/buildings/${id}`);
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* 悬浮按钮 — 灰色 + 放大镜 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: 'calc(65px + var(--safe-bottom))',
          right: 20,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--fill-secondary)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 'var(--z-nav)',
          transition: 'transform 0.2s cubic-bezier(0.25,0.1,0.25,1)',
        }}
      >
        <SearchIcon size={22} color="var(--text)" />
      </button>

      {/* 遮罩 */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 'var(--z-modal)' }}
        />
      )}

      {/* 搜索面板 */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(120px + var(--safe-bottom))',
          right: 16,
          left: 16,
          maxWidth: 400,
          margin: '0 auto',
          background: 'var(--card-elevated)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 'var(--z-modal)',
          animation: 'scaleIn 0.25s cubic-bezier(0.25,0.1,0.25,1)',
          transformOrigin: 'bottom right',
        }}>
          {/* 搜索输入 */}
          <div style={{
            padding: 'var(--space-3) var(--space-4)',
            display: 'flex',
            gap: 'var(--space-2)',
            alignItems: 'center',
            borderBottom: '0.5px solid var(--border)',
          }}>
            <SearchIcon size={18} color="var(--text-muted)" />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="搜索区域、园区、产业类型..."
              className="form-field"
              style={{ flex: 1, background: 'transparent', border: 'none', boxShadow: 'none', padding: '8px 0' }}
            />
            <button onClick={handleVoiceInput} className="btn-ghost" style={{ width: 36, height: 36 }}>
              <MicIcon size={18} color={isListening ? 'var(--error)' : 'var(--text-secondary)'} />
            </button>
            <button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || loading}
              className="btn-ghost"
              style={{ width: 36, height: 36, opacity: input.trim() ? 1 : 0.4 }}
            >
              <SendIcon size={18} color="var(--primary)" />
            </button>
          </div>

          {/* 结果区 */}
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {loading && (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                <div className="skeleton" style={{ width: 40, height: 40, margin: '0 auto var(--space-2)', borderRadius: '50%' }} />
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>搜索中...</p>
              </div>
            )}

            {!loading && results.length > 0 && (
              <div style={{ padding: 'var(--space-2)' }}>
                {results.map((r, i) => (
                  <div
                    key={i}
                    onClick={() => handleClick(r.id)}
                    className="list-row"
                    style={{ borderRadius: 'var(--radius-md)', cursor: r.id ? 'pointer' : 'default' }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--text-md)', color: 'var(--text)' }}>
                        {r.name}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                        {r.region ? `${r.region} · ` : ''}{r.reason}
                      </div>
                    </div>
                    {r.rent_min > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 'var(--fw-bold)', color: 'var(--text)' }}>{Number(r.rent_min).toFixed(1)}</span>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}> 元/㎡/天</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 初始快捷词 */}
            {!loading && results.length === 0 && (
              <div style={{ padding: 'var(--space-4)' }}>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
                  试试这些搜索
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {['生物医药厂房', '智能制造园区', 'AI产业空间', '3000平米以上', '余杭区'].map(hint => (
                    <button
                      key={hint}
                      className="chip"
                      onClick={() => { setInput(hint); handleSubmit(hint); }}
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
