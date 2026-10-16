# 自定义组件与大屏协同能力

这是能力的唯一索引。AI 先读本页，按任务选择下面一个实现文件，再读对应函数 JSDoc；需要了解调用范例时再读 examples；参考代码不属于公共能力 API 或默认页面。无需先扫描整个组件或遗留工具目录。

入口 [index.ts](./index.ts) 只导出函数和类型，没有初始化过程。本目录不在导入阶段主动发出宿主请求、修改场景/联动 DOM 或订阅宿主事件；参考 React 示例不由默认入口加载。宿主对象在实际调用时才读取；可注入请求、SDK、事件目标和文档用于验证。

## 分类索引

“已实现适配”表示提取了真实调用并通过替身测试，不表示已在真实宿主验收；“仅示例/待确认”不得升级描述为平台已支持。

| 能力 ID / 名称 | 用途与状态 | 按需读取 | 调用后的副作用 |
| --- | --- | --- | --- |
| host.props / 宿主属性输入 | 仅类型与观察示例；style 和 customPropsResult 是已观察字段 | [host/props.ts](./host/props.ts) | 无；入口仍完整透传 props |
| platform.request / 请求入口 | 已实现宿主原函数读取，不包装或绑定 | [platform/requests.ts](./platform/requests.ts) | 读取函数本身不请求 |
| platform.app-query / 平台查询 | 仅 getAppByUuid 业务接口示例 | 同上 | 显式调用时 POST |
| platform.external-api / 平台代调 | 原 executeApiCall 描述式用法，转发协议待确认 | 同上 | POST 到平台执行接口 |
| platform.dictionary / 字典查询 | 仅原字典接口示例，编码由调用方提供 | 同上 | 显式调用时请求 |
| platform.visual-angle / 视角接口 | 写入范围、字段、默认 method 待宿主确认 | 同上 | 可能修改平台数据 |
| engine.appearance / 构件外观 | 已提取 SDK 调用；目标格式和数值范围待确认 | [engine/attributes.ts](./engine/attributes.ts)、[SDK 子集](./engine/host.ts) | 改变三维场景 |
| engine.reset-appearance / 恢复属性 | 恢复范围待宿主确认 | 同上 | 改变三维场景 |
| events.selection / 选择事件 | 已实现显式订阅及清理，结果结构未知 | [events/selection.ts](./events/selection.ts) | 注册一个 document 监听，返回幂等清理函数 |
| interaction.visibility / 跨组件显隐 | 仅原生 DOM 示例，不是平台组件协议 | [interaction/visibility.ts](./interaction/visibility.ts) | 修改两个已存在元素的行内 display |

待实现且没有假接口：数据源订阅/消费、customPropsResult 表达式解析或业务映射、向宿主回传自定义事件。不要从字段名推断已具备这些能力。

## 调用约定

每个实现的 JSDoc 是参数/返回值、宿主对象、前置条件、清理、副作用与调用例子的具体契约。共享的[请求选项类型](../utils/request/types.ts)沿用原有兼容声明。接口选项仍由 window.core.request 解释；模板只保留观察到的传参形态，不猜测默认 method、自动包装或错误处理实现。

```ts
import { getAppByUuid, subscribeToSelection } from '@/capabilities';

const response = await getAppByUuid(appUuid); // appUuid 由业务提供；响应结构先确认
const stop = subscribeToSelection((selection) => consumeSelection(selection));
// 在 React useEffect 的清理函数中返回 stop，或不再需要时调用 stop()。
```

三维 target 不提供默认空 ID；原注释中的“所有构件”不能推导为空字符串的确定语义。dataSetId、elemIdList、颜色/材质值域、恢复范围都应先按实际 SDK 确认。DOM 示例要求两个元素已存在，visible=true 固定写 block，不承诺恢复元素原 display。

## 调用参考

[examples/CapabilityExamples.tsx](./examples/CapabilityExamples.tsx) 和 [参数草稿](./examples/config.ts) 仅供 AI 按需读取，用于参考请求、状态展示和事件清理的写法；不由主组件导入，也不从公共能力 index.ts 导出。文件内的局部导出用于参考代码复用，不是对外能力 API。

没有 enabled 页面开关。业务开发请从分类实现选择所需能力，在主组件自行组合 UI，并显式提供经宿主确认的参数；不要重新将整块演示面板接入默认页面。参考代码本身保留显式操作、缺参检查和清理示例，不自动请求或订阅。

兼容导出：src/service.ts 的 executeApiCall、src/component/index.tsx 的 getAppByUuid 保留。入口继续保持 window.GraphicCustomComponent、public path、externals 和完整 props 透传。

## 新增能力约定

1. 在最相关分类新增普通函数或类型；分类确实不同再增加目录。只需要调用时参数，不增加自动初始化、插件注册框架或全局状态。
2. JSDoc 使用固定字段：@capability（唯一 ID）、@status、@param、@returns、@requires（宿主及前置条件）、@sideEffects、@example。未知协议写“待宿主确认”，未实现能力只列入待实现清单。
3. 导入阶段保持无副作用，事件返回清理函数；核心不包含企业业务目标，示例配置与实现分开。能力可从 index.ts 导出，React 演示保持单独入口。
4. 在本表增加一行，补充针对性的替身测试。执行 npm run test:capabilities、既有请求/配置/同步回归和构建，检查历史类型诊断差异；不要用 any、非空断言、ts-ignore 或放宽 tsconfig 来掩盖历史问题。

## 已知限制

数据源消费和对外事件输出尚未实现；三维目标及视角接口协议须由宿主确认。完整 npm run typecheck 当前仍有 5 个诊断：interaction/visibility.ts:13、14 的 TS2531，GlobalConfig.ts:2、3 和 utils/token.ts:2 的 TS2307。构建可成功，不能据此声明类型检查通过。
