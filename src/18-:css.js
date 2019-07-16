//样式定义 :css-width="200"
//:css="{width: 200}"
Anot.directive('css', {
  init: directives.attr.init,
  update: function(val) {
    var $elem = Anot(this.element)
    if (this.param) {
      $elem.css(this.param, val)
    } else {
      if (typeof val !== 'object') {
        return log(
          ':css指令格式错误 %c %s="%s"',
          'color:#f00',
          this.name,
          this.expr
        )
      }
      var obj = val
      if (!Anot.isPlainObject(obj)) {
        obj = val.$model
      }
      $elem.css(obj)
    }
  }
})
