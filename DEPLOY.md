# 部署到 Vercel（不需要登录墙、支持自己的域名）

这份代码已经从 ChatGPT Sites 的 Cloudflare/vinext 结构，改造成了**标准 Next.js 项目**，可以直接部署到 Vercel。已经在沙盒里验证过 `npm install && npm run build && npm start` 都能跑通，页面正常返回 200。

## 部署步骤

1. **上传到 GitHub**
   - 在 GitHub 新建一个仓库（可以设为 Private）
   - 把这个文件夹的内容推上去（`git init` → `git add .` → `git commit` → `git remote add origin ...` → `git push`）

2. **导入到 Vercel**
   - 去 [vercel.com](https://vercel.com) 用 GitHub 账号登录
   - 点 "Add New" → "Project"，选择刚才那个仓库
   - Framework Preset 会自动识别成 "Next.js"，其他保持默认，直接点 "Deploy"
   - 几分钟后会给你一个 `xxx.vercel.app` 的临时域名，可以先用这个测试——**不需要登录，任何人都能直接打开**

3. **绑定你自己的域名**
   - 项目 Dashboard → Settings → Domains，把你买的域名（比如 `xiaochai.com`）填进去
   - 按提示去域名服务商（腾讯云/阿里云）那边加一条 CNAME 或 A 记录指过去
   - 生效后你的域名就能直接访问这个网页了

4. **改小程序里的 H5_URL**
   - 回到微信小程序壳项目的 `pages/index/index.ts`
   - 把 `H5_URL` 改成你在 Vercel 绑定好的自己的域名地址

5. **去微信公众平台配置"业务域名"**
   - 开发管理 → 开发设置 → 业务域名，添加这个域名
   - 下载校验文件，放到网站根目录（Vercel 项目里 `public/` 文件夹下即可，比如 `public/WW_verify_xxxx.txt`），重新部署一次，再去微信后台完成校验

## 这次迁移做了什么改动

- 移除了 Cloudflare 专属的 `worker/`、`vite.config.ts`、`.openai/hosting.json`、`wechat-miniprogram-shell/`（那是壳项目，单独管理）
- `package.json` 的脚本从 `vinext dev/build` 改成标准的 `next dev/build/start`
- 移除了没用到的 Drizzle/D1 数据库相关文件（代码里数据全部存在浏览器 `localStorage`，本来就没真正连数据库）
- 修了一个 TypeScript 类型报错（`normalizeWeeklyGoal` 函数里 `Number.isFinite` 没有正确收窄 `undefined` 类型），否则 `next build` 会报错不给过
- 没有改动任何界面逻辑或样式，功能和之前完全一样（包括之前说的"运动打卡缺按钮"那个问题，按你说的先没动）
