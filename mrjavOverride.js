// mrjavOverride.js: MAIN world에서 실행되어 강제 팝업 및 원치 않는 외부 도메인 창 열림을 차단합니다.
(function() {
  if (window.__MainPopupBlocker) return;
  window.__MainPopupBlocker = true;

  const currentHost = window.location.hostname.toLowerCase().replace(/^www\./, '');
  const isMegaupSite = currentHost.includes('megaup.net');

  // 정상적인 대형 서비스 도메인 목록 (쿠팡, 구글, 네이버 등 SPA 프레임워크 보호)
  const isSafeSite = [
    'coupang.com', 'naver.com', 'daum.net', 'google.', 'youtube.com',
    'github.com', 'toss.im', 'kakao.com', 'netflix.com', 'instagram.com',
    'twitter.com', 'x.com', 'facebook.com', 'amazon.', 'ai-open.kr'
  ].some(safe => currentHost.includes(safe));

  // 1. React / Next.js / 구글 프레임워크 가상 DOM 충돌 방지 안전 래퍼
  // (외부 간섭으로 인해 이미 언마운트된 노드를 removeChild할 때 발생하는 NotFoundError 및 client-side exception 완벽 방어)
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function(child) {
    if (child && child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      return this.appendChild(newNode);
    }
    return originalInsertBefore.apply(this, arguments);
  };

  // 2. 차단할 악성 광고 / 팝업 / 팝언더 네트워크 도메인 목록
  const blockedAdDomains = [
    'stripchat', 'stripchatgirls', 'chaturbate', 'livejasmin', 'biotrck', 'trafficjunky',
    'sivycafybemude', 'pemsrv', 'magsrv', '378ed00341',
    'adskeeper', 'ad-maven', 'admaven', 'kilojaya', 'satisfiednews',
    'gullible-thanks', 'tsyndicate', 'alfalfaemployeeresource', 'few-politics',
    'waqool', 'rmhfrtnd', 'wpadmngr', 'mqy60aa7.shop', 'popads', 'popcash',
    'propellerads', 'adsterra', 'exoclick', 'hilltopads', 'monetag', 'clickadu',
    'yadro', 'adclick', 'doubleclick', 'onclick', 'adservice', 'vidoomy',
    'clickaine', 'richpush', 'clickguard', 'zeroredirect', 'adrevenue',
    'adsupply', 'adcolony', 'taboola', 'outbrain', 'bet365', '1xbet',
    'casinogames', '0lluihle', 'realsrv', 'bkcdn', 'pncloudfl', 'labadena',
    'tapioni', 'affectionatestorage', 'runative-syndicate',
    'adspyglass', 'sh-cdn', 'antiadxxxspy', '0i0i0i0',
    'werefilledwit', 'deofleadyetca', 'unlockr'
  ];

  // 3. 신뢰할 수 있는 인증(OAuth) 및 결제, 공인 서비스 도메인 목록 (정상 팝업 허용)
  const trustedAuthAndPaymentDomains = [
    'accounts.google.com', 'appleid.apple.com', 'nid.naver.com', 'kauth.kakao.com',
    'facebook.com', 'twitter.com', 'x.com', 'github.com', 'discord.com',
    'steamcommunity.com', 'paypal.com', 'inicis.com', 'kcp.co.kr',
    'tosspayments.com', 'nicepay.co.kr', 'danalpay.com', 'payco.com',
    'checkout.stripe.com', 'recaptcha.net', 'google.com/recaptcha',
    'hcaptcha.com', 'challenges.cloudflare.com'
  ];

  // 4. 주요 게임 및 파일 다운로드 / 클라우드 호스팅 도메인 목록
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
    'userscloud.com', 'filestore.me', 'vshare.eu', 'streamtape.com',
    'megaup.net', 'download.megaup.net'
  ];

  // Helper: URL 파싱 및 도메인 추출
  function extractHostname(url) {
    if (!url) return '';
    try {
      if (url.startsWith('//')) {
        return new URL(window.location.protocol + url).hostname.toLowerCase().replace(/^www\./, '');
      }
      if (/^[a-zA-Z]+:\/\//.test(url)) {
        return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
      }
      return currentHost;
    } catch (e) {
      return '';
    }
  }

  // Helper: 동일 도메인(Same-Domain) 여부 확인
  function isSameDomain(url) {
    if (!url) return true;
    const str = url.toString().trim();
    if (str.startsWith('/') || str.startsWith('#') || str.startsWith('?') || 
        str.startsWith('javascript:') || str.startsWith('blob:') || str.startsWith('data:') ||
        str === 'about:blank') {
      return true;
    }
    const host = extractHostname(str);
    if (!host) return true;
    return host === currentHost || host.endsWith('.' + currentHost) || currentHost.endsWith('.' + host);
  }

  // Helper: 차단할 광고 도메인 검사 (내부 링크는 절대 광고로 판단하지 않음)
  function isBlockedAdUrl(url) {
    if (!url) return false;
    // 동일 도메인의 진짜 내부 링크는 무조건 허용
    if (isSameDomain(url)) return false;

    const host = extractHostname(url.toString());
    if (!host) return false;
    return blockedAdDomains.some(ad => host === ad || host.includes(ad));
  }

  // Helper: 신뢰할 수 있는 인증/결제 서비스인지 검사
  function isTrustedAuthOrPayment(url) {
    if (!url) return false;
    const host = extractHostname(url.toString());
    if (!host) return false;
    return trustedAuthAndPaymentDomains.some(trusted => host === trusted || host.endsWith('.' + trusted));
  }

  // Helper: 허용된 다운로드 호스트인지 검사
  function isAllowedDownloadHost(url) {
    if (!url) return false;
    const str = url.toString().toLowerCase();
    if (str.startsWith('magnet:') || str.startsWith('ed2k:') || str.startsWith('torrent:')) {
      return true;
    }
    const host = extractHostname(str);
    if (!host) return false;
    return allowedDownloadHosts.some(domain => host === domain || host.endsWith('.' + domain));
  }

  // Helper: 두 URL이 유사하거나 같은 목적지인지 검사
  function isUrlMatching(urlA, urlB) {
    if (!urlA || !urlB) return false;
    const hostA = extractHostname(urlA);
    const hostB = extractHostname(urlB);
    if (hostA && hostB && hostA === hostB) return true;
    return urlA.toString().trim().toLowerCase() === urlB.toString().trim().toLowerCase();
  }

  // 사용자 인터랙션 추적 상태
  let lastUserInteraction = {
    time: 0,
    target: null,
    anchorHref: '',
    anchorTarget: '',
    openedWindowsCount: 0
  };

  function recordUserInteraction(e) {
    if (e.isTrusted === false) return;

    let target = e.target;
    let anchor = null;
    while (target && target !== document.body && target !== document.documentElement) {
      if (target.tagName === 'A') {
        anchor = target;
        break;
      }
      target = target.parentNode;
    }

    lastUserInteraction = {
      time: Date.now(),
      target: e.target,
      anchorHref: anchor ? (anchor.href || '') : '',
      anchorTarget: anchor ? (anchor.target || '').toLowerCase() : '',
      openedWindowsCount: 0
    };
  }

  window.addEventListener('click', recordUserInteraction, true);
  window.addEventListener('mousedown', recordUserInteraction, true);
  window.addEventListener('pointerdown', recordUserInteraction, true);

  // 가짜 Window 객체
  const fakeWindow = {
    closed: false,
    close: function() {},
    focus: function() {},
    blur: function() {},
    postMessage: function() {},
    print: function() {},
    document: {
      write: function() {},
      open: function() {},
      close: function() {},
      body: { appendChild: function() {} }
    },
    location: {
      _href: '',
      get href() { return this._href; },
      set href(val) {
        if (val && isBlockedAdUrl(val)) {
          console.warn('[MAIN world] fakeWindow 광고 리다이렉트 차단:', val);
          return;
        }
        this._href = val;
      },
      replace: function(val) {
        if (val && isBlockedAdUrl(val)) {
          console.warn('[MAIN world] fakeWindow.replace 광고 차단:', val);
          return;
        }
      },
      assign: function(val) {
        if (val && isBlockedAdUrl(val)) {
          console.warn('[MAIN world] fakeWindow.assign 광고 차단:', val);
          return;
        }
      }
    }
  };

  const originalWindowOpen = window.open;

  // 1. window.open 지능형 가로채기
  window.open = function(url, target, features) {
    const urlStr = url ? url.toString().trim() : '';

    // A. 명백한 광고 도메인/키워드인 경우 -> 무조건 차단
    if (urlStr && isBlockedAdUrl(urlStr)) {
      console.warn('[MAIN world 팝업 차단] 광고 도메인 차단:', urlStr);
      return fakeWindow;
    }

    // A-1. megaup.net 사이트에서의 모든 광고 팝업 차단 (진짜 다운로드 링크 제외)
    if (isMegaupSite) {
      if (!urlStr || urlStr === 'about:blank' || (!urlStr.includes('download.megaup.net') && !urlStr.includes('megaup.net'))) {
        console.warn('[MAIN world 팝업 차단] megaup 광고 팝업 원천 차단:', urlStr);
        return fakeWindow;
      }
    }

    // B. 쿠팡, 구글, 네이버 등 정상 서비스 사이트인 경우
    // (광고 도메인이 아닌 한 동일 도메인/인증/결제 팝업은 100% 정상 허용)
    if (isSafeSite) {
      return originalWindowOpen.apply(this, arguments);
    }

    const now = Date.now();
    const isRecentInteraction = (now - lastUserInteraction.time) < 1200;

    // C. URL이 빈 문자열이거나 about:blank인 경우
    if (!urlStr || urlStr === 'about:blank') {
      if (!isRecentInteraction) {
        console.warn('[MAIN world 팝업 차단] 사용자 클릭 없는 빈 팝업 차단');
        return fakeWindow;
      }
      if (lastUserInteraction.openedWindowsCount > 0) {
        console.warn('[MAIN world 팝업 차단] 중복 빈 팝업 차단');
        return fakeWindow;
      }
      lastUserInteraction.openedWindowsCount++;
      return originalWindowOpen.apply(this, arguments);
    }

    // D. 같은 도메인 또는 신뢰할 수 있는 인증/결제 서비스인 경우 허용
    if (isSameDomain(urlStr) || isTrustedAuthOrPayment(urlStr)) {
      if (isRecentInteraction && lastUserInteraction.openedWindowsCount >= 2) {
        console.warn('[MAIN world 팝업 차단] 초과 팝업 차단:', urlStr);
        return fakeWindow;
      }
      if (isRecentInteraction) lastUserInteraction.openedWindowsCount++;
      return originalWindowOpen.apply(this, arguments);
    }

    // E. 외부 도메인인데 사용자의 최근 클릭이 없는 경우 (타이머/무단 팝업) -> 차단
    if (!isRecentInteraction) {
      console.warn('[MAIN world 팝업 차단] 사용자 클릭 없는 외부 팝업 차단:', urlStr);
      return fakeWindow;
    }

    // F. 사용자가 <a> 링크를 클릭한 상태인데 다른 외부 URL을 여는 경우 (팝언더 차단)
    if (lastUserInteraction.anchorHref) {
      if (!isUrlMatching(lastUserInteraction.anchorHref, urlStr)) {
        console.warn('[MAIN world 팝업 차단] 곁다리 광고 팝업 차단:', urlStr, '클릭 대상:', lastUserInteraction.anchorHref);
        return fakeWindow;
      }
    }

    // G. 단일 사용자 클릭당 허용 창 개수 초과(이미 1개 열림) 시 차단
    if (lastUserInteraction.openedWindowsCount > 0) {
      console.warn('[MAIN world 팝업 차단] 다중 팝업 방지 (이미 1개 열림):', urlStr);
      return fakeWindow;
    }

    // H. 허용된 정상 다운로드 호스팅 사이트인 경우 허용
    if (isAllowedDownloadHost(urlStr)) {
      lastUserInteraction.openedWindowsCount++;
      console.log('[MAIN world] 정상 다운로드 호스트 팝업 허용:', urlStr);
      return originalWindowOpen.apply(this, arguments);
    }

    // I. 기타 미승인 외부 도메인 차단
    console.warn('[MAIN world 팝업 차단] 미승인 외부 도메인 강제 열림 차단:', urlStr);
    return fakeWindow;
  };

  // 2. 동적 a 태그 click() 가로채기 (정상 사이트 내부 클릭은 100% 보존)
  const originalAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function() {
    const href = this.href ? this.href.trim() : '';
    const isDownload = this.hasAttribute('download') || href.startsWith('blob:') || href.startsWith('data:');

    if (isDownload || isSameDomain(href) || isSafeSite) {
      // 명백한 광고 도메인이 아닌 한 정상 클릭은 그대로 허용
      if (href && isBlockedAdUrl(href)) {
        console.warn('[MAIN world 팝업 차단] 광고 링크 a.click 차단:', href);
        return;
      }
      return originalAnchorClick.apply(this, arguments);
    }

    // 다운로드 사이트 등에서 DOM 미부착 가짜 앵커로 외부 광고를 띄우려는 경우 차단
    const isUnattached = !document.contains(this);
    if (isUnattached && !isAllowedDownloadHost(href)) {
      console.warn('[MAIN world 팝업 차단] DOM 미부착 가짜 a.click 차단:', href);
      return;
    }

    if (href && isBlockedAdUrl(href)) {
      console.warn('[MAIN world 팝업 차단] 광고 링크 a.click 차단:', href);
      return;
    }

    return originalAnchorClick.apply(this, arguments);
  };

  // 3. dispatchEvent를 통한 인위적 광고 클릭 차단
  const originalDispatchEvent = EventTarget.prototype.dispatchEvent;
  EventTarget.prototype.dispatchEvent = function(event) {
    if (event && event.type === 'click' && this.tagName === 'A' && !isSafeSite) {
      const href = this.href ? this.href.trim() : '';
      const isDownload = this.hasAttribute('download') || href.startsWith('blob:') || href.startsWith('data:');

      if (!isDownload && !isSameDomain(href)) {
        if (!document.contains(this) && !isAllowedDownloadHost(href)) {
          console.warn('[MAIN world 팝업 차단] DOM 미부착 dispatchEvent 차단:', href);
          return false;
        }
        if (href && isBlockedAdUrl(href)) {
          console.warn('[MAIN world 팝업 차단] 광고 링크 dispatchEvent 차단:', href);
          return false;
        }
      }
    }
    return originalDispatchEvent.apply(this, arguments);
  };

  // 4. 동적 form.submit() 우회 차단 (팝언더용 외부 전송 차단)
  const originalFormSubmit = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = function() {
    const action = this.action || '';
    const t = this.target ? this.target.toLowerCase() : '';
    const hasNewTabTarget = t && !['_self', '_top', '_parent'].includes(t);

    if (action && isBlockedAdUrl(action)) {
      console.warn('[MAIN world 팝업 차단] 광고 form.submit 차단:', action);
      return;
    }

    if (!isSafeSite && hasNewTabTarget && !isSameDomain(action) && !isAllowedDownloadHost(action)) {
      console.warn('[MAIN world 팝업 차단] 외부 새 창 form.submit 차단:', action);
      return;
    }

    return originalFormSubmit.apply(this, arguments);
  };

  // 5. 이벤트 캡처 단계에서 외부 광고 링크 직접 클릭 방지
  const blockAdClickCapture = function(e) {
    try {
      let target = e.target;
      while (target && target.tagName !== 'A') {
        target = target.parentNode;
      }
      if (target && target.tagName === 'A') {
        const href = target.href || '';
        // 현재 도메인의 내부 링크(진짜 주소)는 무조건 안전하게 허용
        if (isSameDomain(href)) return;

        if (href && isBlockedAdUrl(href)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.warn('[MAIN world 팝업 차단] 외부 광고 링크 직접 클릭 차단:', href);
        }
      }
    } catch (err) {}
  };

  document.addEventListener('click', blockAdClickCapture, true);
  document.addEventListener('mousedown', blockAdClickCapture, true);
  document.addEventListener('pointerdown', blockAdClickCapture, true);

  // 6. 안티 디버깅 / 개발자 도구 감지(Function('debugger')) 무력화
  // 개발자 도구가 열려 있어도 debugger 타이머에 걸리지 않도록 방어
  try {
    const OriginalFunction = window.Function;
    window.Function = function(...args) {
      if (args.length > 0 && typeof args[args.length - 1] === 'string') {
        const code = args[args.length - 1];
        if (code.includes('debugger')) {
          return function() {};
        }
      }
      return OriginalFunction.apply(this, args);
    };
    window.Function.prototype = OriginalFunction.prototype;
  } catch(e) {}

  // 7. 동영상 플레이어의 개발자 도구 차단 및 팝업/애드블록 속성 가로채기 (f4stream, f4scdn, AdSpyglass 등)
  try {
    const originalGetAttribute = Element.prototype.getAttribute;
    Element.prototype.getAttribute = function(name) {
      if (name === 'data-protect-devtools') return '0';
      if (name === 'data-block-adblock') return '0';
      if (name === 'data-tag') {
        const val = originalGetAttribute.apply(this, arguments);
        if (val === 'asg') return '';
        return val;
      }
      if (name === 'data-ads') {
        const val = originalGetAttribute.apply(this, arguments);
        if (val) {
          try {
            const ads = JSON.parse(val);
            ads.urls = [];
            ads.own = [];
            ads.push = '';
            ads.pauseAd = '';
            if (ads.vast) {
              ads.vast.tag = '';
              ads.vast.preroll = false;
              ads.vast.midroll = 0;
              ads.vast.postroll = false;
            }
            return JSON.stringify(ads);
          } catch(e) {
            return '{"urls":[],"own":[],"first":0,"push":"","pauseAd":""}';
          }
        }
      }
      return originalGetAttribute.apply(this, arguments);
    };


  } catch(e) {}

  // 재귀적 안전 Proxy 생성기 (어떤 메서드나 속성 접근에도 TypeError/ReferenceError 없이 안전 무력화)
  const makeRecursiveProxy = function() {
    const p = new Proxy(function() { return p; }, {
      get: function(target, prop) {
        if (prop === 'length') return 0;
        if (prop === Symbol.iterator) return function* () {};
        if (prop === 'toString' || prop === Symbol.toPrimitive) return () => '';
        return p;
      },
      apply: function() { return p; },
      construct: function() { return p; }
    });
    return p;
  };

  // 8. 애드블록 탐지(adsbygoogle probe fetch) 응답 위조 (가짜 200 OK 반환)
  try {
    const origFetch = window.fetch;
    if (origFetch) {
      window.fetch = function(input, init) {
        const url = (typeof input === 'string') ? input : (input && input.url ? input.url : '');
        if (url.includes('pagead2.googlesyndication.com') || 
            url.includes('adsbygoogle') ||
            url.includes('doubleclick.net') ||
            url.includes('ad_status.js')) {
          return Promise.resolve(new Response('', { status: 200 }));
        }
        return origFetch.apply(this, arguments);
      };
    }
  } catch(e) {}

  // 9. sextb.net 애드블록 탐지(sxAb, adblock wall) 완벽 무력화, 클릭재킹 팝언더 차단 및 플레이어 자동 복구
  const isSextbFamily = currentHost.includes('sextb.net') || 
                        currentHost.includes('hglink.to') || 
                        currentHost.includes('hgcloud.to') || 
                        currentHost.includes('hanerix.com') || 
                        currentHost.includes('audinifer.com') || 
                        currentHost.includes('vibuxer.com');

  if (isSextbFamily) {
    try {
      // 0. 화면 클릭 시 강제 팝업/팝언더 광고(window.open) 차단
      const origWindowOpen = window.open;
      window.open = function(url, target, features) {
        if (!url || typeof url !== 'string' || 
            url.includes('1vtkmu16') || url.includes('shg.js') || url.includes('directlink') || 
            url.includes('popunder') || url.includes('syndicate') || url.includes('trafficjunky') || 
            url.includes('exoclick') || url.includes('stripchat') || url.includes('ad') ||
            url.includes('click') || url.includes('track') || url === 'about:blank') {
          console.log('[tinymousegesture] Blocked sextb popup/popunder ad:', url);
          return null;
        }
        // 플레이어 화면 내에서의 클릭은 새 창 팝업을 전면 억제
        console.log('[tinymousegesture] Suppressed sextb player popup:', url);
        return null;
      };

      // 0-1. pickDirect 및 uas 광고 배열 무력화
      window.pickDirect = function() { return false; };
      try {
        Object.defineProperty(window, 'uas', {
          get: function() { return []; },
          set: function() {},
          configurable: true
        });
      } catch(e) {}

      // 0-2. 투명 클릭재킹 오버레이 레이어 즉시 제거 (z-index 9999999 등)
      const removeAdOverlays = function() {
        const adLayers = document.querySelectorAll('div[id^="__directlink"], div[style*="9999999"], div[style*="z-index: 999999"]');
        adLayers.forEach(el => {
          if (!el.querySelector('video, iframe, canvas')) {
            el.remove();
          }
        });
      };
      removeAdOverlays();
      setInterval(removeAdOverlays, 300);

      // A. <html> 태그에 data-adfree="1", data-vip="1" 즉시 설정 (sxAb가 자체적으로 검사를 중단하도록 유도)
      if (document.documentElement) {
        document.documentElement.setAttribute('data-adfree', '1');
        document.documentElement.setAttribute('data-vip', '1');
      }

      // B. 세션 스토리지 및 로컬 스토리지 애드블록 검사 캐시를 영구 통과(false) 상태로 위조
      try {
        sessionStorage.setItem('sxab', JSON.stringify({ b: false, t: Date.now() + 864000000 }));
        localStorage.setItem('sxabFree', JSON.stringify({ day: '2099-01-01', films: [16949273] }));
      } catch(e) {}

      // C. window.__adblockWall 속성을 강제로 false 고정하여 플레이어 덮어쓰기 방지
      Object.defineProperty(window, '__adblockWall', {
        get: function() { return false; },
        set: function() {},
        configurable: true
      });

      // D. sxAb 객체 및 adblockBlocks, showAdblockNotice 가로채기
      const fakeSxAb = {
        now: function() { return false; },
        wait: function(cb) { if (typeof cb === 'function') setTimeout(() => cb(false), 0); },
        recheck: function(cb) { if (typeof cb === 'function') setTimeout(() => cb(false), 0); }
      };
      Object.defineProperty(window, 'sxAb', {
        get: function() { return fakeSxAb; },
        set: function() {},
        configurable: true
      });
      Object.defineProperty(window, 'adblockBlocks', {
        get: function() { return function() { return false; }; },
        set: function() {},
        configurable: true
      });
      Object.defineProperty(window, 'showAdblockNotice', {
        get: function() { return function() {}; },
        set: function() {},
        configurable: true
      });

      // E. 기존 sextbAdblock 호환성 유지
      const fakeSextbAdblock = function(cb) {
        if (typeof cb === 'function') setTimeout(() => cb(false), 0);
      };
      fakeSextbAdblock.recheck = function(cb) {
        if (typeof cb === 'function') setTimeout(() => cb(false), 0);
      };
      Object.defineProperty(window, 'sextbAdblock', {
        get: function() { return fakeSextbAdblock; },
        set: function() {},
        configurable: true
      });

      // F. 플레이어가 비어있거나 로딩 상태로 지연될 경우 기본 플레이어 호출 자동 복구
      const checkAndRestore = function() {
        const box = document.getElementById('sextb-player');
        if (box && !box.querySelector('iframe, video')) {
          if (typeof window.player_default === 'function' && window.filmId) {
            console.log('[sextb] 플레이어 자동 복구 실행 (player_default)');
            window.player_default(window.filmId);
          } else {
            const btn = document.querySelector('button.btn-player.active') || document.querySelector('button.btn-player');
            if (btn) {
              console.log('[sextb] 플레이어 자동 복구 실행 (btn-player click)');
              btn.click();
            }
          }
        }
      };
      setTimeout(checkAndRestore, 1500);
      setTimeout(checkAndRestore, 3000);
    } catch(e) {}
  }

  // 10. ExoClick AdProvider 및 Tsyndicate / Native Ads 위젯 프로바이더 무력화
  try {
    const fakeAdProvider = makeRecursiveProxy();
    Object.defineProperty(window, 'AdProvider', {
      get: function() { return fakeAdProvider; },
      set: function() {},
      configurable: true
    });

    const fakeTs = makeRecursiveProxy();
    ['TsMasterSpot', 'ts_im_ad', 'TsVideoInstantMessage', 'TsInstantMessage', 'tsyndicate'].forEach(name => {
      try {
        Object.defineProperty(window, name, {
          get: function() { return fakeTs; },
          set: function() {},
          configurable: true
        });
      } catch(e) {}
    });
  } catch(e) {}

  // 11. AdSpyglass 전역 객체 및 초기화 차단
  try {
    const fakeAsg = makeRecursiveProxy();

    Object.defineProperty(window, '__initAsg', {
      get: function() { return fakeAsg; },
      set: function() {},
      configurable: true
    });
    Object.defineProperty(window, 'asg', {
      get: function() { return fakeAsg; },
      set: function() {},
      configurable: true
    });
    Object.defineProperty(window, 'asg_popunder', {
      get: function() { return fakeAsg; },
      set: function() {},
      configurable: true
    });
    Object.defineProperty(window, 'asg_preroll', {
      get: function() { return fakeAsg; },
      set: function() {},
      configurable: true
    });
  } catch(e) {}

  // 12. JW Player 및 Video.js VAST / Pre-roll 광고 주입 차단 (SPA 정상 사이트는 제외)
  if (!isSafeSite) {
    try {
      let realJwplayer = window.jwplayer;
      const wrapJwplayer = function(target) {
        if (typeof target !== 'function') return target;
        return new Proxy(target, {
          apply(fn, thisArg, args) {
            const inst = Reflect.apply(fn, thisArg, args);
            if (inst && typeof inst.setup === 'function' && !inst.__setupHooked) {
              inst.__setupHooked = true;
              const origSetup = inst.setup;
              inst.setup = function(options) {
                if (options && typeof options === 'object') {
                  if (options.advertising) {
                    console.log('[MAIN world] JW Player advertising 옵션 무력화');
                    delete options.advertising;
                  }
                  if (options.adschedule) delete options.adschedule;
                  if (options.adclient) delete options.adclient;
                  if (options.admessage) delete options.admessage;
                }
                return origSetup.apply(this, arguments);
              };
            }
            return inst;
          }
        });
      };

      if (realJwplayer) {
        window.jwplayer = wrapJwplayer(realJwplayer);
      }
      Object.defineProperty(window, 'jwplayer', {
        get: function() { return realJwplayer; },
        set: function(val) {
          realJwplayer = wrapJwplayer(val);
        },
        configurable: true,
        enumerable: true
      });
    } catch(e) {}

    try {
      let realVideojs = window.videojs;
      const wrapVideojs = function(target) {
        if (typeof target !== 'function') return target;
        return new Proxy(target, {
          apply(fn, thisArg, args) {
            if (args[1] && typeof args[1] === 'object') {
              const opts = args[1];
              if (opts.plugins) {
                delete opts.plugins.vast;
                delete opts.plugins.ads;
                delete opts.plugins.ima;
                delete opts.plugins.asg;
                delete opts.plugins.preroll;
              }
              delete opts.advertising;
              delete opts.adTagUrl;
            }
            const player = Reflect.apply(fn, thisArg, args);
            if (player && player.ima) {
              try { player.ima = function() {}; } catch(e) {}
            }
            return player;
          }
        });
      };

      if (realVideojs) {
        window.videojs = wrapVideojs(realVideojs);
      }
      Object.defineProperty(window, 'videojs', {
        get: function() { return realVideojs; },
        set: function(val) {
          realVideojs = wrapVideojs(val);
        },
        configurable: true,
        enumerable: true
      });
    } catch(e) {}
  }

  // 10. megaup.net 카운트다운 단축, 다운로드 버튼 즉시 활성화 및 팝업/SW 광고 차단
  if (isMegaupSite) {
    try {
      // ServiceWorker 등록 차단 (백그라운드 푸시/팝업 광고 원천 차단)
      if (navigator.serviceWorker) {
        navigator.serviceWorker.register = function() {
          console.log('[MAIN world] megaup ServiceWorker 등록 차단');
          return new Promise(() => {});
        };
      }

      // seconds 변수 오버라이드 (항상 0초 유지하여 즉시 다운로드 버튼 생성)
      try {
        let _megaupSec = 0;
        Object.defineProperty(window, 'seconds', {
          get: function() { return 0; },
          set: function(val) {
            _megaupSec = 0;
            if (typeof window.display === 'function') {
              try { window.display(); } catch(e) {}
            }
          },
          configurable: true
        });
      } catch(e) {}

      // 카운트다운 인터벌 단축 및 display() 즉시 실행
      const fastMegaupDownload = function() {
        try {
          if (typeof window.seconds !== 'undefined') window.seconds = 0;
          if (typeof window.triggerFreeDownload === 'function' && !window.started) {
            window.triggerFreeDownload();
          }
          if (typeof window.display === 'function') {
            window.seconds = 0;
            window.display();
          }
          if (window.countdownTimer) {
            clearInterval(window.countdownTimer);
          }
        } catch(e) {}
      };

      const fastInterval = setInterval(fastMegaupDownload, 50);
      setTimeout(() => clearInterval(fastInterval), 4000);

      document.addEventListener('DOMContentLoaded', fastMegaupDownload);
      window.addEventListener('load', fastMegaupDownload);

      // 다운로드 링크 클릭 시 광고 이벤트 리스너로 전파 방지
      const protectMegaupClick = function(e) {
        const a = e.target && e.target.closest ? e.target.closest('a') : null;
        if (!a) return;
        const href = a.getAttribute('href') || a.href || '';
        if (href.includes('download.megaup.net') || (href.includes('megaup.net') && href.includes('?url='))) {
          a.removeAttribute('target');
          e.stopPropagation();
          console.log('[MAIN world] megaup 다운로드 링크 클릭 보호:', href);
        }
      };

      window.addEventListener('click', protectMegaupClick, true);
      window.addEventListener('mousedown', protectMegaupClick, true);
      window.addEventListener('pointerdown', protectMegaupClick, true);
    } catch(e) {}
  }
})();
