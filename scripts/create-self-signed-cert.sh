#!/bin/bash

# 使用 macOS Keychain Access 创建自签名证书
# 这是最可靠的方法

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  创建自签名证书用于 Auto-Claude 本地测试"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 证书名称
CERT_NAME="Auto-Claude Self-Signed"

# 检查是否已存在
if security find-identity -v -p codesigning | grep -q "$CERT_NAME"; then
    echo "✓ 证书 '$CERT_NAME' 已存在"
    echo ""
    security find-identity -v -p codesigning | grep "$CERT_NAME"
    echo ""
    echo "可以直接使用此证书进行构建:"
    echo "  ./scripts/sign-and-build.sh --skip-notarize"
    echo ""
    exit 0
fi

echo "方法 1: 使用 Keychain Access 图形界面（推荐）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "步骤:"
echo "  1. 打开 Keychain Access 应用"
echo "  2. 菜单: Keychain Access > Certificate Assistant > Create a Certificate"
echo "  3. 填写信息:"
echo "     • Name: $CERT_NAME"
echo "     • Identity Type: Self Signed Root"
echo "     • Certificate Type: Code Signing"
echo "  4. 点击 Create"
echo "  5. 完成后运行: ./scripts/check-signing-config.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "方法 2: 使用命令行（自动）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "是否使用命令行自动创建? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "请使用方法 1 手动创建证书"
    exit 0
fi

echo ""
echo "正在创建证书..."

# 创建临时目录
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# 生成证书
openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout key.pem \
    -out cert.pem \
    -days 365 \
    -subj "/CN=$CERT_NAME/O=Auto-Claude Development/OU=Development" \
    -extensions v3_req \
    -config <(cat <<EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req

[req_distinguished_name]

[v3_req]
keyUsage = critical, digitalSignature
extendedKeyUsage = critical, codeSigning
basicConstraints = critical, CA:false
EOF
) 2>/dev/null

# 创建一个随机密码
RANDOM_PWD=$(openssl rand -base64 32)

# 转换为 p12
openssl pkcs12 -export \
    -out cert.p12 \
    -inkey key.pem \
    -in cert.pem \
    -name "$CERT_NAME" \
    -passout pass:"$RANDOM_PWD" 2>/dev/null

echo ""
echo "导入证书到 Keychain..."
echo "（可能会弹出密码输入框，请输入您的 Mac 登录密码）"
echo ""

# 尝试导入
if security import cert.p12 \
    -k ~/Library/Keychains/login.keychain-db \
    -P "$RANDOM_PWD" \
    -T /usr/bin/codesign \
    -T /usr/bin/productbuild \
    -T /usr/bin/security 2>&1; then

    echo ""
    echo "✓ 证书导n
    # 等待导入完成
    sleep 2

    # 尝试设置访问权限
    echo "设置证书访问权限..."
    security set-key-partition-list -S apple-tool:,apple: -s ~/Library/Keychains/login.keychain-db 2>/dev/null || true

else
    echo ""
    echo "⚠️  自动导入失败"
    echo ""
    echo "请手动导入证书:"
    echo "  1. 双击打开: $TEMP_DIR/cert.p12"
    echo "  2. 密码: $RANDOM_PWD"
    echo "  3. 选择导入到: 登录钥匙串"
    echo ""
    read -p "按回车键继续..." -r
fi

# 清理临时文件
cd - > /dev/null
rm -rf "$TEMP_DIR"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"\n# 验证证书
if security find-identity -v -p codesigning | grep -q "$CERT_NAME"; then
    echo "✓ 自签名证书创建成功!"
    echo ""
    security find-identity -v -p codesigning | grep "$CERT_NAME"
    echo ""
    echo "✓ 证书已可用于代码签名"
    echo ""
    echo "下一步:"
    echo "  ./scripts/sign-and-build.sh --skip-notarize"
else
    echo "⚠️  证书未在 codesigning 列表中找到"
    echo ""
    echo "请手动设置证书信任:"
    echo "  1. 打开 Keychain Access 应用"
    echo "  2. 在左侧选择 '登录' 钥匙串"
    echo "  3. 找到 '$CERT_NAME' 证书"
    echo "  4. 双击打开 > 信任 > 代码签名 > 始终信任"
    echo "  5. 关闭窗口并输入密码确认"
    echo ""
    echo "然后重新运行:"
    echo "  ./scripts/check-signing-config.sh"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  重要提示:"
echo "  • 此证书仅用于本地测试"
echo "  • 无法通过 Apple 公证"
echo "  • 签名后的应用在其他 Mac 上会被 Gatekeeper 阻止"
echo "  • 需要右键 > 打开 来运行"
echo ""
