/**
 *
 * @authors yutent (yutent@doui.cc)
 * @date    2018-08-04 01:00:06
 */

'use strict'

require('es.shim')
const fs = require('iofs')
const path = require('path')
const chokidar = require('chokidar')
const uglify = require('uglify-es')
const chalk = require('chalk')
const log = console.log
const VERSION = '1.0.0'
const PACK_QUEUE = [
  'anot.js',
  'anot.shim.js',
  'anot-touch.js',
  'anot-touch.shim.js'
]
const PACK_DIR = path.resolve('./dist')
const SOURCE_DIR = path.resolve('./src/')

const PAD_START = Buffer.from(`
var _Anot = (function() {
`)
const PAD_END = Buffer.from(`
/*********************************************************************
 *                    DOMReady                                       *
 **********************************************************************/

  var readyList = []
  var isReady
  var fireReady = function(fn) {
    isReady = true
    while ((fn = readyList.shift())) {
      fn(Anot)
    }
  }

  if (DOC.readyState === 'complete') {
    setTimeout(fireReady) //如果在domReady之外加载
  } else {
    DOC.addEventListener('DOMContentLoaded', fireReady)
  }
  window.addEventListener('load', fireReady)
  Anot.ready = function(fn) {
    if (!isReady) {
      readyList.push(fn)
    } else {
      fn(Anot)
    }
  }
  var _Anot = window.Anot
  Anot.noConflict = function(deep) {
    if (deep && window.Anot === Anot) {
      window.Anot = _Anot
    }
    return Anot
  }

  window.Anot = Anot
  return Anot
})()
module.exports = _Anot
`)
const PAD_END_NEXT = Buffer.from(`

/*********************************************************************
 *                   css import                                      *
 **********************************************************************/

  var CSS_DEPS = {}
  function getBaseUrl() {
    if(window.LIBS_BASE_URL){
      return
    }
    var stack
    try {
      throw new Error() // 强制报错,以便捕获e.stack
    } catch (err) {
      stack = err.stack
    }
    stack = stack.trim().split(/[@ ]+/)
    if (window.safari) {
      stack = stack[1]
    } else {
      stack = stack.pop()
    }
    stack = stack.replace(/(:\\d+)?:\d+([\\w\\W]*)?$/i, '')
    window.LIBS_BASE_URL = stack.replace(/^([a-z\-]*):\\/\\/([^\\/]+)(\\/.*)?/, '$1://$2')
  }

  function importCss(url, baseUrl) {
    url = url.replace(/^\\/+/, '/')
    if (baseUrl) {
      url = baseUrl + url
    } else {
      if (window.LIBS_BASE_URL) {
        url = window.LIBS_BASE_URL + url
      }
    }
    
    if (CSS_DEPS[url]) {
      return
    }
    head.insertAdjacentHTML(
      'afterBegin',
      '<link rel="stylesheet" href="' + url + '">'
    )
    CSS_DEPS[url] = 1
  }
  getBaseUrl()


/*********************************************************************
 *                    DOMReady                                       *
 **********************************************************************/

  var readyList = []
  var isReady
  var fireReady = function(fn) {
    isReady = true
    while ((fn = readyList.shift())) {
      fn(Anot)
    }
  }

  if (DOC.readyState === 'complete') {
    setTimeout(fireReady) //如果在domReady之外加载
  } else {
    DOC.addEventListener('DOMContentLoaded', fireReady)
  }
  window.addEventListener('load', fireReady)
  Anot.ready = function(fn) {
    if (!isReady) {
      readyList.push(fn)
    } else {
      fn(Anot)
    }
  }
  window.importCss = importCss
  var _Anot = window.Anot
  Anot.noConflict = function(deep) {
    if (deep && window.Anot === Anot) {
      window.Anot = _Anot
    }
    return Anot
  }

  window.Anot = Anot
  return Anot
})()
export default _Anot
`)
const PAD_START_SHIM = Buffer.from(`
;(function() {
`)
const PAD_END_SHIM = Buffer.from(`
/*********************************************************************
 *                    DOMReady                                       *
 **********************************************************************/

  var readyList = []
  var isReady
  var fireReady = function(fn) {
    isReady = true
    var require = Anot.require
    if (require && require.checkDeps) {
      modules['domReady!'].state = 4
      require.checkDeps()
    }
    while ((fn = readyList.shift())) {
      fn(Anot)
    }
  }

  if (DOC.readyState === 'complete') {
    setTimeout(fireReady) //如果在domReady之外加载
  } else {
    DOC.addEventListener('DOMContentLoaded', fireReady)
  }
  window.addEventListener('load', fireReady)
  Anot.ready = function(fn) {
    if (!isReady) {
      readyList.push(fn)
    } else {
      fn(Anot)
    }
  }
  // Map over Anot in case of overwrite
  var _Anot = window.Anot
  Anot.noConflict = function(deep) {
    if (deep && window.Anot === Anot) {
      window.Anot = _Anot
    }
    return Anot
  }

  window.Anot = Anot
})()
`)

function comment({ amd, touch, next } = {}) {
  return `/*==================================================
 * Anot ${touch ? 'touch' : 'normal'} version ${amd ? 'with AMD loader' : ''} ${
    next ? 'for future browsers' : ''
  }
 * @authors yutent (yutent@doui.cc)
 * @date    2017-03-21 21:05:57
 * support IE10+ and modern browsers
 * 
 ==================================================*/
 `
}

/***************************************************************************/
/*********************        华丽丽的分割线      ****************************/
/***************************************************************************/

const BUFFER_CACHE = {}
const LIB_QUEUE = []

function loadFiles() {
  let files = fs.ls('./src/')
  for (let it of files) {
    if (fs.isdir(it)) {
      continue
    }
    BUFFER_CACHE[it] = fs.cat(it)
    LIB_QUEUE.push(it)
  }
}

function updateBuffer(file) {
  BUFFER_CACHE[file] = fs.cat(file)
}

// 打包,但不压缩
function packNoCompress(file) {
  if (file) {
    updateBuffer(file)
  }
  let libs = LIB_QUEUE.map(it => {
    return BUFFER_CACHE[it]
  })
  let touchModule = fs.cat('./src/lib/touch.js')
  let amdModule = fs.cat('./src/lib/amd.js')

  let nextVer = Buffer.concat(libs)
  let touchNext = Buffer.concat([nextVer, touchModule])
  let shim = Buffer.concat([nextVer, amdModule])
  let touchShim = Buffer.concat([shim, touchModule])

  /**
   * --------------------------------------------------------
   * 打包未来版的 anot
   * --------------------------------------------------------
   */
  fs.echo(
    Buffer.concat([PAD_START, nextVer, PAD_END_NEXT]),
    './dist/anot.next.js'
  )
  log('%s 打包完成...', chalk.green('anot.next.js'))

  /**
   * --------------------------------------------------------
   * 打包带触摸事件的未来版的 anot
   * --------------------------------------------------------
   */
  fs.echo(
    Buffer.concat([PAD_START, touchNext, PAD_END_NEXT]),
    './dist/anot-touch.next.js'
  )
  log('%s 打包完成...', chalk.green('anot-touch.next.js'))

  /**
   * --------------------------------------------------------
   * 打包自带AMD加载器的 anot
   * --------------------------------------------------------
   */
  fs.echo(
    Buffer.concat([PAD_START_SHIM, shim, PAD_END_SHIM]),
    './dist/anot.shim.js'
  )
  log('%s 打包完成...', chalk.green('anot.shim.js'))

  /**
   * --------------------------------------------------------
   * 打包自带AMD加载器及触摸事件的 anot
   * --------------------------------------------------------
   */
  fs.echo(
    Buffer.concat([PAD_START_SHIM, touchShim, PAD_END_SHIM]),
    './dist/anot-touch.shim.js'
  )
  log('%s 打包完成...', chalk.green('anot-touch.shim.js'))
}

// 打包并压缩
function packAndCompress() {
  let libs = LIB_QUEUE.map(it => {
    return BUFFER_CACHE[it]
  })
  let touchModule = fs.cat('./src/lib/touch.js')
  let amdModule = fs.cat('./src/lib/amd.js')

  let normal = Buffer.concat(libs)
  let touchNormal = Buffer.concat([normal, touchModule])
  let shim = Buffer.concat([normal, amdModule])
  let touchShim = Buffer.concat([shim, touchModule])

  /**
   * --------------------------------------------------------
   * 打包普通版 anot
   * --------------------------------------------------------
   */
  log('正在打包 anot.js...')
  let normalVer = Buffer.concat([PAD_START, normal, PAD_END]).toString()
  fs.echo(comment() + uglify.minify(normalVer).code, './dist/anot.js')
  log(chalk.green('anot.js 打包压缩完成!'))

  /**
   * --------------------------------------------------------
   * 打包带触摸事件的普通版 anot
   * --------------------------------------------------------
   */
  log('正在打包 anot-touch.js...')
  let touchNormalVer = Buffer.concat([
    PAD_START,
    touchNormal,
    PAD_END
  ]).toString()

  fs.echo(
    comment({ touch: true }) + uglify.minify(touchNormalVer).code,
    './dist/anot-touch.js'
  )

  log(chalk.green('anot-touch.js 打包压缩完成...'))

  /**
   * --------------------------------------------------------
   * 打包自带AMD加载器的 anot
   * --------------------------------------------------------
   */
  log('正在打包 anot.shim.js...')
  let shimVer = Buffer.concat([PAD_START_SHIM, shim, PAD_END_SHIM]).toString()
  fs.echo(
    comment({ amd: true }) + uglify.minify(shimVer).code,
    './dist/anot.shim.js'
  )
  log(chalk.green('anot.shim.js 打包压缩完成!'))

  /**
   * --------------------------------------------------------
   * 打包自带AMD加载器及触摸事件的 anot
   * --------------------------------------------------------
   */
  log('正在打包 anot-touch.shim.js...')
  let touchShimVer = Buffer.concat([
    PAD_START_SHIM,
    touchShim,
    PAD_END_SHIM
  ]).toString()
  fs.echo(
    comment({ amd: true, touch: true }) + uglify.minify(touchShimVer).code,
    './dist/anot-touch.shim.js'
  )
  log(chalk.green('anot-touch.shim.js 打包压缩完成...'))

  /**
   * --------------------------------------------------------
   * 打包未来版的 anot
   * --------------------------------------------------------
   */
  log('正在打包 anot.next.js...')
  let nextVer = Buffer.concat([PAD_START, normal, PAD_END_NEXT]).toString()
  fs.echo(
    comment({ next: true }) + uglify.minify(nextVer).code,
    './dist/anot.next.js'
  )
  log(chalk.green('anot.next.js 打包压缩完成!'))

  /**
   * --------------------------------------------------------
   * 打包带触摸事件的未来版的 anot
   * --------------------------------------------------------
   */
  log('正在打包 anot-touch.next.js...')
  let touchNextVer = Buffer.concat([
    PAD_START,
    touchNormal,
    PAD_END_NEXT
  ]).toString()
  fs.echo(
    comment({ touch: true, next: true }) + uglify.minify(touchNextVer).code,
    './dist/anot-touch.next.js'
  )
  log(chalk.green('anot-touch.next.js 打包压缩完成!'))
}

let args = process.argv.slice(2)
let mode = args.shift()
let ready = false

switch (mode) {
  case 'dev':
    chokidar
      .watch(path.resolve('./src/'))
      .on('all', (act, file) => {
        if (!ready) {
          return
        }
        if (act === 'add' || act === 'change') {
          packNoCompress(file)
        }
      })
      .on('ready', () => {
        log('正在执行首次打包...')
        loadFiles()
        packNoCompress()
        log(chalk.red('预处理完成,监听文件变化中,请勿关闭本窗口...'))
        ready = true
      })
    break
  case 'prod':
    loadFiles()
    packAndCompress()
    break
  default:
    log(chalk.red('无效编译参数!'))
    let buf = Buffer.concat(loadFiles())
    log(buf.toString())
    break
}
