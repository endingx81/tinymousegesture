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
        bottom: 56px;
        left: 14px;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 6px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease, transform 0.2s ease;
        user-select: none;
        -webkit-user-select: none;
      }

      /* 플레이어에 마우스가 호버되어 있거나 컨트롤 자체에 호버된 경우 항상 떠있도록 보장 */
      [data-testid="videoPlayer"]:hover .x-custom-video-controls,
      [data-testid="videoComponent"]:hover .x-custom-video-controls,
      div[style*="aspect-ratio"]:hover .x-custom-video-controls,
      .x-custom-video-controls:hover,
      .x-custom-video-controls.visible {
        opacity: 1 !important;
        pointer-events: auto !important;
      }

      /* 전체화면 모드 대응 */
      :fullscreen .x-custom-video-controls,
      [data-fullscreen="true"] .x-custom-video-controls {
        bottom: 68px;
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

    // 마우스 호버 및 인터랙션 상태 관리
    let isHoveringControls = false;
    let isHoveringPlayer = false;
    let hideTimer = null;

    const resetHideTimer = () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    };

    const scheduleHide = (delay = 3000) => {
      resetHideTimer();
      // 마우스가 플레이어나 컨트롤 위에 있거나, 영상이 멈춰있으면 절대 숨기지 않음
      if (isHoveringControls || isHoveringPlayer || video.paused || video.ended) {
        return;
      }
      hideTimer = setTimeout(() => {
        if (!isHoveringControls && !isHoveringPlayer && !video.paused && !video.ended) {
          controls.classList.remove('visible');
        }
      }, delay);
    };

    const showControls = () => {
      controls.classList.add('visible');
      if (isHoveringControls || isHoveringPlayer || video.paused || video.ended) {
        resetHideTimer();
      } else {
        scheduleHide(3000);
      }
    };

    const hideControls = () => {
      resetHideTimer();
      if (!isHoveringControls && !isHoveringPlayer && !video.paused && !video.ended) {
        controls.classList.remove('visible');
      }
    };

    // 이벤트 캡처 단계에서 트위터 내부 재생/일시정지 및 트윗 확장 이벤트 전파 차단
    const bindEvents = (btn, isForward) => {
      ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'dblclick'].forEach(evtName => {
        btn.addEventListener(evtName, (e) => {
          e.stopPropagation();
          e.stopImmediatePropagation();
          // 버튼 클릭 및 인터랙션 시 항상 controls 표시 유지 및 타이머 리셋
          isHoveringControls = true;
          resetHideTimer();
          controls.classList.add('visible');

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
    video.__xControlsScheduleHide = scheduleHide;

    playerContainer.addEventListener('mouseenter', () => {
      this.currentHoveredVideo = video;
      isHoveringPlayer = true;
      resetHideTimer();
      controls.classList.add('visible');
    });

    playerContainer.addEventListener('mousemove', () => {
      this.currentHoveredVideo = video;
      isHoveringPlayer = true;
      resetHideTimer();
      controls.classList.add('visible');
    });

    playerContainer.addEventListener('mouseleave', () => {
      if (this.currentHoveredVideo === video) {
        this.currentHoveredVideo = null;
      }
      isHoveringPlayer = false;
      isHoveringControls = false;
      scheduleHide(1000);
    });

    controls.addEventListener('mouseenter', () => {
      isHoveringControls = true;
      resetHideTimer();
      controls.classList.add('visible');
    });

    controls.addEventListener('mousemove', () => {
      isHoveringControls = true;
      resetHideTimer();
      controls.classList.add('visible');
    });

    controls.addEventListener('mouseleave', () => {
      isHoveringControls = false;
      if (isHoveringPlayer) {
        resetHideTimer();
        controls.classList.add('visible');
      } else {
        scheduleHide(1500);
      }
    });

    video.addEventListener('play', () => {
      if (isHoveringPlayer || isHoveringControls) {
        resetHideTimer();
        controls.classList.add('visible');
      } else {
        scheduleHide(2500);
      }
    });

    video.addEventListener('pause', () => {
      resetHideTimer();
      controls.classList.add('visible');
    });

    video.addEventListener('ended', () => {
      resetHideTimer();
      controls.classList.add('visible');
    });

    // 초기 상태: 영상이 일시정지 중이거나 준비되면 버튼 바로 표시
    if (video.paused) {
      showControls();
    }
  }

  // 슬라이드(컨트롤 바)의 등장/퇴장 이동과 관계없이 항상 동일한 고정 위치 유지
  adjustControlsPosition(playerContainer, controlsEl) {
    if (!controlsEl) return;
    controlsEl.style.bottom = ''; // 동적 인라인 스타일을 비워 CSS 고정값(56px) 유지
  }

  seekVideo(video, seconds, playerContainer) {
    if (!video) return;

    const current = video.currentTime;
    const duration = video.duration || Infinity;
    const target = Math.max(0, Math.min(duration, current + seconds));
    video.currentTime = target;
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

        // 키보드 방향키 조작 시에도 스킵 버튼 표시 및 유지
        if (targetVideo.__xControlsAttached) {
          targetVideo.__xControlsAttached.classList.add('visible');
          if (typeof targetVideo.__xControlsScheduleHide === 'function') {
            targetVideo.__xControlsScheduleHide(3500);
          }
        }
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

