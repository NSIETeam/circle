'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { api } from '../../../lib/api';
import {
  ChevronLeftIcon, ShareIcon, StarIcon, ChatIcon, CalendarIcon,
  FactoryIcon, LockIcon, PhoneIcon, RulerIcon, ZapIcon, ShieldIcon,
  LocationIcon, LayersIcon, CheckCircleIcon,
} from '../../../components/icons';

export default function BuildingDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const { user } = useAuth();
  const [building, setBuilding] = useState<any>(null);
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  useEffect(() => {
    // 从静态JSON读取数据（适配GitHub Pages）
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/data/buildings.json`)
      .then(r => r.json())
      .then((data: any[]) => {
        const found = data.find(b => String(b.id) === String(id));
        setBuilding(found || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleFavorite = async () => {
    const newFav = !favorited;
    setFavorited(newFav);
    showToast(newFav ? '已收藏' : '已取消收藏', 'success');
  };

  const handleConsult = async () => {
    setShowPhoneModal(true);
  };

  const handleBookVisit = async () => {
    if (!user) { window.location.href = '/login'; return; }
    try {
      await api.visits.create({
        building_id: id,
        visit_time: new Date(Date.now() + 86400000).toISOString(),
      });
      showToast('预约成功，园区确认中', 'success');
    } catch (err) {
      showToast('预约失败，请重试', 'error');
    }
  };

  const handleShare = async () => {
    if (!user) { window.location.href = '/login'; return; }
    try {
      const res = await api.share.create(id);
      if (navigator.share) {
        await navigator.share({
          title: building?.name || '园圈房源',
          text: `查看 ${building?.name} - ${building?.region}`,
          url: `${window.location.origin}/share/${res.data.short_code}`,
        });
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/share/${res.data.short_code}`);
        showToast('分享链接已复制', 'success');
      }
    } catch (err) {
      showToast('分享失败', 'error');
    }
  };

  const showToast = (message: string, type: string) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
      <div className="skeleton" style={{ width: 60, height: 60, margin: '0 auto 16px', borderRadius: 14 }} />
      <p>加载中...</p>
    </div>
  );
  if (!building) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--error)' }}>
      <p>房源不存在或加载失败</p>
      <a href="/" style={{ color: 'var(--primary)', fontSize: 14, marginTop: 12, display: 'inline-block' }}>返回首页</a>
    </div>
  );

  const tagClass = (tag: string) =>
    tag === 'AI' ? 'tag-ai' : tag === '生物医药' ? 'tag-bio' : tag === '智能制造' ? 'tag-manufacturing' : 'tag-default';

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Hero */}
      <div className="detail-hero">
        <FactoryIcon size={56} color="rgba(255,255,255,0.85)" />
        <a href="/" className="hero-btn" style={{ left: 16 }}>
          <ChevronLeftIcon size={20} color="#fff" />
        </a>
        <button onClick={handleShare} className="hero-btn" style={{ right: 16 }}>
          <ShareIcon size={18} color="#fff" />
        </button>
      </div>

      <div style={{ padding: 16 }}>
        {/* 园区信息 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, color: 'var(--text)' }}>{building.name}</h1>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <LocationIcon size={14} color="var(--text-muted)" />
              {building.park_name} · {building.region}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>评分</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
              <StarIcon size={14} color="var(--warning)" filled />
              <span style={{ color: 'var(--warning)', fontWeight: 700, fontSize: 15 }}>{Number(building.park_rating || 0).toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* 入驻信息 */}
        <div style={{
          fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'var(--primary-surface)', padding: '6px 12px', borderRadius: 8, width: 'fit-content',
        }}>
          <FactoryIcon size={14} color="var(--primary)" />
          已入驻 <strong style={{ color: 'var(--primary)' }}>{building.tenant_count || 0}</strong> 家企业
        </div>

        {/* 产业标签 */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {(building.industry_tags || []).map((tag: string) => (
            <span key={tag} className={`tag ${tagClass(tag)}`}>{tag}</span>
          ))}
        </div>

        {/* 核心参数 */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}>
            <RulerIcon size={16} color="var(--primary)" />
            核心参数
          </div>
          <div className="info-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <InfoItem label="总面积" value={`${Number(building.total_area).toLocaleString()} ㎡`} />
            <InfoItem label="层高" value={`${Number(building.floor_height)}m`} />
            <InfoItem label="承重" value={`${Number(building.floor_load)}T`} />
            <InfoItem
              label="电力"
              value={building.power_capacity ? `${building.power_capacity}KVA` : '咨询后解锁'}
              locked={!building._access?.power_detail}
              icon={<ZapIcon size={12} color="var(--warning)" />}
            />
          </div>
        </div>

        {/* 配套与政策 */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>园区配套</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(building.amenities || ['食堂', '班车', '宿舍']).map((a: string) => (
              <span key={a} style={{ fontSize: 12, padding: '5px 14px', background: 'var(--bg)', borderRadius: 20, color: 'var(--text-secondary)', fontWeight: 500 }}>
                {a}
              </span>
            ))}
          </div>
        </div>

        {/* 地址（信息分层） */}
        <div className={`card ${!building._access?.address ? 'locked-card' : ''}`} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}>
            <LocationIcon size={16} color="var(--primary)" />
            位置
          </div>
          {building._access?.address ? (
            <div style={{ fontSize: 14, color: 'var(--text)' }}>{building.address}</div>
          ) : (
            <div className="locked-hint">
              <LockIcon size={14} color="var(--warning)" />
              精确地址{building._unlock_hint_address || '需认证后可见'}
            </div>
          )}
        </div>

        {/* 平面图（信息分层） */}
        <div className={`card ${!building._access?.floor_plan ? 'locked-card' : ''}`} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}>
            <LayersIcon size={16} color="var(--primary)" />
            楼层平面图
          </div>
          {building._access?.floor_plan ? (
            <div style={{ height: 160, background: 'var(--bg)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <RulerIcon size={32} color="var(--text-muted)" />
            </div>
          ) : (
            <div className="locked-hint">
              <LockIcon size={14} color="var(--warning)" />
              收藏后解锁平面图
            </div>
          )}
        </div>

        {/* 环评（信息分层） */}
        <div className={`card ${!building._access?.env_assessment ? 'locked-card' : ''}`} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}>
            <ShieldIcon size={16} color="var(--primary)" />
            环评等级
          </div>
          {building._access?.env_assessment ? (
            <div style={{ fontSize: 14, color: 'var(--text)' }}>{building.env_assessment}</div>
          ) : (
            <div className="locked-hint">
              <LockIcon size={14} color="var(--warning)" />
              认证后可见
            </div>
          )}
        </div>
      </div>

      {/* 底部按钮（拇指热区） */}
      <div className="thumb-zone">
        <button onClick={handleFavorite} className="btn-ghost">
          <StarIcon size={22} color={favorited ? 'var(--warning)' : 'var(--text-muted)'} filled={favorited} />
        </button>
        <button className="btn-secondary" onClick={handleBookVisit}>
          <CalendarIcon size={18} color="var(--primary)" />
          预约带看
        </button>
        <button className="btn-primary" onClick={handleConsult}>
          <ChatIcon size={18} color="#fff" />
          平台IM联系
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' && <CheckCircleIcon size={16} color="#fff" />}
          {toast.message}
        </div>
      )}

      {/* IM 联系弹窗 */}
      {showPhoneModal && (
        <div className="modal-overlay" onClick={() => setShowPhoneModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PhoneIcon size={18} color="var(--primary)" />
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>平台IM联系</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
              园区招商电话仅通过平台IM转接，平台保障您的佣金安全。
            </div>
            <div style={{
              padding: 14, background: 'var(--primary-surface)', borderRadius: 10, marginBottom: 16,
              textAlign: 'center', fontSize: 14, color: 'var(--primary)', fontWeight: 600,
            }}>
              <ChatIcon size={16} color="var(--primary)" />
              {' '}
              联系园区「{building?.park_name || building.name}」
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowPhoneModal(false)} className="btn-secondary" style={{ flex: 1 }}>
                取消
              </button>
              <button className="btn-primary" style={{ flex: 2 }}
                onClick={() => { setShowPhoneModal(false); showToast('已发送咨询，等待园区回复', 'success'); }}>
                发送咨询
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value, locked, icon }: { label: string; value: string; locked?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="info-item">
      <span className="info-label">{label}</span>
      <span className="info-value" style={{
        color: locked ? 'var(--warning)' : 'var(--text)',
        fontSize: locked ? 12 : 14,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {locked && (icon || <LockIcon size={12} color="var(--warning)" />)}
        {value}
      </span>
    </div>
  );
}
