import { getBlackHole3D } from './host';
import type { BlackHole3DHost } from './host';

export interface ElementTarget { dataSetId: string; elemIdList: string }
export interface ElementAppearance {
  color: readonly [number, number, number, number];
  elemEmis: number;
  elemEmisPercent: number;
  elemSmooth: number;
  elemMetal: number;
  elemSmmePercent: number;
}

/**
 * @capability engine.appearance
 * @status 已提取 SDK 调用；目标格式、空 ID 含义和数值范围待宿主确认。
 * @param target 数据集/构件目标，必须显式提供；不填充空字符串或猜测“所有构件”。
 * @param appearance 颜色及原示例的材质字段，全部显式传入；engine 可选 SDK。
 * @returns void。
 * @requires REElemAttr、REColor、BIM.setElemAttr 可用，调用方确认目标和各值合法。
 * @sideEffects 立即修改三维场景中的构件外观；不自动恢复。
 * @example setElementAppearance(target, appearance) // target/appearance 均须先确认
 */
export function setElementAppearance(target: ElementTarget, appearance: ElementAppearance, engine: BlackHole3DHost = getBlackHole3D()): void {
  const attribute = new engine.REElemAttr();
  attribute.dataSetId = target.dataSetId;
  attribute.elemIdList = target.elemIdList;
  attribute.elemClr = new engine.REColor(...appearance.color);
  attribute.elemEmis = appearance.elemEmis;
  attribute.elemEmisPercent = appearance.elemEmisPercent;
  attribute.elemSmooth = appearance.elemSmooth;
  attribute.elemMetal = appearance.elemMetal;
  attribute.elemSmmePercent = appearance.elemSmmePercent;
  engine.BIM.setElemAttr(attribute);
}

/**
 * @capability engine.reset-appearance
 * @status 待宿主确认恢复范围；不将原示例的空字符串解释为“恢复所有”。
 * @param target 显式数据集/构件目标；engine 可选 SDK。
 * @returns void。
 * @requires BIM.resetElemAttr 可用，确认目标参数协议后调用。
 * @sideEffects 恢复指定目标的 SDK 属性，范围取决于宿主实现。
 * @example resetElementAppearance(target)
 */
export function resetElementAppearance(target: ElementTarget, engine: BlackHole3DHost = getBlackHole3D()): void {
  engine.BIM.resetElemAttr(target.dataSetId, target.elemIdList);
}
