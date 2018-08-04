/*-----------------部分ES6的JS实现 start---------------*/

// ===============================
// ========== Promise ============
// ===============================
;(function(nativePromise) {
  function _yes(val) {
    return val
  }

  function _no(err) {
    throw err
  }

  function done(callback) {
    return this.then(callback, _no)
  }

  function fail(callback) {
    return this.then(_yes, callback)
  }

  function defer() {
    var obj = {}
    obj.promise = new _Promise(function(yes, no) {
      obj.resolve = yes
      obj.reject = no
    })
    return obj
  }

  //成功的回调
  function _resolve(obj, val) {
    if (obj._state !== 'pending') {
      return
    }

    if (val && typeof val.then === 'function') {
      var method = val instanceof _Promise ? '_then' : 'then'
      val[method](
        function(v) {
          _transmit(obj, v, true)
        },
        function(v) {
          _transmit(obj, v, false)
        }
      )
    } else {
      _transmit(obj, val, true)
    }
  }

  //失败的回调
  function _reject(obj, val) {
    if (obj._state !== 'pending') {
      return
    }

    _transmit(obj, val, false)
  }

  // 改变Promise的_fired值，并保持用户传参，触发所有回调
  function _transmit(obj, val, isResolved) {
    obj._fired = true
    obj._val = val
    obj._state = isResolved ? 'fulfilled' : 'rejected'

    fireCallback(obj, function() {
      for (var i in obj.callback) {
        obj._fire(obj.callback[i].yes, obj.callback[i].no)
      }
    })
  }

  function fireCallback(obj, callback) {
    var isAsync = false

    if (typeof obj.async === 'boolean') {
      isAsync = obj.async
    } else {
      isAsync = obj.async = true
    }

    if (isAsync) {
      setTimeout(callback, 0)
    } else {
      callback()
    }
  }

  function _some(bool, iterable) {
    iterable = Array.isArray(iterable) ? iterable : []

    var n = 0
    var res = []
    var end = false

    return new _Promise(function(yes, no) {
      if (!iterable.length) no(res)

      function loop(obj, idx) {
        obj.then(
          function(val) {
            if (!end) {
              res[idx] = val
              n++
              if (bool || n >= iterable.length) {
                yes(bool ? val : res)
                end = true
              }
            }
          },
          function(val) {
            end = true
            no(val)
          }
        )
      }

      for (var i = 0, len = iterable.length; i < len; i++) {
        loop(iterable[i], i)
      }
    })
  }

  //---------------------------
  var _Promise = function(callback) {
    this.callback = []
    var _this = this

    if (typeof this !== 'object') {
      throw new TypeError('Promises must be constructed via new')
    }

    if (typeof callback !== 'function') {
      throw new TypeError('Argument must be a function')
    }

    callback(
      function(val) {
        _resolve(_this, val)
      },
      function(val) {
        _reject(_this, val)
      }
    )
  }
  var self = {
    _state: 1,
    _fired: 1,
    _val: 1,
    callback: 1
  }

  _Promise.prototype = {
    constructor: _Promise,
    _state: 'pending',
    _fired: false,
    _fire: function(yes, no) {
      if (this._state === 'rejected') {
        if (typeof no === 'function') no(this._val)
        else throw this._val
      } else {
        if (typeof yes === 'function') yes(this._val)
      }
    },
    _then: function(yes, no) {
      if (this._fired) {
        var _this = this
        fireCallback(_this, function() {
          _this._fire(yes, no)
        })
      } else {
        this.callback.push({ yes: yes, no: no })
      }
    },
    then: function(yes, no) {
      yes = typeof yes === 'function' ? yes : _yes
      no = typeof no === 'function' ? no : _no
      var _this = this
      var next = new _Promise(function(resolve, reject) {
        _this._then(
          function(val) {
            try {
              val = yes(val)
            } catch (err) {
              return reject(err)
            }
            resolve(val)
          },
          function(val) {
            try {
              val = no(val)
            } catch (err) {
              return reject(err)
            }
            resolve(val)
          }
        )
      })
      for (var i in _this) {
        if (!self[i]) next[i] = _this[i]
      }
      return next
    },
    done: done,
    catch: fail,
    fail: fail
  }

  _Promise.all = function(arr) {
    return _some(false, arr)
  }

  _Promise.race = function(arr) {
    return _some(true, arr)
  }

  _Promise.defer = defer

  _Promise.resolve = function(val) {
    var obj = this.defer()
    obj.resolve(val)
    return obj.promise
  }

  _Promise.reject = function(val) {
    var obj = this.defer()
    obj.reject(val)
    return obj.promise
  }
  if (/native code/.test(nativePromise)) {
    nativePromise.prototype.done = done
    nativePromise.prototype.fail = fail
    if (!nativePromise.defer) {
      nativePromise.defer = defer
    }
  }
  window.Promise = nativePromise || _Promise
})(window.Promise)

if (!Object.assign) {
  Object.defineProperty(Object, 'assign', {
    enumerable: false,
    value: function(target, first) {
      'use strict'
      if (target === undefined || target === null)
        throw new TypeError('Can not convert first argument to object')

      var to = Object(target)
      for (var i = 0, len = arguments.length; i < len; i++) {
        var next = arguments[i]
        if (next === undefined || next === null) continue

        var keys = Object.keys(Object(next))
        for (var j = 0, n = keys.length; j < n; j++) {
          var key = keys[j]
          var desc = Object.getOwnPropertyDescriptor(next, key)
          if (desc !== undefined && desc.enumerable) to[key] = next[key]
        }
      }
      return to
    }
  })
}

if (!Array.from) {
  Object.defineProperty(Array, 'from', {
    enumerable: false,
    value: (function() {
      var toStr = Object.prototype.toString
      var isCallable = function(fn) {
        return (
          typeof fn === 'function' || toStr.call(fn) === '[object Function]'
        )
      }

      var toInt = function(val) {
        var num = val - 0
        if (isNaN(num)) return 0

        if (num === 0 || isFinite(num)) return num

        return (num > 0 ? 1 : -1) * Math.floor(Math.abs(num))
      }
      var maxInt = Math.pow(2, 53) - 1
      var toLen = function(val) {
        var len = toInt(val)
        return Math.min(Math.max(len, 0), maxInt)
      }

      return function(arrLike) {
        var _this = this
        var items = Object(arrLike)
        if (arrLike === null)
          throw new TypeError(
            'Array.from requires an array-like object - not null or undefined'
          )

        var mapFn = arguments.length > 1 ? arguments[1] : undefined
        var other
        if (mapFn !== undefined) {
          if (!isCallable(mapFn))
            throw new TypeError(
              'Array.from: when provided, the second argument must be a function'
            )

          if (arguments.length > 2) other = arguments[2]
        }

        var len = toLen(items.length)
        var arr = isCallable(_this) ? Object(new _this(len)) : new Array(len)
        var k = 0
        var kVal
        while (k < len) {
          kVal = items[k]
          if (mapFn)
            arr[k] =
              other === 'undefined'
                ? mapFn(kVal, k)
                : mapFn.call(other, kVal, k)
          else arr[k] = kVal

          k++
        }
        arr.length = len
        return arr
      }
    })()
  })
}

// 判断数组是否包含指定元素
if (!Array.prototype.includes) {
  Object.defineProperty(Array.prototype, 'includes', {
    value: function(val) {
      for (var i in this) {
        if (this[i] === val) return true
      }
      return false
    },
    enumerable: false
  })
}

//类似于Array 的splice方法
if (!String.prototype.splice) {
  Object.defineProperty(String.prototype, 'splice', {
    value: function(start, len, fill) {
      var length = this.length,
        argLen = arguments.length

      fill = fill === undefined ? '' : fill

      if (argLen < 1) {
        return this
      }

      //处理负数
      if (start < 0) {
        if (Math.abs(start) >= length) start = 0
        else start = length + start
      }

      if (argLen === 1) {
        return this.slice(0, start)
      } else {
        len -= 0

        var strl = this.slice(0, start),
          strr = this.slice(start + len)

        return strl + fill + strr
      }
    },
    enumerable: false
  })
}

if (!Date.prototype.getFullWeek) {
  //获取当天是本年度第几周
  Object.defineProperty(Date.prototype, 'getFullWeek', {
    value: function() {
      var thisYear = this.getFullYear(),
        that = new Date(thisYear, 0, 1),
        firstDay = that.getDay() || 1,
        numsOfToday = (this - that) / 86400000
      return Math.ceil((numsOfToday + firstDay) / 7)
    },
    enumerable: false
  })

  //获取当天是本月第几周
  Object.defineProperty(Date.prototype, 'getWeek', {
    value: function() {
      var today = this.getDate(),
        thisMonth = this.getMonth(),
        thisYear = this.getFullYear(),
        firstDay = new Date(thisYear, thisMonth, 1).getDay()
      return Math.ceil((today + firstDay) / 7)
    },
    enumerable: false
  })
}

if (!Date.isDate) {
  Object.defineProperty(Date, 'isDate', {
    value: function(obj) {
      return typeof obj === 'object' && obj.getTime ? true : false
    },
    enumerable: false
  })
}

//时间格式化
if (!Date.prototype.format) {
  Object.defineProperty(Date.prototype, 'format', {
    value: function(str) {
      str = str || 'Y-m-d H:i:s'
      var week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        dt = {
          fullyear: this.getFullYear(),
          year: this.getYear(),
          fullweek: this.getFullWeek(),
          week: this.getWeek(),
          month: this.getMonth() + 1,
          date: this.getDate(),
          day: week[this.getDay()],
          hours: this.getHours(),
          minutes: this.getMinutes(),
          seconds: this.getSeconds()
        },
        re

      dt.g = dt.hours > 12 ? dt.hours - 12 : dt.hours

      re = {
        Y: dt.fullyear,
        y: dt.year,
        m: dt.month < 10 ? '0' + dt.month : dt.month,
        n: dt.month,
        d: dt.date < 10 ? '0' + dt.date : dt.date,
        j: dt.date,
        H: dt.hours < 10 ? '0' + dt.hours : dt.hours,
        h: dt.g < 10 ? '0' + dt.g : dt.g,
        G: dt.hours,
        g: dt.g,
        i: dt.minutes < 10 ? '0' + dt.minutes : dt.minutes,
        s: dt.seconds < 10 ? '0' + dt.seconds : dt.seconds,
        W: dt.fullweek,
        w: dt.week,
        D: dt.day
      }

      for (var i in re) {
        str = str.replace(new RegExp(i, 'g'), re[i])
      }
      return str
    },
    enumerable: false
  })
}
/*-----------------部分ES6的JS实现 ending---------------*/
