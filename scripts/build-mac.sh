#!/bin/bash

# Auto-Claude 打包脚本
# 用于构建 macOS 安装包（跳过签名）

set -e

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/apps/frontend"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Auto-Claude 打包脚本"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "项目根目录: $PROJECT_ROOT"
echo "前端目录: $FRONTEND_DIR"
echo ""

# 切换到前端目录
cd "$FRONTEND_DIR"

# 检查环境
echo "步骤 1/4: 检查环境..."
echo "  当前目录: $(pwd)"
echo "  Node: $(node --version)"
echo "  npm: $(npm --version)"
echo ""

# 检查是否有签名证书
echo "步骤 2/4: 检查签名证书..."
CERT_COUNT=$(security find-identity -v -p codesigning 2>/dev/null | grep -c "Auto-Claude" || echo "0")

if [ "$CERT_COUNT" -gt 0 ]; then
    echo "  ✓ 找到签名证书，将进行代码签名"
    SIGN_FLAG=""
else
    echo "  ⚠ 未找到签名证书，跳过签名"
    export CSC_IDENTITY_AUTO_DISCOVERY=false
    SIGN_FLAG="（未签名）"
fi
echo ""

# 使用 package-with-python.cjs 进行完整打包
# 这个脚本会：
# 1. 下载 Python 运行时
# 2. 构建 Electron 应用
# 3. 正确处理 code-server 的 node_modules（修复符号链接问题）
# 4. 打包应用
echo "步骤 3/4: 打包应用 $SIGN_FLAG..."
echo "  使用 package-with-python.cjs 进行完整打包..."
echo ""
node scripts/package-with-python.cjs --mac
echo ""

# 显示结果
echo "步骤 4/4: 检查输出..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✓ 打包完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "输出文件:"
ls -lh dist/*.dmg dist/*.zip 2>/dev/null || echo "  未找到安装包文件"
echo ""

if [ "$CERT_COUNT" -eq 0 ]; then
    echo "⚠️  注意: 此应用未签名"
    echo "  - 在本机可以正常运行"
    echo "  - 在其他 Mac 上需要右键 > 打开"
    echo "  - 或运行: xattr -cr /path/to/Auto-Claude.app"
    echo ""
fi

echo "应用位置: dist/mac-arm64/Auto-Claude.app"
echo ""
