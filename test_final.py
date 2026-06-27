#!/usr/bin/env python3
"""园圈应用 - 全面功能测试 (修正版)"""
import requests, json

BASE = "http://localhost:3000"
API = "http://localhost:3001"

print("=" * 60)
print("  园圈应用 - 全面功能测试")
print("=" * 60)

# === 1. 页面可访问性 ===
print("\n[1] 页面可访问性")
for page in ["/", "/map", "/favorites", "/profile", "/login", "/register"]:
    try:
        r = requests.get(f"{BASE}{page}", timeout=5)
        print(f"  {'✅' if r.status_code == 200 else '❌'} {page} → {r.status_code}")
    except Exception as e:
        print(f"  ❌ {page} → {e}")

# === 2. 登录 ===
print("\n[2] 🔐 登录")
r = requests.post(f"{API}/api/auth/login", json={"phone":"admin","password":"admin123"}, timeout=5)
d = r.json()
token = d["data"]["token"]
user = d["data"]["user"]
print(f"  ✅ {user['name']} | 角色: {user['role']}")

h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# === 3. 推荐API V4 ===
print("\n[3] 🧠 推荐API V4")
import time
t0 = time.time()
r = requests.post(f"{API}/api/recommend/match", json={
    "industry": "AI", "min_area": 1000, "max_area": 5000, "max_rent": 4
}, headers=h, timeout=10)
t1 = time.time()
d = r.json()
print(f"  ⚡ 冷启动: {(t1-t0)*1000:.0f}ms | 结果: {d['total']}套 | 缓存: {d.get('cached')}")
for i, item in enumerate(d["data"][:3], 1):
    b = item["building"]
    print(f"    {i}. {b['name']} | Score: {item['score']}")

# 缓存命中
t0 = time.time()
r = requests.post(f"{API}/api/recommend/match", json={
    "industry": "AI", "min_area": 1000, "max_area": 5000, "max_rent": 4
}, headers=h, timeout=10)
t2 = time.time()
print(f"  🔄 缓存命中: {(t2-t0)*1000:.0f}ms (应<5ms)")

# === 4. 首页渲染检查 ===
print("\n[4] 🏠 首页渲染")
r = requests.get(f"{BASE}/", timeout=5)
html = r.text
checks = [
    ("AI悬浮圆圈按钮", "position:fixed" in html and "bottom:90px" in html and "right:20px" in html),
    ("底部导航栏", "thumb-zone" in html),
    ("搜索框", "搜索区域" in html),
    ("产业筛选标签", "生物医药" in html),
    ("SparklesIcon", "SparklesIcon" in html or "path d=\"M12 3l" in html),
]
for name, ok in checks:
    print(f"  {'✅' if ok else '❌'} {name}")

# === 5. 其他页面渲染 ===
print("\n[5] 📄 其他页面渲染")

# 地图页
r = requests.get(f"{BASE}/map", timeout=5)
html = r.text
print(f"  🗺️ /map → {r.status_code} (Leaflet客户端加载)")

# 收藏页
r = requests.get(f"{BASE}/favorites", timeout=5)
html = r.text
print(f"  ⭐ /favorites → {r.status_code} (需登录后渲染空状态)")

# 个人页
r = requests.get(f"{BASE}/profile", timeout=5)
html = r.text
print(f"  👤 /profile → {r.status_code} (返回按钮独立导航栏)")

# === 6. 后端API路由验证 ===
print("\n[6] 🔌 后端API路由验证")
routes = [
    ("GET", "/api/health", None),
    ("POST", "/api/auth/login", {"phone":"admin","password":"admin123"}),
    ("POST", "/api/recommend/match", {"industry":"AI"}),
    ("GET", "/api/buildings", None),
]
for method, path, body in routes:
    try:
        if method == "GET":
            r = requests.get(f"{API}{path}", headers=h, timeout=5)
        else:
            r = requests.post(f"{API}{path}", json=body, headers=h, timeout=5)
        ok = r.status_code in [200, 201]
        print(f"  {'✅' if ok else '❌'} {method} {path} → {r.status_code}")
    except Exception as e:
        print(f"  ❌ {method} {path} → {e}")

print("\n" + "=" * 60)
print("  ✅ 测试完成！")
print("=" * 60)
print("\n📱 前端: http://localhost:3000")
print("🔧 后端: http://localhost:3001")
print("\n💡 请在浏览器中手动验证:")
print("   1. 右下角AI圆圈悬浮按钮 → 点击展开语音/文字推荐面板")
print("   2. 底栏固定不随滚动 (position: fixed)")
print("   3. 个人页返回按钮与头像不再重叠")
print("   4. 收藏页显示空状态 (未收藏时不显示假数据)")
print("   5. 地图页加载Leaflet真实地图")
