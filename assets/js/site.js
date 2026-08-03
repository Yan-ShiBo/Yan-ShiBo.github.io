
(function () {
  var root = document.documentElement;
  root.classList.add('reveal-ready');
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var THEME_KEY = 'ysb-theme';
  initializeThemeBeforePaint();
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
        element.setAttribute(
          'data-modal-was-inert',
          element.hasAttribute('inert') || element.inert ? 'true' : 'false'
        );
      }
      element.setAttribute('aria-hidden', 'true');
      element.setAttribute('inert', '');
      element.inert = true;
      return;
    }

    if (!element.hasAttribute('data-modal-inert')) return;
    var previousAria = element.getAttribute('data-modal-aria-hidden');
    var wasInert = element.getAttribute('data-modal-was-inert') === 'true';
    if (previousAria === '__unset__') {
      element.removeAttribute('aria-hidden');
    } else if (previousAria !== null) {
      element.setAttribute('aria-hidden', previousAria);
    }
    element.removeAttribute('data-modal-inert');
    element.removeAttribute('data-modal-aria-hidden');
    element.removeAttribute('data-modal-was-inert');
    element.toggleAttribute('inert', wasInert);
    element.inert = wasInert;
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

  function getStoredTheme() {
    try {
      var saved = localStorage.getItem(THEME_KEY);
      return saved === 'dark' || saved === 'light' ? saved : null;
    } catch (err) {
      return null;
    }
  }

  function resolveInitialTheme() {
    return getStoredTheme() || (prefersDark() ? 'dark' : 'light');
  }

  function initializeThemeBeforePaint() {
    var theme = resolveInitialTheme();
    root.setAttribute('data-theme', theme);
    if (themeMeta) {
      themeMeta.setAttribute('content', theme === 'dark' ? '#000000' : '#ececee');
    }
  }

  function applyTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
    if (themeMeta) {
      themeMeta.setAttribute('content', theme === 'dark' ? '#000000' : '#ececee');
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
    applyTheme(resolveInitialTheme(), false);

    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(next, true);
      });
    });

    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var listener = function (event) {
        var stored = getStoredTheme();
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

    function notifyMenuStateChange() {
      window.dispatchEvent(new Event('ysb:menu-state-change'));
    }

    function setDrawerHidden(hidden) {
      if (!drawer) return;
      drawer.setAttribute('aria-hidden', hidden ? 'true' : 'false');
      if (hidden) {
        drawer.setAttribute('inert', '');
        drawer.inert = true;
      } else {
        drawer.removeAttribute('inert');
        drawer.inert = false;
      }
    }

    if (drawer) {
      drawer.setAttribute('tabindex', '-1');
      setDrawerHidden(true);
    }

    function closeMenu(restoreFocus) {
      var wasOpen = document.body.classList.contains('menu-open');
      document.body.classList.remove('menu-open');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
      setDrawerHidden(true);
      setBackgroundInert(false);
      notifyMenuStateChange();
      if (
        restoreFocus !== false &&
        wasOpen &&
        returnFocus &&
        returnFocus.focus &&
        document.contains(returnFocus)
      ) {
        focusNode(returnFocus);
      }
      returnFocus = null;
    }

    function openMenu() {
      if (document.body.classList.contains('menu-open')) return;
      returnFocus = document.activeElement;
      document.body.classList.add('menu-open');
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
      setDrawerHidden(false);
      if (drawer) setBackgroundInert(true, [drawer, backdrop]);
      notifyMenuStateChange();
      window.requestAnimationFrame(function () {
        if (!document.body.classList.contains('menu-open')) return;
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

    function handleMenuBreakpointChange(event) {
      if (event.matches || !document.body.classList.contains('menu-open')) return;
      var active = document.activeElement;
      var shouldMoveFocus = Boolean(
        active === toggle ||
        (drawer && active && drawer.contains(active))
      );

      closeMenu(false);

      if (shouldMoveFocus) {
        var desktopTarget = document.querySelector('.site-nav [aria-current="page"]') ||
          document.querySelector('.site-nav a');
        focusNode(desktopTarget);
      }
    }

    if (window.matchMedia) {
      var mobileMenuQuery = window.matchMedia('(max-width: 833px)');
      if (mobileMenuQuery.addEventListener) {
        mobileMenuQuery.addEventListener('change', handleMenuBreakpointChange);
      } else if (mobileMenuQuery.addListener) {
        mobileMenuQuery.addListener(handleMenuBreakpointChange);
      }
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
    var spotlightRAF = 0;
    window.addEventListener('pointermove', function (event) {
      if (spotlightRAF) return;
      spotlightRAF = requestAnimationFrame(function () {
        root.style.setProperty('--pointer-x', event.clientX + 'px');
        root.style.setProperty('--pointer-y', event.clientY + 'px');
        spotlightRAF = 0;
      });
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
        var visible = window.scrollY > 520 && !document.body.classList.contains('menu-open');
        button.classList.toggle('show', visible);
        button.setAttribute('aria-hidden', visible ? 'false' : 'true');
        button.tabIndex = visible ? 0 : -1;
      });
    }

    var scrollRAF = 0;
    window.addEventListener('scroll', function () {
      if (scrollRAF) return;
      scrollRAF = requestAnimationFrame(function () {
        updateState();
        scrollRAF = 0;
      });
    }, { passive: true });
    window.addEventListener('ysb:menu-state-change', updateState);
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
    var activeLink = null;

    var sections = links
      .map(function (link) {
        var id = link.getAttribute('href');
        return id && id.length > 1 ? document.querySelector(id) : null;
      })
      .filter(Boolean);

    function setCurrent(id) {
      var current = null;

      links.forEach(function (link) {
        if (link.getAttribute('href') === '#' + id) {
          link.setAttribute('aria-current', 'location');
          current = link;
        } else {
          link.removeAttribute('aria-current');
        }
      });

      if (!current || current === activeLink) return;
      activeLink = current;

      var rail = current.closest('.anchor-bar');
      if (!rail || rail.scrollWidth <= rail.clientWidth + 1) return;

      var railRect = rail.getBoundingClientRect();
      var currentRect = current.getBoundingClientRect();
      var targetLeft = rail.scrollLeft + currentRect.left - railRect.left -
        (rail.clientWidth - currentRect.width) / 2;
      var maxLeft = Math.max(0, rail.scrollWidth - rail.clientWidth);
      var nextLeft = Math.max(0, Math.min(maxLeft, targetLeft));
      var reduced = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (typeof rail.scrollTo === 'function') {
        rail.scrollTo({ left: nextLeft, behavior: reduced ? 'auto' : 'smooth' });
      } else {
        rail.scrollLeft = nextLeft;
      }
    }

    links.forEach(function (link) {
      link.addEventListener('click', function () {
        var id = link.getAttribute('href').slice(1);
        if (id) setCurrent(id);
      });
    });

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

  function initProofRails() {
    var rails = document.querySelectorAll('.proof-grid');
    if (!rails.length || !('PointerEvent' in window)) return;

    var dragThreshold = 6;

    rails.forEach(function (rail) {
      var pointerId = null;
      var startX = 0;
      var startScrollLeft = 0;
      var moved = false;
      var suppressClick = false;

      rail.classList.add('is-drag-scroll');

      rail.addEventListener('pointerdown', function (event) {
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        pointerId = event.pointerId;
        startX = event.clientX;
        startScrollLeft = rail.scrollLeft;
        moved = false;
        suppressClick = false;
      });

      rail.addEventListener('pointermove', function (event) {
        if (event.pointerId !== pointerId || (event.buttons & 1) !== 1) return;
        var distance = event.clientX - startX;
        if (!moved) {
          if (Math.abs(distance) < dragThreshold) return;
          moved = true;
          suppressClick = true;
          rail.classList.add('is-dragging');
          if (rail.setPointerCapture) rail.setPointerCapture(pointerId);
        }
        event.preventDefault();
        rail.scrollLeft = startScrollLeft - distance;
      });

      function finishDrag(event) {
        if (event.pointerId !== pointerId) return;
        if (rail.hasPointerCapture && rail.hasPointerCapture(pointerId)) {
          rail.releasePointerCapture(pointerId);
        }
        pointerId = null;
        rail.classList.remove('is-dragging');
        if (moved) {
          window.setTimeout(function () {
            suppressClick = false;
          }, 0);
        }
      }

      rail.addEventListener('pointerup', finishDrag);
      rail.addEventListener('pointercancel', finishDrag);
      rail.addEventListener('lostpointercapture', finishDrag);
      rail.addEventListener('click', function (event) {
        if (!suppressClick) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      }, true);
      rail.addEventListener('dragstart', function (event) {
        event.preventDefault();
      });
    });
  }

  function initLightbox() {
    var triggers = document.querySelectorAll('[data-lightbox]');
    if (!triggers.length) return;

    var isZh = document.documentElement.lang && document.documentElement.lang.toLowerCase().indexOf('zh') === 0;
    var closeText = isZh ? '关闭大图' : 'Close image preview';
    var previewText = isZh ? '图片预览' : 'Image preview';

    var overlay = document.createElement('div');
    overlay.className = 'lightbox';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<div class="lightbox-dialog" role="dialog" aria-modal="true" aria-label="' + closeText + '" tabindex="-1"><button class="lightbox-close" type="button" aria-label="' + closeText + '"><i class="fa fa-times" aria-hidden="true"></i></button><img class="lightbox-image" alt="' + previewText + '" width="1" height="1" loading="lazy" decoding="async"><div class="lightbox-caption"></div></div>';
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
      image.alt = previewText;
      image.setAttribute('width', '1');
      image.setAttribute('height', '1');
      caption.textContent = '';
      if (activeTrigger && activeTrigger.focus && document.contains(activeTrigger)) {
        focusNode(activeTrigger);
      }
      activeTrigger = null;
    }

    function openLightbox(trigger) {
      activeTrigger = trigger;
      image.src = trigger.getAttribute('href');
      var triggerImg = trigger.querySelector('img');
      image.alt = triggerImg ? (triggerImg.getAttribute('alt') || previewText) : previewText;
      if (triggerImg && triggerImg.hasAttribute('width')) {
        image.setAttribute('width', triggerImg.getAttribute('width'));
      }
      if (triggerImg && triggerImg.hasAttribute('height')) {
        image.setAttribute('height', triggerImg.getAttribute('height'));
      }
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

  function initNotFoundPage() {
    var page = document.querySelector('[data-not-found-page]');
    if (!page) return;

    var rootElement = document.documentElement;
    var localizesByPath = page.hasAttribute('data-not-found-localizable');
    var usesEnglish = localizesByPath
      ? /^\/en(?:\/|$)/.test(window.location.pathname)
      : rootElement.lang === 'en';
    var language = usesEnglish ? 'en' : 'zh-CN';
    var localeKey = usesEnglish ? 'en' : 'zh';
    var home = usesEnglish ? '/en/' : '/';

    rootElement.lang = language;
    page.setAttribute('data-not-found-locale', language);
    page.setAttribute('data-not-found-home', home);

    function applyLocalizedAttribute(sourceSuffix, targetAttribute) {
      var zhAttribute = 'data-not-found-zh-' + sourceSuffix;
      var enAttribute = 'data-not-found-en-' + sourceSuffix;
      var sourceAttribute = localeKey === 'en' ? enAttribute : zhAttribute;
      document.querySelectorAll('[' + zhAttribute + '][' + enAttribute + ']').forEach(function (node) {
        var value = node.getAttribute(sourceAttribute);
        if (targetAttribute) {
          node.setAttribute(targetAttribute, value);
        } else {
          node.textContent = value;
        }
      });
    }

    if (localizesByPath) {
      applyLocalizedAttribute('text', '');
      applyLocalizedAttribute('href', 'href');
      applyLocalizedAttribute('content', 'content');
      applyLocalizedAttribute('aria-label', 'aria-label');
      applyLocalizedAttribute('label-dark', 'data-label-dark');
      applyLocalizedAttribute('label-light', 'data-label-light');
    }

    document.querySelectorAll('.lang-switch a[lang]').forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('lang') === language);
    });

    var countdown = document.querySelector('[data-countdown]');
    if (!countdown) return;
    var remaining = 5;
    countdown.textContent = remaining;
    var timer = window.setInterval(function () {
      remaining -= 1;
      countdown.textContent = remaining;
      if (remaining <= 0) {
        window.clearInterval(timer);
        window.location.href = home;
      }
    }, 1000);
  }

  function initYear() {
    document.querySelectorAll('[data-year]').forEach(function (node) {
      node.textContent = new Date().getFullYear();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNotFoundPage();
    initTheme();
    initMenu();
    initSpotlight();
    initCopy();
    initBackToTop();
    initAnchorNav();
    initReveal();
    initProofRails();
    initLightbox();
    initYear();
  });
})();
