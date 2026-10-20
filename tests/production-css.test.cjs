const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { createRequire } = require('node:module')
const test = require('node:test')
const buildRequire = createRequire(require.resolve('@duwenjie198312/build-webpack-react/package.json'))
const { getBaseConfig } = buildRequire('./lib/webpackConfig/base')
const customize = require('../config/webpack.config').default
const buildConfig = require('../config/dongting.config').buildConfig

function productionConfig() {
  const config = getBaseConfig({ nodeEnv: 'production', buildConfig })
  const originalOtherRules = ['less', 'sass'].map(name => config.module.rule(name).toConfig())
  const css = config.module.rule('css')
  css.use('css-loader').options({ modules: { auto: true } })
  customize(config, { nodeEnv: 'production', cliArgv: {} })
  return { config, css, originalOtherRules }
}

test('host CSS uses runtime injection while preserving CSS Modules options and Less/Sass rules', () => {
  const { config, css, originalOtherRules } = productionConfig()
  const uses = css.toConfig().use
  assert.equal(uses.length, 2)
  assert.match(uses[0].loader, /style-loader/)
  assert.match(uses[1].loader, /css-loader/)
  assert.deepEqual(uses[1].options, { modules: { auto: true } })
  assert.deepEqual(
    ['less', 'sass'].map(name => config.module.rule(name).toConfig()),
    originalOtherRules,
  )
  assert.equal(config.output.get('libraryTarget'), 'umd')
  assert.equal(config.get('externals').react, 'var window.GPReact')
})

test('plain CSS and CSS Modules compile into the executable host JS without an HTML stylesheet', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nebula-production-css-'))
  try {
    fs.writeFileSync(
      path.join(temp, 'entry.js'),
      "import './plain.css'; import styles from './part.module.css'; window.__nebulaCssModuleClass = styles.card;",
    )
    fs.writeFileSync(path.join(temp, 'plain.css'), '.nebula-css-contract { color: rgb(12, 34, 56); }')
    fs.writeFileSync(path.join(temp, 'part.module.css'), '.card { padding: 17px; }')
    const { css } = productionConfig()
    const webpack = buildRequire('webpack')
    const compiler = webpack({
      mode: 'production',
      context: temp,
      entry: path.join(temp, 'entry.js'),
      devtool: false,
      output: { path: path.join(temp, 'dist'), filename: 'entry.js' },
      module: { rules: [css.toConfig()] },
    })
    await new Promise((resolve, reject) =>
      compiler.run((error, stats) => {
        compiler.close(closeError => {
          if (error || closeError) reject(error || closeError)
          else if (stats.hasErrors()) reject(new Error(stats.toString({ all: false, errors: true })))
          else resolve()
        })
      }),
    )
    const files = fs.readdirSync(path.join(temp, 'dist'))
    assert.deepEqual(files, ['entry.js'])
    const js = fs.readFileSync(path.join(temp, 'dist/entry.js'), 'utf8')
    assert.ok(js.includes('nebula-css-contract'))
    assert.ok(js.includes('17px'))
    assert.ok(js.includes('__nebulaCssModuleClass'))
  } finally {
    fs.rmSync(temp, { recursive: true, force: true })
  }
})
