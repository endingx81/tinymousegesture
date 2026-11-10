// twitterControl.js: X (Twitter) 동영상 플레이어 10초(설정값) 전후 탐색 버튼 및 단축키 컨트롤러
class TwitterController {
  constructor() {
    this.skipTime = 10; // 기본값 10초
    this.currentHoveredVideo = null;
    this.styleInjected = false;
    this.pollInterval = null;
    this.observer = null;

    this.initialize();
  }

  async initialize() {
    await this.initializeState();
    this.injectStyles();
    this.installHooks();
    this.setupKeyboardShortcuts();
    this.scanAndInject();
  }

  async initializeState() {
    try {
      if (chrome?.storage?.local) {
        const data = await chrome.storage.local.get(['twitterSkipTime', 'youtubeSkipTime']);
        this.skipTime = data.twitterSkipTime || 10;
      }
    } catch (e) {
      console.warn('[TwitterController] 설정 로드 오류:', e);
      this.skipTime = 10;
    }

    // 설정 변경 실시간 반영
    if (chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.twitterSkipTime) {
          this.skipTime = changes.twitterSkipTime.newValue || 10;
          this.updateAllButtonLabels();
        }
      });
    }
  }

  injectStyles() {
    if (this.styleInjected || document.getElementById('x-custom-video-controls-style')) return;
    this.styleInjected = true;

    const styleEl = document.createElement('style');
    styleEl.id = 'x-custom-video-controls-style';
    styleEl.textContent = `
      .x-custom-video-controls {
        position: absolute;
        bottom: 52px;
        left: 14px;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 6px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease, transform 0.2s ease, bottom 0.2s ease;
        user-select: none;
        -webkit-user-select: none;
      }

      .x-custom-video-controls.visible {
        opacity: 1 !important;
        pointer-events: auto !important;
      }

      .x-custom-skip-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 4px !important;
        height: 28px !important;
        padding: 0 10px !important;
        background: rgba(15, 20, 25, 0.75) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
        color: #ffffff !important;
        border: 1px solid rgba(255, 255, 255, 0.25) !important;
        border-radius: 14px !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        line-height: 1 !important;
        cursor: pointer !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4) !important;
        transition: background 0.15s ease, transform 0.1s ease, border-color 0.15s ease, box-shadow 0.15s ease !important;
        outline: none !important;
        margin: 0 !important;
      }

      .x-custom-skip-btn:hover {
        background: rgba(29, 155, 240, 0.95) !important; /* X/Twitter Blue */
        border-color: rgba(29, 155, 240, 1) !important;
        color: #ffffff !important;
        transform: scale(1.06) !important;
        box-shadow: 0 4px 12px rgba(29, 155, 240, 0.45) !important;
      }

      .x-custom-skip-btn:active {
        transform: scale(0.94) !important;
        background: rgba(26, 140, 216, 1) !important;
      }

      .x-custom-skip-btn svg {
        width: 14px !important;
        height: 14px !important;
        fill: currentColor !important;
        display: block !important;
        pointer-events: none !important;
      }

      .x-custom-skip-btn span {
        pointer-events: none !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        letter-spacing: -0.2px !important;
      }

      /* 스킵 애니메이션 토스트 (화면 중앙 피드백) */
      .x-custom-skip-toast {
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) scale(0.85) !important;
        background: rgba(0, 0, 0, 0.8) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
        color: #ffffff !important;
        padding: 10px 18px !important;
        border-radius: 24px !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        font-size: 14px !important;
        font-weight: 700 !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        pointer-events: none !important;
        opacity: 0 !important;
        z-index: 10000 !important;
        transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.6) !important;
        border: 1px solid rgba(255, 255, 255, 0.15) !important;
      }

      .x-custom-skip-toast.show {
        opacity: 1 !important;
        transform: translate(-50%, -50%) scale(1) !important;
      }

      .x-custom-skip-toast svg {
        width: 16px !important;
        height: 16px !important;
        fill: currentColor !important;
      }
    `;

    if (document.head) {
      document.head.appendChild(styleEl);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.head?.appendChild(styleEl);
      });
    }
  }

  installHooks() {
    // DOM 변화 감시 (동적 렌더링 대응)
    this.observer = new MutationObserver(() => {
      this.scanAndInject();
    });

    const targetNode = document.body || document.documentElement;
    if (targetNode) {
      this.observer.observe(targetNode, { childList: true, subtree: true });
    }

    // SPA 페이지 전환 및 스크롤 이벤트 대비 주기적 폴링
    this.pollInterval = setInterval(() => {
      this.scanAndInject();
    }, 1000);
  }

  scanAndInject() {
    const videos = document.querySelectorAll('video');
    videos.forEach((video) => {
      this.injectControlsForVideo(video);
    });
  }

  injectControlsForVideo(video) {
    if (!video) return;

    // GIF 플레이어는 건너뛰기
    if (video.closest('[data-testid="gifPlayer"]')) return;
    if (video.loop && video.duration > 0 && video.duration < 3.5 && !video.hasAttribute('controls')) return;

    // 플레이어 래퍼 컨테이너 찾기
    const playerContainer = video.closest('[data-testid="videoPlayer"]') ||
                            video.closest('[data-testid="videoComponent"]') ||
                            video.closest('div[style*="aspect-ratio"]') ||
                            video.parentElement;
    if (!playerContainer) return;

    // 이미 주입된 컨트롤이 있는지 확인
    const existingControls = playerContainer.querySelector('.x-custom-video-controls');
    if (existingControls) {
      if (video.__xControlsAttached !== existingControls) {
        video.__xControlsAttached = existingControls;
      }
      return;
    }

    // playerContainer의 position이 static이면 relative로 보정하여 절대 위치 보장
    if (window.getComputedStyle(playerContainer).position === 'static') {
      playerContainer.style.position = 'relative';
    }

    // 컨트롤 컨테이너 생성
    const controls = document.createElement('div');
    controls.className = 'x-custom-video-controls';

    // 10초 뒤로 버튼
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'x-custom-skip-btn x-skip-back';
    backBtn.title = `${this.skipTime}초 뒤로 (← 또는 J)`;
    backBtn.setAttribute('aria-label', `${this.skipTime}초 뒤로 탐색`);
    backBtn.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>
      <span class="x-skip-text">${this.skipTime}s</span>
    `;

    // 10초 앞으로 버튼
    const forwardBtn = document.createElement('button');
    forwardBtn.type = 'button';
    forwardBtn.className = 'x-custom-skip-btn x-skip-forward';
    forwardBtn.title = `${this.skipTime}초 앞으로 (→ 또는 L)`;
    forwardBtn.setAttribute('aria-label', `${this.skipTime}초 앞으로 탐색`);
    forwardBtn.innerHTML = `
      <span class="x-skip-text">${this.skipTime}s</span>
      <svg viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
    `;

    // 이벤트 캡처 단계에서 트위터 내부 재생/일시정지 및 트윗 확장 이벤트 전파 차단
    const bindEvents = (btn, isForward) => {
      ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'dblclick'].forEach(evtName => {
        btn.addEventListener(evtName, (e) => {
          e.stopPropagation();
          e.stopImmediatePropagation();
          if (evtName === 'click') {
            e.preventDefault();
            const delta = isForward ? this.skipTime : -this.skipTime;
            this.seekVideo(video, delta, playerContainer);
          }
        }, true);
      });
    };

    bindEvents(backBtn, false);
    bindEvents(forwardBtn, true);

    controls.appendChild(backBtn);
    controls.appendChild(forwardBtn);
    playerContainer.appendChild(controls);

    video.__xControlsAttached = controls;

    // 마우스 호버 및 재생 상태에 따른 표시/숨김 제어
    let hideTimer = null;
    const showControls = () => {
      this.adjustControlsPosition(playerContainer, controls);
      controls.classList.add('visible');
      if (hideTimer) clearTimeout(hideTimer);
      if (!video.paused && !video.ended) {
        hideTimer = setTimeout(() => {
          controls.classList.remove('visible');
        }, 2500);
      }
    };

    const hideControls = () => {
      if (hideTimer) clearTimeout(hideTimer);
      if (!video.paused && !video.ended) {
        controls.classList.remove('visible');
      }
    };

    playerContainer.addEventListener('mouseenter', () => {
      this.currentHoveredVideo = video;
      showControls();
    });

    playerContainer.addEventListener('mousemove', () => {
      showControls();
    });

    playerContainer.addEventListener('mouseleave', () => {
      if (this.currentHoveredVideo === video) {
        this.currentHoveredVideo = null;
      }
      hideControls();
    });

    controls.addEventListener('mouseenter', () => {
      if (hideTimer) clearTimeout(hideTimer);
      controls.classList.add('visible');
    });

    video.addEventListener('play', showControls);
    video.addEventListener('pause', () => {
      if (hideTimer) clearTimeout(hideTimer);
      controls.classList.add('visible');
    });
    video.addEventListener('ended', () => {
      controls.classList.add('visible');
    });

    // 초기 상태: 영상이 일시정지 중이면 버튼 바로 표시
    if (video.paused) {
      showControls();
    }
  }

  // 트위터 하단 컨트롤 바 높이에 맞게 버튼 위치 자동 보정
  adjustControlsPosition(playerContainer, controlsEl) {
    try {
      const playerRect = playerContainer.getBoundingClientRect();
      if (playerRect.height === 0) return;

      const nativeControl = playerContainer.querySelector('[role="slider"], [aria-label*="Play" i], [aria-label*="Pause" i], [aria-label*="재생" i], [aria-label*="일시" i]');
      if (nativeControl) {
        let current = nativeControl.parentElement;
        while (current && current !== playerContainer) {
          const style = window.getComputedStyle(current);
          const rect = current.getBoundingClientRect();
          if (style.position === 'absolute' || rect.bottom >= playerRect.bottom - 10) {
            if (rect.height >= 24 && rect.height <= 80) {
              const bottomGap = Math.max(48, Math.round(playerRect.bottom - rect.top + 8));
              controlsEl.style.bottom = `${bottomGap}px`;
              return;
            }
          }
          current = current.parentElement;
        }
      }
    } catch (e) {}

    controlsEl.style.bottom = '52px';
  }

  seekVideo(video, seconds, playerContainer) {
    if (!video) return;

    const current = video.currentTime;
    const duration = video.duration || Infinity;
    const target = Math.max(0, Math.min(duration, current + seconds));
    video.currentTime = target;

    const label = seconds > 0 ? `+${Math.abs(seconds)}s` : `-${Math.abs(seconds)}s`;
    const direction = seconds > 0 ? 'forward' : 'backward';
    this.showToast(playerContainer, label, direction);
  }

  showToast(playerContainer, text, direction) {
    if (!playerContainer) return;

    let toast = playerContainer.querySelector('.x-custom-skip-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'x-custom-skip-toast';
      playerContainer.appendChild(toast);
    }

    const iconSvg = direction === 'forward'
      ? '<svg viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>';

    toast.innerHTML = direction === 'forward'
      ? `<span>${text}</span> ${iconSvg}`
      : `${iconSvg} <span>${text}</span>`;

    toast.classList.remove('show');
    void toast.offsetWidth; // Force Reflow
    toast.classList.add('show');

    if (toast.__hideTimer) clearTimeout(toast.__hideTimer);
    toast.__hideTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 600);
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // 텍스트 입력 중일 때는 단축키 비활성화
      const activeEl = document.activeElement;
      if (activeEl) {
        const tag = activeEl.tagName.toUpperCase();
        if (tag === 'INPUT' || tag === 'TEXTAREA' || activeEl.isContentEditable || activeEl.getAttribute('role') === 'textbox') {
          return;
        }
      }

      if (e.altKey || e.ctrlKey || e.metaKey) return;

      let delta = 0;
      if (e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
        delta = -this.skipTime;
      } else if (e.key === 'ArrowRight' || e.key === 'l' || e.key === 'L') {
        delta = this.skipTime;
      }

      if (delta === 0) return;

      const targetVideo = this.findActiveVideo();
      if (targetVideo) {
        e.preventDefault();
        e.stopPropagation();

        const container = targetVideo.closest('[data-testid="videoPlayer"]') ||
                          targetVideo.closest('[data-testid="videoComponent"]') ||
                          targetVideo.parentElement;
        this.seekVideo(targetVideo, delta, container);
      }
    }, true);
  }

  findActiveVideo() {
    const videos = Array.from(document.querySelectorAll('video')).filter(v => {
      return !v.closest('[data-testid="gifPlayer"]') && (!v.loop || v.duration > 3.5 || v.hasAttribute('controls'));
    });
    if (videos.length === 0) return null;

    // 1. 현재 마우스가 올려져 있는 비디오
    if (this.currentHoveredVideo && document.contains(this.currentHoveredVideo)) {
      return this.currentHoveredVideo;
    }

    // 2. 현재 재생 중인 비디오
    const playing = videos.find(v => !v.paused && !v.ended && v.readyState > 1);
    if (playing) return playing;

    // 3. 뷰포트 내에 보이는 비디오
    const visible = videos.find(v => {
      const rect = v.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight && rect.width > 50 && rect.height > 50;
    });

    return visible || videos[0];
  }

  updateAllButtonLabels() {
    document.querySelectorAll('.x-custom-skip-btn.x-skip-back').forEach(btn => {
      btn.title = `${this.skipTime}초 뒤로 (← 또는 J)`;
      btn.setAttribute('aria-label', `${this.skipTime}초 뒤로 탐색`);
      const span = btn.querySelector('.x-skip-text');
      if (span) span.textContent = `${this.skipTime}s`;
    });

    document.querySelectorAll('.x-custom-skip-btn.x-skip-forward').forEach(btn => {
      btn.title = `${this.skipTime}초 앞으로 (→ 또는 L)`;
      btn.setAttribute('aria-label', `${this.skipTime}초 앞으로 탐색`);
      const span = btn.querySelector('.x-skip-text');
      if (span) span.textContent = `${this.skipTime}s`;
    });
  }
}

// 컨트롤러 인스턴스 초기화
new TwitterController();
