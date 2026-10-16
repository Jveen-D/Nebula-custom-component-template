const webpack = require('webpack')

module.exports = {

  // config 是 webpack-chain 的对象，可以链式修改配置
  default: (config, options) => {
    if (options.cliArgv.local) {
      config
        .plugin('define-constant')
        .use(webpack.DefinePlugin, [{ __RUN_ON_LOCAL__: true }])
      return
    }
    config.output
      .library('graphic-custom-component')
      .libraryTarget('umd')
      .globalObject('window')

    config
      .plugin('define-constant')
      .use(webpack.DefinePlugin, [{ __RUN_ON_LOCAL__: false }])

    config.externals({
      react: 'var window.GPReact',
      'react-dom': 'var window.GPReactDOM',
      moment: 'var window.moment',
      lodash: 'var window._',
      antd: 'var window.GPAntd',
      '@ant-design/pro-form': 'var window.ProForm',
      '@ant-design/pro-table': 'var window.ProTable',
      '@metacode/runtime': 'var window.MetacodeRuntime'
    })
  },
  // 这里面的配置会通过 webpack-merge 这个库 合并进去，为什么不全部通过上面的 webpack-chain 配置？因为上面有些配置不支持....
  // 例如 https://github.com/neutrinojs/webpack-chain/issues/230 这个居然不支持
  configureWebpack: (options) => {
    return {
      devServer: {
        allowedHosts: 'all',
        host: '127.0.0.1', // 将 'your-public-ip' 替换为您的公共IP地址
        headers: {
          'Access-Control-Allow-Origin': '*' // 允许所有源域跨域访问，这样可能会导致安全漏洞，只在开发环境中使用
          // 或者可以指定允许的源域：
          // 'Access-Control-Allow-Origin': 'http://124.70.26.197:7080'
        },
        proxy: {
          '^/newblackholeapi/.*': {
            target: 'https://graphplatform-dev.bjblackhole.com/', // 如果本地没有起服务，不需要联调，用这个
            changeOrigin: true
          }
        }
      },
      resolve: {
        fallback: {
          stream: require.resolve('stream-browserify'),
          buffer: require.resolve('buffer/')
        }
      }
    }
  }
}
