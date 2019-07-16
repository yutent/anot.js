/*********************************************************************
 *                             自带过滤器                             *
 **********************************************************************/

var rscripts = /<script[^>]*>([\S\s]*?)<\/script\s*>/gim
var ron = /\s+(on[^=\s]+)(?:=("[^"]*"|'[^']*'|[^\s>]+))?/g
var ropen = /<\w+\b(?:(["'])[^"]*?(\1)|[^>])*>/gi
var rsanitize = {
  a: /\b(href)\=("javascript[^"]*"|'javascript[^']*')/gi,
  img: /\b(src)\=("javascript[^"]*"|'javascript[^']*')/gi,
  form: /\b(action)\=("javascript[^"]*"|'javascript[^']*')/gi
}
var rsurrogate = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g
var rnoalphanumeric = /([^\#-~| |!])/g

function numberFormat(number, decimals, point, thousands) {
  //form http://phpjs.org/functions/number_format/
  //number 必需，要格式化的数字
  //decimals 可选，规定多少个小数位。
  //point 可选，规定用作小数点的字符串（默认为 . ）。
  //thousands 可选，规定用作千位分隔符的字符串（默认为 , ），如果设置了该参数，那么所有其他参数都是必需的。
  number = (number + '').replace(/[^0-9+\-Ee.]/g, '')
  var n = !isFinite(+number) ? 0 : +number,
    prec = !isFinite(+decimals) ? 3 : Math.abs(decimals),
    sep = thousands || ',',
    dec = point || '.',
    s = '',
    toFixedFix = function(n, prec) {
      var k = Math.pow(10, prec)
      return '' + (Math.round(n * k) / k).toFixed(prec)
    }
  // Fix for IE parseFloat(0.55).toFixed(0) = 0;
  s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.')
  if (s[0].length > 3) {
    s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep)
  }
  if ((s[1] || '').length < prec) {
    s[1] = s[1] || ''
    s[1] += new Array(prec - s[1].length + 1).join('0')
  }
  return s.join(dec)
}

var filters = (Anot.filters = {
  uppercase: function(str) {
    return str.toUpperCase()
  },
  lowercase: function(str) {
    return str.toLowerCase()
  },
  //字符串截取，超过指定长度以mark标识接上
  truncate: function(str, len, mark) {
    len = len || 30
    mark = typeof mark === 'string' ? mark : '...'
    return str.slice(0, len) + (str.length <= len ? '' : mark)
  },
  //小值秒数转化为 时间格式
  time: function(str) {
    str = str >> 0
    var s = str % 60
    var m = Math.floor(str / 60)
    var h = Math.floor(m / 60)
    m = m % 60
    m = m < 10 ? '0' + m : m
    s = s < 10 ? '0' + s : s

    if (h > 0) {
      h = h < 10 ? '0' + h : h
      return h + ':' + m + ':' + s
    }
    return m + ':' + s
  },
  $filter: function(val) {
    for (var i = 1, n = arguments.length; i < n; i++) {
      var array = arguments[i]
      var fn = Anot.filters[array[0]]
      if (typeof fn === 'function') {
        var arr = [val].concat(array.slice(1))
        val = fn.apply(null, arr)
      }
    }
    return val
  },
  camelize: camelize,
  //https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet
  //    <a href="javasc&NewLine;ript&colon;alert('XSS')">chrome</a>
  //    <a href="data:text/html;base64, PGltZyBzcmM9eCBvbmVycm9yPWFsZXJ0KDEpPg==">chrome</a>
  //    <a href="jav  ascript:alert('XSS');">IE67chrome</a>
  //    <a href="jav&#x09;ascript:alert('XSS');">IE67chrome</a>
  //    <a href="jav&#x0A;ascript:alert('XSS');">IE67chrome</a>
  xss: function(str) {
    return str.replace(rscripts, '').replace(ropen, function(a, b) {
      var match = a.toLowerCase().match(/<(\w+)\s/)
      if (match) {
        //处理a标签的href属性，img标签的src属性，form标签的action属性
        var reg = rsanitize[match[1]]
        if (reg) {
          a = a.replace(reg, function(s, name, value) {
            var quote = value.charAt(0)
            return name + '=' + quote + 'javascript:void(0)' + quote // jshint ignore:line
          })
        }
      }
      return a.replace(ron, ' ').replace(/\s+/g, ' ') //移除onXXX事件
    })
  },
  escape: function(str) {
    //将字符串经过 str 转义得到适合在页面中显示的内容, 例如替换 < 为 &lt
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(rsurrogate, function(value) {
        var hi = value.charCodeAt(0)
        var low = value.charCodeAt(1)
        return '&#' + ((hi - 0xd800) * 0x400 + (low - 0xdc00) + 0x10000) + ';'
      })
      .replace(rnoalphanumeric, function(value) {
        return '&#' + value.charCodeAt(0) + ';'
      })
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  },
  currency: function(amount, symbol, fractionSize) {
    return (
      (symbol || '\u00a5') +
      numberFormat(amount, isFinite(fractionSize) ? fractionSize : 2)
    )
  },
  number: numberFormat,
  //日期格式化，类似php的date函数，
  date: function(stamp, str) {
    var oDate = stamp

    if (!Date.isDate(oDate)) {
      var tmp = +oDate
      if (tmp === tmp) {
        oDate = tmp
      }

      oDate = new Date(oDate)
      if (oDate.toString() === 'Invalid Date') {
        return 'Invalid Date'
      }
    }
    return oDate.format(str)
  }
})
