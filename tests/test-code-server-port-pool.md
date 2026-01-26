# Code-Server 端口池测试步骤

## 📋 测试目标

验证修复后的端口池功能：
1. ✅ 自动分配可用端口
2. ✅ 端口被占用时自动跳过
3. ✅ 多实例启动时端口不冲突

---

## 🚀 测试步骤

### 方法 1：开发模式测试（推荐）

#### 1. 启动应用

```bash
cd /Users/zhengbingjin/Project/Github/Auto-Claude/apps/frontend
npm run dev
```

#### 2. 模拟端口冲突

在另一个终端：

```bash
# 占用端口 18080
nc -l 18080 &

# 占用端口 18081
nc -l 18081 &
```

#### 3. 在应用中测试

1. 打开应用
2. 选择一个项目（例如 Auto-Claude 项目）
3. 点击侧边栏的"编辑器"按钮（或按 E 键）
4. 观察控制台输出

**预期结果**：
```
[PortPool] Port 18080 is in use, trying next port...
[PortPool] Port 18081 is in use, trying next port...
[CodeServerService] Starting: { port: 18082, ... }
[CodeServerService] Server ready at: http://127.0.0.1:18082
```

#### 4. 验证端口分配

```bash
# 检查实际运行的端口
lsof -i :18080,18081,18082 | grep code-server
```

**预期结果**：
```
code-server *:18082
```

#### 5. 清理测试端口

```bash
pkill -f "nc -l 18080"
pkill -f "nc -l 18081"
```

---

### 方法 2：手动测试端口池

#### 测试脚本

```javascript
// test-port-allocation.js
const net = require('net');

async function testPortAllocation() {
  console.log('=== 测试端口分配 ===\n');

  // 1. 占用端口 18080
  console.log('1. 占用端口 18080...');
  const server1 = net.createServer();
  await new Promise(resolve => server1.listen(18080, '127.0.0.1', resolve));
  console.log('✓ 端口 18080 已占用\n');

  // 2. 占用端口 18081
  console.log('2. 占用端口 18081...');
  const server2 = net.createServer();
  await new Promise(resolve => server2.listen(18081, '127.0.0.1', resolve));
  console.log('✓ 端口 18081 已占用\n');

  console.log('3. 现在启动应用，应该会自动分配 18082 或更高...\n');

  // 保持占用
  process.on('SIGINT', () => {
    server1.close();
    server2.close();
    process.exit();
  });
}

testPortAllocation();
```

运行测试：

```bash
node test-port-allocation.js
# 然后启动应用，观察控制台日志
```

---

### 方法 3：打包应用测试

#### 1. 安装应用

```bash
# 打开 DMG 并拖到 Applications
open dist/Auto-Claude-2.7.4-darwin-arm64.dmg
```

#### 2. 启动应用

```bash
open -a "Auto-Claude"
```

#### 3. 查看日志

```bash
# 在终端查看日志
log stream --predicate 'process == "Auto-Claude"' --level debug
```

#### 4. 测试端口分配

1. 打开应用
2. 选择项目
3. 点击编辑器按钮
4. 观察日志中的端口分配信息

---

## ✅ 验收标准

### 成功标准

- [ ] 应用启动无错误
- [ ] 点击编辑器按钮后 VSCode 正常加载
- [ ] 控制台显示正确的端口号（18080+）
- [ ] 如果端口被占用，自动跳过并分配新端口
- [ ] VSCode 界面可以正常使用

### 失败标准

- [ ] 应用崩溃
- [ ] 端口冲突导致启动失败
- [ ] VSCode 无法加载
- [ ] 控制台显示端口绑定错误

---

## 🐛 常见问题

### Q1: 端口一直被占用怎么办？

```bash
# 查看占用端口的进程
lsof -i :18080

# 杀死占用进程
kill -9 <PID>

# 或批量清理
pkill -f "code-server.*18080"
```

### Q2: 如何查看详细日志？

开发模式：
```bash
npm run dev 2>&1 | grep -E "PortPool|CodeServerService|port"
```

打包应用：
```bash
# 查看系统日志
log stream --predicate 'process == "Auto-Claude"' --level debug
```

### Q3: 端口分配失败怎么办？

如果端口池耗尽（18080-19080 全部被占用）：

1. 清理旧的 code-server 进程：
   ```bash
   pkill -f code-server
   ```

2. 或者重启应用

---

## 📊 测试结果记录

### 测试 1：正常启动

- 时间：
- 分配端口：
- 状态：✅ PASS / ❌ FAIL
- 备注：

### 测试 2：端口冲突

- 占用端口：
- 实际分配：
- 状态：✅ PASS / ❌ FAIL
- 备注：

### 测试 3：多实例

- 实例数量：
- 端口列表：
- 状态：✅ PASS / ❌ FAIL
- 备注：

---

## 🎯 下一步

测试完成后，请反馈结果：
- ✅ 如果测试通过，端口池功能正常
- ❌ 如果测试失败，提供错误日志和复现步骤
