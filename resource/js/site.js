
(function () {
  var root = document.documentElement;
  root.classList.add('reveal-ready');
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var THEME_KEY = 'ysb-theme';
  var FOCUSABLE_SELECTOR = [
    'a[href]',
    'area[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'iframe',
    'object',
    'embed',
    '[contenteditable="true"]',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function getFocusable(container) {
    if (!container) return [];
    return Array.prototype.slice.call(container.querySelectorAll(FOCUSABLE_SELECTOR))
      .filter(function (node) {
        return !node.hasAttribute('disabled') &&
          node.getAttribute('aria-hidden') !== 'true' &&
          (node.offsetWidth > 0 || node.offsetHeight > 0 || node.getClientRects().length > 0);
      });
  }

  function focusNode(node) {
    if (!node || !node.focus) return;
    try {
      node.focus({ preventScroll: true });
    } catch (err) {
      node.focus();
    }
  }

  function focusFirst(container, preferred) {
    focusNode(preferred || getFocusable(container)[0] || container);
  }

  function trapFocus(event, container) {
    if (event.key !== 'Tab' || !container) return;
    var nodes = getFocusable(container);
    if (!nodes.length) {
      event.preventDefault();
      focusNode(container);
      return;
    }

    var first = nodes[0];
    var last = nodes[nodes.length - 1];
    var active = document.activeElement;

    if (event.shiftKey && (active === first || !container.contains(active))) {
      event.preventDefault();
      focusNode(last);
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      focusNode(first);
    }
  }

  function setElementInert(element, active) {
    if (!element) return;
    if (active) {
      if (!element.hasAttribute('data-modal-inert')) {
        element.setAttribute('data-modal-inert', '');
        element.setAttribute(
          'data-modal-aria-hidden',
          element.hasAttribute('aria-hidden') ? element.getAttribute('aria-hidden') : '__unset__'
        );
      }
      element.setAttribute('aria-hidden', 'true');
      element.setAttribute('inert', '');
      element.inert = true;
      return;
    }

    if (!element.hasAttribute('data-modal-inert')) return;
    var previousAria = element.getAttribute('data-modal-aria-hidden');
    if (previousAria === '__unset__') {
      element.removeAttribute('aria-hidden');
    } else if (previousAria !== null) {
      element.setAttribute('aria-hidden', previousAria);
    }
    element.removeAttribute('data-modal-inert');
    element.removeAttribute('data-modal-aria-hidden');
    element.removeAttribute('inert');
    element.inert = false;
  }

  function setBackgroundInert(active, activeElements) {
    var allowed = Array.isArray(activeElements) ? activeElements : [activeElements];
    Array.prototype.slice.call(document.body.children).forEach(function (child) {
      if (active && allowed.indexOf(child) !== -1) return;
      setElementInert(child, active);
    });
  }

  function prefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function applyTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
    if (themeMeta) {
      themeMeta.setAttribute('content', theme === 'dark' ? '#000000' : '#f5f5f7');
    }
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      var icon = btn.querySelector('i');
      var label = btn.querySelector('.theme-label');
      btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      if (icon) {
        icon.className = theme === 'dark' ? 'fa fa-sun-o' : 'fa fa-moon-o';
      }
      if (label) {
        label.textContent = theme === 'dark'
          ? (btn.getAttribute('data-label-light') || 'Light')
          : (btn.getAttribute('data-label-dark') || 'Dark');
      }
    });
    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch (err) {
        /* ignore */
      }
    }
  }

  function initTheme() {
    var saved = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch (err) {
      saved = null;
    }
    applyTheme(saved || (prefersDark() ? 'dark' : 'light'), false);

    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(next, true);
      });
    });

    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var listener = function (event) {
        var stored = null;
        try {
          stored = localStorage.getItem(THEME_KEY);
        } catch (err) {
          stored = null;
        }
        if (!stored) {
          applyTheme(event.matches ? 'dark' : 'light', false);
        }
      };
      if (mq.addEventListener) {
        mq.addEventListener('change', listener);
      } else if (mq.addListener) {
        mq.addListener(listener);
      }
    }
  }

  function initMenu() {
    var toggle = document.querySelector('[data-menu-toggle]');
    var closeBtn = document.querySelector('[data-menu-close]');
    var drawer = document.querySelector('[data-drawer]');
    var backdrop = document.querySelector('[data-drawer-backdrop]');
    var returnFocus = null;

    if (drawer) drawer.setAttribute('tabindex', '-1');

    function closeMenu() {
      var wasOpen = document.body.classList.contains('menu-open');
      document.body.classList.remove('menu-open');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
      if (drawer) drawer.setAttribute('aria-hidden', 'true');
      setBackgroundInert(false);
      if (wasOpen && returnFocus && returnFocus.focus && document.contains(returnFocus)) {
        focusNode(returnFocus);
      }
      returnFocus = null;
    }

    function openMenu() {
      if (document.body.classList.contains('menu-open')) return;
      returnFocus = document.activeElement;
      document.body.classList.add('menu-open');
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
      if (drawer) drawer.setAttribute('aria-hidden', 'false');
      if (drawer) setBackgroundInert(true, [drawer, backdrop]);
      window.requestAnimationFrame(function () {
        focusFirst(drawer, closeBtn || drawer);
      });
    }

    if (toggle) {
      toggle.addEventListener('click', function () {
        if (document.body.classList.contains('menu-open')) {
          closeMenu();
        } else {
          openMenu();
        }
      });
    }

    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    if (backdrop) backdrop.addEventListener('click', closeMenu);
    if (drawer) {
      drawer.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', closeMenu);
      });
    }

    window.addEventListener('keydown', function (event) {
      if (!document.body.classList.contains('menu-open')) return;
      if (event.key === 'Escape') {
        closeMenu();
      } else {
        trapFocus(event, drawer);
      }
    });
  }

  function initSpotlight() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    window.addEventListener('pointermove', function (event) {
      root.style.setProperty('--pointer-x', event.clientX + 'px');
      root.style.setProperty('--pointer-y', event.clientY + 'px');
    }, { passive: true });
  }

  function initCopy() {
    document.querySelectorAll('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy');
        var label = btn.querySelector('.copy-label');
        var copiedLabel = btn.getAttribute('data-copied-label') || 'Copied';
        var fallbackLabel = btn.getAttribute('data-fallback-label') || 'Copy';
        var original = label ? label.textContent : fallbackLabel;

        function restore() {
          if (label) label.textContent = original;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            if (label) label.textContent = copiedLabel;
            window.setTimeout(restore, 1600);
          }).catch(function () {
            window.prompt('Copy:', text);
          });
        } else {
          window.prompt('Copy:', text);
        }
      });
    });
  }

  function initBackToTop() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-back-to-top]'));
    if (!buttons.length) return;
    var floatingButtons = buttons.filter(function (button) {
      return button.classList.contains('back-to-top');
    });

    function updateState() {
      floatingButtons.forEach(function (button) {
        button.classList.toggle('show', window.scrollY > 520);
      });
    }

    window.addEventListener('scroll', updateState, { passive: true });
    updateState();

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      });
    });
  }

  function initAnchorNav() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.anchor-chip[href^="#"]'));
    if (!links.length || !('IntersectionObserver' in window)) return;

    var sections = links
      .map(function (link) {
        var id = link.getAttribute('href');
        return id && id.length > 1 ? document.querySelector(id) : null;
      })
      .filter(Boolean);

    function setCurrent(id) {
      links.forEach(function (link) {
        if (link.getAttribute('href') === '#' + id) {
          link.setAttribute('aria-current', 'page');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          setCurrent(entry.target.id);
        }
      });
    }, {
      rootMargin: '-45% 0px -45% 0px',
      threshold: 0
    });

    sections.forEach(function (section) {
      observer.observe(section);
    });

    if (sections[0]) setCurrent(sections[0].id);
  }

  function initReveal() {
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var nodes = document.querySelectorAll('[data-reveal]');
    if (!nodes.length) return;

    if (reduced || !('IntersectionObserver' in window)) {
      nodes.forEach(function (node) { node.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.01,
      rootMargin: '0px 0px -8% 0px'
    });

    nodes.forEach(function (node) { observer.observe(node); });
  }

  function initLightbox() {
    var triggers = document.querySelectorAll('[data-lightbox]');
    if (!triggers.length) return;

    var isZh = document.documentElement.lang && document.documentElement.lang.toLowerCase().indexOf('zh') === 0;
    var closeText = isZh ? '关闭大图' : 'Close image preview';

    var overlay = document.createElement('div');
    overlay.className = 'lightbox';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<div class="lightbox-dialog" role="dialog" aria-modal="true" aria-label="' + closeText + '" tabindex="-1"><button class="lightbox-close" type="button" aria-label="' + closeText + '"><i class="fa fa-times" aria-hidden="true"></i></button><img class="lightbox-image" alt=""><div class="lightbox-caption"></div></div>';
    document.body.appendChild(overlay);

    var dialog = overlay.querySelector('.lightbox-dialog');
    var image = overlay.querySelector('.lightbox-image');
    var caption = overlay.querySelector('.lightbox-caption');
    var closeBtn = overlay.querySelector('.lightbox-close');
    var activeTrigger = null;

    function closeLightbox() {
      if (!overlay.classList.contains('open')) return;
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lightbox-open');
      setBackgroundInert(false);
      image.removeAttribute('src');
      image.alt = '';
      caption.textContent = '';
      if (activeTrigger && activeTrigger.focus && document.contains(activeTrigger)) {
        focusNode(activeTrigger);
      }
      activeTrigger = null;
    }

    function openLightbox(trigger) {
      activeTrigger = trigger;
      image.src = trigger.getAttribute('href');
      image.alt = trigger.querySelector('img') ? (trigger.querySelector('img').getAttribute('alt') || '') : '';
      caption.textContent = trigger.getAttribute('data-caption') || '';
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lightbox-open');
      setBackgroundInert(true, [overlay]);
      window.requestAnimationFrame(function () {
        focusFirst(dialog, closeBtn || dialog);
      });
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function (event) {
        event.preventDefault();
        openLightbox(trigger);
      });
    });

    closeBtn.addEventListener('click', closeLightbox);
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeLightbox();
    });
    dialog.addEventListener('click', function (event) {
      event.stopPropagation();
    });
    window.addEventListener('keydown', function (event) {
      if (!overlay.classList.contains('open')) return;
      if (event.key === 'Escape') {
        closeLightbox();
      } else {
        trapFocus(event, dialog);
      }
    });
  }

  function initYear() {
    document.querySelectorAll('[data-year]').forEach(function (node) {
      node.textContent = new Date().getFullYear();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    initMenu();
    initSpotlight();
    initCopy();
    initBackToTop();
    initAnchorNav();
    initReveal();
    initLightbox();
    initYear();
  });
})();
