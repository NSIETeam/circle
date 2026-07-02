/**
 * 私聊数据层 — 经纪人 ⇄ 园区管理者
 * 基于 localStorage，两端共享会话存储
 */

export interface ChatMessage {
  id: string;
  from: string;      // 发送者 agentId
  fromName: string;
  fromRole: 'agent' | 'park';
  to: string;        // 接收者 agentId
  text: string;
  createdAt: string;
  read: boolean;
}

export interface Conversation {
  id: string;        // 较小id + '_' + 较大id
  participants: string[];
  lastMessage: string;
  lastAt: string;
  unread: number;    // 当前用户视角的未读
}

const MSG_KEY = 'chat_messages';
const ME_KEY = 'chat_current_user';

export function getCurrentUserId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(ME_KEY) || '';
}

export function setCurrentUserId(id: string, name: string, role: 'agent' | 'park') {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ME_KEY, JSON.stringify({ id, name, role }));
  }
}

export function getCurrentUser(): { id: string; name: string; role: 'agent' | 'park' } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(ME_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function getMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(MSG_KEY) || '[]'); } catch { return []; }
}

function saveMessages(msgs: ChatMessage[]) {
  if (typeof window !== 'undefined') localStorage.setItem(MSG_KEY, JSON.stringify(msgs));
}

function convId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

/** 发送消息 */
export function sendMessage(to: string, toName: string, text: string) {
  const me = getCurrentUser();
  if (!me || !text.trim()) return;
  const msgs = getMessages();
  const msg: ChatMessage = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    from: me.id, fromName: me.name, fromRole: me.role,
    to, text: text.trim(), createdAt: new Date().toISOString(), read: false,
  };
  msgs.push(msg);
  saveMessages(msgs);
  return msg;
}

/** 获取与某人的对话 */
export function getConversation(otherId: string): ChatMessage[] {
  const me = getCurrentUser();
  if (!me) return [];
  return getMessages().filter(m =>
    (m.from === me.id && m.to === otherId) || (m.from === otherId && m.to === me.id)
  ).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** 获取会话列表 */
export function getConversations(): Conversation[] {
  const me = getCurrentUser();
  if (!me) return [];
  const msgs = getMessages().filter(m => m.from === me.id || m.to === me.id);
  const map = new Map<string, Conversation>();
  msgs.forEach(m => {
    const otherId = m.from === me.id ? m.to : m.from;
    const otherName = m.from === me.id ? '' : m.fromName;
    const cid = convId(me.id, otherId);
    if (!map.has(cid)) {
      map.set(cid, { id: cid, participants: [me.id, otherId], lastMessage: '', lastAt: '', unread: 0 });
    }
    const c = map.get(cid)!;
    c.lastMessage = m.text;
    c.lastAt = m.createdAt;
    if (m.to === me.id && !m.read) c.unread++;
  });
  return Array.from(map.values()).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

/** 标记已读 */
export function markRead(otherId: string) {
  const me = getCurrentUser();
  if (!me) return;
  const msgs = getMessages();
  let changed = false;
  msgs.forEach(m => { if (m.to === me.id && m.from === otherId && !m.read) { m.read = true; changed = true; } });
  if (changed) saveMessages(msgs);
}

/** 模拟对方回复（演示用，实际应接后端） */
export function simulateReply(fromId: string, fromName: string, fromRole: 'agent' | 'park', text: string) {
  const me = getCurrentUser();
  if (!me) return;
  const msgs = getMessages();
  msgs.push({
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    from: fromId, fromName, fromRole,
    to: me.id, text, createdAt: new Date().toISOString(), read: false,
  });
  saveMessages(msgs);
}

/** 预设联系人（园区管理者列表） */
export const PARK_CONTACTS = [
  { id: 'park_001', name: '亦庄园区·李经理', park: '亦庄经济技术开发区' },
  { id: 'park_002', name: '生命科学园·王经理', park: '中关村生命科学园' },
  { id: 'park_003', name: '未来科学城·张经理', park: '未来科学城' },
  { id: 'park_004', name: '京南基地·赵经理', park: '京南智能制造基地' },
];

/** 预设经纪人列表 */
export const AGENT_CONTACTS = [
  { id: 'agt_demo_001', name: '张经纪' },
  { id: 'agt_demo_002', name: '李经纪' },
  { id: 'agt_demo_003', name: '王经纪' },
];
