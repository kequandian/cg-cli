CG-CLI 使用手册（Linux 命令行风格）

NAME
- `cg-cli` — 基于 SQL 的代码生成与表结构解析 CLI。
- `cg-api-server` — 拉取并运行代码生成后端服务的脚本。

INSTALL
- npm i
- npm link

SYNOPSIS
- 环境变量：`ENDPOINT`（默认 `http://localhost:8080`）

- `cg-cli [OPTIONS] [ARGS]`
- `cg-cli local update [TABLE]`
- `cg-cli do-entity [TABLE]`
- `cg-cli do-master [TABLE]`
- `cg-cli do-onemany [TABLE]`
- `cg-cli do-onemany-native [TABLE]`
- `cg-cli --show-endpoint`
- `cg-cli --show-local`
- `cg-cli --show-default`
- `cg-cli --show-default-field <FIELD>`

- 备用（Windows/任意环境）：`node cg-cli.js <subcommand> [args]`
  - 例：`node cg-cli.js show-endpoint`、`node cg-cli.js update-table-entity cg_entity_resource`

DESCRIPTION
- `cg-cli` 负责解析 `src/main/resources/sql` 下 `*-schema.sql` 的建表语句，并将配置（`crud.json`）发送到后端进行代码生成。
- `cg-api-server` 使用 Maven 依赖拉取 `com.jfeat:cg-api:1.3.1:jar:standalone` 到 `/var/tmp`，并以 `java -jar` 启动服务；默认端口 `8080`。

ENVIRONMENT
- `ENDPOINT`：后端服务地址，默认 `http://localhost:8080`。
  - Linux/macOS：`ENDPOINT=http://127.0.0.1:8080 cg-cli --show-endpoint`
  - Windows（PowerShell）：`$env:ENDPOINT='http://127.0.0.1:8080'; node cg-cli.js show-endpoint`

FILES
- `pom.xml`：需在 Maven 项目根目录执行生成命令。
- `src/main/resources/sql`：放置 `*-schema.sql` 文件（解析表名）。
- `src/main/java/com/jfeat/<module>/<submodule>`：源码结构用于推断 `module/submodule`。
- `crud.json`：生成/编辑的代码生成配置文件。

OPTIONS（cg-cli）
- `-h`, `--help`：打印帮助。
- `--show-endpoint`：显示当前服务端点（读取 `ENDPOINT` 或默认值）。
- `--show-local`：显示 SQL 目录并列出 `*-schema.sql` 文件。
- `--show-default`：输出服务端默认字段集合。
- `--show-default-field <FIELD>`：输出指定默认字段详情。

COMMANDS（cg-cli）
- `local update [TABLE]`
  - 用途：在 Maven 项目下解析 `*-schema.sql`；不传 `TABLE` 时列出所有表；传入后向后端 `POST /api/cg/generate/code/base` 进行实体生成。
  - 用法：`cg-cli local update` | `cg-cli local update cg_entity_resource`

- `do-entity [TABLE]`
  - 用途：基于或自动创建 `crud.json`，注入 `mask=entity`，调用 `POST /api/cg/generate/code`。
  - 用法：`cg-cli do-entity cg_entity_resource`

- `do-master [TABLE]`
  - 用途：读取 `crud.json` 调用 `POST /api/cg/generate/code`（主表生成）。
  - 用法：`cg-cli do-master cg_entity_resource`

- `do-onemany [TABLE]`
  - 用途：在当前 `TABLE` 基础上注入 `slaves` 配置（`masterId=master_id:id`，`itemsKey=items`），调用 `POST /api/cg/generate/code`。
  - 用法：`cg-cli do-onemany cg_master`

- `do-onemany-native [TABLE]`
  - 用途：直接使用现有 `crud.json`（或自动生成），调用 `POST /api/cg/generate/code`。
  - 用法：`cg-cli do-onemany-native cg_master`

RETURN VALUES
- 命令执行成功返回 0；如服务端不可用、路径不正确或文件缺失，返回非 0 并输出错误信息。

EXAMPLES（cg-cli）
- 启动后端服务：`cg-api-server -p 8080`
- 显示端点：`cg-cli --show-endpoint`
- 查看本地 SQL：`cg-cli --show-local`
- 列出所有表：`cg-cli local update`
- 生成实体：`cg-cli local update cg_entity_resource`
- 生成主表：`cg-cli do-master cg_entity_resource`
- 生成一对多：`cg-cli do-onemany cg_master`

NAME（cg-api-server）
- `cg-api-server` — 拉取并运行代码生成后端的启动脚本。

SYNOPSIS（cg-api-server）
- `cg-api-server [OPTIONS]`
- `cg-api-server -p <PORT>` | `--port <PORT>`
- `cg-api-server -f` | `--force`
- `cg-api-server -t` | `--test`

DESCRIPTION（cg-api-server）
- 使用 Maven 依赖插件拉取 `cg-api-*-standalone.jar` 至 `/var/tmp` 并运行；首次运行会同时提取并打开 `cg-api-test.http`（如检测到 VS Code）。

OPTIONS（cg-api-server）
- `-h`, `--help`：显示帮助。
- `-p <PORT>`, `--port <PORT>`：指定端口（默认 8080）。
- `-f`, `--force`：强制更新 JAR 与 `cg-api-test.http`。
- `-t`, `--test`：仅打开测试用例并退出。
 - `--jar <path>`：使用本地 standalone JAR 路径，不通过 Maven 拉取。
 - `--repo <url>`：覆盖 Maven `remoteRepositories`，从指定仓库拉取。

EXAMPLES（cg-api-server）
- 默认启动：`cg-api-server`
- 指定端口：`cg-api-server -p 9090`
- 强制更新：`cg-api-server -f`
- 打开测试用例：`cg-api-server -t`
 - 使用本地 JAR：`node cg-api-server.js --jar C:\path\cg-api-1.3.1-standalone.jar -p 8080`
 - 指定仓库拉取：`node cg-api-server.js --repo https://repo1.maven.org/maven2/ -p 8080`

NOTES / 平台兼容
- Linux/macOS：直接使用 `cg-cli` 与 `cg-api-server` 即可。
- Windows：`cg-cli` 与 `cg-api-server` 均为 Bash/sh 脚本，建议在 Git Bash/WSL 中运行；或改用 `node cg-cli.js <subcommand>` 直接调用 Node 脚本。
 - 提示：仓库已提供 `cg-api-server.js`（Node 版，跨平台），在 Windows PowerShell 下可直接运行：`node cg-api-server.js [options]`。

DIAGNOSTICS
- `pom.xml not fould, not an maven project !`：当前目录不是 Maven 项目根；请在包含 `pom.xml` 的目录执行。
- `module is null, pls provide module name !`：`src/main/java/com/jfeat` 下未能定位模块/子模块；检查源码结构或手工设置。
- `crud.json not found, pls edit crud.json first ..!`：首次运行某些命令会生成基础 `crud.json`；请按需编辑后重试。
- 服务端未启动或端口不一致：设置 `ENDPOINT` 或先运行 `cg-api-server`。
 - Maven 拉取失败：目标 artifact 可能不在默认仓库；使用 `--repo <url>` 指定仓库或用 `--jar <path>` 指定本地 JAR。

LICENSE
- ISC（详见 `package.json`）。
