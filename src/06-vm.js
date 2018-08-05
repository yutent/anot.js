function $watch(expr, binding) {
  var $events = this.$events || (this.$events = {}),
    queue = $events[expr] || ($events[expr] = [])

  if (typeof binding === 'function') {
    var backup = binding
    backup.uuid = '_' + ++bindingID
    binding = {
      element: root,
      type: 'user-watcher',
      handler: noop,
      vmodels: [this],
      expr: expr,
      uuid: backup.uuid
    }
    binding.wildcard = /\*/.test(expr)
  }

  if (!binding.update) {
    if (/\w\.*\B/.test(expr) || expr === '*') {
      binding.getter = noop
      var host = this
      binding.update = function() {
        var args = this.fireArgs || []
        if (args[2]) binding.handler.apply(host, args)
        delete this.fireArgs
      }
      queue.sync = true
      Anot.Array.ensure(queue, binding)
    } else {
      Anot.injectBinding(binding)
    }
    if (backup) {
      binding.handler = backup
    }
  } else if (!binding.oneTime) {
    Anot.Array.ensure(queue, binding)
  }

  return function() {
    binding.update = binding.getter = binding.handler = noop
    binding.element = DOC.createElement('a')
  }
}

function $emit(key, args) {
  var event = this.$events
  var _parent = null
  if (event && event[key]) {
    if (args) {
      args[2] = key
    }
    var arr = event[key]
    notifySubscribers(arr, args)
    if (args && event['*'] && !/\./.test(key)) {
      for (var sub, k = 0; (sub = event['*'][k++]); ) {
        try {
          sub.handler.apply(this, args)
        } catch (e) {}
      }
    }
    _parent = this.$up
    if (_parent) {
      if (this.$pathname) {
        $emit.call(_parent, this.$pathname + '.' + key, args) //以确切的值往上冒泡
      }
      $emit.call(_parent, '*.' + key, args) //以模糊的值往上冒泡
    }
  } else {
    _parent = this.$up
    if (this.$ups) {
      for (var i in this.$ups) {
        $emit.call(this.$ups[i], i + '.' + key, args) //以确切的值往上冒泡
      }
      return
    }
    if (_parent) {
      var p = this.$pathname
      if (p === '') p = '*'
      var path = p + '.' + key
      arr = path.split('.')

      args = (args && args.concat([path, key])) || [path, key]

      if (arr.indexOf('*') === -1) {
        $emit.call(_parent, path, args) //以确切的值往上冒泡
        arr[1] = '*'
        $emit.call(_parent, arr.join('.'), args) //以模糊的值往上冒泡
      } else {
        $emit.call(_parent, path, args) //以确切的值往上冒泡
      }
    }
  }
}

function collectDependency(el, key) {
  do {
    if (el.$watch) {
      var e = el.$events || (el.$events = {})
      var array = e[key] || (e[key] = [])
      dependencyDetection.collectDependency(array)
      return
    }
    el = el.$up
    if (el) {
      key = el.$pathname + '.' + key
    } else {
      break
    }
  } while (true)
}

function notifySubscribers(subs, args) {
  if (!subs) return
  if (new Date() - beginTime > 444 && typeof subs[0] === 'object') {
    rejectDisposeQueue()
  }
  var users = [],
    renders = []
  for (var i = 0, sub; (sub = subs[i++]); ) {
    if (sub.type === 'user-watcher') {
      users.push(sub)
    } else {
      renders.push(sub)
    }
  }
  if (kernel.async) {
    buffer.render() //1
    for (i = 0; (sub = renders[i++]); ) {
      if (sub.update) {
        sub.uuid = sub.uuid || '_' + ++bindingID
        var uuid = sub.uuid
        if (!buffer.queue[uuid]) {
          buffer.queue[uuid] = '__'
          buffer.queue.push(sub)
        }
      }
    }
  } else {
    for (i = 0; (sub = renders[i++]); ) {
      if (sub.update) {
        sub.update() //最小化刷新DOM树
      }
    }
  }
  for (i = 0; (sub = users[i++]); ) {
    if ((args && args[2] === sub.expr) || sub.wildcard) {
      sub.fireArgs = args
    }
    sub.update()
  }
}

//一些不需要被监听的属性
var kernelProps = oneObject(
  '$id,$watch,$fire,$events,$model,$active,$pathname,$up,$ups,$track,$accessors'
)

//如果浏览器不支持ecma262v5的Object.defineProperties或者存在BUG，比如IE8
//标准浏览器使用__defineGetter__, __defineSetter__实现

function modelFactory(source, options) {
  options = options || {}
  options.watch = true
  return observeObject(source, options)
}

function isSkip(k) {
  return k.charAt(0) === '$' || k.slice(0, 2) === '__' || kernelProps[k]
}

//监听对象属性值的变化(注意,数组元素不是数组的属性),通过对劫持当前对象的访问器实现
//监听对象或数组的结构变化, 对对象的键值对进行增删重排, 或对数组的进行增删重排,都属于这范畴
//   通过比较前后代理VM顺序实现
function Component() {}

function observeObject(source, options) {
  if (
    !source ||
    (source.$id && source.$accessors) ||
    (source.nodeName && source.nodeType > 0)
  ) {
    return source
  }
  //source为原对象,不能是元素节点或null
  //options,可选,配置对象,里面有old, force, watch这三个属性
  options = options || nullObject
  var force = options.force || nullObject
  var old = options.old
  var oldAccessors = (old && old.$accessors) || nullObject
  var $vmodel = new Component() //要返回的对象, 它在IE6-8下可能被偷龙转凤
  var accessors = {} //监控属性
  var hasOwn = {}
  var skip = []
  var simple = []
  var userSkip = {}
  // 提取 source中的配置项, 并删除相应字段
  var state = source.state
  var computed = source.computed
  var methods = source.methods
  var props = source.props
  var watches = source.watch
  var mounted = source.mounted

  delete source.state
  delete source.computed
  delete source.methods
  delete source.props
  delete source.watch

  if (source.skip) {
    userSkip = oneObject(source.skip)
    delete source.skip
  }

  // 基础数据
  if (state) {
    if (source.$id) {
      // 直接删除名为props的 字段, 对于主VM对象, props将作为保留关键字
      // 下面的计算属性,方法等, 作同样的逻辑处理
      delete state.props
    }
    for (name in state) {
      var value = state[name]
      if (!kernelProps[name]) {
        hasOwn[name] = true
      }
      if (
        typeof value === 'function' ||
        (value && value.nodeName && value.nodeType > 0) ||
        (!force[name] && (isSkip(name) || userSkip[name]))
      ) {
        skip.push(name)
      } else if (isComputed(value)) {
        log('warning:计算属性建议放在[computed]对象中统一定义')
        // 转给下一步处理
        computed[name] = value
      } else {
        simple.push(name)
        if (oldAccessors[name]) {
          accessors[name] = oldAccessors[name]
        } else {
          accessors[name] = makeGetSet(name, value)
        }
      }
    }
  }

  //处理计算属性
  if (computed) {
    delete computed.props
    for (var name in computed) {
      hasOwn[name] = true
      ;(function(key, value) {
        var old
        if (typeof value === 'function') {
          value = { get: value, set: noop }
        }
        if (typeof value.set !== 'function') {
          value.set = noop
        }
        accessors[key] = {
          get: function() {
            return (old = value.get.call(this))
          },
          set: function(x) {
            var older = old,
              newer
            value.set.call(this, x)
            newer = this[key]
            if (this.$fire && newer !== older) {
              this.$fire(key, newer, older)
            }
          },
          enumerable: true,
          configurable: true
        }
      })(name, computed[name]) // jshint ignore:line
    }
  }

  // 方法
  if (methods) {
    delete methods.props
    for (var name in methods) {
      hasOwn[name] = true
      skip.push(name)
    }
  }

  if (props) {
    hideProperty($vmodel, 'props', {})
    hasOwn.props = !!source.$id
    for (var name in props) {
      $vmodel.props[name] = props[name]
    }
  }

  Object.assign(source, state, methods)

  accessors['$model'] = $modelDescriptor
  $vmodel = Object.defineProperties($vmodel, accessors, source)
  function trackBy(name) {
    return hasOwn[name] === true
  }
  skip.forEach(function(name) {
    $vmodel[name] = source[name]
  })

  /* jshint ignore:start */
  // hideProperty($vmodel, '$ups', null)
  hideProperty($vmodel, '$id', 'anonymous')
  hideProperty($vmodel, '$up', old ? old.$up : null)
  hideProperty($vmodel, '$track', Object.keys(hasOwn))
  hideProperty($vmodel, '$active', false)
  hideProperty($vmodel, '$pathname', old ? old.$pathname : '')
  hideProperty($vmodel, '$accessors', accessors)
  hideProperty($vmodel, '$events', {})
  hideProperty($vmodel, '$refs', {})
  hideProperty($vmodel, '$children', [])
  hideProperty($vmodel, '$components', [])
  hideProperty($vmodel, 'hasOwnProperty', trackBy)
  hideProperty($vmodel, '$mounted', mounted)
  if (options.watch) {
    hideProperty($vmodel, '$watch', function() {
      return $watch.apply($vmodel, arguments)
    })
    hideProperty($vmodel, '$fire', function(path, a) {
      if (path.indexOf('all!') === 0) {
        var ee = path.slice(4)
        for (var i in Anot.vmodels) {
          var v = Anot.vmodels[i]
          v.$fire && v.$fire.apply(v, [ee, a])
        }
      } else if (path.indexOf('child!') === 0) {
        var ee = 'props.' + path.slice(6)
        for (var i in $vmodel.$children) {
          var v = $vmodel.$children[i]
          v.$fire && v.$fire.apply(v, [ee, a])
        }
      } else {
        $emit.call($vmodel, path, [a])
      }
    })
  }
  /* jshint ignore:end */

  //必须设置了$active,$events
  simple.forEach(function(name) {
    var oldVal = old && old[name]
    var val = ($vmodel[name] = state[name])
    if (val && typeof val === 'object' && !Date.isDate(val)) {
      val.$up = $vmodel
      val.$pathname = name
    }
    $emit.call($vmodel, name, [val, oldVal])
  })

  // 属性的监听, 必须放在上一步$emit后处理, 否则会在初始时就已经触发一次 监听回调
  if (watches) {
    delete watches.props
    for (var key in watches) {
      if (Array.isArray(watches[key])) {
        var tmp
        while ((tmp = watches[key].pop())) {
          $watch.call($vmodel, key, tmp)
        }
      } else {
        $watch.call($vmodel, key, watches[key])
      }
    }
  }

  $vmodel.$active = true

  if (old && old.$up && old.$up.$children) {
    old.$up.$children.push($vmodel)
  }

  return $vmodel
}

/*
 新的VM拥有如下私有属性
 $id: vm.id
 $events: 放置$watch回调与绑定对象
 $watch: 增强版$watch
 $fire: 触发$watch回调
 $track:一个数组,里面包含用户定义的所有键名
 $active:boolean,false时防止依赖收集
 $model:返回一个纯净的JS对象
 $accessors:放置所有读写器的数据描述对象
 $pathname:返回此对象在上级对象的名字,注意,数组元素的$pathname为空字符串
 =============================
 skip:用于指定不可监听的属性,但VM生成是没有此属性的
 */
function isComputed(val) {
  //speed up!
  if (val && typeof val === 'object') {
    for (var i in val) {
      if (i !== 'get' && i !== 'set') {
        return false
      }
    }
    return typeof val.get === 'function'
  }
}
function makeGetSet(key, value) {
  var childVm,
    value = NaN
  return {
    get: function() {
      if (this.$active) {
        collectDependency(this, key)
      }
      return value
    },
    set: function(newVal) {
      if (value === newVal) return
      var oldValue = value
      childVm = observe(newVal, value)
      if (childVm) {
        value = childVm
      } else {
        childVm = void 0
        value = newVal
      }

      if (Object(childVm) === childVm) {
        childVm.$pathname = key
        childVm.$up = this
      }
      if (this.$active) {
        $emit.call(this, key, [value, oldValue])
      }
    },
    enumerable: true,
    configurable: true
  }
}

function observe(obj, old, hasReturn, watch) {
  if (Array.isArray(obj)) {
    return observeArray(obj, old, watch)
  } else if (Anot.isPlainObject(obj)) {
    if (old && typeof old === 'object') {
      var keys = Object.keys(obj)
      var keys2 = Object.keys(old)
      if (keys.join(';') === keys2.join(';')) {
        for (var i in obj) {
          if (obj.hasOwnProperty(i)) {
            old[i] = obj[i]
          }
        }
        return old
      }
      old.$active = false
    }
    return observeObject(
      { state: obj },
      {
        old: old,
        watch: watch
      }
    )
  }
  if (hasReturn) {
    return obj
  }
}

function observeArray(array, old, watch) {
  if (old && old.splice) {
    var args = [0, old.length].concat(array)
    old.splice.apply(old, args)
    return old
  } else {
    for (var i in newProto) {
      array[i] = newProto[i]
    }
    hideProperty(array, '$up', null)
    hideProperty(array, '$pathname', '')
    hideProperty(array, '$track', createTrack(array.length))

    array._ = observeObject(
      {
        state: { length: NaN }
      },
      {
        watch: true
      }
    )
    array._.length = array.length
    array._.$watch('length', function(a, b) {
      $emit.call(array.$up, array.$pathname + '.length', [a, b])
    })
    if (watch) {
      hideProperty(array, '$watch', function() {
        return $watch.apply(array, arguments)
      })
    }

    Object.defineProperty(array, '$model', $modelDescriptor)

    for (var j = 0, n = array.length; j < n; j++) {
      var el = (array[j] = observe(array[j], 0, 1, 1))
      if (Object(el) === el) {
        //#1077
        el.$up = array
      }
    }

    return array
  }
}

function hideProperty(host, name, value) {
  Object.defineProperty(host, name, {
    value: value,
    writable: true,
    enumerable: false,
    configurable: true
  })
}
Anot.hideProperty = hideProperty

function toJson(val) {
  var xtype = Anot.type(val)
  if (xtype === 'array') {
    var array = []
    for (var i = 0; i < val.length; i++) {
      array[i] = toJson(val[i])
    }
    return array
  } else if (xtype === 'object') {
    var obj = {}
    for (i in val) {
      if (val.hasOwnProperty(i)) {
        var value = val[i]
        obj[i] = value && value.nodeType ? value : toJson(value)
      }
    }
    return obj
  }
  return val
}

var $modelDescriptor = {
  get: function() {
    return toJson(this)
  },
  set: noop,
  enumerable: false,
  configurable: true
}
