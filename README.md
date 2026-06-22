# 🚀 太空生存 - Space Survival Roguelite

一款使用 HTML5 Canvas + CSS3 + 原生 JavaScript ES6 模块化实现的太空生存射击 Roguelite 游戏。浏览器直接可玩，零依赖。

---

## 游戏简介

操控飞船在浩瀚太空中生存，躲避并击毁不断涌来的陨石敌群，收集随机掉落的强化道具，挑战越来越强的关卡，冲击排行榜最高纪录！

---

## 操作方式

### 键盘操作

| 操作 | 按键 |
|------|------|
| 四方向移动 | `←` `↑` `→` `↓` 方向键 或 `W` `A` `S` `D` |
| 暂停 / 继续 | `空格键` |
| 重新开始 | `R` 键 |
| 返回菜单 | `Esc` 键 |

> 飞船会自动射击，无需手动开火。

### 触屏操作

手机或平板端可使用屏幕左下方的十字方向键（D-pad）操控飞船移动。

---

## 敌人类型

| 敌人 | 描述 | 分数 |
|------|------|------|
| 🔶 小型高速陨石 | 移动速度快，血量低（1击即碎） | 15 分 |
| 🔷 中型分裂陨石 | 血量较高（3击），击破后**炸裂分裂成 4 块小陨石** | 40 分 |
| 🔴 大型 Boss | 每 **30 秒**出现一次，血条显示于顶部，发射会追踪玩家的**追踪弹** | 500 分 |

---

## 道具系统

击杀敌人有概率掉落道具，拾取后立即生效。HUD 左侧会实时显示当前持有道具的剩余时间。

| 道具 | 效果 | 持续时间 |
|------|------|----------|
| 🛡 **护盾** | 抵挡一次碰撞伤害，护盾存在期间不会被消耗生命值 | 10 秒 |
| ⏳ **时间减速** | 所有敌人与敌人子弹移动速度降低 60% | 6 秒 |
| 💥 **散射激光** | 同时发射 5 道扇形激光，大幅提升火力覆盖范围 | 8 秒 |

---

## 关卡机制

- 每存活 **60 秒** 自动进入下一关卡
- 关卡切换时星空背景与星云色调会随之变换（共 6 种主题循环），伴随彩色粒子庆祝特效
- 关卡越高，敌人刷新频率越快，追踪弹速度越高
- 连续击杀敌人可累积**连击**：每 5 连击分数倍率 +0.5x（最高可达多倍加成）
- 连击中断 2.5 秒后重置

---

## 排行榜系统

- 游戏结束后成绩自动记录到浏览器 `localStorage`
- 排行榜保留**前 5 名**，显示分数、到达关卡、存活时间、击杀数
- 主菜单与结算界面均可查看排行榜
- 结算界面底部可点击「清除排行榜」按钮手动清空所有记录

---

## 设置面板

在主菜单点击 ⚙ **设置** 可调节：

| 设置项 | 说明 |
|--------|------|
| 音效 / 音乐 | 开关音效与背景音乐 |
| 音效音量 / 音乐音量 | 0% ~ 100% 滑块调节 |
| 粒子特效 | 开关爆炸、拾取、关卡切换等粒子效果 |
| 粒子密度 | 粒子数量倍率（20% ~ 200%），低配设备可调低获得更流畅体验 |
| 屏幕震动 | 受击、爆炸时的屏幕震动反馈 |
| 飞船样式 | 经典 / 流线型 / 棱角型 三种外观 |

---

## 运行方式

### 方法一：直接打开（最简单）

直接双击 `index.html` 文件，或右键选择「打开方式」→ 任意现代浏览器（Chrome、Edge、Firefox、Safari 等）即可开始游戏。

> 注：部分浏览器对本地 `file://` 协议加载 ES6 Module 有限制。如果遇到白屏或报错，请使用方法二启动本地服务器。

### 方法二：本地 HTTP 服务器（推荐）

**使用 Python 3：**
```bash
python -m http.server 8000
```

**使用 Node.js（需全局安装 serve）：**
```bash
npx serve .
```

启动后在浏览器访问 `http://localhost:8000`（或对应端口）即可。

---

## 文件目录

```
.
├── index.html          # 游戏主页面（UI 结构）
├── css/
│   └── style.css       # 全部样式（HUD、菜单、设置、响应式）
├── js/
│   ├── main.js         # 游戏主控制器（状态、循环、模块组装）
│   ├── player.js       # 玩家飞船（移动、射击、生命值、道具状态）
│   ├── enemies.js      # 敌人定义（小陨石、分裂陨石、Boss、追踪弹）
│   ├── bullets.js      # 子弹定义（普通激光、散射激光）
│   ├── powerups.js     # 道具定义与掉落逻辑
│   ├── renderer.js     # Canvas 绘制（飞船、敌人、子弹、道具、星空背景）
│   ├── particles.js    # 粒子系统（爆炸、拾取、特效）
│   ├── input.js        # 输入管理（键盘 + 触屏 D-pad）
│   ├── audio.js        # Web Audio API 音效与背景音乐
│   ├── collision.js    # SAT 碰撞检测（纯函数，回调注入副作用）
│   ├── leaderboard.js  # 排行榜（计分算法 + 存储 + 渲染 + 版本迁移）
│   ├── monitor.js      # 全局异常监控（错误捕获 + FPS + 日志持久化）
│   ├── storage.js      # localStorage 原始读写（设置 + 旧版排行榜）
│   └── ui.js           # UI 层（HUD、菜单、弹窗、Toast）
└── README.md           # 本说明文档
```

---

## 技术栈

- **HTML5 Canvas** — 游戏画面渲染
- **CSS3** — 界面布局、渐变、动效、响应式适配
- **JavaScript ES6+** — 模块化（`import` / `export`）、类、箭头函数
- **Web Audio API** — 音效合成与背景音乐（无外部音频文件）
- **localStorage** — 排行榜与玩家设置持久化

---

## 计分公式

排行榜使用 **rankScore** 进行排序，生存时间具有绝对主导权重：

```
rankScore = survivalSec * 30      // 核心（约占总分 66%+）
          + level * 200           // 通关里程碑奖励
          + kills * 8             // 击杀奖励（但击杀本身依赖生存）
          + min(log2(maxCombo+1) * 10, 60)
                                  // 连击风格奖励，上限 60 分
```

**连击分数对照表：**

| 最大连击 | 连击奖励分 |
|---------|-----------|
| 5 连击  | 26 分     |
| 10 连击 | 34 分     |
| 20 连击 | 44 分     |
| 40 连击 | 54 分     |
| 63+连击 | 60 分（封顶） |

> 设计意图：这是一个**生存游戏**，活得久永远比刷分重要。即使刷到 10000 连击，也无法超越多存活几秒的玩家。

---

## collision.js 接口说明

### 核心原理
采用 **SAT（Separating Axis Theorem，分离轴定理）** 实现凸多边形精确碰撞检测，替代了原先的圆形近似，使飞船三角形轮廓与陨石不规则形状的碰撞真正匹配视觉模型。

### 导出函数

| 函数 | 说明 |
|------|------|
| `polygonHit(polyA, polyB)` | 检测两个多边形是否相交（SAT 算法） |
| `circleHit(ax, ay, ar, bx, by, br)` | 圆形碰撞检测（保留，用于子弹/道具） |
| `polygonCircleHit(poly, cx, cy, cr)` | 多边形与圆形的碰撞检测 |
| `getPlayerPolygon(player)` | 根据玩家飞船状态构建碰撞多边形 |
| `getEnemyPolygon(enemy)` | 根据敌人状态构建碰撞多边形（匹配渲染的不规则 n 边形） |
| `getBulletPolygon(bullet)` | 根据子弹状态构建矩形碰撞多边形 |
| `getBossBulletCircle(bullet)` | 获取 Boss 追踪弹的碰撞圆 |
| `getPowerupCircle(powerup)` | 获取道具的碰撞圆 |
| `runCollisions(state, callbacks)` | 执行完整碰撞检测流程，结果通过回调返回 |

### runCollisions 回调

```js
runCollisions(state, {
  onBulletEnemyHit(bullet, enemy),    // 玩家子弹命中敌人
  onEnemyKilled(enemy),               // 敌人被击杀
  onPlayerEnemyHit(player, enemy),    // 玩家与敌人相撞
  onPlayerBossBulletHit(player, bullet), // 玩家被 Boss 子弹命中
  onPlayerPowerupHit(player, powerup),   // 玩家拾取道具
  onPlayerDead(player),               // 玩家死亡
})
```

### 设计特点
- **纯函数**：碰撞模块不依赖游戏状态，副作用全部通过回调注入
- **可独立测试**：所有检测逻辑均可单独单元测试
- **性能权衡**：子弹-敌人使用多边形精确检测，道具拾取仍用圆形（效率足够且体验一致）

---

## monitor.js 接口说明

### 功能
全局异常安全网 + FPS 性能监控 + 日志持久化 + 可选匿名上报。

### 安装与配置

```js
import monitor from './monitor.js';

monitor.install({
  onToast: (msg, type) => { ... },  // 错误时显示 Toast
  onError: (err, info) => { ... },  // 额外的错误回调
  reportUrl: 'https://...',         // 可选：匿名上报端点
  enableReport: false,              // 可选：是否启用上报（默认关闭）
});
```

### 公开 API

| 方法 / 属性 | 说明 |
|------------|------|
| `monitor.install(options)` | 安装全局错误监听（幂等） |
| `monitor.safe(fn, fallback)` | 包装同步函数，出错返回 fallback |
| `monitor.safeAsync(fn, fallback)` | 包装异步函数，出错返回 fallback |
| `monitor.tickFrame()` | 每帧调用，用于 FPS 统计 |
| `monitor.fps` | 当前 FPS（只读） |
| `monitor.errorCount` | 累计错误数（只读） |
| `monitor.getAllLogs()` | 从 localStorage 读取所有错误日志（最多 50 条） |
| `monitor.clearLogs()` | 清空本地错误日志 |
| `monitor.setReportUrl(url)` | 设置匿名上报端点 URL |
| `monitor.setReportEnabled(enabled)` | 启用/禁用匿名上报 |
| `monitor.reportEnabled` | 当前是否启用上报（只读） |

### 日志条目结构

```js
{
  t:        1719000000000,  // 时间戳
  type:     'error',         // 错误类型：error / unhandledrejection
  message:  '...',           // 错误消息
  stack:    '...',           // 错误堆栈
  file:     'player.js',     // 出错文件（如有）
  line:     42,              // 出错行号（如有）
  fps:      58,              // 出错时的 FPS
  url:      '...',           // 页面 URL
  ua:       '...',           // User-Agent
}
```

### 匿名上报
- 默认**关闭**，需显式调用 `setReportEnabled(true)` 开启
- 使用 `navigator.sendBeacon` 优先发送，不阻塞页面
- 上报内容不包含任何用户身份信息，仅错误与环境数据
- 上报失败静默忽略，不影响游戏运行
