import type { ExternalApiCall, VisualAngleInput } from '../platform/requests';
import type { ElementAppearance, ElementTarget } from '../engine/attributes';

/** 仅供 AI 参考的参数草稿，不是宿主 props 协议或默认页面开关。 */
export interface CapabilityExampleConfig {
  appUuid?: string;
  parentDictCode?: string;
  externalApi?: ExternalApiCall;
  visualAngle?: VisualAngleInput;
  elementTarget?: ElementTarget;
  appearance?: ElementAppearance;
  linkedElementIds?: readonly [string, string];
}

// 无企业 UUID、字典码、DOM ID 或空三维目标默认值。
// 默认主组件不引用本文件；业务实现请自行选择所需能力和确认后的参数。
export const capabilityExampleConfig: CapabilityExampleConfig = {};
