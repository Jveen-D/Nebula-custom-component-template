import { createStyles } from 'antd-style'
const useStyles = createStyles(
  ({ cx, css, prefixCls, token, responsive }, props:any) => {
    /**
     * 🚀 xs: 575
     * 🚀 sm: 767
     * 🚀 md: 991
     * 🚀 lg: 1199
     * 🚀 xl: 1599
     * 🚀 xxl: 1600
     * */
    return {
      Wrapper: css`
        color: ${token.colorPrimary}
      `,
    }
  }
)
export default useStyles
