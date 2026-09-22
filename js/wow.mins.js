/*! wow.min.js — 轻量重制版 v2.0.0
 * 兼容原页面的调用方式：new WOW().init()  /  class="wow bounceInRight"
 * 支持 data-wow-duration / data-wow-delay / data-wow-iteration / data-wow-offset
 * 与原版差异：不缓存计算样式、不写任何视觉样式、脚本执行时立即隐藏待入场元素
 *            （消除“先显示再隐藏”的闪烁），并使用 requestAnimationFrame 调度。
 * 许可：MIT
 */
(function (win, doc) {
    'use strict';

    /* ---------- 默认配置（与 WOW 原版保持一致） ---------- */
    var DEFAULTS = {
        boxClass: 'wow',
        animateClass: 'animated',
        offset: 0,
        mobile: true,
        live: true
    };

    function extend(target, source) {
        for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key) &&
                target[key] === undefined) {
                target[key] = source[key];
            }
        }
        return target;
    }

    /* ---------- 构造函数 ---------- */
    function WOW(options) {
        var self = this;

        this.config = extend(options || {}, DEFAULTS);
        this.boxes = [];        /* 尚未入场的元素 */
        this.all = [];          /* 已收录的全部 .wow 元素 */
        this.finished = [];
        this.scrolled = true;
        this.stopped = false;

        /* 稳定的回调引用，便于 stop() 时解绑 */
        this.scrollHandler = function () {
            self.scrolled = true;
            self.check();
        };
    }

    WOW.prototype.defaults = DEFAULTS;

    /* ---------- 环境判断 ---------- */
    WOW.prototype.isMobile = function () {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
    };

    WOW.prototype.disabled = function () {
        return !this.config.mobile && this.isMobile();
    };

    WOW.prototype.innerHeight = function () {
        return win.innerHeight || (doc.documentElement && doc.documentElement.clientHeight) || 0;
    };

    WOW.prototype.util = function () {
        var self = this;
        return {
            isMobile: function () { return self.isMobile(); }
        };
    };

    /* ---------- 事件绑定 ---------- */
    WOW.prototype.on = function (el, type, fn, useCapture) {
        if (!el) { return; }
        if (el.addEventListener) {
            el.addEventListener(type, fn, useCapture || false);
        } else if (el.attachEvent) {
            el.attachEvent('on' + type, fn);
        } else {
            el['on' + type] = fn;
        }
    };

    WOW.prototype.off = function (el, type, fn, useCapture) {
        if (!el) { return; }
        if (el.removeEventListener) {
            el.removeEventListener(type, fn, useCapture || false);
        } else if (el.detachEvent) {
            el.detachEvent('on' + type, fn);
        } else {
            delete el['on' + type];
        }
    };

    /* ---------- 初始化 ---------- */
    WOW.prototype.init = function () {
        var self = this;

        this.element = doc.documentElement;

        /* 脚本位于 </body> 之前，此时 body 已存在：
           立即执行，可在首次绘制前就隐藏待入场元素，避免闪烁。
           若脚本被移到 <head>，则退回等待 DOMContentLoaded。 */
        if (doc.body) {
            this.start();
        }

        if (doc.readyState === 'loading' && !doc.body) {
            this.on(doc, 'DOMContentLoaded', function () { self.start(); });
        }
        this.on(win, 'load', function () { self.start(); });

        return this;
    };

    /* ---------- 开始工作 ---------- */
    WOW.prototype.start = function () {
        this.stopped = false;
        this.collect();

        if (this.disabled()) {
            /* 移动端被显式关闭动画：直接全部显示 */
            this.resetStyle();
            return this;
        }

        var i;
        for (i = 0; i < this.boxes.length; i++) {
            this.applyStyle(this.boxes[i], true);
        }

        if (!this.bound) {
            this.bound = true;
            this.on(win, 'scroll', this.scrollHandler, true);
            this.on(win, 'resize', this.scrollHandler, false);
            this.on(win, 'orientationchange', this.scrollHandler, false);
            /* 图片 / 字体 / 毛玻璃滤镜造成的布局变化，用几帧补检测 */
            this.settle();
        }

        this.observe();
        this.scrolled = true;
        this.check();

        return this;
    };

    /* 收集页面上所有 .wow 元素。
       注意：只能“追加”新元素，绝不能清空 this.boxes，
       否则会抹掉尚未入场的队列，导致元素永久停在 hidden。 */
    WOW.prototype.collect = function () {
        var nodes = this.element.querySelectorAll('.' + this.config.boxClass);
        for (var i = 0; i < nodes.length; i++) {
            if (this.indexOf(this.all, nodes[i]) === -1) {
                this.all.push(nodes[i]);
                this.boxes.push(nodes[i]);
            }
        }
        return this.boxes;
    };

    WOW.prototype.indexOf = function (arr, item) {
        if (Array.prototype.indexOf) { return arr.indexOf(item); }
        for (var i = 0, len = arr.length; i < len; i++) {
            if (arr[i] === item) { return i; }
        }
        return -1;
    };

    /* 连续几帧补检测：等布局稳定后再判断一次 */
    WOW.prototype.settle = function () {
        var self = this;
        var delays = [60, 200, 500, 1200];
        for (var i = 0; i < delays.length; i++) {
            (function (d) {
                win.setTimeout(function () { self.check(true); }, d);
            })(delays[i]);
        }
        /* 最后一道保险：登录页绝不能出现“永远隐藏的登录框” */
        win.setTimeout(function () { self.hardReveal(); }, 2500);
    };

    /* 兜底显示：视口内（及已滚过）却仍未入场的元素，直接显示 */
    WOW.prototype.hardReveal = function () {
        if (this.stopped) { return this; }
        var viewH = this.innerHeight();
        var remaining = [];

        for (var i = 0; i < this.boxes.length; i++) {
            var box = this.boxes[i];
            var rect = box.getBoundingClientRect ? box.getBoundingClientRect() : null;
            if (!rect) { remaining.push(box); continue; }

            if (rect.top < viewH) {
                this.show(box);
                this.finished.push(box);
            } else {
                remaining.push(box);
            }
        }
        this.boxes = remaining;
        return this;
    };

    /* 请求一次检测（同一帧内合并多次调用；force=true 时忽略合并标记） */
    WOW.prototype.check = function (force) {
        var self = this;
        if (this.stopped) { return this; }
        if (this._pending && !force) { return this; }
        this._pending = true;

        var raf = win.requestAnimationFrame || win.webkitRequestAnimationFrame;
        var run = function () {
            self._pending = false;
            self.scrollCallback();
        };

        if (raf) {
            this._raf = raf(run);
        } else {
            win.setTimeout(run, 16);
        }
        return this;
    };

    /* ---------- 样式与动画 ---------- */
    WOW.prototype.setAnimationName = function (el, name) {
        var style = el.style;
        style.animationName = name;
        style.webkitAnimationName = name;
        style.WebkitAnimationName = name;
    };

    WOW.prototype.vendorSet = function (style, map) {
        var vendors = ['moz', 'webkit', 'o'];
        for (var key in map) {
            if (!Object.prototype.hasOwnProperty.call(map, key)) { continue; }
            var value = map[key];
            style[key] = value;
            for (var i = 0; i < vendors.length; i++) {
                style[vendors[i] + key.charAt(0).toUpperCase() + key.substr(1)] = value;
            }
        }
    };

    /* hide = true  隐藏待入场；hide = false  播放动画并显示 */
    WOW.prototype.applyStyle = function (el, hide) {
        var duration = el.getAttribute('data-wow-duration');
        var delay = el.getAttribute('data-wow-delay');
        var iteration = el.getAttribute('data-wow-iteration');

        if (duration) { this.vendorSet(el.style, { animationDuration: duration }); }
        if (delay) { this.vendorSet(el.style, { animationDelay: delay }); }
        if (iteration) { this.vendorSet(el.style, { animationIterationCount: iteration }); }

        /* 动画名交回 CSS 的具体动画类（如 .bounceInRight）决定 */
        this.setAnimationName(el, hide ? 'none' : '');
        el.style.visibility = hide ? 'hidden' : 'visible';
        return el;
    };

    WOW.prototype.show = function (el) {
        if (el.getAttribute('data-wow-shown') === '1') { return; }
        el.setAttribute('data-wow-shown', '1');

        /* 只添加一次 animated，避免重复动画 */
        if (el.classList) {
            if (!el.classList.contains(this.config.animateClass)) {
                el.classList.add(this.config.animateClass);
            }
        } else if (el.className.indexOf(this.config.animateClass) === -1) {
            el.className = (el.className + ' ' + this.config.animateClass).replace(/\s+/g, ' ').replace(/^ | $/g, '');
        }

        this.applyStyle(el, false);
    };

    WOW.prototype.resetStyle = function () {
        for (var i = 0; i < this.all.length; i++) {
            this.all[i].style.visibility = 'visible';
            this.setAnimationName(this.all[i], '');
        }
    };

    /* ---------- 可见性判断 ---------- */
    WOW.prototype.isVisible = function (el) {
        var offset = parseInt(el.getAttribute('data-wow-offset') || this.config.offset, 10);
        if (isNaN(offset)) { offset = 0; }

        var rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
        var viewH = this.innerHeight();

        if (rect) {
            return rect.top - offset < viewH && rect.bottom + offset > 0;
        }
        /* 老浏览器兜底：逐级累加 offsetTop */
        var top = 0, node = el;
        while (node) {
            top += node.offsetTop || 0;
            node = node.offsetParent;
        }
        var scrollY = win.pageYOffset || doc.documentElement.scrollTop || 0;
        return top - offset < scrollY + viewH && (top + (el.clientHeight || 0)) + offset > scrollY;
    };

    /* ---------- 主循环 ---------- */
    WOW.prototype.scrollCallback = function () {
        if (!this.scrolled || this.stopped) { return; }
        this.scrolled = false;

        var remaining = [];
        for (var i = 0; i < this.boxes.length; i++) {
            var box = this.boxes[i];
            if (!box) { continue; }
            if (this.isVisible(box)) {
                this.show(box);
                this.finished.push(box);
            } else {
                remaining.push(box);
            }
        }
        this.boxes = remaining;

        if (this.boxes.length === 0 && !this.config.live) {
            this.stop();
        }
    };

    /* ---------- 动态内容（等同原版 live 能力） ---------- */
    WOW.prototype.observe = function () {
        if (!this.config.live || this._observer) { return; }
        var MO = win.MutationObserver || win.WebkitMutationObserver || win.MozMutationObserver;
        if (!MO || !doc.body) { return; }

        var self = this;
        this._observer = new MO(function () {
            self.collect();
            self.check();
        });
        this._observer.observe(doc.body, { childList: true, subtree: true });
    };

    /* 新增内容后手动同步：new WOW().sync() */
    WOW.prototype.sync = function () {
        this.collect();
        return this.start();
    };

    /* ---------- 停止 ---------- */
    WOW.prototype.stop = function () {
        this.stopped = true;

        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
        if (this.bound) {
            this.bound = false;
            this.off(win, 'scroll', this.scrollHandler, true);
            this.off(win, 'resize', this.scrollHandler, false);
            this.off(win, 'orientationchange', this.scrollHandler, false);
        }
        if (this._raf && win.cancelAnimationFrame) {
            win.cancelAnimationFrame(this._raf);
            this._raf = null;
        }
        return this;
    };

    /* ---------- 导出 ---------- */
    win.WOW = WOW;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = WOW;
    }
})(window, document);
