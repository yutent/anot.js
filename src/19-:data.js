//兼容2种写法 :data-xx="yy", :data="{xx: yy}"
Anot.directive('data', {
  priority: 100,
  init: directives.attr.init,
  update: function(val) {
    var $el = Anot(this.element)
    if (this.param) {
      $el.data(this.param, val)
    } else {
      if (typeof val !== 'object') {
        return log(
          ':data指令格式错误 %c %s="%s"',
          'color:#f00',
          this.name,
          this.expr
        )
      }
      var obj = val
      if (!Anot.isPlainObject(obj)) {
        obj = val.$model
      }
      for (var i in obj) {
        $el.data(i, obj[i])
      }
    }
  }
})
