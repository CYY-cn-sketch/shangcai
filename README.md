# 上财 AI 创业实践教学平台

正式实施项目，前端使用 React、TypeScript 与 Vite，后端使用 Java 21、Spring Boot、MySQL 和 Flyway。

## 本地运行

MySQL 使用 Windows 服务 `SUFE_MySQL84`。本地凭据放在 `backend/.env.local`，不要提交到 Git。

```powershell
Set-Location -LiteralPath 'D:\桌面\shangcai\backend'
.\mvnw.cmd package
powershell -ExecutionPolicy Bypass -File .\start-mysql-local.ps1
```

```powershell
Set-Location -LiteralPath 'D:\桌面\shangcai'
npm run dev -- --host 0.0.0.0 --port 5174
```

- 前端：`http://localhost:5174/`
- 后端：`http://127.0.0.1:8080/`
- 健康检查：`http://127.0.0.1:8080/actuator/health`

## 验证

```powershell
npm run test:ci

# 需要在当前进程提供专用测试密码；不要写入仓库
$env:SUFE_E2E_PASSWORD = '<专用测试密码>'
npm run test:e2e
Remove-Item Env:SUFE_E2E_PASSWORD

Set-Location -LiteralPath 'D:\桌面\shangcai\backend'
.\mvnw.cmd test
```

- `test:ci` 串行执行 ESLint、21 项 Vitest 单元测试（含最低覆盖率门槛）和生产构建。
- `test:e2e` 使用 Playwright 验证学生、教师和管理员的关键流程；回答方式与专家能力边界当前按本阶段范围执行桌面端验收。
- GitHub Actions 会在推送和拉取请求时使用隔离的 H2 数据库重复执行前后端测试与浏览器验收，供应商开关保持关闭。

## 数据与供应商边界

- 登录会话、账号、小组、学生工作台、成果、审核、知识库、文件元数据和专家配置由 Java 后端与 MySQL 管理。
- 知识资料原始文件保存到服务端文件目录，不使用浏览器 `localStorage` 保存业务数据；生产备份同时覆盖 MySQL 和服务端文件目录。
- 专家 Skill 以 ZIP 压缩包上传，服务端只读取受限数量和大小的 UTF-8 文本配置，不执行包内脚本或二进制文件。
- 路演 PPT 由乐享知识库提供逐页内容，平台本地组装 PPTX 并通过 Java 后端保存；乐享不可用时只使用本地预置结构，不产生供应商消耗。
- 管理端 AI 用量仅统计供应商明确返回、可核验的输入与输出 Token，不使用字符数估算；明细与个人/小组汇总保存到 MySQL。
- WorkBuddy 与乐享默认关闭；只有在明确联调时才通过服务端环境变量启用。

## 生产部署

生产 Profile、Nginx、systemd、环境变量、备份和冒烟测试模板位于 `deploy/`。完整步骤见 `交接运行说明.md`。
