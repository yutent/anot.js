//双工绑定
var rduplexType = /^(?:checkbox|radio)$/
var rduplexParam = /^(?:radio|checked)$/
var rnoduplexInput = /^(file|button|reset|submit|checkbox|radio|range)$/
var duplexBinding = Anot.directive('duplex', {
  priority: 2000,
  init: function(binding, hasCast) {
    var elem = binding.element
    var vmodels = binding.vmodels
    binding.changed = getBindingCallback(elem, 'data-changed', vmodels) || noop
    var params = []
    var casting = oneObject('string,number,boolean,checked')
    if (elem.type === 'radio' && binding.param === '') {
      binding.param = 'checked'
    }

    binding.param.replace(rw20g, function(name) {
      if (rduplexType.test(elem.type) && rduplexParam.test(name)) {
        name = 'checked'
        binding.isChecked = true
        binding.xtype = 'radio'
      }

      if (casting[name]) {
        hasCast = true
      }
      Anot.Array.ensure(params, name)
    })
    if (!hasCast) {
      params.push('string')
    }
    binding.param = params.join('-')
    if (!binding.xtype) {
      binding.xtype =
        elem.tagName === 'SELECT'
          ? 'select'
          : elem.type === 'checkbox'
            ? 'checkbox'
            : elem.type === 'radio'
              ? 'radio'
              : /^change/.test(elem.getAttribute('data-event'))
                ? 'change'
                : 'input'
    }
    elem.expr = binding.expr
    //===================绑定事件======================
    var bound = (binding.bound = function(type, callback) {
      elem.addEventListener(type, callback, false)
      var old = binding.rollback
      binding.rollback = function() {
        elem.anotSetter = null
        Anot.unbind(elem, type, callback)
        old && old()
      }
    })
    function callback(value) {
      binding.changed.call(this, value)
    }
    var composing = false
    function compositionStart() {
      composing = true
    }
    function compositionEnd() {
      composing = false
      setTimeout(updateVModel)
    }
    var updateVModel = function(e) {
      var val = elem.value
      //防止递归调用形成死循环
      //处理中文输入法在minlengh下引发的BUG
      if (composing || val === binding.oldValue || binding.pipe === null) {
        return
      }

      var lastValue = binding.pipe(val, binding, 'get')
      binding.oldValue = val
      binding.setter(lastValue)

      callback.call(elem, lastValue)
      Anot.fireDom(elem, 'change')
    }
    switch (binding.xtype) {
      case 'radio':
        bound('click', function() {
          var lastValue = binding.pipe(elem.value, binding, 'get')
          binding.setter(lastValue)
          callback.call(elem, lastValue)
        })
        break
      case 'checkbox':
        bound('change', function() {
          var method = elem.checked ? 'ensure' : 'remove'
          var array = binding.getter.apply(0, binding.vmodels)
          if (!Array.isArray(array)) {
            log(':duplex应用于checkbox上要对应一个数组')
            array = [array]
          }
          var val = binding.pipe(elem.value, binding, 'get')
          Anot.Array[method](array, val)
          callback.call(elem, array)
        })
        break
      case 'change':
        bound('change', updateVModel)
        break
      case 'input':
        bound('input', updateVModel)
        bound('keyup', updateVModel)
        if (!IEVersion) {
          bound('compositionstart', compositionStart)
          bound('compositionend', compositionEnd)
          bound('DOMAutoComplete', updateVModel)
        }
        break
      case 'select':
        bound('change', function() {
          var val = Anot(elem).val() //字符串或字符串数组
          if (Array.isArray(val)) {
            val = val.map(function(v) {
              return binding.pipe(v, binding, 'get')
            })
          } else {
            val = binding.pipe(val, binding, 'get')
          }
          if (val + '' !== binding.oldValue) {
            try {
              binding.setter(val)
            } catch (ex) {
              log(ex)
            }
          }
        })
        bound('datasetchanged', function(e) {
          if (e.bubble === 'selectDuplex') {
            var value = binding._value
            var curValue = Array.isArray(value) ? value.map(String) : value + ''
            Anot(elem).val(curValue)
            elem.oldValue = curValue + ''
            callback.call(elem, curValue)
          }
        })
        break
    }
    if (binding.xtype === 'input' && !rnoduplexInput.test(elem.type)) {
      if (elem.type !== 'hidden') {
        bound('focus', function() {
          elem.msFocus = true
        })
        bound('blur', function() {
          elem.msFocus = false
        })
      }
      elem.anotSetter = updateVModel //#765
      watchValueInTimer(function() {
        if (root.contains(elem)) {
          if (!elem.msFocus) {
            updateVModel()
          }
        } else if (!elem.msRetain) {
          return false
        }
      })
    }
  },
  update: function(value) {
    var elem = this.element,
      binding = this,
      curValue
    if (!this.init) {
      var cpipe = binding.pipe || (binding.pipe = pipe)
      cpipe(null, binding, 'init')
      this.init = 1
    }
    switch (this.xtype) {
      case 'input':
        elem.value = value
        break
      case 'change':
        curValue = this.pipe(value, this, 'set') //fix #673
        if (curValue !== this.oldValue) {
          var fixCaret = false
          if (elem.msFocus) {
            try {
              var start = elem.selectionStart
              var end = elem.selectionEnd
              if (start === end) {
                var pos = start
                fixCaret = true
              }
            } catch (e) {}
          }
          elem.value = this.oldValue = curValue
          if (fixCaret && !elem.readOnly) {
            elem.selectionStart = elem.selectionEnd = pos
          }
        }
        break
      case 'radio':
        curValue = binding.isChecked ? !!value : value + '' === elem.value
        elem.checked = curValue
        break
      case 'checkbox':
        var array = [].concat(value) //强制转换为数组
        curValue = this.pipe(elem.value, this, 'get')
        elem.checked = array.indexOf(curValue) > -1
        break
      case 'select':
        //必须变成字符串后才能比较
        binding._value = value
        if (!elem.msHasEvent) {
          elem.msHasEvent = 'selectDuplex'
          //必须等到其孩子准备好才触发
        } else {
          Anot.fireDom(elem, 'datasetchanged', {
            bubble: elem.msHasEvent
          })
        }
        break
    }
  }
})

function fixNull(val) {
  return val == null ? '' : val
}
Anot.duplexHooks = {
  checked: {
    get: function(val, binding) {
      return !binding.oldValue
    }
  },
  string: {
    get: function(val) {
      //同步到VM
      return val
    },
    set: fixNull
  },
  boolean: {
    get: function(val) {
      return val === 'true'
    },
    set: fixNull
  },
  number: {
    get: function(val, binding) {
      var number = +val
      if (+val === number) {
        return number
      }
      return 0
    },
    set: fixNull
  }
}

function pipe(val, binding, action, e) {
  binding.param.replace(rw20g, function(name) {
    var hook = Anot.duplexHooks[name]
    if (hook && typeof hook[action] === 'function') {
      val = hook[action](val, binding)
    }
  })
  return val
}

var TimerID,
  ribbon = []

Anot.tick = function(fn) {
  if (ribbon.push(fn) === 1) {
    TimerID = setInterval(ticker, 60)
  }
}

function ticker() {
  for (var n = ribbon.length - 1; n >= 0; n--) {
    var el = ribbon[n]
    if (el() === false) {
      ribbon.splice(n, 1)
    }
  }
  if (!ribbon.length) {
    clearInterval(TimerID)
  }
}

var watchValueInTimer = noop
new function() {
  // jshint ignore:line
  try {
    //#272 IE9-IE11, firefox
    var setters = {}
    var aproto = HTMLInputElement.prototype
    var bproto = HTMLTextAreaElement.prototype
    function newSetter(value) {
      // jshint ignore:line
      setters[this.tagName].call(this, value)
      if (!this.msFocus && this.anotSetter) {
        this.anotSetter()
      }
    }
    var inputProto = HTMLInputElement.prototype
    Object.getOwnPropertyNames(inputProto) //故意引发IE6-8等浏览器报错
    setters['INPUT'] = Object.getOwnPropertyDescriptor(aproto, 'value').set

    Object.defineProperty(aproto, 'value', {
      set: newSetter
    })
    setters['TEXTAREA'] = Object.getOwnPropertyDescriptor(bproto, 'value').set
    Object.defineProperty(bproto, 'value', {
      set: newSetter
    })
  } catch (e) {
    //在chrome 43中 :duplex终于不需要使用定时器实现双向绑定了
    // http://updates.html5rocks.com/2015/04/DOM-attributes-now-on-the-prototype
    // https://docs.google.com/document/d/1jwA8mtClwxI-QJuHT7872Z0pxpZz8PBkf2bGAbsUtqs/edit?pli=1
    watchValueInTimer = Anot.tick
  }
}() // jshint ignore:line
