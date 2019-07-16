/*********************************************************************
 *          监控数组（:for配合使用）                     *
 **********************************************************************/

var arrayMethods = ['push', 'pop', 'shift', 'unshift', 'splice']
var arrayProto = Array.prototype
var newProto = {
  notify: function() {
    $emit.call(this.$up, this.$pathname)
  },
  set: function(index, val) {
    index = index >>> 0
    if (index > this.length) {
      throw Error(index + 'set方法的第一个参数不能大于原数组长度')
    }
    if (this[index] !== val) {
      var old = this[index]
      this.splice(index, 1, val)
      $emit.call(this.$up, this.$pathname + '.*', [val, old, null, index])
    }
  },
  contains: function(el) {
    //判定是否包含
    return this.indexOf(el) > -1
  },
  ensure: function(el) {
    if (!this.contains(el)) {
      //只有不存在才push
      this.push(el)
    }
    return this
  },
  pushArray: function(arr) {
    return this.push.apply(this, toJson(arr))
  },
  remove: function(el) {
    //移除第一个等于给定值的元素
    return this.removeAt(this.indexOf(el))
  },
  removeAt: function(index) {
    index = index >>> 0
    //移除指定索引上的元素
    return this.splice(index, 1)
  },
  size: function() {
    //取得数组长度，这个函数可以同步视图，length不能
    return this._.length
  },
  removeAll: function(all) {
    //移除N个元素
    if (Array.isArray(all)) {
      for (var i = this.length - 1; i >= 0; i--) {
        if (all.indexOf(this[i]) !== -1) {
          _splice.call(this.$track, i, 1)
          _splice.call(this, i, 1)
        }
      }
    } else if (typeof all === 'function') {
      for (i = this.length - 1; i >= 0; i--) {
        var el = this[i]
        if (all(el, i)) {
          _splice.call(this.$track, i, 1)
          _splice.call(this, i, 1)
        }
      }
    } else {
      _splice.call(this.$track, 0, this.length)
      _splice.call(this, 0, this.length)
    }

    this.notify()
    this._.length = this.length
  },
  clear: function() {
    this.removeAll()
  }
}

var _splice = arrayProto.splice
arrayMethods.forEach(function(method) {
  var original = arrayProto[method]
  newProto[method] = function() {
    // 继续尝试劫持数组元素的属性
    var args = []
    for (var i = 0, n = arguments.length; i < n; i++) {
      args[i] = observe(arguments[i], 0, 1, 1)
    }
    var result = original.apply(this, args)
    addTrack(this.$track, method, args)

    this.notify()
    this._.length = this.length
    return result
  }
})

'sort,reverse'.replace(rword, function(method) {
  newProto[method] = function() {
    var oldArray = this.concat() //保持原来状态的旧数组
    var newArray = this
    var mask = Math.random()
    var indexes = []
    var hasSort = false
    arrayProto[method].apply(newArray, arguments) //排序
    for (var i = 0, n = oldArray.length; i < n; i++) {
      var neo = newArray[i]
      var old = oldArray[i]
      if (neo === old) {
        indexes.push(i)
      } else {
        var index = oldArray.indexOf(neo)
        indexes.push(index) //得到新数组的每个元素在旧数组对应的位置
        oldArray[index] = mask //屏蔽已经找过的元素
        hasSort = true
      }
    }
    if (hasSort) {
      sortByIndex(this.$track, indexes)

      this.notify()
    }
    return this
  }
})

function sortByIndex(array, indexes) {
  var map = {}
  for (var i = 0, n = indexes.length; i < n; i++) {
    map[i] = array[i]
    var j = indexes[i]
    if (j in map) {
      array[i] = map[j]
      delete map[j]
    } else {
      array[i] = array[j]
    }
  }
}

function createTrack(n) {
  var ret = []
  for (var i = 0; i < n; i++) {
    ret[i] = generateID('proxy-each')
  }
  return ret
}

function addTrack(track, method, args) {
  switch (method) {
    case 'push':
    case 'unshift':
      args = createTrack(args.length)
      break
    case 'splice':
      if (args.length > 2) {
        // 0, 5, a, b, c --> 0, 2, 0
        // 0, 5, a, b, c, d, e, f, g--> 0, 0, 3
        var del = args[1]
        var add = args.length - 2
        // args = [args[0], Math.max(del - add, 0)].concat(createTrack(Math.max(add - del, 0)))
        args = [args[0], args[1]].concat(createTrack(args.length - 2))
      }
      break
  }
  Array.prototype[method].apply(track, args)
}
