// twidougaOverride.js: MAIN world에서 실행되어 twidouga.net의 타이머 무력화 및 스트립챗 팝언더를 완벽 차단합니다.
(function() {
  if (window.__TwidougaOverrideInitialized) return;
  window.__TwidougaOverrideInitialized = true;

  // 1. twidouga.net의 더 불러오기 광고 대기 시간 무력화 (기존 기능 유지)
  const originalSetInterval = window.setInterval;
  window.setInterval = function(fn, delay) {
    if (fn && typeof fn === 'function' && fn.toString().includes('adGate')) {
      return originalSetInterval.call(this, fn, 10);
    }
    return originalSetInterval.call(this, fn, delay);
  };

  // 2. 팝언더 스크립트(TsPopunder) 선제적 무력화
  try {
    Object.defineProperty(window, 'TsPopunder', {
      get: function() { return function() { return Promise.resolve(); }; },
      set: function() {},
      configurable: true
    });
  } catch (e) {}

  // 3. 팝언더 설정 fetch('/js/domain.txt') 등 차단
  const originalFetch = window.fetch;
  if (originalFetch) {
    window.fetch = function(input, init) {
      const url = (typeof input === 'string') ? input : (input && input.url ? input.url : '');
      const lowerUrl = url.toLowerCase();
      if (lowerUrl.includes('domain.txt') || lowerUrl.includes('popunder') || 
          lowerUrl.includes('sivycafybemude') || lowerUrl.includes('pemsrv') || 
          lowerUrl.includes('magsrv') || lowerUrl.includes('stripchat')) {
        console.warn('[twidouga] 팝언더 관련 fetch 차단:', url);
        return Promise.reject(new Error('Blocked popunder fetch'));
      }
      return originalFetch.apply(this, arguments);
    };
  }

  // 4. 동적 script 주입 가로채기 (dd.p.js, dd.engine.js, magsrv 등 차단)
  const originalCreateElement = Document.prototype.createElement;
  Document.prototype.createElement = function(tagName, options) {
    const el = originalCreateElement.apply(this, arguments);
    if (tagName && tagName.toLowerCase() === 'script') {
      const originalSetAttribute = el.setAttribute;
      el.setAttribute = function(name, value) {
        if (name && name.toLowerCase() === 'src' && typeof value === 'string') {
          const lower = value.toLowerCase();
          if (lower.includes('popunder') || lower.includes('sivycafybemude') || 
              lower.includes('pemsrv') || lower.includes('magsrv') || 
              lower.includes('378ed00341') || lower.includes('stripchat')) {
            console.warn('[twidouga] 팝언더 스크립트 src 설정 차단:', value);
            return;
          }
        }
        return originalSetAttribute.apply(this, arguments);
      };

      // src 프로퍼티 직접 대입도 방어
      let scriptSrc = '';
      Object.defineProperty(el, 'src', {
        get: function() { return scriptSrc; },
        set: function(val) {
          if (typeof val === 'string') {
            const lower = val.toLowerCase();
            if (lower.includes('popunder') || lower.includes('sivycafybemude') || 
                lower.includes('pemsrv') || lower.includes('magsrv') || 
                lower.includes('378ed00341') || lower.includes('stripchat')) {
              console.warn('[twidouga] 팝언더 스크립트 src 대입 차단:', val);
              return;
            }
          }
          scriptSrc = val;
          el.setAttribute('src', val);
        },
        configurable: true
      });
    }
    return el;
  };

  // 5. 동영상 클릭 시 스트립챗 팝언더 전파 원천 차단 (최우선 캡처)
  const handleVideoClick = function(e) {
    let target = e.target;
    let videoLink = null;

    while (target && target !== document.body && target !== document.documentElement) {
      if (target.tagName === 'A') {
        const href = target.getAttribute('href') || target.href || '';
        if (href.includes('video.php') || target.classList.contains('rank-thumb-link')) {
          videoLink = target;
          break;
        }
      }
      target = target.parentNode;
    }

    if (videoLink) {
      // 사이트의 전역 팝언더/광고 리스너로 이벤트가 넘어가지 않도록 즉시 중단
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (e.type === 'click') {
        e.preventDefault();
        const safeUrl = videoLink.href || videoLink.getAttribute('href');
        console.log('[twidouga] 동영상 안전 클릭 (스트립챗 팝언더 완벽 차단):', safeUrl);
        if (safeUrl) {
          // 원래 의도대로 새 창/탭 또는 현재 창으로 깨끗하게 열기
          const isBlank = (videoLink.target || '').toLowerCase() === '_blank';
          if (isBlank) {
            window.open(safeUrl, '_blank', 'noopener,noreferrer');
          } else {
            window.location.href = safeUrl;
          }
        }
      }
    }
  };

  // 캡처 단계에서 최우선으로 등록
  window.addEventListener('click', handleVideoClick, true);
  window.addEventListener('mousedown', handleVideoClick, true);
  window.addEventListener('pointerdown', handleVideoClick, true);
  window.addEventListener('mouseup', handleVideoClick, true);

  // 6. 현재 페이지가 스트립챗 등 광고 도메인으로 무단 리디렉트되는 행위 차단
  const isAdUrl = function(url) {
    if (!url) return false;
    const lower = url.toString().toLowerCase();
    return lower.includes('stripchat') || lower.includes('pemsrv') || 
           lower.includes('magsrv') || lower.includes('sivycafybemude') || 
           lower.includes('378ed00341');
  };

  const originalLocation = window.location;
  try {
    const locDesc = Object.getOwnPropertyDescriptor(window, 'location');
    if (locDesc && locDesc.set) {
      const origSet = locDesc.set;
      Object.defineProperty(window, 'location', {
        set: function(val) {
          if (isAdUrl(val)) {
            console.warn('[twidouga] 스트립챗 location 리디렉트 차단:', val);
            return;
          }
          return origSet.call(this, val);
        }
      });
    }
  } catch (e) {}

  console.log('[twidouga] twidougaOverride 로드 완료 (스트립챗 방어 활성화)');
})();
