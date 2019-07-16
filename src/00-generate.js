/*********************************************************************
 *                    全局变量及方法                                   *
 **********************************************************************/
var bindingID = 1024

var expose = generateID()
//http://stackoverflow.com/questions/7290086/javascript-use-strict-and-nicks-find-global-function
var DOC = window.document
var head = DOC.head //HEAD元素
head.insertAdjacentHTML(
  'afterbegin',
  '<anot skip class="anot-hide"><style id="anot-style">.anot-hide{ display: none!important } slot{visibility:hidden;}</style></anot>'
)
var ifGroup = head.firstChild

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

var subscribers = '$' + expose

var nullObject = {} //作用类似于noop，只用于代码防御，千万不要在它上面添加属性
var rword = /[^, ]+/g //切割字符串为一个个小块，以空格或豆号分开它们，结合replace实现字符串的forEach
var rw20g = /\w+/g
var rsvg = /^\[object SVG\w*Element\]$/
var oproto = Object.prototype
var ohasOwn = oproto.hasOwnProperty
var serialize = oproto.toString
var ap = Array.prototype
var aslice = ap.slice
var root = DOC.documentElement
var anotFragment = DOC.createDocumentFragment()
var cinerator = DOC.createElement('div')
var class2type = {
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
  var result = {},
    value = val !== void 0 ? val : 1
  for (var i = 0, n = array.length; i < n; i++) {
    result[array[i]] = value
  }
  return result
}

function generateID(mark) {
  mark = (mark && mark + '-') || 'anot-'
  return mark + (++bindingID).toString(16)
}
