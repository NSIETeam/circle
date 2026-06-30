'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import BottomNav from '../../components/BottomNav';

// 动态导入地图组件，避免SSR问题
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
);

// 修复 Leaflet 默认图标在 Next.js 中路径错误（延迟到客户端执行）
// 在 useEffect 中处理，避免 SSR 报错

interface Building {
  id: string;
  name: string;
  park_name: string;
  region: string;
  latitude?: number;
  longitude?: number;
  rent_min: number;
  rent_max: number;
  industry_tags: string[];
  images: string[];
}

export default function MapPage() {
  const router = useRouter();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // 修复 Leaflet 默认图标路径
    import('leaflet').then((L) => {
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    });
  }, []);

  useEffect(() => {
    // 获取所有房源数据（无需登录也可查看地图）
    api.buildings.search({ page_size: '100' }).then(res => {
      // 过滤有坐标的房源
      const withCoords = res.data.filter((b: any) => b.latitude && b.longitude);
      setBuildings(withCoords);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
      <div className="skeleton" style={{ width: 60, height: 60, margin: '0 auto 16px', borderRadius: 14 }} />
      <p>加载地图数据...</p>
    </div>
  );

  // 默认中心点（北京）
  const defaultCenter: [number, number] = [39.9042, 116.4074];
  const hasBuildings = buildings.length > 0;
  const mapCenter = hasBuildings && buildings[0].latitude && buildings[0].longitude
    ? [buildings[0].latitude, buildings[0].longitude] as [number, number]
    : defaultCenter;

  return (
    <div style={{ paddingBottom: 90, background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{
        padding: '16px', display: 'flex', alignItems: 'center',
        borderBottom: '1px solid var(--border)', background: 'var(--card)',
      }}>
        <button onClick={() => { window.location.href = process.env.NEXT_PUBLIC_BASE_PATH || '/'; }} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'var(--fill-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontWeight: 600, fontSize: 16 }}>地图找房</span>
        <div style={{ width: 32 }} />
      </div>

      <div style={{ height: 'calc(100vh - 200px)', minHeight: 400 }}>
        {isClient && (
          <>
            <MapContainer
              center={mapCenter}
              zoom={hasBuildings ? 12 : 10}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
          subdomains={['1','2','3','4']}
              />
              {buildings.map(building => (
                building.latitude && building.longitude && (
                  <Marker
                    key={building.id}
                    position={[building.latitude, building.longitude]}
                  >
                    <Popup>
                      <div style={{ minWidth: 200 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                          {building.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          {building.region} · {building.park_name}
                        </div>
                        <div style={{ color: 'var(--primary)', fontWeight: 700, marginBottom: 8 }}>
                          {Number(building.rent_min).toFixed(1)}-{Number(building.rent_max).toFixed(1)} 元/㎡/天
                        </div>
                        <button
                          onClick={() => router.push(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/buildings/${building.id}`)}
                          className="btn-primary"
                          style={{ width: '100%', padding: '8px', fontSize: 13 }}
                        >
                          查看详情
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}
            </MapContainer>
          </>
        )}
      </div>

      {buildings.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--card)',
          padding: '24px',
          borderRadius: 14,
          boxShadow: 'var(--shadow-lg)',
          textAlign: 'center',
          maxWidth: 300,
        }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
            暂无带坐标的房源数据
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            请在后台为房源添加经纬度坐标
          </p>
        </div>
      )}

      <BottomNav active="map" />
    </div>
  );
}
