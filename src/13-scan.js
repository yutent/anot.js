/*********************************************************************
 *                           扫描系统                                 *
 **********************************************************************/

//http://www.w3.org/TR/html5/syntax.html#void-elements
var stopScan = oneObject(
  'area,base,basefont,br,col,command,embed,hr,img,input,link,meta,param,source,track,wbr,noscript,script,style,textarea'.toUpperCase()
)
function isWidget(el) {
  //如果是组件,则返回组件的名字
  var name = el.nodeName.toLowerCase()
  if (/^anot-([a-z][a-z0-9\-]*)$/.test(name)) {
    return RegExp.$1
  }
  return null
}

function isRef(el) {
  return el.hasAttribute('ref') ? el.getAttribute('ref') : null
}

function checkScan(elem, callback, innerHTML) {
  var id = setTimeout(function() {
    var currHTML = elem.innerHTML
    clearTimeout(id)
    if (currHTML === innerHTML) {
      callback()
    } else {
      checkScan(elem, callback, currHTML)
    }
  })
}

function getBindingCallback(elem, name, vmodels) {
  var callback = elem.getAttribute(name)
  if (callback) {
    for (var i = 0, vm; (vm = vmodels[i++]); ) {
      if (vm.hasOwnProperty(callback) && typeof vm[callback] === 'function') {
        return vm[callback]
      }
    }
  }
}

function executeBindings(bindings, vmodels) {
  for (var i = 0, binding; (binding = bindings[i++]); ) {
    binding.vmodels = vmodels
    directives[binding.type].init(binding)

    Anot.injectBinding(binding)
    if (binding.getter && binding.element.nodeType === 1) {
      //移除数据绑定，防止被二次解析
      //chrome使用removeAttributeNode移除不存在的特性节点时会报错
      binding.element.removeAttribute(binding.name)
    }
  }
  bindings.length = 0
}

//https://github.com/RubyLouvre/Anot/issues/636
var mergeTextNodes =
  IEVersion && window.MutationObserver
    ? function(elem) {
        var node = elem.firstChild,
          text
        while (node) {
          var aaa = node.nextSibling
          if (node.nodeType === 3) {
            if (text) {
              text.nodeValue += node.nodeValue
              elem.removeChild(node)
            } else {
              text = node
            }
          } else {
            text = null
          }
          node = aaa
        }
      }
    : 0
var roneTime = /^\s*::/
var rmsAttr = /:(\w+)-?(.*)/

var events = oneObject(
  'animationend,blur,change,input,click,dblclick,focus,keydown,keypress,keyup,mousedown,mouseenter,mouseleave,mousemove,mouseout,mouseover,mouseup,scan,scroll,submit'
)
var obsoleteAttrs = oneObject(
  'value,title,alt,checked,selected,disabled,readonly,enabled,href,src'
)
function bindingSorter(a, b) {
  return a.priority - b.priority
}

var rnoCollect = /^(:\S+|data-\S+|on[a-z]+|style|class)$/
var ronattr = '__fn__'
var specifiedVars = [':disabled', ':loading', ':value']
var filterTypes = ['html', 'text', 'attr', 'data']
function getOptionsFromTag(elem, vmodels) {
  var attributes = aslice.call(elem.attributes, 0)
  var ret = {}
  var vm = vmodels[0] || {}

  for (var i = 0, attr; (attr = attributes[i++]); ) {
    var name = attr.name
    if (
      (attr.specified && !rnoCollect.test(name)) ||
      specifiedVars.includes(name)
    ) {
      elem.removeAttribute(name)
      if (name.indexOf(ronattr) === 0) {
        name = attr.value.slice(6)
        ret[name] = elem[attr.value]
        delete elem[attr.value]
      } else {
        var camelizeName = camelize(name)
        if (camelizeName.indexOf('@') === 0) {
          camelizeName = camelizeName.slice(1)
          attr.value = attr.value.replace(/\(.*\)$/, '')
          if (vm.$id.slice(0, 10) === 'proxy-each') {
            vm = vm.$up
          }
          var fn = parseVmValue(vm, attr.value)
          if (fn && typeof fn === 'function') {
            ret[camelizeName] = fn.bind(vm)
          }
        } else {
          ret[camelizeName] = parseData(attr.value)
        }
      }
    }
  }
  return ret
}

function scanAttr(elem, vmodels, match) {
  var scanNode = true
  if (vmodels.length) {
    var attributes = elem.attributes
    var bindings = []
    var uniq = {}
    for (var i = 0, attr; (attr = attributes[i++]); ) {
      var name = attr.name
      if (uniq[name]) {
        //IE8下:for BUG
        continue
      }
      uniq[name] = 1
      if (attr.specified) {
        if ((match = name.match(rmsAttr))) {
          //如果是以指定前缀命名的
          var type = match[1]
          var param = match[2] || ''
          var value = attr.value
          if (events[type]) {
            param = type
            type = 'on'
          }
          if (directives[type]) {
            var newValue = value.replace(roneTime, '')
            var oneTime = value !== newValue
            var binding = {
              type: type,
              param: param,
              element: elem,
              name: name,
              expr: newValue,
              oneTime: oneTime,
              uuid: '_' + ++bindingID,
              priority:
                (directives[type].priority || type.charCodeAt(0) * 10) +
                (Number(param.replace(/\D/g, '')) || 0)
            }
            if (filterTypes.includes(type)) {
              var filters = getToken(value).filters
              binding.expr = binding.expr.replace(filters, '')
              binding.filters = filters
                .replace(rhasHtml, function() {
                  binding.type = 'html'
                  binding.group = 1
                  return ''
                })
                .trim() // jshint ignore:line
            } else if (type === 'duplex') {
              var hasDuplex = name
            } else if (name === ':if-loop') {
              binding.priority += 100
            } else if (name === ':attr-value') {
              var hasAttrValue = name
            }
            bindings.push(binding)
          }
        }
      }
    }
    if (bindings.length) {
      bindings.sort(bindingSorter)

      if (hasDuplex && hasAttrValue && elem.type === 'text') {
        log('warning!一个控件不能同时定义:attr-value与' + hasDuplex)
      }

      for (i = 0; (binding = bindings[i]); i++) {
        type = binding.type
        if (rnoscanAttrBinding.test(type)) {
          return executeBindings(bindings.slice(0, i + 1), vmodels)
        } else if (scanNode) {
          scanNode = !rnoscanNodeBinding.test(type)
        }
      }
      executeBindings(bindings, vmodels)
    }
  }
  if (
    scanNode &&
    !stopScan[elem.tagName] &&
    (isWidget(elem) ? elem.msResolved : 1)
  ) {
    mergeTextNodes && mergeTextNodes(elem)
    scanNodeList(elem, vmodels) //扫描子孙元素
  }
}

var rnoscanAttrBinding = /^if|for$/
var rnoscanNodeBinding = /^html|include$/

function scanNodeList(elem, vmodels) {
  var nodes = Anot.slice(elem.childNodes)
  scanNodeArray(nodes, vmodels)
}

function scanNodeArray(nodes, vmodels) {
  function _delay_component(name) {
    setTimeout(function() {
      Anot.component(name)
    })
  }
  for (var i = 0, node; (node = nodes[i++]); ) {
    switch (node.nodeType) {
      case 1:
        var elem = node
        if (
          !elem.msResolved &&
          elem.parentNode &&
          elem.parentNode.nodeType === 1
        ) {
          var widget = isWidget(elem)

          if (widget) {
            elem.setAttribute('is-widget', '')
            elem.removeAttribute(':if')
            elem.removeAttribute(':if-loop')
            componentQueue.push({
              element: elem,
              vmodels: vmodels,
              name: widget
            })
            if (Anot.components[widget]) {
              // log(widget, Anot.components)
              //确保所有:attr-name扫描完再处理
              _delay_component(widget)
            }
          } else {
            // 非组件才检查 ref属性
            var ref = isRef(elem)
            if (ref && vmodels.length) {
              vmodels[0].$refs[ref] = elem
            }
          }
        }

        scanTag(node, vmodels) //扫描元素节点

        if (node.msHasEvent) {
          Anot.fireDom(node, 'datasetchanged', {
            bubble: node.msHasEvent
          })
        }

        break
      case 3:
        if (rexpr.test(node.nodeValue)) {
          scanText(node, vmodels, i) //扫描文本节点
        }
        break
    }
  }
}

function scanTag(elem, vmodels) {
  //扫描顺序  skip(0) --> anot(1) --> :if(10) --> :for(90)
  //--> :if-loop(110) --> :attr(970) ...--> :duplex(2000)垫后
  var skip = elem.getAttribute('skip')
  var node = elem.getAttributeNode('anot')
  var vm = vmodels.concat()
  if (typeof skip === 'string') {
    return
  } else if (node) {
    var newVmodel = Anot.vmodels[node.value]
    var attrs = aslice.call(elem.attributes, 0)

    if (!newVmodel) {
      return
    }

    vm = [newVmodel]

    elem.removeAttribute(node.name) //removeAttributeNode不会刷新xx[anot]样式规则
    // 挂载VM对象到相应的元素上
    elem.__VM__ = newVmodel
    hideProperty(newVmodel, '$elem', elem)

    if (vmodels.length) {
      newVmodel.$up = vmodels[0]
      vmodels[0].$children.push(newVmodel)
      var props = {}
      attrs.forEach(function(attr) {
        if (/^:/.test(attr.name)) {
          var name = attr.name.match(rmsAttr)[1]
          var value = null
          if (!name || Anot.directives[name] || events[name]) {
            return
          }
          try {
            value = parseExpr(attr.value, vmodels, {}).apply(0, vmodels)
            value = toJson(value)
            elem.removeAttribute(attr.name)
            props[name] = value
          } catch (error) {
            log(
              'Props parse faild on (%s[class=%s]),',
              elem.nodeName,
              elem.className,
              attr,
              error + ''
            )
          }
        }
      })
      // 一旦设定了 props的类型, 就必须传入正确的值
      for (var k in newVmodel.props) {
        if (newVmodel.props[k] && newVmodel.props[k].type === 'PropsTypes') {
          if (newVmodel.props[k].check(props[k])) {
            newVmodel.props[k] = props[k]
            delete props[k]
          } else {
            console.error(
              new TypeError(
                'props.' +
                  k +
                  ' needs [' +
                  newVmodel.props[k].checkType +
                  '], but [' +
                  newVmodel.props[k].result +
                  '] given.'
              )
            )
          }
        }
      }
      Object.assign(newVmodel.props, props)
      props = undefined
    }
  }
  scanAttr(elem, vm) //扫描特性节点

  if (newVmodel) {
    setTimeout(function() {
      if (typeof newVmodel.$mounted === 'function') {
        newVmodel.$mounted()
      }
      delete newVmodel.$mounted
    })
  }
}
var rhasHtml = /\|\s*html(?:\b|$)/,
  r11a = /\|\|/g,
  rlt = /&lt;/g,
  rgt = /&gt;/g,
  rstringLiteral = /(['"])(\\\1|.)+?\1/g,
  rline = /\r?\n/g
function getToken(value) {
  if (value.indexOf('|') > 0) {
    var scapegoat = value.replace(rstringLiteral, function(_) {
      return Array(_.length + 1).join('1') // jshint ignore:line
    })
    var index = scapegoat.replace(r11a, '\u1122\u3344').indexOf('|') //干掉所有短路或
    if (index > -1) {
      return {
        type: 'text',
        filters: value.slice(index).trim(),
        expr: value.slice(0, index)
      }
    }
  }
  return {
    type: 'text',
    expr: value,
    filters: ''
  }
}

function scanExpr(str) {
  var tokens = [],
    value,
    start = 0,
    stop
  do {
    stop = str.indexOf(openTag, start)
    if (stop === -1) {
      break
    }
    value = str.slice(start, stop)
    if (value) {
      // {{ 左边的文本
      tokens.push({
        expr: value
      })
    }
    start = stop + openTag.length
    stop = str.indexOf(closeTag, start)
    if (stop === -1) {
      break
    }
    value = str.slice(start, stop)
    if (value) {
      //处理{{ }}插值表达式
      tokens.push(getToken(value.replace(rline, '')))
    }
    start = stop + closeTag.length
  } while (1)
  value = str.slice(start)
  if (value) {
    //}} 右边的文本
    tokens.push({
      expr: value
    })
  }
  return tokens
}

function scanText(textNode, vmodels, index) {
  var bindings = [],
    tokens = scanExpr(textNode.data)
  if (tokens.length) {
    for (var i = 0, token; (token = tokens[i++]); ) {
      var node = DOC.createTextNode(token.expr) //将文本转换为文本节点，并替换原来的文本节点
      if (token.type) {
        token.expr = token.expr.replace(roneTime, function() {
          token.oneTime = true
          return ''
        }) // jshint ignore:line
        token.element = node
        token.filters = token.filters.replace(rhasHtml, function() {
          token.type = 'html'
          return ''
        }) // jshint ignore:line
        token.pos = index * 1000 + i
        bindings.push(token) //收集带有插值表达式的文本
      }
      anotFragment.appendChild(node)
    }
    textNode.parentNode.replaceChild(anotFragment, textNode)
    if (bindings.length) executeBindings(bindings, vmodels)
  }
}
