/*-----------------部分ES6的JS实现 start---------------*/

// ===============================
// ========== Promise ============
// ===============================

if (!Promise.defer) {
  Promise.defer = function() {
    let obj = {}
    obj.promise = new Promise((resolve, reject) => {
      obj.resolve = resolve
      obj.reject = reject
    })
    return obj
  }
}

//类似于Array 的splice方法
if (!String.prototype.splice) {
  Object.defineProperty(String.prototype, 'splice', {
    value: function(start, len, fill) {
      let length = this.length
      let argLen = arguments.length

      fill = fill === undefined ? '' : fill

      if (argLen < 1) {
        return this
      }

      //处理负数
      if (start < 0) {
        if (Math.abs(start) >= length) {
          start = 0
        } else {
          start = length + start
        }
      }

      if (argLen === 1) {
        return this.slice(0, start)
      } else {
        len -= 0

        let strl = this.slice(0, start)
        let strr = this.slice(start + len)

        return strl + fill + strr
      }
    },
    enumerable: false
  })
}

if (!Date.prototype.getFullWeek) {
  //获取当天是本年度第几周
  Object.defineProperty(Date.prototype, 'getFullWeek', {
    value: function() {
      let thisYear = this.getFullYear()
      let that = new Date(thisYear, 0, 1)
      let firstDay = that.getDay() || 1
      let numsOfToday = (this - that) / 86400000
      return Math.ceil((numsOfToday + firstDay) / 7)
    },
    enumerable: false
  })

  //获取当天是本月第几周
  Object.defineProperty(Date.prototype, 'getWeek', {
    value: function() {
      let today = this.getDate()
      let thisMonth = this.getMonth()
      let thisYear = this.getFullYear()
      let firstDay = new Date(thisYear, thisMonth, 1).getDay()
      return Math.ceil((today + firstDay) / 7)
    },
    enumerable: false
  })
}

if (!Date.isDate) {
  Object.defineProperty(Date, 'isDate', {
    value: function(obj) {
      return typeof obj === 'object' && obj.getTime ? true : false
    },
    enumerable: false
  })
}

//时间格式化
if (!Date.prototype.format) {
  Object.defineProperty(Date.prototype, 'format', {
    value: function(str) {
      str = str || 'Y-m-d H:i:s'
      let week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      let dt = {
        fullyear: this.getFullYear(),
        year: this.getYear(),
        fullweek: this.getFullWeek(),
        week: this.getWeek(),
        month: this.getMonth() + 1,
        date: this.getDate(),
        day: week[this.getDay()],
        hours: this.getHours(),
        minutes: this.getMinutes(),
        seconds: this.getSeconds()
      }
      let re

      dt.g = dt.hours > 12 ? dt.hours - 12 : dt.hours

      re = {
        Y: dt.fullyear,
        y: dt.year,
        m: dt.month < 10 ? '0' + dt.month : dt.month,
        n: dt.month,
        d: dt.date < 10 ? '0' + dt.date : dt.date,
        j: dt.date,
        H: dt.hours < 10 ? '0' + dt.hours : dt.hours,
        h: dt.g < 10 ? '0' + dt.g : dt.g,
        G: dt.hours,
        g: dt.g,
        i: dt.minutes < 10 ? '0' + dt.minutes : dt.minutes,
        s: dt.seconds < 10 ? '0' + dt.seconds : dt.seconds,
        W: dt.fullweek,
        w: dt.week,
        D: dt.day
      }

      for (let i in re) {
        str = str.replace(new RegExp(i, 'g'), re[i])
      }
      return str
    },
    enumerable: false
  })
}
/*-----------------部分ES6的JS实现 ending---------------*/
