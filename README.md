# Nebula 自定义组件模板

React 自定义组件模板，依赖公开 npm 包，无需 npm 登录。环境：Node.js 24、npm 11。

项目默认使用淘宝 npm 镜像 `https://registry.npmmirror.com/`，仅 `@duwenjie198312` 从官方 npm 下载。npm 11 使用 `replace-registry-host=never` 配合锁文件中的混合源地址，避免把该 scope 的 tarball 改写到镜像；版本和 integrity 保持不变。

## 安装、运行与打包

```powershell
npm ci --ignore-scripts --legacy-peer-deps
npm run serve
```

开发服务保持运行；构建请在另一个终端或停止服务后执行：

```powershell
npm run build
Compress-Archive -Path .\dist\* -DestinationPath ..\component.zip
```

ZIP 根目录放 dist 内的产物，不包含外层 dist 目录。legacy-peer-deps 用于现有构建插件的 peer 约束；安装阶段禁用隐式生命周期，构建脚本显式执行。保留 package-lock.json，使用 npm ci 安装。

组件需要宿主提供 window.core、React/Antd externals 和三维引擎；开发服务可访问不代表脱离宿主即可完整运行。

## 开发与 AI 阅读入口

1. 先读 [能力索引](./src/capabilities/README.md)，再按分类读取函数的中文 JSDoc。
2. 业务 UI 位于 [src/component/index.tsx](./src/component/index.tsx)；[src/index.tsx](./src/index.tsx) 保留宿主注册、定位和 props 透传。
3. examples 仅供 AI 按需阅读调用参考，不接入主组件或公共能力 API，没有默认页面开关。业务按需组合真实能力；数据源消费和向宿主发送事件尚未实现。

```powershell
npm run check
npm run typecheck
```

检查手动执行。当前完整类型检查仍有 5 个已知诊断，位置见能力索引；构建成功不代表类型检查全部通过。

## 维护者双仓同步

远端 origin/gitee 的目标须与 [同步脚本](./scripts/sync-remotes.cjs) 定义的 GitHub/Gitee 地址一致。提交待发布代码后执行：

```powershell
npm run sync -- --check
npm run sync
```

默认只同步 main，版本标签须显式指定，例如 npm run sync -- --tag v1.2.3。分歧和标签冲突会停止，逐远端报告结果；修复故障后可重试。两端推送非原子，不自动合并、不强推或删除远端历史。凭据与 SSH 主机信任由维护者在仓库外正常配置；更多参数见 npm run sync -- --help。
