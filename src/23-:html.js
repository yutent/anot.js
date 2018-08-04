Anot.directive('html', {
  update: function(val) {
    var binding = this
    var elem = this.element
    var isHtmlFilter = elem.nodeType !== 1
    var _parent = isHtmlFilter ? elem.parentNode : elem
    if (!_parent) return
    val = val == null ? '' : val

    if (elem.nodeType === 3) {
      var signature = generateID('html')
      _parent.insertBefore(DOC.createComment(signature), elem)
      binding.element = DOC.createComment(signature + ':end')
      _parent.replaceChild(binding.element, elem)
      elem = binding.element
    }
    if (typeof val !== 'object') {
      //string, number, boolean
      var fragment = Anot.parseHTML(String(val))
    } else if (val.nodeType === 11) {
      //将val转换为文档碎片
      fragment = val
    } else if (val.nodeType === 1 || val.item) {
      var nodes = val.nodeType === 1 ? val.childNodes : val.item
      fragment = anotFragment.cloneNode(true)
      while (nodes[0]) {
        fragment.appendChild(nodes[0])
      }
    }

    nodes = Anot.slice(fragment.childNodes)
    //插入占位符, 如果是过滤器,需要有节制地移除指定的数量,如果是html指令,直接清空
    if (isHtmlFilter) {
      var endValue = elem.nodeValue.slice(0, -4)
      while (true) {
        var node = elem.previousSibling
        if (!node || (node.nodeType === 8 && node.nodeValue === endValue)) {
          break
        } else {
          _parent.removeChild(node)
        }
      }
      _parent.insertBefore(fragment, elem)
    } else {
      Anot.clearHTML(elem).appendChild(fragment)
    }
    scanNodeArray(nodes, binding.vmodels)
  }
})
