# AI 风控 Agent
# 独立部署，负责IM内容扫描和飞单检测

import asyncio
import json
import os
import re
from datetime import datetime

# 飞单关键词库
RISK_KEYWORDS = [
    '微信', '电话', '手机号', '手机号码', '加我', '加微信',
    '私下', '绕过', '直接找', '私聊', '私信',
    '电话号码', '联系电话', '打我电话', 'call me',
]

# 安全关键词（正常业务沟通）
SAFE_PATTERNS = [
    r'层高', r'承重', r'面积', r'租金', r'单价',
    r'环评', r'政策', r'配套', r'入驻', r'园区',
    r'预约', r'带看', r'时间', r'地址', r'位置',
    r'价格', r'优惠', r'补贴', r'税收',
]

class RiskAgent:
    def __init__(self):
        self.warning_count = {}

    async def scan_message(self, content: str, user_id: str) -> dict:
        """
        扫描IM消息，返回风控结果

        Args:
            content: 消息内容
            user_id: 发送者ID

        Returns:
            {
                "allow_send": bool,
                "risk_level": "safe" | "warn" | "block",
                "matched_keyword": str | None,
                "reason": str | None,
                "suggested_reply": str | None
            }
        """
        # 检查安全模式（正常业务沟通不受影响）
        for pattern in SAFE_PATTERNS:
            if re.search(pattern, content):
                return {
                    "allow_send": True,
                    "risk_level": "safe",
                    "matched_keyword": None,
                    "reason": None,
                    "suggested_reply": None
                }

        # 检查风险关键词
        for keyword in RISK_KEYWORDS:
            if keyword in content:
                # 记录警告次数
                self.warning_count[user_id] = self.warning_count.get(user_id, 0) + 1
                warnings = self.warning_count[user_id]

                if warnings >= 3:
                    return {
                        "allow_send": False,
                        "risk_level": "block",
                        "matched_keyword": keyword,
                        "reason": f"多次飞单违规（{warnings}次），对话已冻结",
                        "suggested_reply": "您的账号因多次违规已被冻结，请联系平台运营处理。"
                    }
                elif warnings >= 1:
                    return {
                        "allow_send": False,
                        "risk_level": "warn",
                        "matched_keyword": keyword,
                        "reason": f"检测到飞单风险关键词: '{keyword}'（第{warnings}次警告）",
                        "suggested_reply": "平台保障您的带看记录和佣金安全，请勿私下联系。请通过平台完成沟通。"
                    }

        return {
            "allow_send": True,
            "risk_level": "safe",
            "matched_keyword": None,
            "reason": None,
            "suggested_reply": None
        }

    async def scan_image_text(self, text: str) -> dict:
        """扫描图片中的文字（OCR结果）"""
        return await self.scan_message(text, "image_scan")

    def get_risk_keywords(self) -> list:
        """获取当前关键词库"""
        return RISK_KEYWORDS

    def update_keywords(self, keywords: list):
        """更新关键词库（支持动态配置）"""
        global RISK_KEYWORDS
        RISK_KEYWORDS = keywords


# 独立运行入口
async def main():
    agent = RiskAgent()
    print(f"[{datetime.now().isoformat()}] Risk Agent started")
    print(f"Keywords: {RISK_KEYWORDS}")

    # 简单测试
    test_cases = [
        ("这个园区层高6米，承重5吨", "user_1"),      # 安全
        ("加我微信聊吧 13800138000", "user_2"),       # 风险
        ("方便给个电话吗？", "user_2"),               # 风险（第二次）
        ("咱们私下联系", "user_2"),                   # 风险（第三次→冻结）
    ]

    for content, uid in test_cases:
        result = await agent.scan_message(content, uid)
        print(f"\nMessage: '{content}'")
        print(f"Result: {json.dumps(result, ensure_ascii=False, indent=2)}")

if __name__ == "__main__":
    asyncio.run(main())
