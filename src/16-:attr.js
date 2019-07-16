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
      // 是否直接替换当前容器
      var outer = (binding.includeReplace = elem.hasAttribute('replace'))
      if (elem.hasAttribute('cache')) {
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

    val = toJson(val)

    if (this.param) {
      if (val && typeof val === 'object') {
        if (Array.isArray(val)) {
          obj[this.param] = val
        } else {
          if (Date.isDate(val)) {
            obj[this.param] = val.toISOString()
          } else {
            obj[this.param] = val
          }
        }
      } else {
        obj[this.param] = val
      }
    } else {
      if (
        !val ||
        typeof val !== 'object' ||
        Array.isArray(val) ||
        Date.isDate(val)
      ) {
        return
      }

      obj = val
    }

    for (var i in obj) {
      if (i === 'style') {
        elem.style.cssText = obj[i]
        continue
      }
      if (i === 'href' || i === 'src') {
        elem[i] = obj[i]
      } else {
        if (obj[i] === false || obj[i] === null || obj[i] === undefined) {
          obj[i] = ''
        }

        if (typeof elem[boolMap[i]] === 'boolean') {
          //布尔属性必须使用el.xxx = true|false方式设值
          obj[i] = !!obj[i]
          elem[boolMap[i]] = obj[i]

          if (!obj[i]) {
            elem.removeAttribute(boolMap[i])
            continue
          }
        }

        //SVG只能使用setAttribute(xxx, yyy), VML只能使用elem.xxx = yyy ,HTML的固有属性必须elem.xxx = yyy
        var isInnate = rsvg.test(elem) ? false : i in elem.cloneNode(false)
        if (isInnate) {
          elem[i] = obj[i]
        } else {
          if (typeof obj[i] === 'object') {
            obj[i] = Date.isDate(obj[i])
              ? obj[i].toISOString()
              : JSON.stringify(obj[i])
          }
          elem.setAttribute(i, obj[i])
        }
      }
    }
  }
})
