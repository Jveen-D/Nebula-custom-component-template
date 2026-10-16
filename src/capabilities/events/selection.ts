import { getBlackHole3D } from '../engine/host';
import type { BlackHole3DHost } from '../engine/host';

export interface SelectionSubscription {
  target?: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
  engine?: Pick<BlackHole3DHost, 'Probe'>;
}

/**
 * @capability events.selection
 * @status 已实现原事件订阅；选择结果结构待宿主确认，以 unknown 交给调用方。
 * @param onSelection 收到选择结果及原始 Event；options 可注入事件目标和 Probe。
 * @returns 幂等的 unsubscribe()；必须在组件卸载或不再需要时调用。
 * @requires 默认使用 document 和 window.BlackHole3D.Probe；宿主产生 RESystemSelElement。
 * @sideEffects 显式调用时注册一个监听；收到事件时读取当前选择并回调，不向宿主发事件。
 * @example const stop = subscribeToSelection(result => consume(result)); // 清理时 stop()
 */
export function subscribeToSelection(onSelection: (selection: unknown, event: Event) => void, options: SelectionSubscription = {}): () => void {
  const target = options.target ?? document;
  const engine = options.engine ?? getBlackHole3D();
  let active = true;
  const listener = (event: Event) => {
    if (active) onSelection(engine.Probe.getCurProbeRet(), event);
  };
  target.addEventListener('RESystemSelElement', listener);
  return () => {
    if (!active) return;
    active = false;
    target.removeEventListener('RESystemSelElement', listener);
  };
}
