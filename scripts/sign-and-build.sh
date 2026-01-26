#!/bin/bash

# Auto-Claude macOS Code Signing & Build Script
# 用法: ./scripts/sign-and-build.sh [--skip-notarize]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

# 检查是否跳过公证
SKIP_NOTARIZE=false
if [[ "$1" == "--skip-notarize" ]]; then
    SKIP_NOTARIZE=true
    print_warning "将跳过公证步骤"
fi

# 切换到 frontend 目录
cd "$(dirname "$0")/.."

print_info "开始 Auto-Claude macOS 签名构建流程..."
echo ""

# 1. 检查证书
print_info "步骤 1/6: 检查代码签名证书..."
IDENTITIES=$(security find-identity -v -p codesigning | grep "Developer ID Application" | wc -l)

if [ "$IDENTITIES" -eq 0 ]; then
    print_error "未找到有效的 Developer ID Application 证书"
    echo ""
    echo "请按照以下步骤获取证书:"
    echo "1. 打开 Xcode > Preferences > Accounts"
    echo "2. 添加你的 Apple ID"
    echo "3. Manage Certificates > + > Developer ID Application"
    echo ""
    echo "或者访问: https://developer.apple.com/account/resources/certificates"
    exit 1
fi

print_success "找到 $IDENTITIES 个有效的签名证书"
security find-identity -v -p codesigning | grep "Developer ID Application"
echo ""

# 2. 加载环境变量
print_info "步骤 2/6: 加载环境变量..."

if [ -f ".env.local" ]; then
    print_success "找到 .env.local 文件"
    source .env.local
elif [ -f ".env" ]; then
    print_success "找到 .env 文件"
    source .env
else
    print_warning "未找到 .env.local 或 .env 文件"
fi

# 3. 验证公证所需的环境变量
if [ "$SKIP_NOTARIZE" = false ]; then
    print_info "步骤 3/6: 验证公证配置..."

    MISSING_VARS=()

    if [ -z "$APPLE_ID" ]; then
        MISSING_VARS+=("APPLE_ID")
    fi

    if [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ]; then
        MISSING_VARS+=("APPLE_APP_SPECIFIC_PASSWORD")
    fi

    if [ -z "$APPLE_TEAM_ID" ]; then
        MISSING_VARS+=("APPLE_TEAM_ID")
    fi

    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        print_error "缺少以下环境变量: ${MISSING_VARS[*]}"
        echo ""
        echo "请创建 .env.local 文件并设置:"
        echo "  APPLE_ID=your-apple-id@example.com"
        echo "  APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx"
        echo "  APPLE_TEAM_ID=YOUR_TEAM_ID"
        echo ""
        echo "或者使用 --skip-notarize 跳过公证 (仅用于测试)"
        exit 1
    fi

    print_success "公证配置验证通过"
    echo "  Apple ID: $APPLE_ID"
    echo "  Team ID: $APPLE_TEAM_ID"
else
    print_info "步骤 3/6: 跳过公证配置验证"
    export CSC_IDENTITY_AUTO_DISCOVERY=false
fi
echo ""

# 4. 下载 Python 运行时
print_info "步骤 4/6: 下载 Python 运行时..."
npm run python:download
print_success "Python 运行时准备完成"
echo ""

# 5. 构建应用
print_info "步骤 5/6: 构建 Electron 应用..."
npm run build
print_success "应用构建完成"
echo ""

# 6. 打包和签名
print_info "步骤 6/6: 打包、签名和公证..."

if [ "$SKIP_NOTARIZE" = true ]; then
    print_warning "跳过公证，仅进行代码签名"
    electron-builder --mac --publish never
else
    print_info "开始代码签名和公证流程 能需要几分钟)..."
    electron-builder --mac --publish never
fi

print_success "打包完成"
echo ""

# 显示输出文件
print_success "构建产物:"
ls -lh dist/*.dmg dist/*.zip 2>/dev/null || true
echo ""

# 验证签名
print_info "验证代码签名..."
APP_PATH=$(find dist -name "Auto-Claude.app" -type d | head -1)

if [ -n "$APP_PATH" ]; then
    codesign -dv --verbose=4 "$APP_PATH" 2>&1 | grep -E "(Authority|TeamIdentifier|Identifier)"
    echo ""

    if [ "$SKIP_NOTARIZE" = false ]; then
        print_info "验证公证状态..."
        spctl -a -vv -t install "$APP_PATH" 2>&1 || print_warning "公证验证失败 (可能需要等待 Apple 处理)"
    fi
fi

echo ""
print_success "✨ 构建流程完成!
echo ""
echo "安装包位置: dist/"
echo ""

if [ "$SKIP_NOTARIZE" = true ]; then
    print_warning "注意: 此构建未经公证，在其他 Mac 上可能被 Gatekeeper 阻止"
    echo "要进行完整签名和公证，请配置环境变量后重新运行"
fi
