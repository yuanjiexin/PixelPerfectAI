<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# PixelPerfect AI

基于 Vite + React 的像素级设计稿与开发截图比对工具，分析服务使用千问 DashScope，经由 Netlify Functions 代理以保障密钥安全。

## 本地运行

前端预览：
- `npm install`
- `npm run dev`

端到端（含函数与千问调用）：
- 安装 Netlify CLI：`npm i -g netlify-cli`
- 设置密钥：`netlify env:set DASHSCOPE_API_KEY <你的密钥>`
- 启动：`netlify dev`

## 部署到 Netlify
- 连接仓库后使用默认构建：Build command `npm run build`，Publish directory `dist`
- Functions 目录：`netlify/functions`
- 在 Netlify 环境变量中设置：`DASHSCOPE_API_KEY=<你的密钥>`

## 关键配置
- `netlify.toml`：构建与函数目录
- `netlify/functions/analyze.ts`：调用千问兼容模式并返回结构化结果
- `services/geminiService.ts`：前端调用同源函数 `/.netlify/functions/analyze`
