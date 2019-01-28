/*********************************************************************
 *                    全局变量及方法                                   *
 **********************************************************************/
const CSS_DEPS = {}
let bindingID = 1024
let IEVersion = 0
if (window.VBArray) {
  IEVersion = document.documentMode || (window.XMLHttpRequest ? 7 : 6)
}
let expose = generateID()
//http://stackoverflow.com/questions/7290086/javascript-use-strict-and-nicks-find-global-function
let DOC = window.document
let head = DOC.head //HEAD元素
head.insertAdjacentHTML(
  'afterbegin',
  '<anot skip class="anot-hide"><style id="anot-style">.anot-hide{ display: none!important } slot{visibility:hidden;}</style></anot>'
)
let ifGroup = head.firstChild

function log() {
  // http://stackoverflow.com/questions/8785624/how-to-safely-wrap-console-log
  console.log.apply(console, arguments)
}

/**
 * Creates a new object without a prototype. This object is useful for lookup without having to
 * guard against prototypically inherited properties via hasOwnProperty.
 *
 * Related micro-benchmarks:
 * - http://jsperf.com/object-create2
 * - http://jsperf.com/proto-map-lookup/2
 * - http://jsperf.com/for-in-vs-object-keys2
 */
function createMap() {
  return Object.create(null)
}

let subscribers = '$' + expose

let nullObject = {} //作用类似于noop，只用于代码防御，千万不要在它上面添加属性
let rword = /[^, ]+/g //切割字符串为一个个小块，以空格或豆号分开它们，结合replace实现字符串的forEach
let rw20g = /\w+/g
let rsvg = /^\[object SVG\w*Element\]$/
let oproto = Object.prototype
let ohasOwn = oproto.hasOwnProperty
let serialize = oproto.toString
let ap = Array.prototype
let aslice = ap.slice
let W3C = window.dispatchEvent
let root = DOC.documentElement
let anotFragment = DOC.createDocumentFragment()
let cinerator = DOC.createElement('div')
let class2type = {
  '[object Boolean]': 'boolean',
  '[object Number]': 'number',
  '[object String]': 'string',
  '[object Function]': 'function',
  '[object Array]': 'array',
  '[object Date]': 'date',
  '[object RegExp]': 'regexp',
  '[object Object]': 'object',
  '[object Error]': 'error',
  '[object AsyncFunction]': 'asyncfunction',
  '[object Promise]': 'promise',
  '[object Generator]': 'generator',
  '[object GeneratorFunction]': 'generatorfunction'
}

function noop() {}
function scpCompile(array) {
  return Function.apply(noop, array)
}

function oneObject(array, val) {
  if (typeof array === 'string') {
    array = array.match(rword) || []
  }
  let result = {},
    value = val !== void 0 ? val : 1
  for (let i = 0, n = array.length; i < n; i++) {
    result[array[i]] = value
  }
  return result
}

function generateID(mark) {
  mark = (mark && mark + '-') || 'anot-'
  return mark + (++bindingID).toString(16)
}

/*********************************************************************
 *                   css import                                      *
 **********************************************************************/

function getBaseUrl() {
  if (window.LIBS_BASE_URL) {
    return
  }
  let stack
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
  window.LIBS_BASE_URL = stack.replace(
    /^([a-z\-]*):\/\/([^\/]+)(\/.*)?/,
    '$1://$2'
  )
}

function importCss(url, baseUrl) {
  url = url.replace(/^\/+/, '/')
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
    'afterbegin',
    '<link rel="stylesheet" href="' + url + '">'
  )
  CSS_DEPS[url] = 1
}

getBaseUrl()
