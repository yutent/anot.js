Anot.directive('for', {
  priority: 90,
  init: function(binding) {
    var type = binding.type
    binding.cache = {} //用于存放代理VM
    binding.enterCount = 0

    var elem = binding.element
    if (elem.nodeType === 1) {
      var vars = binding.expr.split(' in ')
      binding.expr = vars.pop()
      if (vars.length) {
        vars = vars.pop().split(/\s+/)
      }
      binding.vars = vars
      elem.removeAttribute(binding.name)
      effectBinding(elem, binding)
      var rendered = getBindingCallback(elem, 'data-rendered', binding.vmodels)

      var signature = generateID(type)
      var start = DOC.createComment(signature + ':start')
      var end = (binding.element = DOC.createComment(signature + ':end'))
      binding.signature = signature
      binding.start = start
      binding.template = anotFragment.cloneNode(false)

      var _parent = elem.parentNode
      _parent.replaceChild(end, elem)
      _parent.insertBefore(start, end)
      binding.template.appendChild(elem)

      binding.element = end

      if (rendered) {
        var removeFn = Anot.bind(_parent, 'datasetchanged', function() {
          rendered.apply(_parent, _parent.args)
          Anot.unbind(_parent, 'datasetchanged', removeFn)
          _parent.msRendered = rendered
        })
      }
    }
  },
  update: function(value, oldValue) {
    var binding = this
    var xtype = this.xtype

    if (xtype === 'array') {
      if (!this.vars.length) {
        this.vars.push('$index', 'el')
      } else if (this.vars.length === 1) {
        this.vars.unshift('$index')
      }
      this.param = this.vars[1]
    } else {
      this.param = '__el__'
      if (!this.vars.length) {
        this.vars.push('$key', '$val')
      } else if (this.vars.length === 1) {
        this.vars.push('$val')
      }
    }

    this.enterCount += 1
    var init = !oldValue
    if (init) {
      binding.$outer = {}
      var check0 = this.vars[0]
      var check1 = this.vars[1]
      if (xtype === 'array') {
        check0 = '$first'
        check1 = '$last'
      }
      for (var i = 0, v; (v = binding.vmodels[i++]); ) {
        if (v.hasOwnProperty(check0) && v.hasOwnProperty(check1)) {
          binding.$outer = v
          break
        }
      }
    }
    var track = this.track
    var action = 'move'
    binding.$repeat = value
    var fragments = []
    var transation = init && anotFragment.cloneNode(false)
    var proxies = []
    var param = this.param
    var retain = Anot.mix({}, this.cache)
    var elem = this.element
    var length = track.length

    var _parent = elem.parentNode

    //检查新元素数量
    var newCount = 0
    for (i = 0; i < length; i++) {
      var keyOrId = track[i]
      if (!retain[keyOrId]) newCount++
    }
    var oldCount = 0
    for (i in retain) {
      oldCount++
    }
    var clear = (!length || newCount === length) && oldCount > 10 //当全部是新元素,且移除元素较多(10)时使用clear

    var kill = elem.previousSibling
    var start = binding.start

    if (clear) {
      while (kill !== start) {
        _parent.removeChild(kill)
        kill = elem.previousSibling
      }
    }

    for (i = 0; i < length; i++) {
      keyOrId = track[i] //array为随机数, object 为keyName
      var proxy = retain[keyOrId]
      if (!proxy) {
        // log(this)
        proxy = getProxyVM(this)
        proxy.$up = this.vmodels[0]
        if (xtype === 'array') {
          action = 'add'
          proxy.$id = keyOrId
          var valueItem = value[i]
          proxy[param] = valueItem //index
          if (Object(valueItem) === valueItem) {
            hideProperty(valueItem, '$ups', valueItem.$ups || {})
            valueItem.$ups[param] = proxy
          }
        } else {
          action = 'append'
          proxy[check0] = keyOrId
          proxy[check1] = value[keyOrId] //key
          var tmp = {}
          tmp[check0] = proxy[check0]
          tmp[check1] = proxy[check1]
          proxy[param] = tmp
        }
        this.cache[keyOrId] = proxy
        var node = proxy.$anchor || (proxy.$anchor = elem.cloneNode(false))
        node.nodeValue = this.signature
        shimController(
          binding,
          transation,
          proxy,
          fragments,
          init && !binding.effectDriver
        )
        decorateProxy(proxy, binding, xtype)
      } else {
        fragments.push({})
        retain[keyOrId] = true
      }

      //重写proxy
      if (this.enterCount === 1) {
        //防止多次进入,导致位置不对
        proxy.$active = false
        proxy.$oldIndex = proxy.$index
        proxy.$active = true
        proxy.$index = i
      }

      if (xtype === 'array') {
        proxy.$first = i === 0
        proxy.$last = i === length - 1
        proxy[this.vars[0]] = proxy.$index
      } else {
        proxy[check1] = toJson(value[keyOrId]) //这里是处理vm.object = newObject的情况
      }
      proxies.push(proxy)
    }
    this.proxies = proxies
    if (init && !binding.effectDriver) {
      _parent.insertBefore(transation, elem)
      fragments.forEach(function(fragment) {
        scanNodeArray(fragment.nodes || [], fragment.vmodels)
        //if(fragment.vmodels.length > 2)
        fragment.nodes = fragment.vmodels = null
      }) // jshint ignore:line
    } else {
      var staggerIndex = (binding.staggerIndex = 0)
      for (keyOrId in retain) {
        if (retain[keyOrId] !== true) {
          action = 'del'
          !clear && removeItem(retain[keyOrId].$anchor, binding, true)
          // 相当于delete binding.cache[key]
          proxyRecycler(this.cache, keyOrId, param)
          retain[keyOrId] = null
        }
      }

      for (i = 0; i < length; i++) {
        proxy = proxies[i]
        keyOrId = xtype === 'array' ? proxy.$id : proxy.$key
        var pre = proxies[i - 1]
        var preEl = pre ? pre.$anchor : binding.start
        if (!retain[keyOrId]) {
          //如果还没有插入到DOM树,进行插入动画
          ;(function(fragment, preElement) {
            var nodes = fragment.nodes
            var vmodels = fragment.vmodels
            if (nodes) {
              staggerIndex = mayStaggerAnimate(
                binding.effectEnterStagger,
                function() {
                  _parent.insertBefore(fragment.content, preElement.nextSibling)
                  scanNodeArray(nodes, vmodels)
                  !init && animateRepeat(nodes, 1, binding)
                },
                staggerIndex
              )
            }
            fragment.nodes = fragment.vmodels = null
          })(fragments[i], preEl) // jshint ignore:line
        } else if (proxy.$index !== proxy.$oldIndex) {
          //进行移动动画
          ;(function(proxy2, preElement) {
            staggerIndex = mayStaggerAnimate(
              binding.effectEnterStagger,
              function() {
                var curNode = removeItem(proxy2.$anchor)
                var inserted = Anot.slice(curNode.childNodes)
                _parent.insertBefore(curNode, preElement.nextSibling)
                animateRepeat(inserted, 1, binding)
              },
              staggerIndex
            )
          })(proxy, preEl) // jshint ignore:line
        }
      }
    }
    if (!value.$track) {
      //如果是非监控对象,那么就将其$events清空,阻止其持续监听
      for (keyOrId in this.cache) {
        proxyRecycler(this.cache, keyOrId, param)
      }
    }

    // :for --> duplex
    ;(function(args) {
      _parent.args = args
      if (_parent.msRendered) {
        //第一次事件触发,以后直接调用
        _parent.msRendered.apply(_parent, args)
      }
    })(kernel.newWatch ? arguments : [action])
    var id = setTimeout(function() {
      clearTimeout(id)
      //触发上层的select回调及自己的rendered回调
      Anot.fireDom(_parent, 'datasetchanged', {
        bubble: _parent.msHasEvent
      })
    })
    this.enterCount -= 1
  }
})

function animateRepeat(nodes, isEnter, binding) {
  for (var i = 0, node; (node = nodes[i++]); ) {
    if (node.className === binding.effectClass) {
      Anot.effect.apply(node, isEnter, noop, noop, binding)
    }
  }
}

function mayStaggerAnimate(staggerTime, callback, index) {
  if (staggerTime) {
    setTimeout(callback, ++index * staggerTime)
  } else {
    callback()
  }
  return index
}

function removeItem(node, binding, flagRemove) {
  var fragment = anotFragment.cloneNode(false)
  var last = node
  var breakText = last.nodeValue
  var staggerIndex = binding && Math.max(+binding.staggerIndex, 0)
  var nodes = Anot.slice(last.parentNode.childNodes)
  var index = nodes.indexOf(last)
  while (true) {
    var pre = nodes[--index] //node.previousSibling
    if (!pre || String(pre.nodeValue).indexOf(breakText) === 0) {
      break
    }
    if (!flagRemove && binding && pre.className === binding.effectClass) {
      node = pre
      ;(function(cur) {
        binding.staggerIndex = mayStaggerAnimate(
          binding.effectLeaveStagger,
          function() {
            Anot.effect.apply(
              cur,
              0,
              noop,
              function() {
                fragment.appendChild(cur)
              },
              binding
            )
          },
          staggerIndex
        )
      })(pre) // jshint ignore:line
    } else {
      fragment.insertBefore(pre, fragment.firstChild)
    }
  }
  fragment.appendChild(last)
  return fragment
}

function shimController(data, transation, proxy, fragments, init) {
  var content = data.template.cloneNode(true)
  var nodes = Anot.slice(content.childNodes)
  content.appendChild(proxy.$anchor)
  init && transation.appendChild(content)
  var itemName = data.param || 'el'
  var valueItem = proxy[itemName],
    nv

  nv = [proxy].concat(data.vmodels)

  var fragment = {
    nodes: nodes,
    vmodels: nv,
    content: content
  }
  fragments.push(fragment)
}
// {}  -->  {xx: 0, yy: 1, zz: 2} add
// {xx: 0, yy: 1, zz: 2}  -->  {xx: 0, yy: 1, zz: 2, uu: 3}
// [xx: 0, yy: 1, zz: 2}  -->  {xx: 0, zz: 1, yy: 2}

function getProxyVM(binding) {
  var agent = binding.xtype === 'object' ? withProxyAgent : eachProxyAgent
  var proxy = agent(binding)
  var node = proxy.$anchor || (proxy.$anchor = binding.element.cloneNode(false))
  node.nodeValue = binding.signature
  proxy.$outer = binding.$outer
  return proxy
}

function decorateProxy(proxy, binding, type) {
  if (type === 'array') {
    proxy.$remove = function() {
      binding.$repeat.removeAt(proxy.$index)
    }
    var param = binding.param
    proxy.$watch(param, function(val) {
      var index = proxy.$index
      binding.$repeat[index] = val
    })
  } else {
    var __k__ = binding.vars[0]
    var __v__ = binding.vars[1]
    proxy.$up.$watch(binding.expr + '.' + proxy[__k__], function(val) {
      proxy[binding.param][__v__] = val
      proxy[__v__] = val
    })
  }
}

var eachProxyPool = []

function eachProxyAgent(data, proxy) {
  var itemName = data.param || 'el'
  for (var i = 0, n = eachProxyPool.length; i < n; i++) {
    var candidate = eachProxyPool[i]
    if (candidate && candidate.hasOwnProperty(itemName)) {
      eachProxyPool.splice(i, 1)
      proxy = candidate
      break
    }
  }
  if (!proxy) {
    proxy = eachProxyFactory(data)
  }
  return proxy
}

function eachProxyFactory(data) {
  var itemName = data.param || 'el'
  var __k__ = data.vars[0]
  var source = {
    $outer: {},
    $index: 0,
    $oldIndex: 0,
    $anchor: null,
    //-----
    $first: false,
    $last: false,
    $remove: Anot.noop
  }
  source[__k__] = 0
  source[itemName] = NaN
  var force = {
    $last: 1,
    $first: 1,
    $index: 1
  }
  force[__k__] = 1
  force[itemName] = 1
  var proxy = modelFactory(
    { state: source },
    {
      force: force
    }
  )
  proxy.$id = generateID('proxy-each')
  return proxy
}

var withProxyPool = []

function withProxyAgent(data) {
  return withProxyPool.pop() || withProxyFactory(data)
}

function withProxyFactory(data) {
  var itemName = data.param || '__el__'
  var __k__ = data.vars[0]
  var __v__ = data.vars[1]
  var source = {
    $index: 0,
    $oldIndex: 0,
    $outer: {},
    $anchor: null
  }
  source[__k__] = ''
  source[__v__] = NaN
  source[itemName] = NaN
  var force = {
    __el__: 1,
    $index: 1
  }
  force[__k__] = 1
  force[__v__] = 1
  var proxy = modelFactory(
    { state: source },
    {
      force: force
    }
  )
  proxy.$id = generateID('proxy-with')
  return proxy
}

function proxyRecycler(cache, key, param) {
  var proxy = cache[key]
  if (proxy) {
    var proxyPool =
      proxy.$id.indexOf('proxy-each') === 0 ? eachProxyPool : withProxyPool
    proxy.$outer = {}

    for (var i in proxy.$events) {
      var a = proxy.$events[i]
      if (Array.isArray(a)) {
        a.length = 0
        if (i === param) {
          proxy[param] = NaN
        } else if (i === '$val') {
          proxy.$val = NaN
        }
      }
    }

    if (proxyPool.unshift(proxy) > kernel.maxRepeatSize) {
      proxyPool.pop()
    }
    delete cache[key]
  }
}
