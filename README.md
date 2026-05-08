# 实时文件系统监控与可视化应用（桌面端）

基于 Tauri + React 的本机实时文件变动监控工具，支持递归监听、事件筛选排序、统计图表、SQLite 持久化与重要变动通知。

## 功能概览
- 递归监听目录（创建/修改/删除/重命名）
- 事件实时流与历史检索（按时间/类型/路径/扩展名/大小筛选）
- 统计图表（近窗口总数、按分钟趋势、类型分布）
- 本地持久化（SQLite，批量写入，基础保留清理）
- 重要变动提醒（系统通知 + UI 标记）

## 开发与运行

### 前置条件（桌面端）
需要 Rust 工具链与系统依赖：
- 安装 Rust（包含 `cargo`）
- 安装 Tauri 桌面端构建依赖

### 启动 Web UI（不含本机监听）
```bash
npm install
npm run dev
```

### 启动桌面端（Tauri）
```bash
npm install
npm run dev:tauri
```

## 项目结构
- `src/`：React 前端
- `shared/`：前后端共享类型
- `src-tauri/`：Rust 本机核心（监听 + SQLite + Commands）

## 文档
见 `.trae/documents/`：PRD、技术架构与页面设计。
