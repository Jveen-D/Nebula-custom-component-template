const { createRequire } = require('node:module')
const buildRequire = createRequire(require.resolve('@duwenjie198312/build-webpack-react/package.json'))
const webpack = buildRequire('webpack')

module.exports = {
  // config 是 webpack-chain 的对象，可以链式修改配置
  default: (config, options) => {
    // The host executes the JS entry without its HTML; initial CSS must inject itself.
    const cssRule = config.module.rule('css')
    cssRule.uses.delete('mini-css-extract-plugin')
    cssRule.use('style-loader').before('css-loader').loader(buildRequire.resolve('style-loader'))
    cssRule.use('css-loader').loader(buildRequire.resolve('css-loader'))
    if (options.cliArgv.local) {
      config.plugin('define-constant').use(webpack.DefinePlugin, [{ __RUN_ON_LOCAL__: true }])
      return
    }
    config.output.library('graphic-custom-component').libraryTarget('umd').globalObject('window')

    config.plugin('define-constant').use(webpack.DefinePlugin, [{ __RUN_ON_LOCAL__: false }])

    config.externals({
      react: 'var window.GPReact',
      'react-dom': 'var window.GPReactDOM',
      moment: 'var window.moment',
      lodash: 'var window._',
      antd: 'var window.GPAntd',
      '@ant-design/pro-form': 'var window.ProForm',
      '@ant-design/pro-table': 'var window.ProTable',
      '@metacode/runtime': 'var window.MetacodeRuntime',
    })
  },
  // 这里面的配置会通过 webpack-merge 这个库 合并进去，为什么不全部通过上面的 webpack-chain 配置？因为上面有些配置不支持....
  // 例如 https://github.com/neutrinojs/webpack-chain/issues/230 这个居然不支持
  configureWebpack: options => {
    const { buildConfig } = require('./dongting.config')
    const origins = new Set([`http://localhost:${buildConfig.port}`, `http://127.0.0.1:${buildConfig.port}`])
    for (const value of (process.env.NEBULA_DEV_ORIGINS || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean)) {
      let url
      try {
        url = new URL(value)
      } catch {
        throw new Error('NEBULA_DEV_ORIGINS 必须是逗号分隔的完整 HTTP(S) 来源。')
      }
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.pathname !== '/' ||
        url.search ||
        url.hash
      ) {
        throw new Error('NEBULA_DEV_ORIGINS 只接受协议、主机和端口，不接受通配符、路径或凭据。')
      }
      if (url.hostname.includes('*') || url.hostname.startsWith('.'))
        throw new Error('NEBULA_DEV_ORIGINS 不接受通配符或子域通配写法。')
      origins.add(url.origin)
    }
    return {
      devServer: {
        host: '127.0.0.1',
        allowedHosts: [...new Set([...origins].map(origin => new URL(origin).hostname))],
        // 使用函数覆盖构建器的通配 CORS；仅为明确授权的宿主来源返回响应头。
        headers: request => ({
          Vary: 'Origin',
          ...(origins.has(request.headers.origin) ? { 'Access-Control-Allow-Origin': request.headers.origin } : {}),
        }),
        // WebSocket 升级不经过 HTTP 中间件，热更新同样校验完整来源。
        webSocketServer: { type: 'ws', options: { verifyClient: info => origins.has(info.origin) } },
        setupMiddlewares: middlewares => {
          middlewares.unshift({
            name: 'validate-dev-origin',
            middleware: (request, response, next) => {
              if (request.headers.origin && !origins.has(request.headers.origin)) {
                response.statusCode = 403
                response.end('Origin not allowed')
                return
              }
              next()
            },
          })
          return middlewares
        },
        proxy: {
          '^/newblackholeapi/.*': {
            target: 'https://graphplatform-dev.bjblackhole.com/', // 如果本地没有起服务，不需要联调，用这个
            changeOrigin: true,
          },
        },
      },
      resolve: {
        fallback: {
          stream: require.resolve('stream-browserify'),
          buffer: require.resolve('buffer/'),
        },
      },
    }
  },
}
