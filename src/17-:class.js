//类名定义  :class="{xx: yy}" :class="xx"
Anot.directive('class', {
  init: function(binding) {
    binding.expr = binding.expr.replace(/\n/g, ' ').replace(/\s+/g, ' ')

    if (binding.type === 'hover' || binding.type === 'active') {
      var expr = new Function('return ' + binding.expr)()

      //确保只绑定一次
      if (!binding.hasBindEvent) {
        var elem = binding.element
        var $elem = Anot(elem)
        var activate = 'mouseenter' //在移出移入时切换类名
        var abandon = 'mouseleave'
        if (binding.type === 'active') {
          //在聚焦失焦中切换类名
          elem.tabIndex = elem.tabIndex || -1
          activate = 'mousedown'
          abandon = 'mouseup'
          var fn0 = $elem.bind('mouseleave', function() {
            $elem.removeClass(expr)
          })
        }
      }

      var fn1 = $elem.bind(activate, function() {
        $elem.addClass(expr)
      })
      var fn2 = $elem.bind(abandon, function() {
        $elem.removeClass(expr)
      })
      binding.rollback = function() {
        $elem.unbind('mouseleave', fn0)
        $elem.unbind(activate, fn1)
        $elem.unbind(abandon, fn2)
      }
      binding.hasBindEvent = true
    }
  },
  update: function(val) {
    if (this.type !== 'class') {
      return
    }
    var obj = val
    if (!obj || this.param)
      return log(
        'class指令语法错误 %c %s="%s"',
        'color:#f00',
        this.name,
        this.expr
      )

    if (typeof obj === 'string') {
      obj = {}
      obj[val] = true
    }

    if (!Anot.isPlainObject(obj)) {
      obj = obj.$model
    }

    for (var i in obj) {
      this.element.classList.toggle(i, !!obj[i])
    }
  }
})

'hover,active'.replace(rword, function(name) {
  directives[name] = directives['class']
})
