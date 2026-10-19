export interface LinkedElementVisibilityOptions {
  /** 显式确认目标所有权；可授权其他组件，但不能仅凭全局 ID 推定有权修改。 */
  canControl: (element: HTMLElement) => boolean
  targetDocument?: Pick<Document, 'getElementById'>
}

const hiddenDisplays = new WeakMap<HTMLElement, { value: string; priority: string }>()

/**
 * @capability interaction.visibility
 * @status 原生 DOM 跨组件联动；不是平台组件协议或 React 条件渲染。
 * @param visible false 隐藏；true 恢复本能力隐藏前的行内 display，未隐藏过则不修改。
 * @param ids 调用者提供的两个非空、不同的 DOM ID。
 * @param options 必须提供 canControl 确认两个目标均可控制；targetDocument 默认 document。
 * @returns void；缺失目标或授权时在修改任何元素前抛错。
 * @requires 调用方按已确认的容器或目标集合实现 canControl；跨组件控制须获得目标所有者授权。
 * @sideEffects 显式调用时修改两个目标的 display；重复隐藏保留首次快照，恢复时保留原优先级。
 * 隐藏后若其他代码改写了 display，则恢复时不覆盖该修改。调用方需在目标移除前按需恢复，避免多个控制者同时管理同一目标。
 * @example setLinkedElementsVisible(false, ids, { canControl: element => approvedTargets.has(element) })
 */
export function setLinkedElementsVisible(
  visible: boolean,
  ids: readonly [string, string],
  options: LinkedElementVisibilityOptions,
): void {
  if (typeof options?.canControl !== 'function') throw new Error('请显式提供联动目标的所有权检查。')
  if (!ids[0] || !ids[1] || ids[0] === ids[1]) throw new Error('请提供两个非空、不同的联动目标 ID。')
  const targetDocument = options.targetDocument ?? document
  // 先解析并授权全部目标，避免第二个目标无效时留下部分修改。
  const elements = ids.map(id => {
    const element = targetDocument.getElementById(id)
    if (!element || options.canControl(element) !== true) throw new Error('联动目标不存在或未获调用方授权。')
    return element
  })

  for (const element of elements) {
    if (!visible) {
      if (!hiddenDisplays.has(element)) {
        hiddenDisplays.set(element, {
          value: element.style.getPropertyValue('display'),
          priority: element.style.getPropertyPriority('display'),
        })
      }
      element.style.setProperty('display', 'none', 'important')
    } else {
      const original = hiddenDisplays.get(element)
      if (!original) continue
      if (
        element.style.getPropertyValue('display') === 'none' &&
        element.style.getPropertyPriority('display') === 'important'
      ) {
        if (original.value) element.style.setProperty('display', original.value, original.priority)
        else element.style.removeProperty('display')
      }
      hiddenDisplays.delete(element)
    }
  }
}
