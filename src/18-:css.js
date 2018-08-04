//样式定义 :css-width="200"
//:css="{width: 200}"
Anot.directive('css', {
  init: directives.attr.init,
  update: function(val) {
    var $elem = Anot(this.element)
    if (!this.param) {
      var obj = val
      try {
        if (typeof val === 'object') {
          if (!Anot.isPlainObject(val)) obj = val.$model
        } else {
          obj = new Function('return ' + val)()
        }
        for (var i in obj) {
          $elem.css(i, obj[i])
        }
      } catch (err) {
        log('样式格式错误 %c %s="%s"', 'color:#f00', this.name, this.expr)
      }
    } else {
      $elem.css(this.param, val)
    }
  }
})
