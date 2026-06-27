#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
全面测试园圈应用的所有修复和新功能
"""

import requests
import json
import time

BASE_URL = "http://localhost:3000"
API_URL = "http://localhost:3001"

def test_pages():
    """测试所有页面是否可访问"""
    print("\n=== 1. 测试页面可访问性 ===")
    pages = ["/", "/map", "/favorites", "/profile", "/login"]

    for page in pages:
        try:
            resp = requests.get(f"{BASE_URL}{page}", timeout=5)
            status = "✅" if resp.status_code == 200 else "❌"
            print(f"{status} {page} - HTTP {resp.status_code}")
        except Exception as e:
            print(f"❌ {page} - 错误: {e}")

def test_login_api():
    """测试登录API"""
    print("\n=== 2. 测试登录API ===")
    try:
        resp = requests.post(f"{API_URL}/api/auth/login", json={
            "phone": "admin",
            "password": "admin123"
        }, timeout=5)

        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                token = data["data"]["token"]
                user = data["data"]["user"]
                print(f"✅ 登录成功 - 用户: {user.get('name')}, 角色: {user.get('role')}")
                return token
            else:
                print(f"❌ 登录失败 - {data.get('message')}")
        else:
            print(f"❌ 登录API返回 HTTP {resp.status_code}")
    except Exception as e:
        print(f"❌ 登录API错误: {e}")
    return None

def test_recommendation_api(token):
    """测试AI推荐API"""
    print("\n=== 3. 测试AI推荐API ===")
    if not token:
        print("⚠️ 无有效token,跳过测试")
        return

    headers = {"Authorization": f"Bearer {token}"}

    # 测试基本推荐
    try:
        resp = requests.post(f"{API_URL}/api/recommend", json={
            "industry": "生物医药",
            "min_area": 2000,
            "max_area": 5000
        }, headers=headers, timeout=10)

        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                results = data.get("data", [])
                print(f"✅ 推荐API成功 - 返回 {len(results)} 套房源")
                if results:
                    print(f"   首套房源: {results[0].get('name')} (匹配度: {results[0].get('match_score'):.1%})")
            else:
                print(f"❌ 推荐API失败 - {data.get('message')}")
        else:
            print(f"❌ 推荐API返回 HTTP {resp.status_code}")
    except Exception as e:
        print(f"❌ 推荐API错误: {e}")

def test_html_rendering():
    """测试HTML渲染是否正确"""
    print("\n=== 4. 测试HTML渲染 ===")

    # 测试首页
    try:
        resp = requests.get(f"{BASE_URL}/", timeout=5)
        html = resp.text

        checks = [
            ("AI悬浮按钮", "AIFloatingWrapper" in html or "position:fixed;bottom:90px;right:20px" in html),
            ("BottomNav", "thumb-zone" in html),
            ("搜索框", "搜索区域、园区名" in html),
            ("产业筛选", "生物医药" in html and "智能制造" in html),
        ]

        for name, passed in checks:
            status = "✅" if passed else "❌"
            print(f"{status} 首页 - {name}")

    except Exception as e:
        print(f"❌ 首页渲染检查失败: {e}")

    # 测试收藏页
    try:
        resp = requests.get(f"{BASE_URL}/favorites", timeout=5)
        html = resp.text
        has_empty_state = "还没有收藏的房源" in html or "去看看房源" in html
        status = "✅" if has_empty_state else "❌"
        print(f"{status} 收藏页 - 空状态提示")
    except Exception as e:
        print(f"❌ 收藏页检查失败: {e}")

    # 测试地图页
    try:
        resp = requests.get(f"{BASE_URL}/map", timeout=5)
        html = resp.text
        has_map = "leaflet" in html.lower() or "地图找房" in html
        status = "✅" if has_map else "❌"
        print(f"{status} 地图页 - Leaflet集成")
    except Exception as e:
        print(f"❌ 地图页检查失败: {e}")

def test_api_endpoints(token):
    """测试其他API端点"""
    print("\n=== 5. 测试其他API端点 ===")

    headers = {"Authorization": f"Bearer {token}"} if token else {}

    endpoints = [
        ("房源列表", "GET", "/api/buildings", None),
        ("收藏列表", "GET", "/api/buildings/favorites", None),
        ("园区列表", "GET", "/api/parks", None),
    ]

    for name, method, path, data in endpoints:
        try:
            url = f"{API_URL}{path}"
            if method == "GET":
                resp = requests.get(url, headers=headers, timeout=5)
            else:
                resp = requests.post(url, json=data, headers=headers, timeout=5)

            if resp.status_code in [200, 401]:  # 401 is expected for protected routes without token
                status = "✅"
            else:
                status = "❌"
            print(f"{status} {name} - HTTP {resp.status_code}")
        except Exception as e:
            print(f"❌ {name} - 错误: {e}")

def main():
    print("=" * 60)
    print("园圈应用 - 全面功能测试")
    print("=" * 60)

    # 1. 测试页面
    test_pages()

    # 2. 测试登录
    token = test_login_api()

    # 3. 测试推荐API
    test_recommendation_api(token)

    # 4. 测试HTML渲染
    test_html_rendering()

    # 5. 测试其他API
    test_api_endpoints(token)

    print("\n" + "=" * 60)
    print("测试完成！")
    print("=" * 60)
    print("\n📱 访问地址:")
    print(f"   前端: {BASE_URL}")
    print(f"   后端API: {API_URL}/api")
    print("\n💡 手动测试建议:")
    print("   1. 点击右下角AI悬浮按钮,测试语音/文字推荐")
    print("   2. 在地图页查看Leaflet地图渲染")
    print("   3. 在收藏页查看空状态提示")
    print("   4. 在个人页查看返回按钮与头像是否重叠")
    print("   5. 验证BottomNav固定在底部不随滚动")

if __name__ == "__main__":
    main()
