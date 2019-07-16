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
const VERSION = '2.0.0'

const PACK_DIR = path.resolve('./dist')
const SOURCE_DIR = path.resolve('./src/')

const PAD_START = Buffer.from(`
const _Anot = (function() {
`)

const PAD_END = Buffer.from(`

/*********************************************************************
 *                    DOMReady                                       *
 **********************************************************************/

  let readyList = []
  let isReady
  let fireReady = function(fn) {
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
  window.Anot = Anot
  return Anot
})()
export default _Anot
`)

function comment({ touch } = {}) {
  return `/*==================================================
 * Anot ${touch ? 'touch' : 'normal'} version for future browsers
 * @authors yutent (yutent@doui.cc)
 * @date    2017-03-21 21:05:57
 * V${VERSION}
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

  let normalVer = Buffer.concat(libs)
  let touchVer = Buffer.concat([normalVer, touchModule])

  /**
   * --------------------------------------------------------
   * 打包未来版的 anot
   * --------------------------------------------------------
   */
  fs.echo(Buffer.concat([PAD_START, normalVer, PAD_END]), './dist/anot.js')
  log('%s 打包完成...', chalk.green('anot.js'))

  /**
   * --------------------------------------------------------
   * 打包带触摸事件的未来版的 anot
   * --------------------------------------------------------
   */
  fs.echo(Buffer.concat([PAD_START, touchVer, PAD_END]), './dist/anot-touch.js')
  log('%s 打包完成...', chalk.green('anot-touch.js'))
}

// 打包并压缩
function packAndCompress() {
  let libs = LIB_QUEUE.map(it => {
    return BUFFER_CACHE[it]
  })
  let touchModule = fs.cat('./src/lib/touch.js')

  let normalVer = Buffer.concat(libs)
  let touchVer = Buffer.concat([normalVer, touchModule])

  /**
   * --------------------------------------------------------
   * 打包未来版的 anot
   * --------------------------------------------------------
   */
  log('正在打包 anot.js...')
  let normalVerPack = Buffer.concat([PAD_START, normalVer, PAD_END]).toString()
  fs.echo(comment() + uglify.minify(normalVerPack).code, './dist/anot.js')
  log(chalk.green('anot.js 打包压缩完成!'))

  /**
   * --------------------------------------------------------
   * 打包带触摸事件的未来版的 anot
   * --------------------------------------------------------
   */
  log('正在打包 anot-touch.js...')
  let touchVerPack = Buffer.concat([PAD_START, touchVer, PAD_END]).toString()

  fs.echo(
    comment({ touch: true }) + uglify.minify(touchVerPack).code,
    './dist/anot-touch.js'
  )
  log(chalk.green('anot-touch.js 打包压缩完成!'))
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
    break
}
