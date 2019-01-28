/*********************************************************************
 *                           DOM 底层补丁                             *
 **********************************************************************/

//safari5+是把contains方法放在Element.prototype上而不是Node.prototype
if (!DOC.contains) {
  Node.prototype.contains = function(arg) {
    return !!(this.compareDocumentPosition(arg) & 16)
  }
}
Anot.contains = function(root, el) {
  try {
    while ((el = el.parentNode)) if (el === root) return true
    return false
  } catch (e) {
    return false
  }
}

if (window.SVGElement) {
  let svgns = 'http://www.w3.org/2000/svg'
  let svg = DOC.createElementNS(svgns, 'svg')
  svg.innerHTML = '<circle cx="50" cy="50" r="40" fill="red" />'
  if (!rsvg.test(svg.firstChild)) {
    // #409
    /* jshint ignore:start */
    function enumerateNode(node, targetNode) {
      if (node && node.childNodes) {
        let nodes = node.childNodes
        for (let i = 0, el; (el = nodes[i++]); ) {
          if (el.tagName) {
            let svg = DOC.createElementNS(svgns, el.tagName.toLowerCase())
            // copy attrs
            ap.forEach.call(el.attributes, function(attr) {
              svg.setAttribute(attr.name, attr.value)
            })
            // 递归处理子节点
            enumerateNode(el, svg)
            targetNode.appendChild(svg)
          }
        }
      }
    }
    /* jshint ignore:end */
    Object.defineProperties(SVGElement.prototype, {
      outerHTML: {
        //IE9-11,firefox不支持SVG元素的innerHTML,outerHTML属性
        enumerable: true,
        configurable: true,
        get: function() {
          return new XMLSerializer().serializeToString(this)
        },
        set: function(html) {
          let tagName = this.tagName.toLowerCase(),
            par = this.parentNode,
            frag = Anot.parseHTML(html)
          // 操作的svg，直接插入
          if (tagName === 'svg') {
            par.insertBefore(frag, this)
            // svg节点的子节点类似
          } else {
            let newFrag = DOC.createDocumentFragment()
            enumerateNode(frag, newFrag)
            par.insertBefore(newFrag, this)
          }
          par.removeChild(this)
        }
      },
      innerHTML: {
        enumerable: true,
        configurable: true,
        get: function() {
          let s = this.outerHTML
          let ropen = new RegExp(
            '<' + this.nodeName + '\\b(?:(["\'])[^"]*?(\\1)|[^>])*>',
            'i'
          )
          let rclose = new RegExp('</' + this.nodeName + '>$', 'i')
          return s.replace(ropen, '').replace(rclose, '')
        },
        set: function(html) {
          if (Anot.clearHTML) {
            Anot.clearHTML(this)
            let frag = Anot.parseHTML(html)
            enumerateNode(frag, this)
          }
        }
      }
    })
  }
}

//========================= event binding ====================

let eventHooks = Anot.eventHooks

//针对firefox, chrome修正mouseenter, mouseleave(chrome30+)
if (!('onmouseenter' in root)) {
  Anot.each(
    {
      mouseenter: 'mouseover',
      mouseleave: 'mouseout'
    },
    function(origType, fixType) {
      eventHooks[origType] = {
        type: fixType,
        fix: function(elem, fn) {
          return function(e) {
            let t = e.relatedTarget
            if (!t || (t !== elem && !(elem.compareDocumentPosition(t) & 16))) {
              delete e.type
              e.type = origType
              return fn.call(elem, e)
            }
          }
        }
      }
    }
  )
}

//针对IE9+, w3c修正animationend
Anot.each(
  {
    AnimationEvent: 'animationend',
    WebKitAnimationEvent: 'webkitAnimationEnd'
  },
  function(construct, fixType) {
    if (window[construct] && !eventHooks.animationend) {
      eventHooks.animationend = {
        type: fixType
      }
    }
  }
)

if (DOC.onmousewheel === void 0) {
  /* IE6-11 chrome mousewheel wheelDetla 下 -120 上 120
     firefox DOMMouseScroll detail 下3 上-3
     firefox wheel detlaY 下3 上-3
     IE9-11 wheel deltaY 下40 上-40
     chrome wheel deltaY 下100 上-100 */
  eventHooks.mousewheel = {
    type: 'wheel',
    fix: function(elem, fn) {
      return function(e) {
        e.wheelDeltaY = e.wheelDelta = e.deltaY > 0 ? -120 : 120
        e.wheelDeltaX = 0
        Object.defineProperty(e, 'type', {
          value: 'mousewheel'
        })
        fn.call(elem, e)
      }
    }
  }
}
