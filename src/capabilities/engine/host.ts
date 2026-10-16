/** 仅描述原模板实际使用的 SDK 子集，不是完整 SDK 类型或值域承诺。 */
export interface ElementAttribute {
  dataSetId: string;
  elemIdList: string;
  elemClr: unknown;
  elemEmis: number;
  elemEmisPercent: number;
  elemSmooth: number;
  elemMetal: number;
  elemSmmePercent: number;
}

export interface BlackHole3DHost {
  REElemAttr: new () => ElementAttribute;
  REColor: new (red: number, green: number, blue: number, alpha: number) => unknown;
  BIM: {
    setElemAttr(attribute: ElementAttribute): unknown;
    resetElemAttr(dataSetId: string, elemIdList: string): unknown;
  };
  Probe: { getCurProbeRet(): unknown };
}

/** 调用时才读取宿主；导入该模块不会读取 SDK 或修改场景。 */
export function getBlackHole3D(): BlackHole3DHost {
  const engine = typeof window === 'undefined' ? undefined : window.BlackHole3D;
  if (!engine) throw new Error('需要宿主提供 window.BlackHole3D，或显式传入 SDK 对象。');
  return engine as BlackHole3DHost;
}
