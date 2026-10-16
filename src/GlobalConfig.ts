import React from 'react'
import { Employee } from './api/commonApi'
import graphicHelper from './microAdapt/graphicHelper'

type Account = {
  employeeUuid: string
}

type ToolGroup = 'engine' | 'business';
type DisplayType = 'view' | 'modal';

export type SelectEmployeeBusinessType = 'markAdd' | 'annotationAdd'

export type SceneBasicData = {
  projectId: string;
  engineProjectId: string;
  sceneId: string;
};

export type SceneTool = {
  label: string;
  icon: string;
  type: string;
  group?: ToolGroup;
}

export type SceneToolViewDismissEvent = () => void;

export type SceneToolViewBaseProps = {
  defaultScrollTargetId?: string
  extraData?: any
  onDismiss: SceneToolViewDismissEvent;
  style?: React.CSSProperties
};

type SceneToolViewClickPayload = {
  onDismiss: () => void;
} & SceneBasicData;

export type SceneToolItem = {
  displayType?: DisplayType;
  ToolComponent?: React.FC<SceneToolViewBaseProps>;
  dismiss?: () => void;
  onClick?: (clicked: boolean, sceneBasicData: SceneToolViewClickPayload) => void;
} & SceneTool;

export type SceneRightClickMenuItem = {
  index?: number

  onClick?: (sceneBasicData: SceneBasicData) => void
} & SceneTool

type AppendSceneTool = {
  groupIndex?: number
  childIndex?: number
} & SceneToolItem

type SelectEmployeeParam = {
  title?: string
  businessType?: SelectEmployeeBusinessType
  projectId?: string
  engineProjectId?: string
  curSelected: Employee[];
  onFinish: (selected: Employee[]) => void
}

export interface IGlobalConfigHelper {

  loginPage: string
  errorPage403?: string

  pageOffset: {
    x: number
    y: number
  }

  getAccount: () => Account

  verifyPermission?: (code: string, projectId?: string) => boolean

  dynamicAppendSceneTools?: () => AppendSceneTool[]

  dynamicAppendSceneRightClickMenu?: () => SceneRightClickMenuItem[]

  onSelectEmployee: (param: SelectEmployeeParam) => Employee[]

  onScenePageFullScreen?: (full: boolean) => void

  isGraphicAppEnable?: (param: { appUuid: string }) => Promise<{ data: boolean, message?: string }>

  onGraphicPreview?: (param: { url: string }) => void

  onGraphicDesignExit?: () => void

}

class GlobalConfigDefaultHelper implements IGlobalConfigHelper {
  loginPage: string = `${window.location.origin}${graphicHelper.genePath('/login')}`

  pageOffset: { x: number; y: number; } = {
    x: 0,
    y: 0
  }

  getAccount: () => Account = () => {
    return {
      employeeUuid: ''
    }
  }

  onSelectEmployee: (param: SelectEmployeeParam) => Employee[] = () => []
}

class GlobalConfigHelper implements IGlobalConfigHelper {
  private _helper: IGlobalConfigHelper = new GlobalConfigDefaultHelper()

  loginPage: string = this._helper.loginPage
  errorPage403: string = this._helper.errorPage403 || ''

  pageOffset: { x: number; y: number; } = this._helper.pageOffset

  initial (helper: IGlobalConfigHelper) {
    if (!helper) return

    this._helper = helper
    this.loginPage = helper.loginPage
    this.errorPage403 = helper.errorPage403 || ''
    this.pageOffset = helper.pageOffset
    this.onGraphicPreview = helper.onGraphicPreview
    this.onGraphicDesignExit = helper.onGraphicDesignExit
  }

  getAccount: () => Account = () => {
    return this._helper.getAccount() || {}
  }

  verifyPermission: ((code: string, projectId?: string) => boolean) = (code, projectId) => {
    return this._helper.verifyPermission ? this._helper.verifyPermission(code, projectId) : true
  }

  dynamicAppendSceneTools: () => AppendSceneTool[] = () => {
    return this._helper.dynamicAppendSceneTools?.() || []
  }

  dynamicAppendSceneRightClickMenu: () => SceneRightClickMenuItem[] = () => {
    return this._helper.dynamicAppendSceneRightClickMenu?.() || []
  }

  onSelectEmployee: (param: SelectEmployeeParam) => Employee[] = (param) => {
    return this._helper.onSelectEmployee(param)
  }

  onScenePageFullScreen: ((full: boolean) => void) = (full) => {
    this._helper.onScenePageFullScreen?.(full)
  }

  isGraphicAppEnable: ((param: { appUuid: string; }) => Promise<{ data: boolean, message?: string }>) = async (param) => {
    return this._helper.isGraphicAppEnable ? await this._helper.isGraphicAppEnable(param) : { data: true }
  }

  onGraphicPreview?: (param: { url: string }) => void

  onGraphicDesignExit?: () => void
}

export const globalConfigHelper = new GlobalConfigHelper()
