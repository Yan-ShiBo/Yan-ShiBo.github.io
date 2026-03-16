
(function () {
  var root = document.documentElement;
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var THEME_KEY = 'ysb-theme';

  function prefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function applyTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
    if (themeMeta) {
      themeMeta.setAttribute('content', theme === 'dark' ? '#07111f' : '#f4f7ff');
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

    function closeMenu() {
      document.body.classList.remove('menu-open');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
      if (drawer) drawer.setAttribute('aria-hidden', 'true');
    }

    function openMenu() {
      document.body.classList.add('menu-open');
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
      if (drawer) drawer.setAttribute('aria-hidden', 'false');
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
      if (event.key === 'Escape') closeMenu();
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
    var button = document.querySelector('[data-back-to-top]');
    if (!button) return;

    function updateState() {
      button.classList.toggle('show', window.scrollY > 520);
    }

    window.addEventListener('scroll', updateState, { passive: true });
    updateState();

    button.addEventListener('click', function () {
      var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
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
  overlay.innerHTML = '<div class="lightbox-dialog" role="dialog" aria-modal="true" aria-label="' + closeText + '"><button class="lightbox-close" type="button" aria-label="' + closeText + '"><i class="fa fa-times" aria-hidden="true"></i></button><img class="lightbox-image" alt=""><div class="lightbox-caption"></div></div>';
  document.body.appendChild(overlay);

  var dialog = overlay.querySelector('.lightbox-dialog');
  var image = overlay.querySelector('.lightbox-image');
  var caption = overlay.querySelector('.lightbox-caption');
  var closeBtn = overlay.querySelector('.lightbox-close');
  var activeTrigger = null;

  function closeLightbox() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    image.removeAttribute('src');
    image.alt = '';
    caption.textContent = '';
    if (activeTrigger && activeTrigger.focus) activeTrigger.focus();
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
    closeBtn.focus();
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
    if (event.key === 'Escape' && overlay.classList.contains('open')) {
      closeLightbox();
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
    initReveal();
    initLightbox();
    initYear();
  });
})();
