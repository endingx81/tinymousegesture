// mrjavOverride.js: MAIN world에서 실행되어 강제 팝업 및 원치 않는 외부 도메인 창 열림을 철저히 차단합니다.
(function() {
  if (window.__MainPopupBlocker) return;
  window.__MainPopupBlocker = true;

  const currentHost = window.location.hostname.toLowerCase().replace(/^www\./, '');

  // 1. 차단할 악성 광고 / 팝업 / 팝언더 네트워크 및 키워드 목록
  const blockedAdKeywords = [
    'stripchat', 'stripchatgirls', 'chaturbate', 'livejasmin', 'biotrck', 'trafficjunky',
    'sivycafybemude', 'pemsrv', 'magsrv', '378ed00341',
    'adskeeper', 'ad-maven', 'admaven', 'kilojaya', 'satisfiednews',
    'gullible-thanks', 'tsyndicate', 'alfalfaemployeeresource', 'few-politics',
    'waqool', 'rmhfrtnd', 'wpadmngr', 'mqy60aa7.shop', 'popads', 'popcash',
    'propellerads', 'adsterra', 'exoclick', 'hilltopads', 'monetag', 'clickadu',
    'yadro', 'adclick', 'doubleclick', 'onclick', 'adservice', 'vidoomy',
    'clickaine', 'richpush', 'clickguard', 'zeroredirect', 'adrevenue',
    'adsupply', 'adcolony', 'taboola', 'outbrain', 'bet365', '1xbet',
    'casinogames', 'porn', 'camgirl', 'fap', 'adultgames'
  ];

  // 2. 신뢰할 수 있는 인증(OAuth) 및 결제, 공인 서비스 도메인 목록 (정상 팝업 허용)
  const trustedAuthAndPaymentDomains = [
    'accounts.google.com', 'appleid.apple.com', 'nid.naver.com', 'kauth.kakao.com',
    'facebook.com', 'twitter.com', 'x.com', 'github.com', 'discord.com',
    'steamcommunity.com', 'paypal.com', 'inicis.com', 'kcp.co.kr',
    'tosspayments.com', 'nicepay.co.kr', 'danalpay.com', 'payco.com',
    'checkout.stripe.com', 'recaptcha.net', 'google.com/recaptcha',
    'hcaptcha.com', 'challenges.cloudflare.com'
  ];

  // 3. 주요 게임 및 파일 다운로드 / 클라우드 호스팅 도메인 목록
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

  // Helper: 차단할 광고 도메인/키워드 검사
  function isBlockedAdUrl(url) {
    if (!url) return false;
    const str = url.toString().toLowerCase();
    return blockedAdKeywords.some(keyword => str.includes(keyword));
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

  // 캡처 단계에서 사용자의 실제 클릭/마우스 이벤트 기록
  function recordUserInteraction(e) {
    // 스크립트로 임의 생성된 가짜 이벤트 무시
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

  // 가짜 Window 객체 (차단 시 반환하여 스크립트 에러 방지)
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

  // 1. window.open 지능형 훅킹: 원하는 링크 1개만 열리고 추가/강제 광고 탭은 원천 차단
  window.open = function(url, target, features) {
    const now = Date.now();
    const isRecentInteraction = (now - lastUserInteraction.time) < 1200;
    const urlStr = url ? url.toString().trim() : '';

    // A. 명백한 광고 도메인/키워드인 경우 -> 무조건 즉시 차단
    if (urlStr && isBlockedAdUrl(urlStr)) {
      console.warn('[MAIN world 팝업 차단] 광고 도메인 차단:', urlStr);
      return fakeWindow;
    }

    // B. URL이 빈 문자열이거나 about:blank인 경우
    if (!urlStr || urlStr === 'about:blank') {
      // 사용자 클릭 없이 스크립트가 임의로 띄우는 팝업 차단
      if (!isRecentInteraction) {
        console.warn('[MAIN world 팝업 차단] 사용자 클릭 없는 빈 팝업 차단');
        return fakeWindow;
      }
      // 이미 1개 열렸다면 중복 스팸 방지
      if (lastUserInteraction.openedWindowsCount > 0) {
        console.warn('[MAIN world 팝업 차단] 중복 빈 팝업 차단');
        return fakeWindow;
      }
      lastUserInteraction.openedWindowsCount++;
      return originalWindowOpen.apply(this, arguments);
    }

    // C. 같은 도메인 또는 신뢰할 수 있는 인증/결제 서비스인 경우 허용
    if (isSameDomain(urlStr) || isTrustedAuthOrPayment(urlStr)) {
      // 동일 클릭에서 2개 초과 다중 팝업 스팸 방지
      if (isRecentInteraction && lastUserInteraction.openedWindowsCount >= 2) {
        console.warn('[MAIN world 팝업 차단] 초과 팝업 차단:', urlStr);
        return fakeWindow;
      }
      if (isRecentInteraction) lastUserInteraction.openedWindowsCount++;
      return originalWindowOpen.apply(this, arguments);
    }

    // D. 외부 도메인인데 사용자의 최근 클릭이 없는 경우 (타이머/백그라운드 무단 팝업) -> 차단!
    if (!isRecentInteraction) {
      console.warn('[MAIN world 팝업 차단] 사용자 클릭 없는 외부 팝업 차단:', urlStr);
      return fakeWindow;
    }

    // E. 사용자가 <a> 링크를 클릭한 상태인 경우 ("링크에 한 개만 열리면 되는데 다른 광고 페이지가 같이 열려")
    if (lastUserInteraction.anchorHref) {
      // 사용자가 클릭한 링크의 목적지와 window.open의 대상이 다른 경우 -> 100% 팝언더 광고 스크립트!
      if (!isUrlMatching(lastUserInteraction.anchorHref, urlStr)) {
        console.warn('[MAIN world 팝업 차단] 곁다리 광고 팝업 차단 (클릭한 링크와 불일치):', urlStr, '클릭한 대상:', lastUserInteraction.anchorHref);
        return fakeWindow;
      }
    }

    // F. 단일 사용자 클릭당 허용 창 개수 초과(이미 1개 열림) 시 차단
    if (lastUserInteraction.openedWindowsCount > 0) {
      console.warn('[MAIN world 팝업 차단] 다중 팝업 방지 (이미 1개 열림):', urlStr);
      return fakeWindow;
    }

    // G. 허용된 정상 다운로드 호스팅 사이트인 경우 허용
    if (isAllowedDownloadHost(urlStr)) {
      lastUserInteraction.openedWindowsCount++;
      console.log('[MAIN world] 정상 다운로드 호스트 팝업 허용:', urlStr);
      return originalWindowOpen.apply(this, arguments);
    }

    // H. 그 외 다운로드 사이트 등에서 강제로 열리는 임의의 외부 도메인 차단
    console.warn('[MAIN world 팝업 차단] 미승인 외부 도메인 강제 열림 차단:', urlStr);
    return fakeWindow;
  };

  // 2. 동적 a 태그 click() 가로채기 (DOM 미연결 가짜 앵커 또는 외부 광고 링크 차단)
  const originalAnchorClick = HTMLAnchorElement.prototype.click;
  const hookedAnchorClick = function() {
    const href = this.href ? this.href.trim() : '';
    const isDownload = this.hasAttribute('download') || href.startsWith('blob:') || href.startsWith('data:');

    // 정상 파일 다운로드는 무조건 허용
    if (isDownload) {
      return originalAnchorClick.apply(this, arguments);
    }

    // DOM 트리에 포함되지 않은 가짜 앵커 클릭 차단
    const isUnattached = !document.contains(this);
    if (isUnattached) {
      console.warn('[MAIN world 팝업 차단] DOM 미부착 가짜 a.click 차단:', href);
      return;
    }

    // 화면에 보이지 않는 은닉 태그 클릭 차단
    try {
      const style = window.getComputedStyle(this);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        console.warn('[MAIN world 팝업 차단] 은닉된 a.click 차단:', href);
        return;
      }
    } catch (e) {}

    // 명백한 광고 도메인 차단
    if (href && isBlockedAdUrl(href)) {
      console.warn('[MAIN world 팝업 차단] 광고 링크 a.click 차단:', href);
      return;
    }

    // 사용자가 다른 링크를 누른 상태에서 스크립트가 추가 가짜 클릭을 날리는 경우 차단
    if (lastUserInteraction.anchorHref && !isUrlMatching(lastUserInteraction.anchorHref, href)) {
      console.warn('[MAIN world 팝업 차단] 곁다리 가짜 a.click 차단:', href);
      return;
    }

    return originalAnchorClick.apply(this, arguments);
  };
  HTMLAnchorElement.prototype.click = hookedAnchorClick;

  // 3. dispatchEvent를 통한 인위적 클릭 우회 차단
  const originalDispatchEvent = EventTarget.prototype.dispatchEvent;
  EventTarget.prototype.dispatchEvent = function(event) {
    if (event && event.type === 'click' && this.tagName === 'A') {
      const href = this.href ? this.href.trim() : '';
      const isDownload = this.hasAttribute('download') || href.startsWith('blob:') || href.startsWith('data:');

      if (!isDownload) {
        if (!document.contains(this)) {
          console.warn('[MAIN world 팝업 차단] DOM 미부착 dispatchEvent 차단:', href);
          return false;
        }
        if (href && isBlockedAdUrl(href)) {
          console.warn('[MAIN world 팝업 차단] 광고 링크 dispatchEvent 차단:', href);
          return false;
        }
        if (lastUserInteraction.anchorHref && !isUrlMatching(lastUserInteraction.anchorHref, href)) {
          console.warn('[MAIN world 팝업 차단] 곁다리 dispatchEvent 차단:', href);
          return false;
        }
      }
    }
    return originalDispatchEvent.apply(this, arguments);
  };

  // 4. 동적 form.submit() 우회 차단 (팝언더용 외부 전송 차단)
  const originalFormSubmit = HTMLFormElement.prototype.submit;
  const hookedFormSubmit = function() {
    const action = this.action || '';
    const t = this.target ? this.target.toLowerCase() : '';
    const hasNewTabTarget = t && !['_self', '_top', '_parent'].includes(t);

    if (action && isBlockedAdUrl(action)) {
      console.warn('[MAIN world 팝업 차단] 광고 form.submit 차단:', action);
      return;
    }

    if (hasNewTabTarget && !isSameDomain(action) && !isAllowedDownloadHost(action)) {
      console.warn('[MAIN world 팝업 차단] 외부 새 창 form.submit 차단:', action);
      return;
    }

    return originalFormSubmit.apply(this, arguments);
  };
  HTMLFormElement.prototype.submit = hookedFormSubmit;

  // 5. iframe을 통한 window.open 우회 완벽 차단
  const cwDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
  const cdDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentDocument');

  const hookIframe = function(iframe) {
    try {
      if (!iframe) return;
      let cw = null;
      if (cwDesc && cwDesc.get) {
        cw = cwDesc.get.call(iframe);
      } else {
        cw = iframe.contentWindow;
      }
      if (cw) {
        cw.open = window.open;
        if (cw.HTMLAnchorElement) cw.HTMLAnchorElement.prototype.click = hookedAnchorClick;
        if (cw.HTMLFormElement) cw.HTMLFormElement.prototype.submit = hookedFormSubmit;
      }
    } catch (e) {}
  };

  const originalAppendChild = Node.prototype.appendChild;
  Node.prototype.appendChild = function(child) {
    const result = originalAppendChild.apply(this, arguments);
    if (child && (child.tagName === 'IFRAME' || child.nodeName === 'IFRAME')) hookIframe(child);
    return result;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(newNode, referenceNode) {
    const result = originalInsertBefore.apply(this, arguments);
    if (newNode && (newNode.tagName === 'IFRAME' || newNode.nodeName === 'IFRAME')) hookIframe(newNode);
    return result;
  };

  if (cwDesc) {
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
      get: function() {
        hookIframe(this);
        return cwDesc.get.call(this);
      },
      configurable: true,
      enumerable: true
    });
  }

  if (cdDesc) {
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentDocument', {
      get: function() {
        hookIframe(this);
        return cdDesc.get.call(this);
      },
      configurable: true,
      enumerable: true
    });
  }

  // DOM에 추가되는 iframe 지속 감지
  const iframeObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.tagName === 'IFRAME' || node.nodeName === 'IFRAME') {
          hookIframe(node);
        } else if (node.querySelectorAll) {
          node.querySelectorAll('iframe').forEach(hookIframe);
        }
      });
    });
  });

  if (document.documentElement) {
    iframeObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  const existingIframes = document.querySelectorAll('iframe');
  for (let i = 0; i < existingIframes.length; i++) {
    hookIframe(existingIframes[i]);
  }

  // 6. 이벤트 캡처 단계에서 외부 광고 링크 직접 클릭 방지
  const blockAdClickCapture = function(e) {
    try {
      let target = e.target;
      while (target && target.tagName !== 'A') {
        target = target.parentNode;
      }
      if (target && target.tagName === 'A') {
        const href = target.href || '';
        if (href && isBlockedAdUrl(href)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.warn('[MAIN world 팝업 차단] 광고 링크 직접 클릭 차단:', href);
        }
      }
    } catch (err) {}
  };

  document.addEventListener('click', blockAdClickCapture, true);
  document.addEventListener('mousedown', blockAdClickCapture, true);
  document.addEventListener('pointerdown', blockAdClickCapture, true);
})();
