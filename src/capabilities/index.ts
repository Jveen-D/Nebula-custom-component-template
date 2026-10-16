// 能力实现均惰性读取宿主；导入此入口不会请求、修改三维、操作 DOM 或注册监听。
// AI 先读本目录 README.md，再按分类读取实现的 JSDoc。可选 React 示例不从此入口导出。
export type { HostComponentProps } from './host/props';
export { getHostRequest, getAppByUuid, executeApiCall, getDictionaryValues, setVisualAngle } from './platform/requests';
export type { ExternalApiCall, VisualAngleInput } from './platform/requests';
export { setElementAppearance, resetElementAppearance } from './engine/attributes';
export type { ElementTarget, ElementAppearance } from './engine/attributes';
export type { BlackHole3DHost } from './engine/host';
export { subscribeToSelection } from './events/selection';
export { setLinkedElementsVisible } from './interaction/visibility';
