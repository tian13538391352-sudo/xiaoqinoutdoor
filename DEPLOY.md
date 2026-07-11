# Xiaoqin Outdoor - 部署指南

## 方式一：Vercel（推荐，免费）

1. 打开浏览器访问 https://vercel.com ，用 GitHub / GitLab / 邮箱注册（免费）
2. 回到终端，运行以下命令：
```bash
cd /Users/tianxiaoqin/.accio/accounts/1761156530_5001/agents/DID-F456DA-06F456DAU1778074-6499-543708/project/xiaoqinoutdoor
npx vercel login
npx vercel --prod
```
3. 浏览器会弹出授权页面，点击确认即可自动部署
4. 部署完成后获得域名：`xiaoqinoutdoor.vercel.app`
5. 在 Vercel Dashboard → Settings → Domains 中绑定你的 `xiaoqinoutdoor.com`

## 方式二：Netlify（免费）

1. 打开 https://app.netlify.com ，注册账号
2. 在 Netlify Dashboard 点击 "Add new site" → "Deploy manually"
3. 将整个 `xiaoqinoutdoor/` 文件夹拖拽到页面中
4. 自动部署完成，获得 `xxx.netlify.app` 域名

## 方式三：GitHub Pages（免费）

```bash
cd /Users/tianxiaoqin/.accio/accounts/1761156530_5001/agents/DID-F456DA-06F456DAU1778074-6499-543708/project/xiaoqinoutdoor
git init && git add -A && git commit -m "initial deploy"
# 然后在 GitHub 创建仓库并推送，Settings → Pages 启用
```

## 方式四：阿里云 OSS + CDN

适合 xiaoqinoutdoor.com 域名已购买的情况：
- 阿里云 OSS 创建 Bucket，开启静态网站托管
- 上传 `xiaoqinoutdoor/` 目录下所有文件
- 绑定自定义域名，配置 CDN 加速
