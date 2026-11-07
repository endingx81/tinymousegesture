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

  // 5. 동영상 링크 클릭 시 스트립챗 등 광고 전파 방어 및 안전한 네이티브 탐색 보장
  const isAdUrl = function(url) {
    if (!url) return false;
    const lower = url.toString().toLowerCase();
    return lower.includes('stripchat') || lower.includes('pemsrv') || 
           lower.includes('magsrv') || lower.includes('sivycafybemude') || 
           lower.includes('378ed00341');
  };

  const handleVideoClick = function(e) {
    let target = e.target;
    let videoLink = null;

    while (target && target !== document.body && target !== document.documentElement) {
      if (target.tagName === 'A') {
        const href = target.getAttribute('href') || target.href || '';
        if (href.includes('video.php') || target.classList.contains('rank-thumb-link') || target.classList.contains('grid-item-link')) {
          videoLink = target;
          break;
        }
      }
      target = target.parentNode;
    }

    if (videoLink) {
      const safeUrl = videoLink.getAttribute('href') || videoLink.href || '';
      if (safeUrl && !isAdUrl(safeUrl)) {
        // 새 창/새 탭에서 열리도록 보장
        if (!videoLink.getAttribute('target')) {
          videoLink.setAttribute('target', '_blank');
        }
        videoLink.setAttribute('rel', 'noopener');

        // 상위 window/document의 팝업 광고 리스너로 이벤트가 전파되지 않도록 차단
        e.stopPropagation();

        // [중요] e.preventDefault()를 호출하지 않아 브라우저 고유의 <a> 태그 네이티브 탐색은 100% 정상 작동!
        // 크롬 자체 팝업 차단기에 걸리지 않고 안정적으로 새 탭이 열립니다.
      }
    }
  };

  // 버블링 단계(false)에서 상위로의 광고 리스너 전파 방지
  window.addEventListener('click', handleVideoClick, false);
  window.addEventListener('mousedown', handleVideoClick, false);
  window.addEventListener('mouseup', handleVideoClick, false);

  // 6. 현재 페이지가 스트립챗 등 광고 도메인으로 무단 리디렉트되는 행위 차단
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

  // 7. 더 불러오기(load-more-wrap) 및 adGate 자동 해제 보조
  // 스크롤 시 '더 불러오기' 버튼이 활성화되거나 ad-gate 오버레이가 생기면 즉시 통과/해제
  setInterval(function() {
    try {
      const wrap = document.getElementById('load-more-wrap');
      const btn = document.getElementById('load-more-btn');
      if (wrap && btn && !wrap.classList.contains('hidden') && wrap.style.display !== 'none') {
        btn.click();
      }
      const adGate = document.getElementById('ad-gate');
      if (adGate && adGate.classList.contains('is-open')) {
        adGate.classList.remove('is-open');
      }
      const customInterstitial = document.getElementById('custom-interstitial');
      if (customInterstitial && customInterstitial.classList.contains('is-open')) {
        customInterstitial.classList.remove('is-open');
      }
    } catch (e) {}
  }, 250);

  console.log('[twidouga] twidougaOverride 로드 완료 (스트립챗 방어 활성화)');
})();
