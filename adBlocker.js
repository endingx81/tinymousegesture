// adBlocker.js: 광고 및 악성 팝업, 투명 오버레이를 감지하고 차단하는 스크립트
(function() {
  if (window.__AdBlockerInitialized) return;
  window.__AdBlockerInitialized = true;
  
  const hostname = window.location.hostname.toLowerCase().replace(/^www\./, '');
  const isHitomiSite = hostname.includes('hitomi.la');
  const isTwidougaSite = hostname.includes('twidouga.net');
  const isSwiftUploadsSite = hostname.includes('swiftuploads.com');
  const isGameRepackSite = hostname.includes('game-repack.site');
  let isMrJavSite = false;
  try {
    isMrJavSite = hostname.includes('mrjav.net') || (window.top && window.top.location.hostname.includes('mrjav.net'));
  } catch(e) {}
  
  const blockedDomains = [
    'stripchatgirls', 'stripchat', 'chaturbate', 'livejasmin', 'biotrck',
    'sivycafybemude', 'pemsrv', 'magsrv', '378ed00341',
    'trafficjunky', 'adskeeper', 'ad-maven', 'admaven', 'kilojaya', 'satisfiednews',
    'gullible-thanks', 'tsyndicate', 'alfalfaemployeeresource', 'few-politics',
    'waqool', 'rmhfrtnd', 'wpadmngr', 'mqy60aa7.shop', 'popads', 'popcash',
    'propellerads', 'adsterra', 'exoclick', 'hilltopads', 'monetag', 'clickadu',
    'yadro', 'adclick', 'doubleclick', 'onclick', 'vidoomy', 'clickaine',
    'richpush', 'clickguard', 'zeroredirect', 'adrevenue', 'adsupply',
    'adcolony', 'taboola', 'outbrain', 'bet365', '1xbet'
  ];

  const allowedDownloadHosts = [
    'mega.nz', 'mega.co.nz', 'drive.google.com', 'mediafire.com', '1fichier.com',
    'qiwi.gg', 'gofile.io', 'pixeldrain.com', 'krakenfiles.com', 'datanodes.to',
    'onedrive.live.com', 'sharemods.com', 'letsupload.io', 'send.cm',
    'buzzheavier.com', 'multiup.org', 'bowfile.com', 'uploadhub.to',
    'file-me.top', 'swiftuploads.com', 'up-4ever.net', 'zovo.ink', 'zovo2.top',
    'rapidgator.net', 'turbobit.net', 'nitroflare.com', 'ddownload.com',
    'workupload.com', 'fitgirl-repacks.site', 'dodi-repacks.site', 'steamrip.com',
    'rutracker.org', 'katfile.com', 'rosefile.net', 'dropgalaxy.com',
    'modsfire.com', 'anonfiles.com', 'bayfiles.com', 'uploadhaven.com',
    'fuckingfast.co', 'clicknupload.click', 'clicknupload.net', 'hexupload.net',
    'userscloud.com', 'filestore.me', 'vshare.eu', 'streamtape.com'
  ];

  // 정상 서비스 사이트 목록 (React/Next.js 기반 모달 및 딤 레이어를 보호)
  const isSafeSite = [
    'coupang.com', 'naver.com', 'daum.net', 'google.', 'youtube.com',
    'github.com', 'toss.im', 'kakao.com', 'netflix.com', 'instagram.com',
    'twitter.com', 'x.com', 'facebook.com', 'amazon.'
  ].some(safe => hostname.includes(safe));

  // 1. 화면 전체를 덮는 투명 오버레이(클릭 가로채기 팝업 유도 레이어) 감지 및 무력화
  function removeTransparentOverlays() {
    // 정상적인 쇼핑몰/포털 사이트에서는 React 가상 DOM 충돌 방지를 위해 범용 오버레이 스캔 제외
    if (isSafeSite) return;

    try {
      const candidates = document.querySelectorAll('div, a, section, span, iframe');
      const winW = window.innerWidth || document.documentElement.clientWidth;
      const winH = window.innerHeight || document.documentElement.clientHeight;
      if (!winW || !winH) return;

      candidates.forEach(el => {
        if (el.dataset.overlayChecked === 'true') return;

        // 정상적인 모달, 드롭다운, 백드롭 UI 요소는 제외
        const className = (el.className || '').toString().toLowerCase();
        const idName = (el.id || '').toString().toLowerCase();
        const isNormalUI = ['modal', 'backdrop', 'dim', 'dialog', 'layer', 'portal', 'tooltip', 'dropdown', 'search', 'menu'].some(keyword => className.includes(keyword) || idName.includes(keyword));
        if (isNormalUI) return;

        const inlineStyle = el.getAttribute('style') || '';
        // 명백한 투명 인라인 스타일
        if (/opacity\s*:\s*0(\.0+1|\.00|\.0)?(?:\s*!important)?;/i.test(inlineStyle)) {
          el.dataset.overlayChecked = 'true';
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('pointer-events', 'none', 'important');
          return;
        }

        const style = window.getComputedStyle(el);
        const pos = style.getPropertyValue('position');
        if (pos !== 'fixed' && pos !== 'absolute') return;

        const zIndex = parseInt(style.getPropertyValue('z-index'), 10) || 0;
        const opacity = parseFloat(style.getPropertyValue('opacity')) || 1;
        const rect = el.getBoundingClientRect();

        // 화면의 60% 이상을 덮는 오버레이
        const isCovering = rect.width >= winW * 0.6 && rect.height >= winH * 0.6;
        if (isCovering && (opacity < 0.2 || zIndex >= 500)) {
          // 콘텐츠(이미지, 텍스트)가 거의 없거나 클릭 가로채기용인 경우
          const hasText = (el.innerText || '').trim().length > 30;
          const hasInputs = el.querySelector('input, textarea, select');
          if (!hasText && !hasInputs) {
            console.log('[AdBlocker] 투명 오버레이 무력화 (React 안전 모드):', el);
            el.dataset.overlayChecked = 'true';
            // React의 removeChild 충돌 방지를 위해 el.remove() 대신 스타일만 무력화
            el.style.setProperty('display', 'none', 'important');
            el.style.setProperty('pointer-events', 'none', 'important');
            el.style.setProperty('visibility', 'hidden', 'important');
            el.style.setProperty('opacity', '0', 'important');
          }
        }
      });
    } catch (error) {}
  }

  // 2. 가짜 다운로드 버튼 및 공통 악성 광고 차단 CSS 주입
  function addBlockingStyles() {
    // 정상적인 쇼핑몰/포털/검색엔진 사이트에서는 스타일 오염 방지
    if (isSafeSite) return;

    const styleEl = document.createElement('style');
    styleEl.id = 'tm-ad-blocker-style';
    
    let css = `
      #ad-gate,
      .file-download-btnn,
      .random,
      iframe[src*="waqool"],
      iframe[src*="rmhfrtnd"],
      iframe[src*="few-politics"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        z-index: -9999 !important;
      }
    `;

    // hitomi.la 전용 스타일 (일반 사이트의 .content, .image 등을 오염시키지 않도록 분리)
    if (isHitomiSite) {
      css += `
        #cover, #display, .gallery, .content, #image-container, #content-container,
        .cover, .image, .image-container, .thumbnail-container,
        img[src*="hitomi"], img[src*="image"], img[data-src] {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }
      `;
    }

    styleEl.textContent = css;
    if (document.head) document.head.appendChild(styleEl);
    else if (document.documentElement) document.documentElement.appendChild(styleEl);
    else document.addEventListener('DOMContentLoaded', () => { if (document.head) document.head.appendChild(styleEl); });
  }

  // 3. 캡처 단계에서 광고 링크 직접 클릭 방지 및 정상 링크 클릭 시 팝언더 전파 방어
  function setupClickProtection() {
    window.addEventListener('click', function(e) {
      const link = e.target.closest ? e.target.closest('a') : null;
      if (!link) return;

      const href = (link.href || '').toLowerCase();
      // A. 명백한 광고 도메인 링크 클릭 차단
      const isAd = blockedDomains.some(domain => href.includes(domain));
      if (isAd) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.warn('[AdBlocker] 악성 광고 링크 클릭 차단:', link.href);
        return;
      }

      // B. 정상 다운로드 링크나 내부 링크를 클릭한 경우:
      // 버블링 단계로 전파되어 사이트에 심어진 팝언더 스크립트가 추가 광고 창을 띄우지 못하도록 보호
      const isInternal = href.includes(hostname) || href.startsWith('/') || href.startsWith('#') || href.startsWith('javascript:');
      const isDownloadHost = allowedDownloadHosts.some(domain => href.includes(domain)) || href.startsWith('magnet:');

      if (isInternal || isDownloadHost) {
        // 단, 링크 자체의 기본 브라우저 동작은 유지하면서 추가 광고 스크립트로의 버블링을 억제
        // (이벤트 캡처 단계에서 플래그 설정)
        link.dataset.trustedUserClick = 'true';
      }
    }, true);
  }

  // 4. 리디렉션 및 특정 사이트 전용 로직
  function preventRedirects() {
    let lastLocation = window.location.href;
    
    if (isMrJavSite) {
      try {
        const pageId = btoa(window.location.pathname).substring(0, 16);
        sessionStorage.setItem('v_pop_' + pageId, '3');
      } catch (e) {}
    }

    if (isGameRepackSite) {
      const forceNavigate = function(e) {
        const link = e.target.closest('a');
        if (link) {
          const href = link.href || '';
          const isInternal = href.includes(hostname) || href.startsWith('/') || href.startsWith('#') || href === '';
          const isAllowed = allowedDownloadHosts.some(domain => href.toLowerCase().includes(domain)) || href.startsWith('magnet:');
          
          if (isInternal || isAllowed) {
            e.stopPropagation();
            if (e.type === 'click') {
              e.preventDefault();
              link.removeAttribute('target');
              console.log('[GameRepack] 안전 강제 이동:', href);
              if (href && href !== 'javascript:void(0)' && href !== '#') {
                window.location.href = href;
              }
            }
          }
        }
      };

      window.addEventListener('click', forceNavigate, true);
      window.addEventListener('mousedown', forceNavigate, true);
      window.addEventListener('mouseup', forceNavigate, true);
      window.addEventListener('pointerdown', forceNavigate, true);
      window.addEventListener('pointerup', forceNavigate, true);

      setInterval(() => {
        try {
          document.querySelectorAll('.file-download-btnn, .random').forEach(el => {
            el.style.display = 'none';
          });
        } catch(e) {}
      }, 1000);
    }

    if (isTwidougaSite || isSwiftUploadsSite) {
      window.addEventListener('submit', function(e) {
        if (isSwiftUploadsSite && e.target && e.target.tagName === 'FORM') {
          const t = e.target.target ? e.target.target.toLowerCase() : '';
          if (t && !['_self', '_top', '_parent'].includes(t)) {
            e.preventDefault();
            console.log('[SwiftUploads] 폼 제출 팝언더 차단:', e.target.action);
            e.target.removeAttribute('target');
            if (!e.target.action.toLowerCase().includes(hostname)) e.preventDefault();
          }
        }
      }, true);

      window.addEventListener('click', function(e) {
        if (isSwiftUploadsSite) {
          const link = e.target.closest('a');
          if (link) {
            const href = link.href || '';
            const t = link.target ? link.target.toLowerCase() : '';
            const hasNewTabTarget = t && !['_self', '_top', '_parent'].includes(t);
            const isExternalHref = href && !href.toLowerCase().includes(hostname) && !href.startsWith('/') && !href.startsWith('javascript:');

            if (hasNewTabTarget || isExternalHref) {
              e.preventDefault();
              e.stopPropagation();
              console.log('[SwiftUploads] 외부/팝업 링크 클릭 차단:', href, t);
              link.removeAttribute('target');
              if (isExternalHref) {
                link.href = 'javascript:void(0)';
              } else {
                if (href && href !== 'javascript:void(0)') window.location.href = href;
              }
            }
          }
        }
      }, true);

      if (isTwidougaSite) {
        window.addEventListener('click', function(e) {
          setTimeout(() => {
            if (window.location.href !== lastLocation) {
              const newUrl = window.location.href;
              const isBlocked = blockedDomains.some(domain => newUrl.toLowerCase().includes(domain));
              if (isBlocked) {
                console.log('[Twidouga] 클릭 후 차단된 리디렉션 시도:', newUrl);
                history.pushState(null, '', lastLocation);
              } else {
                lastLocation = newUrl;
              }
            }
          }, 50);
        }, true);
        
        document.addEventListener('click', function(e) {
          if (e.target.tagName === 'A' || e.target.closest('a') || e.target.classList.contains('thumb') || e.target.classList.contains('thumbnail')) {
            setTimeout(() => {
              const currentUrl = window.location.href;
              const isAdUrl = blockedDomains.some(domain => currentUrl.toLowerCase().includes(domain));
              if (isAdUrl || currentUrl !== lastLocation) {
                console.log('[Twidouga] 동영상 클릭 후 리디렉션 차단:', currentUrl);
                history.pushState(null, '', lastLocation);
              }
            }, 100);
          }
        }, true);

        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        history.pushState = function(state, title, url) {
          if (url && blockedDomains.some(domain => url.toLowerCase().includes(domain))) {
            console.log('[Twidouga] pushState 리디렉션 차단:', url);
            return;
          }
          return originalPushState.apply(this, arguments);
        };
        history.replaceState = function(state, title, url) {
          if (url && blockedDomains.some(domain => url.toLowerCase().includes(domain))) {
            console.log('[Twidouga] replaceState 리디렉션 차단:', url);
            return;
          }
          return originalReplaceState.apply(this, arguments);
        };
      }
    }

    if (isSwiftUploadsSite) {
      setInterval(() => {
        try {
          const buttons = document.querySelectorAll('button');
          let fakeBtn = null;
          let realBtn = null;
          
          buttons.forEach(btn => {
            const text = btn.textContent.trim();
            if (text.includes('Get Download Link')) fakeBtn = btn;
            if (text.includes('Free Download')) realBtn = btn;
          });
          
          if (fakeBtn && realBtn) {
            const realStyle = window.getComputedStyle(realBtn);
            if (realStyle.display === 'none' || realStyle.visibility === 'hidden' || realBtn.offsetHeight === 0) {
              fakeBtn.style.setProperty('display', 'none', 'important');
              if (fakeBtn.parentElement) fakeBtn.parentElement.style.setProperty('display', 'none', 'important');
              
              realBtn.style.setProperty('display', 'block', 'important');
              realBtn.style.setProperty('visibility', 'visible', 'important');
              realBtn.style.setProperty('opacity', '1', 'important');
              realBtn.removeAttribute('disabled');
              
              if (realBtn.dataset.adShield !== 'true') {
                realBtn.dataset.adShield = 'true';
                realBtn.addEventListener('click', function(e) {
                  e.stopPropagation();
                  console.log('[SwiftUploads] 진짜 다운로드 버튼 클릭');
                });
              }
              
              let parent = realBtn.parentElement;
              while (parent && parent.tagName !== 'BODY') {
                if (window.getComputedStyle(parent).display === 'none' || parent.style.display === 'none') {
                  parent.style.setProperty('display', 'block', 'important');
                }
                parent = parent.parentElement;
              }
            }
          }
        } catch(e) {}
      }, 500);
    }
  }
  
  function init() {
    addBlockingStyles();
    removeTransparentOverlays();
    setupClickProtection();
    preventRedirects();

    // DOM 변화 감시로 동적 투명 오버레이 실시간 제거
    const overlayObserver = new MutationObserver(() => {
      removeTransparentOverlays();
    });

    if (document.documentElement) {
      overlayObserver.observe(document.documentElement, { childList: true, subtree: true });
    }

    setInterval(removeTransparentOverlays, 1000);
  }
  
  init();
})();
