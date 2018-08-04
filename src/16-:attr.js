var bools = [
  'autofocus,autoplay,async,allowTransparency,checked,controls',
  'declare,disabled,defer,defaultChecked,defaultSelected',
  'contentEditable,isMap,loop,multiple,noHref,noResize,noShade',
  'open,readOnly,selected'
].join(',')
var boolMap = {}
bools.replace(rword, function(name) {
  boolMap[name.toLowerCase()] = name
})

var propMap = {
  //属性名映射
  'accept-charset': 'acceptCharset',
  char: 'ch',
  charoff: 'chOff',
  class: 'className',
  for: 'htmlFor',
  'http-equiv': 'httpEquiv'
}

var anomaly = [
  'accessKey,bgColor,cellPadding,cellSpacing,codeBase,codeType,colSpan',
  'dateTime,defaultValue,frameBorder,longDesc,maxLength,marginWidth,marginHeight',
  'rowSpan,tabIndex,useMap,vSpace,valueType,vAlign'
].join(',')
anomaly.replace(rword, function(name) {
  propMap[name.toLowerCase()] = name
})

var attrDir = Anot.directive('attr', {
  init: function(binding) {
    //{{aaa}} --> aaa
    //{{aaa}}/bbb.html --> (aaa) + "/bbb.html"
    binding.expr = normalizeExpr(binding.expr.trim())
    if (binding.type === 'include') {
      var elem = binding.element
      effectBinding(elem, binding)
      binding.includeRendered = getBindingCallback(
        elem,
        'data-rendered',
        binding.vmodels
      )
      binding.includeLoaded = getBindingCallback(
        elem,
        'data-loaded',
        binding.vmodels
      )
      var outer = (binding.includeReplace = !!Anot(elem).data('includeReplace'))
      if (Anot(elem).data('cache')) {
        binding.templateCache = {}
      }
      binding.start = DOC.createComment(':include')
      binding.end = DOC.createComment(':include-end')
      if (outer) {
        binding.element = binding.end
        binding._element = elem
        elem.parentNode.insertBefore(binding.start, elem)
        elem.parentNode.insertBefore(binding.end, elem.nextSibling)
      } else {
        elem.insertBefore(binding.start, elem.firstChild)
        elem.appendChild(binding.end)
      }
    }
  },
  update: function(val) {
    var elem = this.element
    var obj = {}
    var vm = this.vmodels[0]

    val = toJson(val)

    if (this.param) {
      if (typeof val === 'object' && val !== null) {
        if (Array.isArray(val)) {
          obj[this.param] = val
        } else {
          if (Date.isDate(val)) {
            obj[this.param] = val.toUTCString()
          } else {
            obj[this.param] = val
          }
        }
      } else {
        obj[this.param] = val
      }
    } else {
      if (!val || typeof val !== 'object' || Array.isArray(val)) {
        return
      }
      if (Date.isDate(val)) {
        return
      }

      obj = val
    }

    for (var i in obj) {
      if (i === 'style') {
        console.error('设置style样式, 请改用 :css指令')
        continue
      }
      // 通过属性设置回调,必须以@符号开头
      if (i.indexOf('@') === 0) {
        if (typeof obj[i] !== 'function') {
          continue
        }
      }
      if (i === 'href' || i === 'src') {
        //处理IE67自动转义的问题
        if (!root.hasAttribute) obj[i] = obj[i].replace(/&amp;/g, '&')

        elem[i] = obj[i]

        //chrome v37- 下embed标签动态设置的src，无法发起请求
        if (window.chrome && elem.tagName === 'EMBED') {
          var _parent = elem.parentNode
          var com = DOC.createComment(':src')
          _parent.replaceChild(com, elem)
          _parent.replaceChild(elem, com)
        }
      } else {
        var k = i
        //古董IE下，部分属性名字要进行映射
        if (!W3C && propMap[k]) {
          k = propMap[k]
        }
        if (obj[i] === false || obj[i] === null || obj[i] === undefined) {
          obj[i] = ''
        }

        if (typeof elem[boolMap[k]] === 'boolean') {
          //布尔属性必须使用el.xxx = true|false方式设值
          elem[boolMap[k]] = !!obj[i]

          //如果为false, IE全系列下相当于setAttribute(xxx, ''),会影响到样式,需要进一步处理
          if (!obj[i]) {
            obj[i] = !!obj[i]
          }
          if (obj[i] === false) {
            elem.removeAttribute(k)
            continue
          }
        }

        //SVG只能使用setAttribute(xxx, yyy), VML只能使用elem.xxx = yyy ,HTML的固有属性必须elem.xxx = yyy
        var isInnate = rsvg.test(elem)
          ? false
          : DOC.namespaces && isVML(elem)
            ? true
            : k in elem.cloneNode(false)
        if (isInnate) {
          elem[k] = obj[i]
        } else {
          if (typeof obj[i] === 'object') {
            obj[i] = Date.isDate(obj[i])
              ? obj[i].toUTCString()
              : JSON.stringify(obj[i])
          } else if (typeof obj[i] === 'function') {
            k = ronattr + camelize(k.slice(1))
            elem[k] = obj[i].bind(vm)
            obj[i] = k
          }
          elem.setAttribute(k, obj[i])
        }
      }
    }
  }
})
