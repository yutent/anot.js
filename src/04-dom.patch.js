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

//========================= event binding ====================

let eventHooks = Anot.eventHooks

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
