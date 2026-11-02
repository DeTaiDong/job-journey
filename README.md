# 求职手帐

一个供个人使用的投递与笔面试日程管理网页，可部署在腾讯云 EdgeOne Pages 或 Vercel，通过 Supabase 在不同设备间同步。

## 功能

- 记录公司、岗位、投递日期、平台、岗位链接、状态和备注
- 给每条投递添加多场笔试或面试，记录时间、类型、地点与备注
- 总览页展示近期日程和投递进展；支持搜索和状态筛选
- 保存投递网站密码：浏览器端使用 AES-GCM 加密后写入数据库，保险箱口令不上传
- Supabase 邮箱登录及行级安全策略，每位用户只能访问自己的记录
- 在日程列表直接标记完成、恢复待办或修改时间，并区分今天、明天和已过期安排
- 下载包含投递与日程的 JSON 数据备份
- 可从手机或平板浏览器添加到主屏幕

日程只在系统内展示，暂不发送邮件或系统推送提醒。

## 本地运行

1. 在 [Supabase](https://supabase.com/) 创建项目。
2. 在 SQL Editor 中执行 [`supabase/schema.sql`](supabase/schema.sql)。
3. 在 Authentication 中启用 Email 登录。若只供自己使用，可以在注册完自己的账户后关闭公开注册。
4. 复制 `.env.example` 为 `.env.local`，填入项目 URL 与 **publishable / anon key**。不要使用 service role key。
5. 安装并启动：

   ```bash
   npm install
   npm run dev
   ```

## 部署到 Vercel

1. 将这个目录提交到自己的 GitHub 仓库，并在 Vercel 导入仓库。
2. Framework Preset 选 **Vite**，Build Command 为 `npm run build`，Output Directory 为 `dist`。仓库中的 `vercel.json` 已配置构建与页面刷新重写。
3. 在 Vercel 项目环境变量中设置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`，与本地值一致。
4. 部署完成后，在 Supabase → Authentication → URL Configuration 中将 **Site URL** 从默认的 `http://localhost:3000` 改成你的 Vercel 正式地址，并在 **Redirect URLs** 加入同一个地址，以便注册确认邮件正确返回。
5. 首次打开网页注册账户。如果只供自己使用，注册成功后可在 Supabase 关闭新用户注册。

Vercel 仅负责托管前端；数据持久化在你的 Supabase 项目。没有配置 Supabase 时网页会显示配置提示，不会假装已同步。

如果验证邮件仍跳转到 `localhost:3000`，检查上述 Site URL；旧邮件中的一次性链接可能已经失效，请在网站登录页重新发送验证邮件，并使用最新邮件的链接。

## 部署到腾讯云 EdgeOne Pages

1. 将代码推送到 GitHub，在 [EdgeOne Pages 控制台](https://console.cloud.tencent.com/edgeone/pages) 创建项目并连接该仓库。生产分支选择 `main`。
2. 加速区域选择 **中国大陆可用区**。构建命令填写 `npm run build`，输出目录填写 `dist`，根目录保持仓库根目录。不要直接套用普通 React 项目的 `build` 输出目录；本项目使用 Vite，实际输出是 `dist`。
3. 在 Pages 的构建环境变量中分别添加 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`，值与 Vercel 项目中正在使用的值相同。只使用 Supabase 的 publishable / anon key，不使用 secret 或 service role key。环境变量在构建时写入前端；修改后需重新部署。
4. 首次部署后可通过项目概览中的临时预览链接检查页面。**长期在中国大陆访问需要绑定已完成 ICP 备案的自有域名**；大陆加速区域的系统预览链接有效期为 3 小时，不能当作长期网址。如果还没有域名，先在「域名注册 → 我的域名」确认，再按需购买并完成域名实名认证。腾讯云首次 ICP 备案还要求账号实名认证及符合条件的备案云资源；EdgeOne Pages 本身不应被默认视作备案云资源，购买前请在备案控制台核对可用产品。备案完成后，在 Pages 项目设置的域名管理中添加域名，按控制台提示添加 DNS 记录并等待 HTTPS 证书生效。
5. 在 Supabase → Authentication → URL Configuration 中将 **Site URL** 改为新的正式 `https://` 域名，并将该域名加入 **Redirect URLs**。本项目注册和重发验证邮件时会把当前网页地址传给 Supabase；若新域名不在允许列表，邮件确认可能无法正确返回。确认新域名上的登录、记录读取和新增功能正常后再停用旧 Vercel 地址。

仅迁移前端不会移动或删除 Supabase 中的投递、日程数据。浏览器仍会直接连接 Supabase；若大陆网络中网页已打开但登录或数据加载卡住，需要再单独处理 Supabase 的可达性。

参考：[EdgeOne Pages 构建与环境变量](https://edgeone.cloud.tencent.com/pages/document/162936788693114880)、[大陆区域与域名规则](https://edgeone.cloud.tencent.com/pages/document/175191784523485184)、[Supabase 登录跳转网址](https://supabase.com/docs/guides/auth/redirect-urls)。

## 网站密码说明

网站密码使用你输入的保险箱口令在浏览器端加密。每条密码有独立的随机盐和随机 IV，使用 PBKDF2-SHA-256 派生 AES-256-GCM 密钥。数据库只保存密文、盐与 IV。保险箱口令仅保存在当前网页会话的内存中，刷新页面或换设备后需重新输入。

请保管好保险箱口令：忘记后无法恢复已存的网站密码。登录密码与保险箱口令是两回事。修改某条记录时，网站密码留空会保留原密码。

## 从 TXT 批量导入

登录网站后打开「投递记录」→「导入 TXT」，选择电脑上的原始投递清单。导入前可预览识别出的公司、链接以及是否含密码，并取消勾选不需要的记录；已经存在同名公司的记录默认不勾选。需要选择一个暂用投递日期，并输入保险箱口令以加密文件中的密码和编码。

原始 TXT 没有准确的投递日期和具体岗位，因此导入的岗位默认标记为「岗位待补充」，日期由你在导入时选择；导入后请逐条核对。文件内容仅在浏览器中读取，密码加密后才写入 Supabase，不会进入 GitHub 仓库。

## 下载备份

登录后打开左侧菜单，点击「下载数据备份」。网页会重新读取 Supabase 中的全部投递与日程，下载 `job-journey-backup-日期.json`。备份包含网站密码的密文、盐和 IV，**不包含明文密码或保险箱口令**；其他投递和日程信息以可读 JSON 保存，请自行保管文件。

当前提供导出，不提供网页内的一键恢复。备份文件保留了完整记录字段，可用于日后迁移或手动恢复。

## 添加到主屏幕

部署到 Vercel 后，在 iPhone / iPad 的 Safari 中打开网站，使用分享菜单中的「添加到主屏幕」。在 Android Chrome 中打开网站，使用浏览器菜单中的「安装应用」或「添加到主屏幕」。网站会以独立窗口打开；查看和同步 Supabase 数据仍需要网络。

## 项目选择

参考了 [JobHunt](https://github.com/kaitranntt/jobhunt) 的投递记录、登录与 Vercel + Supabase 技术路线。该项目还包含看板、动画及较大规模的组件和测试体系；这里按个人记录需求实现更精简的版本，没有直接复制其源码。
