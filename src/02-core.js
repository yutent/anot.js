let Anot = function(el) {
  //创建jQuery式的无new 实例化结构
  return new Anot.init(el)
}

/*视浏览器情况采用最快的异步回调*/
Anot.nextTick = new (function() {
  // jshint ignore:line
  let tickImmediate = window.setImmediate
  let tickObserver = window.MutationObserver
  if (tickImmediate) {
    return tickImmediate.bind(window)
  }

  let queue = []
  function callback() {
    let n = queue.length
    for (let i = 0; i < n; i++) {
      queue[i]()
    }
    queue = queue.slice(n)
  }

  if (tickObserver) {
    let node = document.createTextNode('anot')
    new tickObserver(callback).observe(node, { characterData: true }) // jshint ignore:line
    let bool = false
    return function(fn) {
      queue.push(fn)
      bool = !bool
      node.data = bool
    }
  }

  return function(fn) {
    setTimeout(fn, 4)
  }
})() // jshint ignore:line

/*********************************************************************
 *                 Anot的静态方法定义区                              *
 **********************************************************************/

Anot.type = function(obj) {
  //取得目标的类型
  if (obj == null) {
    return String(obj)
  }
  // 早期的webkit内核浏览器实现了已废弃的ecma262v4标准，可以将正则字面量当作函数使用，因此typeof在判定正则时会返回function
  return typeof obj === 'object' || typeof obj === 'function'
    ? class2type[serialize.call(obj)] || 'object'
    : typeof obj
}

Anot.PropsTypes = function(type) {
  this.type = 'PropsTypes'
  this.checkType = type
}

Anot.PropsTypes.prototype = {
  toString: function() {
    return ''
  },
  check: function(val) {
    this.result = Anot.type(val)
    return this.result === this.checkType
  },
  call: function() {
    return this.toString()
  }
}

Anot.PropsTypes.isString = function() {
  return new this('string')
}

Anot.PropsTypes.isNumber = function() {
  return new this('number')
}

Anot.PropsTypes.isFunction = function() {
  return new this('function')
}

Anot.PropsTypes.isArray = function() {
  return new this('array')
}

Anot.PropsTypes.isObject = function() {
  return new this('object')
}

Anot.PropsTypes.isBoolean = function() {
  return new this('boolean')
}

/*判定是否是一个朴素的javascript对象（Object），不是DOM对象，不是BOM对象，不是自定义类的实例*/
Anot.isPlainObject = function(obj) {
  // 简单的 typeof obj === "object"检测，会致使用isPlainObject(window)在opera下通不过
  return (
    serialize.call(obj) === '[object Object]' &&
    Object.getPrototypeOf(obj) === oproto
  )
}

let VMODELS = (Anot.vmodels = {}) //所有vmodel都储存在这里
Anot.init = function(source) {
  if (Anot.isPlainObject(source)) {
    let $id = source.$id
    let vm = null
    if (!$id) {
      log('warning: vm必须指定id')
    }
    vm = modelFactory(Object.assign({ props: {} }, source))
    vm.$id = $id
    VMODELS[$id] = vm

    Anot.nextTick(function() {
      let $elem = document.querySelector('[anot=' + vm.$id + ']')
      if ($elem) {
        if ($elem === DOC.body) {
          scanTag($elem, [])
        } else {
          let _parent = $elem
          while ((_parent = _parent.parentNode)) {
            if (_parent.__VM__) {
              break
            }
          }
          scanTag($elem.parentNode, _parent ? [_parent.__VM__] : [])
        }
      }
    })

    return vm
  } else {
    this[0] = this.element = source
  }
}
Anot.fn = Anot.prototype = Anot.init.prototype

//与jQuery.extend方法，可用于浅拷贝，深拷贝
Anot.mix = Anot.fn.mix = function() {
  let options,
    name,
    src,
    copy,
    copyIsArray,
    clone,
    target = arguments[0] || {},
    i = 1,
    length = arguments.length,
    deep = false

  // 如果第一个参数为布尔,判定是否深拷贝
  if (typeof target === 'boolean') {
    deep = target
    target = arguments[1] || {}
    i++
  }

  //确保接受方为一个复杂的数据类型
  if (typeof target !== 'object' && Anot.type(target) !== 'function') {
    target = {}
  }

  //如果只有一个参数，那么新成员添加于mix所在的对象上
  if (i === length) {
    target = this
    i--
  }

  for (; i < length; i++) {
    //只处理非空参数
    if ((options = arguments[i]) != null) {
      for (name in options) {
        src = target[name]
        copy = options[name]
        // 防止环引用
        if (target === copy) {
          continue
        }
        if (
          deep &&
          copy &&
          (Anot.isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))
        ) {
          if (copyIsArray) {
            copyIsArray = false
            clone = src && Array.isArray(src) ? src : []
          } else {
            clone = src && Anot.isPlainObject(src) ? src : {}
          }

          target[name] = Anot.mix(deep, clone, copy)
        } else if (copy !== void 0) {
          target[name] = copy
        }
      }
    }
  }
  return target
}

function cacheStore(tpye, key, val) {
  if (this.type(key) === 'object') {
    for (let i in key) {
      window[tpye].setItem(i, key[i])
    }
    return
  }
  switch (arguments.length) {
    case 2:
      return window[tpye].getItem(key)
    case 3:
      if ((this.type(val) == 'string' && val.trim() === '') || val === null) {
        window[tpye].removeItem(key)
        return
      }
      if (this.type(val) !== 'object' && this.type(val) !== 'array') {
        window[tpye].setItem(key, val.toString())
      } else {
        window[tpye].setItem(key, JSON.stringify(val))
      }
      break
  }
}

/*判定是否类数组，如节点集合，纯数组，arguments与拥有非负整数的length属性的纯JS对象*/
function isArrayLike(obj) {
  if (obj && typeof obj === 'object') {
    let n = obj.length,
      str = serialize.call(obj)
    if (/(Array|List|Collection|Map|Arguments)\]$/.test(str)) {
      return true
    } else if (str === '[object Object]' && n === n >>> 0) {
      return true //由于ecma262v5能修改对象属性的enumerable，因此不能用propertyIsEnumerable来判定了
    }
  }
  return false
}

Anot.mix({
  rword: rword,
  subscribers: subscribers,
  version: '1.0.0',
  log: log,
  ui: {}, //仅用于存放组件版本信息等
  slice: function(nodes, start, end) {
    return aslice.call(nodes, start, end)
  },
  noop: noop,
  /*如果不用Error对象封装一下，str在控制台下可能会乱码*/
  error: function(str, e) {
    throw new (e || Error)(str) // jshint ignore:line
  },
  /* Anot.range(10)
     => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
     Anot.range(1, 11)
     => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
     Anot.range(0, 30, 5)
     => [0, 5, 10, 15, 20, 25]
     Anot.range(0, -10, -1)
     => [0, -1, -2, -3, -4, -5, -6, -7, -8, -9]
     Anot.range(0)
     => []*/
  range: function(start, end, step) {
    // 用于生成整数数组
    step || (step = 1)
    if (end == null) {
      end = start || 0
      start = 0
    }
    let index = -1,
      length = Math.max(0, Math.ceil((end - start) / step)),
      result = new Array(length)
    while (++index < length) {
      result[index] = start
      start += step
    }
    return result
  },
  deepCopy: toJson,
  eventHooks: {},
  /*绑定事件*/
  bind: function(el, type, fn, phase) {
    let hooks = Anot.eventHooks
    type = type.split(',')
    Anot.each(type, function(i, t) {
      t = t.trim()
      let hook = hooks[t]
      if (typeof hook === 'object') {
        t = hook.type || type
        phase = hook.phase || !!phase
        fn = hook.fix ? hook.fix(el, fn) : fn
      }
      el.addEventListener(t, fn, phase)
    })
    return fn
  },
  /*卸载事件*/
  unbind: function(el, type, fn, phase) {
    let hooks = Anot.eventHooks
    type = type.split(',')
    fn = fn || noop
    Anot.each(type, function(i, t) {
      t = t.trim()
      let hook = hooks[t]
      if (typeof hook === 'object') {
        t = hook.type || type
        phase = hook.phase || !!phase
      }
      el.removeEventListener(t, fn, phase)
    })
  },
  /*读写删除元素节点的样式*/
  css: function(node, name, value) {
    if (node instanceof Anot) {
      node = node[0]
    }
    var prop = /[_-]/.test(name) ? camelize(name) : name
    var fn

    name = Anot.cssName(prop) || prop
    if (value === void 0 || typeof value === 'boolean') {
      //获取样式
      fn = cssHooks[prop + ':get'] || cssHooks['@:get']
      if (name === 'background') {
        name = 'backgroundColor'
      }
      var val = fn(node, name)
      return value === true ? +val || 0 : val
    } else if (value === '') {
      //请除样式
      node.style[name] = ''
    } else {
      //设置样式
      if (value == null || value !== value) {
        return
      }
      if (isFinite(value) && !Anot.cssNumber[prop]) {
        value += 'px'
      }
      fn = cssHooks[prop + ':set'] || cssHooks['@:set']
      fn(node, name, value)
    }
  },
  /*遍历数组与对象,回调的第一个参数为索引或键名,第二个或元素或键值*/
  each: function(obj, fn) {
    if (obj) {
      //排除null, undefined
      if (isArrayLike(obj)) {
        for (let i = 0, n = obj.length; i < n; i++) {
          if (fn(i, obj[i]) === false) break
        }
      } else {
        for (let i in obj) {
          if (obj.hasOwnProperty(i) && fn(i, obj[i]) === false) {
            break
          }
        }
      }
    }
  },
  Array: {
    /*只有当前数组不存在此元素时只添加它*/
    ensure: function(target, item) {
      if (target.indexOf(item) === -1) {
        return target.push(item)
      }
    },
    /*移除数组中指定位置的元素，返回布尔表示成功与否*/
    removeAt: function(target, index) {
      return !!target.splice(index, 1).length
    },
    /*移除数组中第一个匹配传参的那个元素，返回布尔表示成功与否*/
    remove: function(target, item) {
      let index = target.indexOf(item)
      if (~index) return Anot.Array.removeAt(target, index)
      return false
    }
  },
  /**
   * [ls localStorage操作]
   * @param  {[type]} key  [键名]
   * @param  {[type]} val [键值，为空时删除]
   * @return
   */
  ls: function() {
    let args = aslice.call(arguments, 0)
    args.unshift('localStorage')
    return cacheStore.apply(this, args)
  },
  ss: function() {
    let args = aslice.call(arguments, 0)
    args.unshift('sessionStorage')
    return cacheStore.apply(this, args)
  },
  /**
   * [cookie cookie 操作 ]
   * @param  key  [cookie名]
   * @param  val [cookie值]
   * @param  {[json]} opt   [有效期，域名，路径等]
   * @return {[boolean]}       [读取时返回对应的值，写入时返回true]
   */
  cookie: function(key, val, opt) {
    if (arguments.length > 1) {
      if (!key) {
        return
      }

      //设置默认的参数
      opt = opt || {}
      opt = Object.assign(
        {
          expires: '',
          path: '/',
          domain: document.domain,
          secure: ''
        },
        opt
      )

      if ((this.type(val) == 'string' && val.trim() === '') || val === null) {
        document.cookie =
          encodeURIComponent(key) +
          '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=' +
          opt.domain +
          '; path=' +
          opt.path
        return true
      }
      if (opt.expires) {
        switch (opt.expires.constructor) {
          case Number:
            opt.expires =
              opt.expires === Infinity
                ? '; expires=Fri, 31 Dec 9999 23:59:59 GMT'
                : '; max-age=' + opt.expires
            break
          case String:
            opt.expires = '; expires=' + opt.expires
            break
          case Date:
            opt.expires = '; expires=' + opt.expires.toUTCString()
            break
        }
      }
      document.cookie =
        encodeURIComponent(key) +
        '=' +
        encodeURIComponent(val) +
        opt.expires +
        '; domain=' +
        opt.domain +
        '; path=' +
        opt.path +
        '; ' +
        opt.secure
      return true
    } else {
      if (!key) {
        return document.cookie
      }
      return (
        decodeURIComponent(
          document.cookie.replace(
            new RegExp(
              '(?:(?:^|.*;)\\s*' +
                encodeURIComponent(key).replace(/[\-\.\+\*]/g, '\\$&') +
                '\\s*\\=\\s*([^;]*).*$)|^.*$'
            ),
            '$1'
          )
        ) || null
      )
    }
  },
  //获取url的参数
  search: function(key) {
    key += ''
    let uri = location.search

    if (!key || !uri) {
      return null
    }
    uri = decodeURIComponent(uri)

    uri = uri.slice(1)
    uri = uri.split('&')

    let obj = {}
    for (let i = 0, item; (item = uri[i++]); ) {
      let tmp = item.split('=')
      tmp[1] = tmp.length < 2 ? null : tmp[1]
      tmp[1] = tmp[1]
      if (obj.hasOwnProperty(tmp[0])) {
        if (typeof obj[tmp[0]] === 'object') {
          obj[tmp[0]].push(tmp[1])
        } else {
          obj[tmp[0]] = [obj[tmp[0]]]
          obj[tmp[0]].push(tmp[1])
        }
      } else {
        obj[tmp[0]] = tmp[1]
      }
    }
    return obj.hasOwnProperty(key) ? obj[key] : null
  },
  //复制文本到粘贴板
  copy: function(txt) {
    if (!DOC.queryCommandSupported || !DOC.queryCommandSupported('copy')) {
      return log('该浏览器不支持复制到粘贴板')
    }

    let ta = DOC.createElement('textarea')
    ta.textContent = txt
    ta.style.position = 'fixed'
    ta.style.bottom = '-1000px'
    DOC.body.appendChild(ta)
    ta.select()
    try {
      DOC.execCommand('copy')
    } catch (err) {
      log('复制到粘贴板失败', err)
    }
    DOC.body.removeChild(ta)
  }
})

let bindingHandlers = (Anot.bindingHandlers = {})
let bindingExecutors = (Anot.bindingExecutors = {})

let directives = (Anot.directives = {})
Anot.directive = function(name, obj) {
  bindingHandlers[name] = obj.init = obj.init || noop
  bindingExecutors[name] = obj.update = obj.update || noop
  return (directives[name] = obj)
}
