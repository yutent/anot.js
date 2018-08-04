/************************************************************************
 *              HTML处理(parseHTML, innerHTML, clearHTML)                *
 *************************************************************************/

//parseHTML的辅助变量
var tagHooks = new function() {
  // jshint ignore:line
  Anot.mix(this, {
    option: DOC.createElement('select'),
    thead: DOC.createElement('table'),
    td: DOC.createElement('tr'),
    area: DOC.createElement('map'),
    tr: DOC.createElement('tbody'),
    col: DOC.createElement('colgroup'),
    legend: DOC.createElement('fieldset'),
    _default: DOC.createElement('div'),
    g: DOC.createElementNS('http://www.w3.org/2000/svg', 'svg')
  })
  this.optgroup = this.option
  this.tbody = this.tfoot = this.colgroup = this.caption = this.thead
  this.th = this.td
}() // jshint ignore:line
String(
  'circle,defs,ellipse,image,line,path,polygon,polyline,rect,symbol,text,use'
).replace(rword, function(tag) {
  tagHooks[tag] = tagHooks.g //处理SVG
})

var rtagName = /<([\w:]+)/
var rxhtml = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi
var scriptTypes = oneObject([
  '',
  'text/javascript',
  'text/ecmascript',
  'application/ecmascript',
  'application/javascript'
])
var script = DOC.createElement('script')
var rhtml = /<|&#?\w+;/

Anot.parseHTML = function(html) {
  var fragment = anotFragment.cloneNode(false)
  if (typeof html !== 'string') {
    return fragment
  }
  if (!rhtml.test(html)) {
    fragment.appendChild(DOC.createTextNode(html))
    return fragment
  }
  html = html.replace(rxhtml, '<$1></$2>').trim()
  var tag = (rtagName.exec(html) || ['', ''])[1].toLowerCase(),
    //取得其标签名
    wrapper = tagHooks[tag] || tagHooks._default,
    firstChild
  wrapper.innerHTML = html
  var els = wrapper.getElementsByTagName('script')
  if (els.length) {
    //使用innerHTML生成的script节点不会发出请求与执行text属性
    for (var i = 0, el; (el = els[i++]); ) {
      if (scriptTypes[el.type]) {
        var neo = script.cloneNode(false) //FF不能省略参数
        ap.forEach.call(el.attributes, function(attr) {
          neo.setAttribute(attr.name, attr.value)
        }) // jshint ignore:line
        neo.text = el.text
        el.parentNode.replaceChild(neo, el)
      }
    }
  }

  while ((firstChild = wrapper.firstChild)) {
    // 将wrapper上的节点转移到文档碎片上！
    fragment.appendChild(firstChild)
  }
  return fragment
}

Anot.innerHTML = function(node, html) {
  var a = this.parseHTML(html)
  this.clearHTML(node).appendChild(a)
}

Anot.clearHTML = function(node) {
  node.textContent = ''
  while (node.firstChild) {
    node.removeChild(node.firstChild)
  }
  return node
}
