var componentQueue = []
var widgetList = []
var componentHooks = {
  __init__: noop,
  componentWillMount: noop,
  componentDidMount: noop,
  childComponentDidMount: noop,
  componentWillUnmount: noop,
  render: function() {
    return null
  }
}

function parseSlot(collections, vms) {
  var arr = aslice.call(collections, 0)
  var obj = { __extra__: [] }
  arr.forEach(function(elem) {
    switch (elem.nodeType) {
      case 1:
        var isSlotTag = elem.tagName === 'SLOT'
        var slotKey = null
        var isSlotAttr = elem.getAttribute('slot')

        if (isSlotTag) {
          slotKey = elem.name || elem.getAttribute('name')
        } else if (isSlotAttr) {
          slotKey = isSlotAttr
        }

        if (slotKey) {
          obj[slotKey] = obj[slotKey] || []
          elem.removeAttribute('slot')
          if (isSlotTag) {
            obj[slotKey].push(elem.innerHTML)
          } else {
            obj[slotKey].push(elem.outerHTML)
          }
        } else {
          var txt = elem.outerHTML
          if (isWidget(elem) || /:[\w-]*=".*"/.test(txt)) {
            break
          }
          if (rexpr.test(txt)) {
            var expr = normalizeExpr(txt)
            txt = parseExpr(expr, vms, {}).apply(0, vms)
          }

          obj.__extra__.push(txt)
        }

        break
      case 3:
        var txt = elem.textContent.trim()
        if (txt) {
          obj.__extra__.push(txt)
        }
        break
      default:
        break
    }
    elem.parentNode.removeChild(elem)
  })
  return obj
}

function parseVmValue(vm, key, val) {
  if (arguments.length === 2) {
    var oval = Function('o', 'return o.' + key)(vm)
    if (oval && typeof oval === 'object') {
      try {
        return oval.$model
      } catch (err) {}
    }
    return oval
  } else if (arguments.length === 3) {
    Function('o', 'v', 'return o.' + key + ' = v')(vm, val)
  }
}

Anot.components = {}
Anot.component = function(name, opts) {
  if (opts) {
    Anot.components[name] = Anot.mix({}, componentHooks, opts)
  }
  for (var i = 0, obj; (obj = componentQueue[i]); i++) {
    if (name === obj.name) {
      componentQueue.splice(i, 1)
      i--
      // (obj, Anot.components[name], obj.element, obj.name)
      ;(function(host, hooks, elem, widget) {
        //如果elem已从Document里移除,直接返回
        if (!Anot.contains(DOC, elem) || elem.msResolved) {
          Anot.Array.remove(componentQueue, host)
          return
        }

        var dependencies = 1

        //===========收集各种配置=======
        if (elem.getAttribute(':attr-uuid')) {
          //如果还没有解析完,就延迟一下 #1155
          return
        }
        hooks.watch = hooks.watch || {}
        var parentVm = host.vmodels.concat().pop()
        var state = {}
        var props = getOptionsFromTag(elem, host.vmodels)
        var $id = props.uuid || generateID(widget)
        var slots = { __extra__: [] }

        // 对象组件的子父vm关系, 只存最顶层的$components对象中,
        while (parentVm.$up && parentVm.$up.__WIDGET__ === name) {
          parentVm = parentVm.$up
        }

        if (elem.childNodes.length) {
          slots = parseSlot(elem.childNodes, host.vmodels)
        }
        var txtContent = slots.__extra__.join('')
        delete slots.__extra__
        elem.text = function() {
          return txtContent
        }

        if (props.hasOwnProperty(':disabled')) {
          var disabledKey = props[':disabled']
          var disabledKeyReverse = false
          if (disabledKey.indexOf('!') === 0) {
            disabledKey = disabledKey.slice(1)
            disabledKeyReverse = true
          }
          state.disabled = parseVmValue(parentVm, disabledKey)
          if (disabledKeyReverse) {
            state.disabled = !state.disabled
          }

          parentVm.$watch(disabledKey, function(val) {
            if (disabledKeyReverse) {
              val = !val
            }
            Anot.vmodels[$id].disabled = val
          })

          delete props[':disabled']
        }
        if (props.hasOwnProperty(':loading')) {
          var loadingKey = props[':loading']
          var loadingKeyReverse = false
          if (loadingKey.indexOf('!') === 0) {
            loadingKey = loadingKey.slice(1)
            loadingKeyReverse = true
          }
          state.loading = parseVmValue(parentVm, loadingKey)
          if (loadingKeyReverse) {
            state.loading = !state.loading
          }
          parentVm.$watch(loadingKey, function(val) {
            if (loadingKeyReverse) {
              val = !val
            }
            Anot.vmodels[$id].loading = val
          })
          delete props[':loading']
        }

        // :value可实现双向同步值
        if (props.hasOwnProperty(':value')) {
          var valueKey = props[':value']
          var valueWatcher = function() {
            var val = parseVmValue(parentVm, valueKey)
            Anot.vmodels[$id].value = val
          }
          var childValueWatcher = function() {
            var val = this.value
            if (val && typeof val === 'object') {
              val = val.$model
            }
            parseVmValue(parentVm, valueKey, val)
          }
          state.value = parseVmValue(parentVm, valueKey)

          if (hooks.watch.value) {
            hooks.watch.value = [hooks.watch.value]
          } else {
            hooks.watch.value = []
          }
          if (hooks.watch['value.length']) {
            hooks.watch['value.length'] = [hooks.watch['value.length']]
          } else {
            hooks.watch['value.length'] = []
          }
          if (hooks.watch['value.*']) {
            hooks.watch['value.*'] = [hooks.watch['value.*']]
          } else {
            hooks.watch['value.*'] = []
          }

          parentVm.$watch(valueKey, valueWatcher)
          if (Array.isArray(state.value)) {
            parentVm.$watch(valueKey + '.*', valueWatcher)
            parentVm.$watch(valueKey + '.length', valueWatcher)
            hooks.watch['value.*'].push(childValueWatcher)
            hooks.watch['value.length'].push(childValueWatcher)
          } else {
            hooks.watch.value.push(childValueWatcher)
          }

          delete props[':value']
        }

        delete props.uuid
        delete props.name
        delete props.isWidget

        hooks.props = hooks.props || {}
        hooks.state = hooks.state || {}

        Object.assign(hooks.props, props)
        Object.assign(hooks.state, state)

        var __READY__ = false

        hooks.__init__.call(elem, hooks.props, hooks.state, function next() {
          __READY__ = true

          delete elem.text
        })

        if (!__READY__) {
          return
        }

        hooks.$id = $id

        //==========构建VM=========
        var {
          componentWillMount,
          componentDidMount,
          childComponentDidMount,
          componentWillUnmount,
          render
        } = hooks

        delete hooks.__init__
        delete hooks.componentWillMount
        delete hooks.componentDidMount
        delete hooks.childComponentDidMount
        delete hooks.componentWillUnmount

        var vmodel = Anot(hooks)
        Anot.vmodels[vmodel.$id] = vmodel
        hideProperty(vmodel, '__WIDGET__', name)
        hideProperty(vmodel, '$recycle', function() {
          for (var i in this.$events) {
            var ev = this.$events[i] || []
            var len = ev.length
            while (len--) {
              if (ev[len].type === null || ev[len].type === 'user-watcher') {
                ev.splice(len, 1)
              }
            }
          }
        })
        delete vmodel.$mounted

        // 对象组件的子父vm关系, 只存最顶层的$components对象中,
        // 而子vm, 无论向下多少级, 他们的$up对象也只存最顶层的组件vm
        parentVm.$components.push(vmodel)
        if (parentVm.__WIDGET__ === name) {
          vmodel.$up = parentVm
        }

        elem.msResolved = 1 //防止二进扫描此元素

        componentWillMount.call(vmodel)

        Anot.clearHTML(elem)
        var html = render.call(vmodel, slots) || ''

        html = html.replace(/<\w+[^>]*>/g, function(m, s) {
          return m.replace(/[\n\t\s]{1,}/g, ' ')
        })

        elem.innerHTML = html

        hideProperty(vmodel, '$elem', elem)
        elem.__VM__ = vmodel

        Anot.fireDom(elem, 'datasetchanged', {
          vm: vmodel,
          childReady: 1
        })

        var children = 0
        var removeFn = Anot.bind(elem, 'datasetchanged', function(ev) {
          if (ev.childReady) {
            dependencies += ev.childReady
            if (vmodel.$id !== ev.vm.$id) {
              if (ev.childReady === -1) {
                children++
                childComponentDidMount.call(vmodel, ev.vm)
              }
              ev.stopPropagation()
            }
          }
          if (dependencies === 0) {
            var timer = setTimeout(function() {
              clearTimeout(timer)
              elem.removeAttribute('is-widget')
              componentDidMount.call(vmodel)
            }, children ? Math.max(children * 17, 100) : 17)

            Anot.unbind(elem, 'datasetchanged', removeFn)
            //==================
            host.rollback = function() {
              try {
                componentWillUnmount.call(vmodel)
              } catch (e) {}
              parentVm.$recycle && parentVm.$recycle()
              Anot.Array.remove(parentVm.$components, vmodel)
              delete Anot.vmodels[vmodel.$id]
            }
            injectDisposeQueue(host, widgetList)
            if (window.chrome) {
              elem.addEventListener('DOMNodeRemovedFromDocument', function() {
                setTimeout(rejectDisposeQueue)
              })
            }
          }
        })

        scanTag(elem, [vmodel])

        if (!elem.childNodes.length) {
          Anot.fireDom(elem, 'datasetchanged', {
            vm: vmodel,
            childReady: -1
          })
        } else {
          var id2 = setTimeout(function() {
            clearTimeout(id2)
            Anot.fireDom(elem, 'datasetchanged', {
              vm: vmodel,
              childReady: -1
            })
          }, 17)
        }
      })(obj, toJson(Anot.components[name]), obj.element, obj.name) // jshint ignore:line
    }
  }
}
