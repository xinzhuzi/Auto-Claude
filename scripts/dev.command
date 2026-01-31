#!/bin/bash
# Auto-Claude Dev Mode Launcher
# 双击此文件启动 Auto-Claude 开发模式（支持热更新）

cd "$(dirname "$0")/../apps/frontend"
echo "🚀 启动 Auto-Claude Dev 模式（热更新已启用）..."
echo "📁 工作目录: $(pwd)"
echo ""
echo "💡 修改代码后会自动刷新"
echo "按 Ctrl+C 停止应用"
echo "----------------------------------------"
echo ""

# 使用 npm 启动 dev 模式（electron-vite 内置 HMR）
npm run dev

# 如果应用退出，保持终端打开
echo ""
echo "----------------------------------------"
echo "应用已退出。按回车键关闭此窗口..."
read
