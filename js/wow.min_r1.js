(function (win, doc) {
    'use strict';

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

    function WOW(options) {
        var self = this;

        this.config = extend(options || {}, DEFAULTS);
        this.boxes = [];
        this.all = [];
        this.finished = [];
        this.scrolled = true;
        this.stopped = false;

        this.scrollHandler = function () {
            self.scrolled = true;
            self.check();
        };
    }

    WOW.prototype.defaults = DEFAULTS;

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

    WOW.prototype.init = function () {
        var self = this;

        this.element = doc.documentElement;

        if (doc.body) {
            this.start();
        }

        if (doc.readyState === 'loading' && !doc.body) {
            this.on(doc, 'DOMContentLoaded', function () { self.start(); });
        }
        this.on(win, 'load', function () { self.start(); });

        return this;
    };

    WOW.prototype.start = function () {
        this.stopped = false;
        this.collect();

        if (this.disabled()) {

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

            this.settle();
        }

        this.observe();
        this.scrolled = true;
        this.check();

        return this;
    };

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

    WOW.prototype.settle = function () {
        var self = this;
        var delays = [60, 200, 500, 1200];
        for (var i = 0; i < delays.length; i++) {
            (function (d) {
                win.setTimeout(function () { self.check(true); }, d);
            })(delays[i]);
        }

        win.setTimeout(function () { self.hardReveal(); }, 2500);
    };

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

    WOW.prototype.applyStyle = function (el, hide) {
        var duration = el.getAttribute('data-wow-duration');
        var delay = el.getAttribute('data-wow-delay');
        var iteration = el.getAttribute('data-wow-iteration');

        if (duration) { this.vendorSet(el.style, { animationDuration: duration }); }
        if (delay) { this.vendorSet(el.style, { animationDelay: delay }); }
        if (iteration) { this.vendorSet(el.style, { animationIterationCount: iteration }); }

        this.setAnimationName(el, hide ? 'none' : '');
        el.style.visibility = hide ? 'hidden' : 'visible';
        return el;
    };

    WOW.prototype.show = function (el) {
        if (el.getAttribute('data-wow-shown') === '1') { return; }
        el.setAttribute('data-wow-shown', '1');

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

    WOW.prototype.isVisible = function (el) {
        var offset = parseInt(el.getAttribute('data-wow-offset') || this.config.offset, 10);
        if (isNaN(offset)) { offset = 0; }

        var rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
        var viewH = this.innerHeight();

        if (rect) {
            return rect.top - offset < viewH && rect.bottom + offset > 0;
        }

        var top = 0, node = el;
        while (node) {
            top += node.offsetTop || 0;
            node = node.offsetParent;
        }
        var scrollY = win.pageYOffset || doc.documentElement.scrollTop || 0;
        return top - offset < scrollY + viewH && (top + (el.clientHeight || 0)) + offset > scrollY;
    };

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

    WOW.prototype.sync = function () {
        this.collect();
        return this.start();
    };

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

    function addEvent(el, type, fn) {
        if (!el) { return; }
        if (el.addEventListener) { el.addEventListener(type, fn, false); }
        else if (el.attachEvent) { el.attachEvent('on' + type, fn); }
    }

    function readCookie(name) {
        var s = doc.cookie || '';
        var m = s.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
        if (!m) { return ''; }
        var v = m[1];
        try { v = win.decodeURIComponent(v); } catch (e) { }
        return v.replace(/\+/g, ' ').replace(/^\s+|\s+$/g, '');
    }

    function bootToast() {
        var msg = doc.getElementById('msgpid');
        if (!msg || !doc.body || msg.getAttribute('data-yc-toast') === '1') { return; }
        msg.setAttribute('data-yc-toast', '1');
        doc.documentElement.classList.add('yc-toast-on');

        var host = doc.createElement('div');
        host.className = 'yc-toast-host';
        host.setAttribute('aria-live', 'polite');
        doc.body.appendChild(host);

        var DUR = 5000;
        var timer = null;
        var hideTimer = null;
        var debounce = null;
        var suppress = false;

        var FALLBACK_MSG = '账户密码不正确';
        var exMsg = readCookie('ex_msg');
        var sawSignal = false;

        function current() { return host.firstChild; }

        function startBar(toast, ms) {
            var bar = toast.querySelector('.yc-toast-bar');
            if (!bar) { return; }
            bar.style.transition = 'none';
            bar.style.width = '100%';
            void bar.offsetWidth;
            bar.style.transition = 'width ' + ms + 'ms linear';
            bar.style.width = '0%';
            toast._remain = ms;
        }

        function arm(ms) {
            clearTimeout(timer);
            if (ms > 0) { timer = win.setTimeout(dismiss, ms); }
        }

        function pauseCountdown() {
            var toast = current();
            if (!toast || toast._closing) { return; }
            clearTimeout(timer);
            var bar = toast.querySelector('.yc-toast-bar');
            var total = toast.getBoundingClientRect().width || 1;
            var w = bar.getBoundingClientRect().width;
            var left = Math.max(0, DUR * (w / total));
            toast._remain = left;
            bar.style.transition = 'none';
            bar.style.width = (w / total * 100) + '%';
        }

        function resumeCountdown() {
            var toast = current();
            if (!toast || toast._closing) { return; }
            var left = toast._remain || 0;
            startBar(toast, left);
            arm(left);
        }

        function dismiss() {
            clearTimeout(timer);
            var toast = current();
            if (!toast || toast._closing) { return; }
            toast._closing = true;
            toast.classList.add('yc-toast-out');
            hideTimer = win.setTimeout(function () {
                var t = current();
                if (t && t._closing) { host.innerHTML = ''; }
            }, 380);
        }

        function show(text) {
            clearTimeout(hideTimer);
            host.innerHTML =
                '<div class="yc-toast">' +
                    '<span class="yc-toast-ico">' +
                        '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
                            '<path d="M12 2 1 21h22L12 2z"/>' +
                            '<rect x="11" y="9" width="2" height="6" rx="1" fill="#fff"/>' +
                            '<rect x="11" y="16.4" width="2" height="2" rx="1" fill="#fff"/>' +
                        '</svg>' +
                    '</span>' +
                    '<span class="yc-toast-body"></span>' +
                    '<button type="button" class="yc-toast-close" aria-label="关闭">&#215;</button>' +
                    '<span class="yc-toast-bar"></span>' +
                '</div>';

            var toast = current();
            toast.querySelector('.yc-toast-body').textContent = text;
            toast.querySelector('.yc-toast-close').addEventListener('click', dismiss);
            toast.addEventListener('mouseenter', pauseCountdown);
            toast.addEventListener('mouseleave', resumeCountdown);

            startBar(toast, DUR);
            arm(DUR);

            suppress = true;
            msg.innerHTML = '';
            win.setTimeout(function () { suppress = false; }, 0);
        }

        function wantShow() {
            var d = msg.style ? msg.style.display : '';
            return !!d && d !== 'none';
        }

        function hasUrlError() {
            var s = (win.location.search || '') + (win.location.hash || '');
            if (!s) { return false; }
            s = s.replace(/^[?#]/, '');
            var keys = ['errmsg', 'error', 'err', 'errorcode', 'errcode', 'loginerror', 'msg'];
            for (var i = 0; i < keys.length; i++) {
                var m = s.match(new RegExp('(?:^|&)' + keys[i] + '=([^&]*)', 'i'));
                if (!m) { continue; }
                var v = m[1];
                try { v = win.decodeURIComponent(v); } catch (e) { }
                v = v.replace(/\+/g, ' ').replace(/^\s+|\s+$/g, '').toLowerCase();
                if (v && v !== '0' && v !== 'false' && v !== 'no' && v !== 'none' && v !== 'null' && v !== 'undefined') {
                    return true;
                }
            }
            return false;
        }

        function armFallback() {
            win.setTimeout(function () {
                if ((msg.textContent || '').replace(/\u00a0/g, ' ').trim()) { return; }
                if (current()) { return; }
                show(exMsg || FALLBACK_MSG);
            }, 250);
        }

        function schedule(muts) {
            if (suppress) { return; }
            if (muts && muts.length) {
                for (var i = 0; i < muts.length; i++) {
                    if (muts[i].type === 'attributes' && wantShow()) {
                        sawSignal = true;
                        armFallback();
                    }
                }
            }
            clearTimeout(debounce);
            debounce = win.setTimeout(function () {
                var text = (msg.textContent || '').replace(/\u00a0/g, ' ').trim();
                if (text) { show(text); } else { dismiss(); }
            }, 40);
        }

        if (win.MutationObserver) {
            new win.MutationObserver(schedule).observe(msg, {
                childList: true,
                characterData: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style']
            });
        } else {
            win.setInterval(schedule, 300);
        }

        var initial = (msg.textContent || '').trim();
        if (initial) { show(initial); }

        sawSignal = !!exMsg || hasUrlError();
        if (sawSignal) {
            if (doc.readyState === 'complete') { armFallback(); }
            else { addEvent(win, 'load', armFallback); }
        }
    }

    if (doc.body && doc.getElementById('msgpid')) {
        bootToast();
    } else {
        addEvent(doc, 'DOMContentLoaded', bootToast);
    }

    win.WOW = WOW;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = WOW;
    }
})(window, document);
