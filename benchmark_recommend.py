#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI推荐系统性能压测工具
- 多维度测试（产业/面积/租金/层高/承重/电力）
- 冷启动 vs 缓存命中
- 并发压测
- P50/P95/P99统计
- QPS计算
"""

import requests
import time
import json
import threading
from collections import defaultdict
from statistics import mean, median, stdev

API_URL = "http://localhost:3001"

# 测试账号
LOGIN_DATA = {"phone": "admin", "password": "admin123"}

# 测试用例设计
TEST_CASES = [
    {
        "name": "纯产业匹配 (AI)",
        "params": {"industry": "AI"},
        "expected_min": 1
    },
    {
        "name": "生物医药 + 大面积",
        "params": {"industry": "生物医药", "min_area": 2000, "max_area": 8000},
        "expected_min": 1
    },
    {
        "name": "智能制造 + 高承重",
        "params": {"industry": "智能制造", "min_load": 5, "max_area": 15000},
        "expected_min": 1
    },
    {
        "name": "集成电路 + 小面积",
        "params": {"industry": "集成电路", "max_area": 3000, "max_rent": 6},
        "expected_min": 1
    },
    {
        "name": "航空航天 + 超大面积 + 高电力",
        "params": {"industry": "航空航天", "min_area": 5000, "min_power": 4000},
        "expected_min": 0
    },
    {
        "name": "新材料 + 中等参数",
        "params": {"industry": "新材料", "min_area": 1000, "max_area": 8000, "max_rent": 5},
        "expected_min": 1
    },
    {
        "name": "电子信息 + 低租金",
        "params": {"industry": "电子信息", "max_rent": 4, "min_height": 4},
        "expected_min": 1
    },
    {
        "name": "医疗器械 + 中面积",
        "params": {"industry": "医疗器械", "min_area": 600, "max_area": 4000},
        "expected_min": 1
    },
    {
        "name": "组合条件 (多筛选)",
        "params": {
            "industry": "AI",
            "min_area": 800,
            "max_area": 5000,
            "max_rent": 5,
            "min_height": 4.5,
            "min_power": 1000
        },
        "expected_min": 1
    },
    {
        "name": "极端条件 (几乎无匹配)",
        "params": {
            "industry": "食品加工",
            "min_area": 50000,
            "max_rent": 1,
            "min_power": 99999
        },
        "expected_min": 0
    },
]

class Benchmarker:
    def __init__(self):
        self.token = None
        self.results = defaultdict(list)

    def login(self):
        """登录获取token"""
        print("=" * 70)
        print("  🚀 AI推荐系统性能压测")
        print("=" * 70)

        try:
            resp = requests.post(f"{API_URL}/api/auth/login", json=LOGIN_DATA, timeout=5)
            data = resp.json()
            if data.get("success"):
                self.token = data["data"]["token"]
                print(f"\n✅ 登录成功: {data['data']['user']['name']}")
                return True
        except Exception as e:
            print(f"❌ 登录失败: {e}")
        return False

    def run_single_test(self, test_case):
        """执行单个测试用例"""
        name = test_case["name"]
        params = test_case["params"]

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        # 冷启动测试
        t0 = time.perf_counter()
        try:
            resp = requests.post(
                f"{API_URL}/api/recommend/match",
                json=params,
                headers=headers,
                timeout=10
            )
            t1 = time.perf_counter()
            cold_time = (t1 - t0) * 1000

            if resp.status_code == 200:
                data = resp.json()
                result_count = data.get("total", 0)
                cached = data.get("cached", False)

                self.results[name].append({
                    "cold_time": cold_time,
                    "cached_time": None,
                    "result_count": result_count,
                    "cached": cached
                })

                # 缓存命中测试
                t2 = time.perf_counter()
                resp2 = requests.post(
                    f"{API_URL}/api/recommend/match",
                    json=params,
                    headers=headers,
                    timeout=10
                )
                t3 = time.perf_counter()
                cached_time = (t3 - t2) * 1000

                self.results[name][-1]["cached_time"] = cached_time

                return True, result_count
            else:
                return False, 0

        except Exception as e:
            print(f"  ❌ {name}: {e}")
            return False, 0

    def run_concurrent_test(self, test_case, concurrent=10):
        """并发测试"""
        name = f"{test_case['name']} (并发{concurrent})"
        params = test_case["params"]
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        results = []
        lock = threading.Lock()

        def worker():
            t0 = time.perf_counter()
            try:
                resp = requests.post(
                    f"{API_URL}/api/recommend/match",
                    json=params,
                    headers=headers,
                    timeout=10
                )
                t1 = time.perf_counter()
                with lock:
                    results.append((t1 - t0) * 1000)
            except:
                with lock:
                    results.append(None)

        threads = [threading.Thread(target=worker) for _ in range(concurrent)]

        t_start = time.perf_counter()
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        t_end = time.perf_counter()

        success_results = [r for r in results if r is not None]
        total_time = (t_end - t_start) * 1000

        self.results[name] = [{
            "concurrent": concurrent,
            "success_count": len(success_results),
            "total_time": total_time,
            "avg_time": mean(success_results) if success_results else 0,
            "qps": len(success_results) / (total_time / 1000) if total_time > 0 else 0
        }]

        return len(success_results), total_time

    def print_statistics(self):
        """打印统计报告"""
        print("\n" + "=" * 70)
        print("  📊 性能统计报告")
        print("=" * 70)

        # 单用例统计
        print("\n[单请求性能]")
        print(f"{'测试用例':<25} {'冷启动':>8} {'缓存':>8} {'结果数':>6}")
        print("-" * 70)

        cold_times = []
        cached_times = []

        for name, results in self.results.items():
            if "并发" in name:
                continue

            if not results:
                continue

            cold_time = results[0].get("cold_time", 0)
            cached_time = results[0].get("cached_time")
            result_count = results[0].get("result_count", 0)

            cold_times.append(cold_time)
            if cached_time is not None:
                cached_times.append(cached_time)

            cached_str = f"{cached_time:.1f}ms" if cached_time is not None else "N/A"
            print(f"{name:<25} {cold_time:>7.1f}ms {cached_str:>8} {result_count:>6}套")

        # 总体统计
        if cold_times:
            print("\n[冷启动统计]")
            print(f"  平均: {mean(cold_times):.1f}ms")
            print(f"  最小: {min(cold_times):.1f}ms")
            print(f"  最大: {max(cold_times):.1f}ms")
            if len(cold_times) > 1:
                print(f"  标准差: {stdev(cold_times):.1f}ms")
            sorted_cold = sorted(cold_times)
            p95_idx = int(len(sorted_cold) * 0.95)
            p99_idx = int(len(sorted_cold) * 0.99)
            print(f"  P95: {sorted_cold[min(p95_idx, len(sorted_cold)-1)]:.1f}ms")
            print(f"  P99: {sorted_cold[min(p99_idx, len(sorted_cold)-1)]:.1f}ms")

        if cached_times:
            print("\n[缓存命中统计]")
            print(f"  平均: {mean(cached_times):.1f}ms")
            print(f"  最小: {min(cached_times):.1f}ms")
            print(f"  最大: {max(cached_times):.1f}ms")
            if len(cached_times) > 1:
                print(f"  标准差: {stdev(cached_times):.1f}ms")
            speedup = mean(cold_times) / mean(cached_times) if cached_times else 0
            print(f"  加速比: {speedup:.1f}x")

        # 并发统计
        print("\n[并发测试统计]")
        print(f"{'测试用例':<35} {'并发数':>6} {'成功率':>8} {'平均':>8} {'总耗时':>8} {'QPS':>8}")
        print("-" * 70)

        for name, results in self.results.items():
            if "并发" not in name or not results:
                continue

            r = results[0]
            success_rate = r["success_count"] / r["concurrent"] * 100
            print(f"{name:<35} {r['concurrent']:>6} {success_rate:>7.0f}% {r['avg_time']:>7.1f}ms {r['total_time']:>7.0f}ms {r['qps']:>7.1f}")

        print("\n" + "=" * 70)

        # 性能评级
        avg_cold = mean(cold_times) if cold_times else 999
        avg_cached = mean(cached_times) if cached_times else 999

        print("\n[性能评级]")
        if avg_cold < 50:
            print("  🟢 冷启动性能: 优秀 (<50ms)")
        elif avg_cold < 100:
            print("  🟡 冷启动性能: 良好 (50-100ms)")
        else:
            print("  🔴 冷启动性能: 需优化 (>100ms)")

        if avg_cached < 5:
            print("  🟢 缓存性能: 优秀 (<5ms)")
        elif avg_cached < 10:
            print("  🟡 缓存性能: 良好 (5-10ms)")
        else:
            print("  🔴 缓存性能: 需优化 (>10ms)")

        print("=" * 70)

def main():
    bench = Benchmarker()

    if not bench.login():
        print("❌ 无法登录，退出")
        return

    # 1. 单请求测试
    print("\n[阶段1] 单请求测试")
    print("-" * 70)

    for i, test in enumerate(TEST_CASES, 1):
        print(f"\n{i}. {test['name']}")
        success, count = bench.run_single_test(test)
        if success:
            print(f"   ✓ 匹配到 {count} 套房源")
        else:
            print(f"   ✗ 请求失败")
        time.sleep(0.2)  # 避免过快

    # 2. 并发测试
    print("\n[阶段2] 并发压测")
    print("-" * 70)

    # 选择第一个测试用例进行并发测试
    concurrent_test = TEST_CASES[0]

    for concurrent in [5, 10, 20]:
        print(f"\n并发数: {concurrent}")
        success_count, total_time = bench.run_concurrent_test(concurrent_test, concurrent)
        print(f"  成功: {success_count}/{concurrent} | 总耗时: {total_time:.0f}ms")
        time.sleep(0.5)  # 间隔

    # 3. 打印统计
    bench.print_statistics()

if __name__ == "__main__":
    main()
