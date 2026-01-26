#!/bin/bash

# Auto-Claude Code Signing Configuration Checker
# 检查签名配置是否完整

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_check() {
    echo -e "${BLUE}▸${NC} $1"
}

print_success() {
    echo -e "  ${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "  ${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "  ${RED}✗${NC} $1"
}

cd "$(dirname "$0")/.."

echo ""
print_header "Auto-Claude macOS 签名配置检查"
echo ""

# 检查计数
TOTAL_CHECKS=0
PASSED_CHECKS=0
WARNINGS=0

# 1. 检查证书
print_check "检查代码签名证书..."
IDENTITIES=$(security find-identity -v -p codesigning 2>/dev/null | grep "Developer ID Application" || true)

if [ -n "$IDENTITIES" ]; then
    COUNT=$(echo "$IDENTITIES" | wc -l | tr -d ' ')
    print_success "找到 $COUNT 个有效证书"
    echo "$IDENTITIES" | sed 's/^/    /'
    ((PASSED_CHECKS++))
else
    print_error "未找到 Developer ID Application 证书"
    echo ""
    echo "    获取证书的方法:"
    echo "    1. Xcode > Preferences > Accounts > Manage Certificates"
    echo "    2. 或访问 https://developer.apple.com/account/resources/certificates"
fi
((TOTAL_CHECKS++))
echo ""

# 2. 检查 Xcode Command Line Tools
print_check "检查 Xcode Command Line Tools..."
if xcode-select -p &>/dev/null; then
    XCODE_PATH=$(xcode-select -p)
    print_success "已安装: $XCODE_PATH"
    ((PASSED_CHECKS++))
else
    print_error "未安装 Xcode Command Line Tools"
    echo "    运行: xcode-select --install"
fi
((TOTAL_CHECKS++))
echo ""

# 3. 检查环境变量文件
print_check "检查环境变量配置..."
ENV_FILE=""
if [ -f ".env.local" ]; then
    ENV_FILE=".env.al"
    print_success "找到 .env.local"
elif [ -f ".env" ]; then
    ENV_FILE=".env"
    print_success "找到 .env"
else
    print_warning "未找到 .env.local 或 .env 文件"
    echo "    建议: cp .env.signing.example .env.local"
    ((WARNINGS++))
fi
((TOTAL_CHECKS++))
echo ""

# 4. 检查环境变量内容
if [ -n "$ENV_FILE" ]; then
    print_check "检查环境变量内容..."
    source "$ENV_FILE" 2>/dev/null || true

    ENV_CHECKS=0
    ENV_PASSED=0

    # APPLE_ID
    if [ -n "$APPLE_ID" ]; then
        print_success "APPLE_ID: $APPLE_ID"
        ((ENV_PASSED++))
    else
        print_warning "APPLE_ID 未设置"
    fi
    ((ENV_CHECKS++))

    # APPLE_APP_SPECIFIC_PASSWORD
    if [ -n "$APPLE_APP_SPECIFIC_PASSWORD" ]; then
        MASKED_PWD=$(echo "$APPLE_APP_SPECIFIC_PASSWORD" | sed 's/./*/g')
        print_success "APPLE_APP_SPECIFIC_PASSWORD: $MASKED_PWD"
        ((ENV_PASSED++))
    else
        print_warning "APPLE_APP_SPECIFIC_PASSWORD 未设置"
        echo "    获取方法: https://appleid.apple.com/account/manage"
    fi
    ((ENV_CHECKS++))

    # APPLE_TEAM_ID
    if [ -n "$APPLE_TEAM_ID" ]; then
        print_success "APPLE_TEAM_ID: $APPLE_TEAM_ID"
        ((ENV_PASSED++))
    else
        print_warning "APPLE_TEAM_ID 未设置"
        echo "    查看方法: https://developer.apple.com/account > Membership"
    fi
    ((ENV_CHECKS++))

    if [ $ENV_PASSED -eq $ENV_CHECKS ]; then
        ((PASSED_CHECKS++))
    else
        print_warning "环境变量配置不完整 ($ENV_PASSED/$ENV_CHECKS)"
        ((WARNINGS++))
    fi
    ((TOTAL_CHECKS++))
    echo ""
fi

# 5. 检查 entitlements 文件
print_check "检查权限配置文件..."
if [ -f "resources/entitlements.mac.plist" ]; then
    print_success "entitlements.mac.plist 存在"
    ((PASSED_CHECKS++))
else
    print_error "entitlements.mac.plist 不存在"
fi
((TOTAL_CHECKS++))
echo ""

# 6. 检查 package.json 配置
print_check "检查 package.json 签名配置..."
if grep -q '"hardenedRuntime": true' package.json; then
    print_success "hardenedRuntime 已启用"
fi

if grep -q '"notarize"' package.json; then
    print_success "notarize 配置已添加"
fi

if grep -q '"entitlements"' package.json; then
    print_success "entitlements 配置正确"
fi
((PASSED_CHECKS++))
((TOTAL_CHECKS++))
echo ""

# 7. 检查 Python 运行时
print_check "检查 Python 运行时..."
if [ -d "python-runtime" ]; then
    PLATFORMS=$(ls -d python-runtime/*/* 2>/dev/null | wc -l | tr -d ' ')
    if [ "$PLATFORMS" -gt 0 ]; then
        print_success "Python 运行时已下载 ($PLATFORMS 个平台)"
        ((PASSED_CHECKS++))
    else
        print_warning "Python 运行时目录为空"
        echo "    运行: npm run python:download"
        ((WARNINGS++))
    fi
else
    print_warning "Python 运行时未下载"
    echo "    运行: npm run python:download"
    ((WARNINGS++))
fi
((TOTAL_CHECKS++))
echo ""

# 总结
print_header "检查结果"
echo ""

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ 所有检查通过! ($PASSED_CHECKS/$TOTAL_CHECKS)${NC}"
    echo ""
    echo "可以开始构建签名包:"
    echo "  ./scripts/sign-and-build.sh"
    echo ""
    exit 0
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ 检查完成，有 $WARNINGS 个警告 ($PASSED_CHECKS/$TOTAL_CHECKS 通过)${NC}"
    echo ""
    echo "可以尝试构建 (可能需要跳过公证):"
    echo "  ./scripts/sign-and-build.sh --skip-notarize"
    echo ""
    echo "或者完善配置后进行完整构建:"
    echo "  1. 配置 .env.local 文件"
    echo "  2. 运行 ./scripts/sign-and-build.sh"
    echo ""
    exit 1
else
    echo -e "${RED}✗ 检查失败 ($PASSED_CHECKS/$TOTAL_CHECKS 通过)${NC}"
    echo ""
    echo "请先解决上述问题，然后重新运行此脚本"
    echo ""
    exit 1
fi
