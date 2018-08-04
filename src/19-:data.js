//兼容2种写法 :data-xx="yy", :data="{xx: yy}"
Anot.directive('data', {
  priority: 100,
  init: directives.attr.init,
  update: function(val) {
    var obj = val
    if (typeof obj === 'object' && obj !== null) {
      if (!Anot.isPlainObject(obj)) obj = val.$model

      for (var i in obj) {
        this.element.setAttribute('data-' + i, obj[i])
      }
    } else {
      if (!this.param) return

      this.element.setAttribute('data-' + this.param, obj)
    }
  }
})
