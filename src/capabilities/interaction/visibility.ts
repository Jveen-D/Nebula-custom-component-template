/**
 * @capability interaction.visibility
 * @status 仅原生 DOM 联动示例；不是平台组件协议或 React 条件渲染。
 * @param visible true 写入 block，false 写入 none；ids 为调用者提供的两个 DOM ID。
 * @param targetDocument 可选文档对象，默认 document。
 * @returns void；React 开关状态仍由调用者管理。
 * @requires 两个目标元素均存在，确认元素确属可控制对象；block 未必是其原 display。
 * @sideEffects 改写两个元素的行内 display，不自动恢复原样式。
 * @example setLinkedElementsVisible(false, ['left-panel', 'right-panel'])
 * 历史两处 DOM 可能为空的 TS2531 随此原操作逻辑迁移，按用户要求保留；没有抑制类型检查。
 */
export function setLinkedElementsVisible(visible: boolean, ids: readonly [string, string], targetDocument: Pick<Document, 'getElementById'> = document): void {
  targetDocument.getElementById(ids[0]).style.display = visible ? 'block' : 'none';
  targetDocument.getElementById(ids[1]).style.display = visible ? 'block' : 'none';
}
