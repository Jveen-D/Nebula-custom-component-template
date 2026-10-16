import Cookies from 'js-cookie'
import { userInfo } from '../pages/login/service'

// 三维中台token
export const setAccessToken = (token: string) => {
  // return Cookies.set("access_token", token)
  Cookies.set('access_token', token)
}

// companyId
export const setcompanyId = (companyId: string) => {
  Cookies.set('companyId', companyId)
}

// 登录用户信息
export const setUserInfo = (userInfo: userInfo) => {
  return Cookies.set('userInfo', userInfo)
}

export const GetUserInfo = () => {
  return Cookies.get('userInfo')
}

export const getCompanyId = () => {
  return Cookies.get('companyId')
}

export const getAccessToken = () => {
  return Cookies.get('access_token')
}

// 登录之前删除token
export const removeToken = () => {
  Cookies.remove('userInfo')
  Cookies.remove('token')
  Cookies.remove('access_token')
  Cookies.remove('companyId')
}
