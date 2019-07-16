//将所有远程加载的模板,以字符串形式存放到这里
var templatePool = (Anot.templateCache = {})

function getTemplateContainer(binding, id, text) {
  var div = binding.templateCache && binding.templateCache[id]
  if (div) {
    var dom = DOC.createDocumentFragment(),
      firstChild
    while ((firstChild = div.firstChild)) {
      dom.appendChild(firstChild)
    }
    return dom
  }
  return Anot.parseHTML(text)
}
function nodesToFrag(nodes) {
  var frag = DOC.createDocumentFragment()
  for (var i = 0, len = nodes.length; i < len; i++) {
    frag.appendChild(nodes[i])
  }
  return frag
}
Anot.directive('include', {
  init: directives.attr.init,
  update: function(val) {
    if (!val) {
      return
    }

    var binding = this
    var elem = this.element
    var vmodels = binding.vmodels
    var loaded = binding.includeLoaded // 加载完的回调
    var rendered = binding.includeRendered // 渲染完的回调
    var effectClass = binding.effectName && binding.effectClass // 是否开启动画
    var templateCache = binding.templateCache // 是否开启 缓存
    var outer = binding.includeReplace // 是否替换容器
    var target = outer ? elem.parentNode : elem
    var _ele = binding._element // replace binding.element === binding.end

    binding.recoverNodes = binding.recoverNodes || Anot.noop

    var scanTemplate = function(text) {
      var _stamp = (binding._stamp = Date.now()) // 过滤掉频繁操作
      if (loaded) {
        var newText = loaded.apply(target, [text].concat(vmodels))
        if (typeof newText === 'string') {
          text = newText
        }
      }
      if (rendered) {
        checkScan(
          target,
          function() {
            rendered.call(target)
          },
          NaN
        )
      }
      var lastID = binding.includeLastID || '_default' // 默认

      binding.includeLastID = val
      var leaveEl =
        (templateCache && templateCache[lastID]) ||
        DOC.createElement(elem.tagName || binding._element.tagName) // 创建一个离场元素

      if (effectClass) {
        leaveEl.className = effectClass
        target.insertBefore(leaveEl, binding.start) // 插入到start之前，防止被错误的移动
      }

      // cache or animate，移动节点
      ;(templateCache || {})[lastID] = leaveEl
      var fragOnDom = binding.recoverNodes() // 恢复动画中的节点
      if (fragOnDom) {
        target.insertBefore(fragOnDom, binding.end)
      }
      while (true) {
        var node = binding.start.nextSibling
        if (node && node !== leaveEl && node !== binding.end) {
          leaveEl.appendChild(node)
        } else {
          break
        }
      }

      // 元素退场
      Anot.effect.remove(
        leaveEl,
        target,
        function() {
          if (templateCache) {
            // write cache
            if (_stamp === binding._stamp) ifGroup.appendChild(leaveEl)
          }
        },
        binding
      )

      var enterEl = target,
        before = Anot.noop,
        after = Anot.noop

      var fragment = getTemplateContainer(binding, val, text)
      var nodes = Anot.slice(fragment.childNodes)

      if (outer && effectClass) {
        enterEl = _ele
        enterEl.innerHTML = '' // 清空
        enterEl.setAttribute('skip', '')
        target.insertBefore(enterEl, binding.end.nextSibling) // 插入到bingding.end之后避免被错误的移动
        before = function() {
          enterEl.insertBefore(fragment, null) // 插入节点
        }
        after = function() {
          binding.recoverNodes = Anot.noop
          if (_stamp === binding._stamp) {
            fragment = nodesToFrag(nodes)
            target.insertBefore(fragment, binding.end) // 插入真实element
            scanNodeArray(nodes, vmodels)
          }
          if (enterEl.parentNode === target) target.removeChild(enterEl) // 移除入场动画元素
        }
        binding.recoverNodes = function() {
          binding.recoverNodes = Anot.noop
          return nodesToFrag(nodes)
        }
      } else {
        before = function() {
          //新添加元素的动画
          target.insertBefore(fragment, binding.end)
          scanNodeArray(nodes, vmodels)
        }
      }

      Anot.effect.apply(enterEl, 'enter', before, after)
    }

    if (templatePool[val]) {
      Anot.nextTick(function() {
        scanTemplate(templatePool[val])
      })
    } else {
      fetch(val, {
        method: 'get',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
        .then(res => {
          if (res.status >= 200 && res.status < 300) {
            return res.text()
          } else {
            return Promise.reject(
              `获取网络资源出错, ${res.status} (${res.statusText})`
            )
          }
        })
        .then(text => {
          templatePool[val] = text
          scanTemplate(text)
        })
        .catch(err => {
          log(':include load [' + val + '] error\n%c%s', 'color:#f30', err)
        })
    }
  }
})
