/**
 * 北京地铁站坐标库 + 通勤计算
 */

// 主要地铁站坐标 (lat, lng)
export const BJ_SUBWAY: Record<string, [number, number]> = {
  '亦庄文化园': [39.7965, 116.5016], '亦庄桥': [39.8096, 116.4826], '亦庄线经海路': [39.7790, 116.5711],
  '西二旗': [40.0543, 116.2959], '生命科学园': [40.0770, 116.3088], '昌平西山口': [40.2250, 116.2150],
  '顺义': [40.1300, 116.6500], '后沙峪': [40.0850, 116.5500], '国展': [40.0950, 116.5800],
  '宋家庄': [39.8420, 116.4300], '小红门': [39.8380, 116.4600], '肖村': [39.8350, 116.4780],
  '大屯路东': [40.0120, 116.4120], '望京西': [39.9970, 116.4700], '奥林匹克公园': [40.0080, 116.3880],
  '西直门': [39.9410, 116.3550], '东直门': [39.9410, 116.4340], '国贸': [39.9085, 116.4580],
  '北京南站': [39.8650, 116.3780], '北京西站': [39.8950, 116.3220], '北京站': [39.9020, 116.4270],
  '海淀黄庄': [39.9810, 116.3200], '知春路': [39.9760, 116.3360], '上地': [40.0380, 116.3140],
  '立水桥': [40.0430, 116.4180], '天通苑': [40.0660, 116.4180], '回龙观': [40.0720, 116.3410],
  '十里堡': [39.9240, 116.5000], '青年路': [39.9180, 116.5380], '常营': [39.9240, 116.6000],
  '物资学院路': [39.9180, 116.6200], '通州北苑': [39.9050, 116.6500], '通州': [39.8900, 116.6600],
  '丰台科技园': [39.8180, 116.2900], '郭公庄': [39.8120, 116.2950], '大红门': [39.8380, 116.4100],
};

// 计算两点直线距离(km)
export function distKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dy = (lat1 - lat2) * 111;
  const dx = (lng1 - lng2) * 111 * Math.cos((lat1 + lat2) / 2 * Math.PI / 180);
  return Math.sqrt(dy * dy + dx * dx);
}

// 找最近的地铁站
export function nearestSubway(lat: number, lng: number): { name: string; dist: number } | null {
  let best: { name: string; dist: number } | null = null;
  for (const [name, [slat, slng]] of Object.entries(BJ_SUBWAY)) {
    const d = distKm(lat, lng, slat, slng);
    if (!best || d < best.dist) best = { name, dist: d };
  }
  return best;
}

// 估算通勤：驾车(40km/h) + 地铁步行+乘车(25km/h)
export function commuteEstimate(lat: number, lng: number, destLat?: number, destLng?: number): {
  nearest: { name: string; dist: string } | null;
  toCityCenter: string;   // 到市中心(国贸)驾车时长
  walking: string;        // 步行到地铁站
} {
  const ns = nearestSubway(lat, lng);
  const cityCenter = BJ_SUBWAY['国贸'];
  const toCenter = (destLat !== undefined && destLng !== undefined) ? distKm(lat, lng, destLat, destLng) : distKm(lat, lng, cityCenter[0], cityCenter[1]);
  const drivingMin = Math.round(toCenter / 40 * 60);
  return {
    nearest: ns ? { name: ns.name, dist: ns.dist < 1 ? `${Math.round(ns.dist * 1000)}米` : `${ns.dist.toFixed(1)}公里` } : null,
    toCityCenter: drivingMin < 1 ? '已近市中心' : `${drivingMin}分钟`,
    walking: ns ? (ns.dist < 1 ? `${Math.round(ns.dist * 1000 / 80 * 60) || 1}分钟` : `${Math.round(ns.dist / 5 * 60)}分钟`) : '—',
  };
}

// 模拟导航链接(高德)
export function navLink(lat: number, lng: number, name: string): string {
  return `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(name)}&coordinate=wgs84&callnative=1`;
}
