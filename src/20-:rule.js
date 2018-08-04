/*------ 表单验证 -------*/
var __rules = {}
Anot.validate = function(key, cb) {
  if (!__rules[key]) {
    throw new Error('validate [' + key + '] not exists.')
  }
  if (typeof cb === 'function') {
    __rules[key].event = cb
  }
  var result = __rules[key].result
  for (var k in result) {
    if (!result[k].passed) {
      return result[k]
    }
  }
  return true
}
Anot.directive('rule', {
  priority: 2010,
  init: function(binding) {
    if (binding.param && !__rules[binding.param]) {
      __rules[binding.param] = {
        event: noop,
        result: {}
      }
    }
    binding.target = __rules[binding.param]
  },
  update: function(opt) {
    var _this = this
    var elem = this.element
    if (!['INPUT', 'TEXTAREA'].includes(elem.nodeName)) {
      return
    }
    if (elem.msBinded) {
      return
    }
    if (this.target) {
      this.target.result[elem.expr] = { key: elem.expr }
    }
    var target = this.target

    // 0: 验证通过
    // 10001: 不能为空
    // 10002: 必须为合法数字
    // 10003: Email格式错误
    // 10004: 手机格式错误
    // 10005: 必须为纯中文
    // 10006: 格式匹配错误(正则)
    // 10011: 输入值超过指定最大长度
    // 10012: 输入值短于指定最小长度
    // 10021: 输入值大于指定最大数值
    // 10022: 输入值小于指定最小数值
    // 10031: 与指定的表单的值不一致
    function checked(ev) {
      var val = elem.value
      var code = 0

      if (opt.require && (val === '' || val === null)) {
        code = 10001
      }

      if (code === 0 && opt.isNumeric) {
        code = !isFinite(val) ? 10002 : 0
      }

      if (code === 0 && opt.isEmail)
        code = !/^[\w\.\-]+@\w+([\.\-]\w+)*\.\w+$/.test(val) ? 10003 : 0

      if (code === 0 && opt.isPhone) {
        code = !/^1[34578]\d{9}$/.test(val) ? 10004 : 0
      }

      if (code === 0 && opt.isCN) {
        code = !/^[\u4e00-\u9fa5]+$/.test(val) ? 10005 : 0
      }

      if (code === 0 && opt.exp) {
        code = !opt.exp.test(val) ? 10006 : 0
      }

      if (code === 0 && opt.maxLen) {
        code = val.length > opt.maxLen ? 10011 : 0
      }

      if (code === 0 && opt.minLen) {
        code = val.length < opt.minLen ? 10012 : 0
      }

      if (code === 0 && opt.hasOwnProperty('max')) {
        code = val > opt.max ? 10021 : 0
      }

      if (code === 0 && opt.hasOwnProperty('min')) {
        code = val < opt.min ? 10022 : 0
      }

      if (code === 0 && opt.eq) {
        var eqVal = parseVmValue(_this.vmodels[0], opt.eq)
        code = val !== eqVal ? 10031 : 0
      }

      target.result[elem.expr].code = code
      target.result[elem.expr].passed = opt.require
        ? code === 0
        : val
          ? code === 0
          : true

      var passed = true
      for (var k in target.result) {
        if (!target.result[k].passed) {
          passed = false
          target.event(target.result[k])
          break
        }
      }
      if (passed) {
        target.event(true)
      }
    }
    Anot(elem).bind('blur', checked)
    this.rollback = function() {
      Anot(elem).unbind('blur', checked)
    }
    elem.msBinded = true
    checked()
  }
})
