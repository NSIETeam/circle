'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getConversation, sendMessage, markRead, simulateReply, getCurrentUser, type ChatMessage } from '../lib/chat-store';
import { IKEA, FONT } from '../lib/ikea-style';

interface ChatPanelProps {
  otherId: string;
  otherName: string;
  onBack: () => void;
}

export function ChatPanel({ otherId, otherName, onBack }: ChatPanelProps) {
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const me = getCurrentUser();

  useEffect(() => {
    setMsgs(getConversation(otherId));
    markRead(otherId);
  }, [otherId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(otherId, otherName, input);
    setInput('');
    setMsgs(getConversation(otherId));
    // 模拟对方回复
    setTimeout(() => {
      const replies = ['好的，收到', '我这边确认一下', '稍等，帮您核实', '没问题，可以安排', '具体细节我们电话沟通？', '这个房源还有，欢迎带看'];
      simulateReply(otherId, otherName, me?.role === 'agent' ? 'park' : 'agent', replies[Math.floor(Math.random() * replies.length)]);
      setMsgs(getConversation(otherId));
    }, 1200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: IKEA.bg, fontFamily: FONT }}>
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#fff', borderBottom: `1px solid ${IKEA.border}`, flexShrink: 0 }}>
        <button onClick={onBack} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: IKEA.blueLight, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={IKEA.blue} strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: IKEA.text }}>{otherName}</span>
      </div>
      {/* 消息区 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {msgs.length === 0 && <div style={{ textAlign: 'center', color: IKEA.textMuted, fontSize: 14, marginTop: 40 }}>开始和 {otherName} 私聊吧</div>}
        {msgs.map(m => {
          const mine = m.from === me?.id;
          return (
            <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
              <div style={{ background: mine ? IKEA.blue : '#fff', color: mine ? '#fff' : IKEA.text, padding: '10px 14px', borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px', fontSize: 14, lineHeight: 1.5, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', wordBreak: 'break-word' }}>{m.text}</div>
              <div style={{ fontSize: 10, color: IKEA.textMuted, marginTop: 2, textAlign: mine ? 'right' : 'left' }}>{new Date(m.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {/* 输入栏 */}
      <div style={{ display: 'flex', gap: 8, padding: 12, background: '#fff', borderTop: `1px solid ${IKEA.border}`, flexShrink: 0 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="输入消息..." style={{ flex: 1, height: 40, padding: '0 14px', border: `1px solid ${IKEA.border}`, borderRadius: 20, fontSize: 14, outline: 'none', fontFamily: FONT }} />
        <button onClick={handleSend} disabled={!input.trim()} style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: input.trim() ? IKEA.blue : '#ccc', color: '#fff', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
        </button>
      </div>
    </div>
  );
}
