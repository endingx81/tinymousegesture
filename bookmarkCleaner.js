/**
 * Bookmark Cleaner & Health Inspector
 * tiny mouse gesture & etc.
 */

class BookmarkCleaner {
  constructor() {
    this.bookmarks = [];
    this.deletedBookmarks = [];
    this.results = new Map(); // id -> result object
    this.isScanning = false;
    this.shouldStop = false;
    this.activeTab = 'issues';
    this.searchKeyword = '';
    this.selectedIds = new Set();
    this.concurrencyLimit = 6;
    this.timeoutMs = 8000;

    this.stats = {
      all: 0,
      issues: 0,
      warning: 0,
      ok: 0,
      deleted: 0
    };

    this.initElements();
    this.bindEvents();
    this.loadBookmarks();
  }

  initElements() {
    this.startScanBtn = document.getElementById('startScanBtn');
    this.stopScanBtn = document.getElementById('stopScanBtn');
    this.backupBtn = document.getElementById('backupBtn');
    this.progressSection = document.getElementById('progressSection');
    this.progressText = document.getElementById('progressText');
    this.progressPercent = document.getElementById('progressPercent');
    this.progressBarFill = document.getElementById('progressBarFill');
    this.progressCurrentUrl = document.getElementById('progressCurrentUrl');

    this.statAll = document.getElementById('statAll');
    this.statIssues = document.getElementById('statIssues');
    this.statWarning = document.getElementById('statWarning');
    this.statOk = document.getElementById('statOk');
    this.statDeleted = document.getElementById('statDeleted');

    this.tabCountIssues = document.getElementById('tabCountIssues');
    this.tabCountAll = document.getElementById('tabCountAll');
    this.tabCountWarning = document.getElementById('tabCountWarning');
    this.tabCountOk = document.getElementById('tabCountOk');
    this.tabCountDeleted = document.getElementById('tabCountDeleted');

    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.statCards = document.querySelectorAll('.stat-card');
    this.searchInput = document.getElementById('searchInput');
    this.selectAllIssues = document.getElementById('selectAllIssues');
    this.selectAllCheckbox = document.getElementById('selectAllCheckbox');
    this.deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    this.selectedCount = document.getElementById('selectedCount');

    this.tableBody = document.getElementById('bookmarkTableBody');
    this.toast = document.getElementById('toast');
  }

  bindEvents() {
    this.startScanBtn.addEventListener('click', () => this.startScan());
    this.stopScanBtn.addEventListener('click', () => this.stopScan());
    this.backupBtn.addEventListener('click', () => this.exportBackup());

    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    this.statCards.forEach(card => {
      card.addEventListener('click', (e) => {
        const filter = e.currentTarget.dataset.filter;
        this.switchTab(filter);
      });
    });

    this.searchInput.addEventListener('input', (e) => {
      this.searchKeyword = e.target.value.trim().toLowerCase();
      this.renderTable();
    });

    this.selectAllIssues.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      this.selectAllByStatus(isChecked, ['dead', 'account_dead', 'blog_dead']);
    });

    this.selectAllCheckbox.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      this.selectVisibleItems(isChecked);
    });

    this.deleteSelectedBtn.addEventListener('click', () => this.deleteSelected());

    if (chrome?.bookmarks?.onRemoved) {
      chrome.bookmarks.onRemoved.addListener((id) => {
        const item = this.bookmarks.find(b => b.id === id);
        if (item) {
          const res = this.results.get(id) || { statusType: 'deleted', badgeClass: 'badge-deleted', badgeText: '🗑️ 삭제 완료', reason: '즐겨찾기에서 삭제되었습니다.' };
          this.deletedBookmarks.push({ ...item, res: { ...res, deleted: true } });
          this.bookmarks = this.bookmarks.filter(b => b.id !== id);
          this.results.delete(id);
          this.selectedIds.delete(id);
          this.updateStats();
          this.renderTable();
        }
      });
    }
  }

  showToast(message, duration = 3000) {
    if (!this.toast) return;
    this.toast.textContent = message;
    this.toast.style.display = 'block';
    setTimeout(() => {
      this.toast.style.display = 'none';
    }, duration);
  }

  switchTab(tab) {
    this.activeTab = tab;
    this.tabButtons.forEach(b => {
      if (b.dataset.tab === tab) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
    this.renderTable();
  }

  async loadBookmarks() {
    try {
      const tree = await chrome.bookmarks.getTree();
      this.bookmarks = [];

      const traverse = (node, path = '') => {
        const currentPath = node.title ? (path ? `${path} > ${node.title}` : node.title) : path;
        if (node.url) {
          const lowerUrl = node.url.toLowerCase();
          // http / https 만 검사 대상에 포함
          if (lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://')) {
            this.bookmarks.push({
              id: node.id,
              title: node.title || '(제목 없음)',
              url: node.url,
              folderPath: path || '북마크',
              dateAdded: node.dateAdded
            });
          }
        }
        if (node.children) {
          for (const child of node.children) {
            traverse(child, currentPath);
          }
        }
      };

      for (const root of tree) {
        traverse(root, '');
      }

      this.updateStats();
      this.renderTable();
    } catch (err) {
      console.error('북마크 로드 실패:', err);
      this.showToast('북마크를 불러오는 중 오류가 발생했습니다.');
    }
  }

  updateStats() {
    let all = this.bookmarks.length;
    let issues = 0;
    let warning = 0;
    let ok = 0;
    let deleted = this.deletedBookmarks.length;

    for (const item of this.bookmarks) {
      const res = this.results.get(item.id);
      if (!res) continue;

      if (['dead', 'account_dead', 'blog_dead'].includes(res.statusType)) {
        issues++;
      } else if (res.statusType === 'warning') {
        warning++;
      } else if (res.statusType === 'ok') {
        ok++;
      }
    }

    this.stats = { all, issues, warning, ok, deleted };

    this.statAll.textContent = all;
    this.statIssues.textContent = issues;
    this.statWarning.textContent = warning;
    this.statOk.textContent = ok;
    this.statDeleted.textContent = deleted;

    this.tabCountAll.textContent = all;
    this.tabCountIssues.textContent = issues;
    this.tabCountWarning.textContent = warning;
    this.tabCountOk.textContent = ok;
    this.tabCountDeleted.textContent = deleted;

    this.updateSelectedCounter();
  }

  updateSelectedCounter() {
    const count = this.selectedIds.size;
    this.selectedCount.textContent = count;
    this.deleteSelectedBtn.disabled = count === 0;
  }

  async startScan() {
    if (this.isScanning) return;

    // 크롬 북마크를 최신 상태로 다시 로드 (삭제된 북마크는 이미 크롬에 없으므로 자연스럽게 제외됨)
    await this.loadBookmarks();

    // 현재 남아있는 북마크 ID만 results에 유지하고 삭제된 항목은 정리
    const currentIdSet = new Set(this.bookmarks.map(b => b.id));
    for (const id of Array.from(this.results.keys())) {
      if (!currentIdSet.has(id)) {
        this.results.delete(id);
      }
    }
    this.selectedIds.clear();
    this.updateSelectedCounter();

    this.isScanning = true;
    this.shouldStop = false;

    this.startScanBtn.style.display = 'none';
    this.stopScanBtn.style.display = 'inline-flex';
    this.progressSection.style.display = 'block';

    const total = this.bookmarks.length;
    let completed = 0;

    const queue = [...this.bookmarks];
    const workers = [];

    const updateProgress = (currentUrl = '') => {
      const pct = total === 0 ? 100 : Math.round((completed / total) * 100);
      this.progressBarFill.style.width = `${pct}%`;
      this.progressPercent.textContent = `${pct}%`;
      this.progressText.textContent = `검사 진행 중: ${completed} / ${total} 완료`;
      if (currentUrl) {
        this.progressCurrentUrl.textContent = currentUrl;
      }
    };

    updateProgress();

    const worker = async () => {
      while (queue.length > 0 && !this.shouldStop) {
        const item = queue.shift();
        if (!item) break;

        // 이미 검사했고 삭제된 상태가 아니라면 재검사
        const result = await this.inspectUrl(item.url);
        this.results.set(item.id, result);

        completed++;
        updateProgress(item.url);

        if (completed % 3 === 0 || queue.length === 0) {
          this.updateStats();
          this.renderTable();
        }
      }
    };

    for (let i = 0; i < this.concurrencyLimit; i++) {
      workers.push(worker());
    }

    await Promise.all(workers);

    this.isScanning = false;
    this.startScanBtn.style.display = 'inline-flex';
    this.startScanBtn.textContent = '🔄 재검사 시작';
    this.stopScanBtn.style.display = 'none';

    if (this.shouldStop) {
      this.progressText.textContent = `검사가 중단되었습니다 (${completed} / ${total})`;
      this.showToast('검사가 일시 중단되었습니다.');
    } else {
      this.progressBarFill.style.width = '100%';
      this.progressPercent.textContent = '100%';
      this.progressText.textContent = `검사 완료! 총 ${total}개 검사됨 (문제 ${this.stats.issues}개 발견)`;
      this.progressCurrentUrl.textContent = '검사가 완료되었습니다.';
      this.showToast(`검사 완료: 문제 ${this.stats.issues}개 발견`);
    }

    this.updateStats();
    this.renderTable();
  }

  stopScan() {
    this.shouldStop = true;
    this.stopScanBtn.textContent = '중단 중...';
  }

  /**
   * 개별 URL 상태 및 계정 상태 지능형 검사
   */
  async inspectUrl(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      clearTimeout(timeoutId);
      return {
        statusType: 'dead',
        badgeClass: 'badge-dead',
        badgeText: '🔴 잘못된 URL',
        reason: 'URL 형식이 올바르지 않습니다.'
      };
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const pathname = parsedUrl.pathname;

    try {
      let response;
      try {
        response = await fetch(url, {
          method: 'GET',
          cache: 'no-cache',
          credentials: 'include',
          redirect: 'follow',
          signal: controller.signal,
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });
      } catch (firstErr) {
        // 대기열 솔루션(Queue-it)이나 SSO/로그인 리다이렉트 루프로 인한 실패인 경우,
        // redirect: 'manual'로 서버 응답(302/opaqueredirect 등) 여부 2차 검증
        try {
          const manualController = new AbortController();
          const manualTimeout = setTimeout(() => manualController.abort(), 4000);
          const manualRes = await fetch(url, {
            method: 'GET',
            cache: 'no-cache',
            credentials: 'include',
            redirect: 'manual',
            signal: manualController.signal
          });
          clearTimeout(manualTimeout);

          // 200~399 응답 또는 브라우저 opaqueredirect(status 0) 수신 시 서버가 정상 동작 중인 것으로 판정
          if ((manualRes.status >= 200 && manualRes.status < 400) || manualRes.status === 0 || manualRes.type === 'opaqueredirect') {
            clearTimeout(timeoutId);
            return {
              statusType: 'ok',
              badgeClass: 'badge-ok',
              badgeText: '🟢 정상 (대기열/보안)',
              reason: `대기열(Queue-it) 또는 로그인 리다이렉트 보안이 적용된 정상 사이트입니다 (HTTP ${manualRes.status || '302'})`
            };
          }
        } catch (secondErr) {
          // 2차 수동 요청도 실패한 경우 진짜 도메인 만료/서버 다운
        }
        throw firstErr;
      }

      clearTimeout(timeoutId);

      // 본문 텍스트 읽기 (앞 200KB + 뒤 100KB 및 전체 길이 보존)
      let bodyText = '';
      let textLength = 0;
      let tailText = '';
      try {
        const text = await response.text();
        textLength = text.length;
        bodyText = text.slice(0, 200000);
        tailText = text.length > 200000 ? text.slice(-100000) : '';
      } catch (e) {
        // 본문 읽기 실패 시 빈 문자열
      }

      const status = response.status;

      // 1. X (Twitter) 판별
      if (hostname.includes('twitter.com') || hostname === 'x.com' || hostname.endsWith('.x.com')) {
        if (pathname.length > 1 && !pathname.startsWith('/explore') && !pathname.startsWith('/search') && !pathname.startsWith('/home')) {
          if (status === 404) {
            return {
              statusType: 'account_dead',
              badgeClass: 'badge-account_dead',
              badgeText: '🔴 X 계정/게시물 없음',
              reason: 'X (트위터) 계정 또는 트윗이 삭제되었습니다 (HTTP 404)'
            };
          }

          // A. 진짜 정지/차단된 계정: 명시적 정지 안내 문구 검사
          const isSuspended =
            bodyText.includes('Account suspended') ||
            bodyText.includes('X suspends accounts') ||
            bodyText.includes('계정이 일시 정지되었습니다') ||
            bodyText.includes('계정이 정지되었습니다') ||
            bodyText.includes('운영원칙을 위반한 계정을 일시 정지') ||
            bodyText.includes('운영원칙을 위반한 계정은 정지') ||
            bodyText.includes('アカウントは凍結されています') ||
            bodyText.includes('账号已被冻结');

          if (isSuspended) {
            return {
              statusType: 'account_dead',
              badgeClass: 'badge-account_dead',
              badgeText: '🔴 X 계정 정지/차단',
              reason: '운영원칙 위반 등으로 정지/차단된 X 계정입니다.'
            };
          }

          // B. 존재하지 않거나 탈퇴/삭제된 계정
          const isNotExist =
            bodyText.includes('This account doesn’t exist') ||
            bodyText.includes("This account doesn't exist") ||
            bodyText.includes('존재하지 않는 계정') ||
            bodyText.includes('이 계정은 존재하지 않습니다') ||
            bodyText.includes('Hmm...this page doesn’t exist') ||
            bodyText.includes("Hmm...this page doesn't exist");

          if (isNotExist) {
            return {
              statusType: 'account_dead',
              badgeClass: 'badge-account_dead',
              badgeText: '🔴 X 계정 없음',
              reason: '계정이 탈퇴/삭제되었거나 사용자명이 변경되었습니다.'
            };
          }

          // C. 일시적 활동 제한
          if (bodyText.includes('Caution: This account is temporarily restricted')) {
            return {
              statusType: 'warning',
              badgeClass: 'badge-warning',
              badgeText: '🟡 X 계정 일시제한',
              reason: '계정 활동이 일시적으로 제한되었습니다.'
            };
          }
        }
      }

      // 2. 인스타그램 (Instagram) 판별
      if (hostname.includes('instagram.com')) {
        if (pathname.length > 1 && !pathname.startsWith('/explore') && !pathname.startsWith('/accounts')) {
          if (status === 404) {
            return {
              statusType: 'account_dead',
              badgeClass: 'badge-account_dead',
              badgeText: '🔴 인스타그램 없음 (404)',
              reason: '인스타그램 계정 또는 게시물이 삭제되었습니다.'
            };
          }
          if (
            bodyText.includes("Sorry, this page isn't available") ||
            bodyText.includes('페이지를 사용할 수 없습니다') ||
            bodyText.includes('The link you followed may be broken') ||
            bodyText.includes('Page Not Found &bull; Instagram')
          ) {
            return {
              statusType: 'account_dead',
              badgeClass: 'badge-account_dead',
              badgeText: '🔴 인스타 삭제/차단',
              reason: '페이지를 찾을 수 없거나 계정이 삭제/비활성화되었습니다.'
            };
          }
        }
      }

      // 3. 네이버 블로그 판별
      if (hostname === 'blog.naver.com' || hostname === 'm.blog.naver.com') {
        if (status === 404) {
          return {
            statusType: 'blog_dead',
            badgeClass: 'badge-blog_dead',
            badgeText: '🔴 네이버 블로그 없음 (404)',
            reason: '블로그 주소를 찾을 수 없습니다.'
          };
        }
        if (bodyText.includes('블로그가 존재하지 않습니다') || bodyText.includes('존재하지 않는 블로그입니다')) {
          return {
            statusType: 'blog_dead',
            badgeClass: 'badge-blog_dead',
            badgeText: '🔴 네이버 블로그 없음',
            reason: '존재하지 않는 블로그이거나 탈퇴된 계정입니다.'
          };
        }
        if (bodyText.includes('서비스 이용이 제한되었습니다')) {
          return {
            statusType: 'blog_dead',
            badgeClass: 'badge-blog_dead',
            badgeText: '🔴 네이버 블로그 정지',
            reason: '운영원칙 위반 등으로 서비스 이용이 제한된 블로그입니다.'
          };
        }
        if (bodyText.includes('비공개 블로그입니다')) {
          return {
            statusType: 'blog_dead',
            badgeClass: 'badge-blog_dead',
            badgeText: '🔴 네이버 비공개 블로그',
            reason: '관리자에 의해 비공개로 전환된 블로그입니다.'
          };
        }
        if (
          bodyText.includes('삭제되었거나 존재하지 않는 게시물입니다') ||
          bodyText.includes('존재하지 않는 글입니다') ||
          bodyText.includes('삭제된 글입니다')
        ) {
          return {
            statusType: 'blog_dead',
            badgeClass: 'badge-blog_dead',
            badgeText: '🔴 네이버 글 삭제됨',
            reason: '해당 게시물이 삭제되었거나 이동되었습니다.'
          };
        }
      }

      // 4. 티스토리 (Tistory) 판별
      if (hostname.endsWith('.tistory.com')) {
        if (status === 404) {
          return {
            statusType: 'blog_dead',
            badgeClass: 'badge-blog_dead',
            badgeText: '🔴 티스토리 글/블로그 없음',
            reason: '존재하지 않는 티스토리 페이지입니다 (HTTP 404)'
          };
        }
        if (bodyText.includes('존재하지 않는 페이지입니다') || bodyText.includes('블로그가 존재하지 않거나')) {
          return {
            statusType: 'blog_dead',
            badgeClass: 'badge-blog_dead',
            badgeText: '🔴 티스토리 없음',
            reason: '존재하지 않거나 삭제된 티스토리 블로그/글입니다.'
          };
        }
        if (bodyText.includes('접근이 제한된 블로그입니다')) {
          return {
            statusType: 'blog_dead',
            badgeClass: 'badge-blog_dead',
            badgeText: '🔴 티스토리 접근제한',
            reason: '접근이 제한된 티스토리 블로그입니다.'
          };
        }
      }

      // 5. 벨로그 (Velog) 판별
      if (hostname === 'velog.io') {
        if (status === 404 || bodyText.includes('페이지를 찾을 수 없습니다')) {
          return {
            statusType: 'blog_dead',
            badgeClass: 'badge-blog_dead',
            badgeText: '🔴 벨로그 글/계정 없음',
            reason: '존재하지 않거나 삭제된 벨로그 글입니다.'
          };
        }
      }

      // 6. 유튜브 (YouTube) 판별
      if (hostname.includes('youtube.com') || hostname === 'youtu.be') {
        if (status === 404) {
          return {
            statusType: 'account_dead',
            badgeClass: 'badge-account_dead',
            badgeText: '🔴 유튜브 영상/채널 없음',
            reason: '동영상 또는 채널이 존재하지 않습니다 (HTTP 404)'
          };
        }
        if (bodyText.includes('동영상을 재생할 수 없음') || bodyText.includes('Video unavailable')) {
          return {
            statusType: 'account_dead',
            badgeClass: 'badge-account_dead',
            badgeText: '🔴 유튜브 영상 불가',
            reason: '동영상이 삭제되었거나 제공되지 않습니다.'
          };
        }
        if (bodyText.includes('비공개 동영상') || bodyText.includes('Private video')) {
          return {
            statusType: 'account_dead',
            badgeClass: 'badge-account_dead',
            badgeText: '🔴 유튜브 비공개 영상',
            reason: '비공개 동영상입니다.'
          };
        }
        if (bodyText.includes('계정이 해지되었습니다') || bodyText.includes('This account has been terminated')) {
          return {
            statusType: 'account_dead',
            badgeClass: 'badge-account_dead',
            badgeText: '🔴 유튜브 계정 해지',
            reason: '가이드 위반 등으로 계정이 해지되었습니다.'
          };
        }
        if (bodyText.includes('채널이 존재하지 않습니다') || bodyText.includes("This page isn't available")) {
          return {
            statusType: 'account_dead',
            badgeClass: 'badge-account_dead',
            badgeText: '🔴 유튜브 채널 없음',
            reason: '존재하지 않는 채널/페이지입니다.'
          };
        }
      }

      // 7. 일반 웹사이트 상태 코드 판별
      if (status === 404) {
        // A. SPA 프레임워크(Nuxt, Next.js 등) 및 클라이언트 리다이렉트 감지
        // (구 주소이지만 브라우저 접속 시 새 주소로 자동 이동되는 정상 서비스)
        const fullCheckText = bodyText + tailText;
        const isSpa =
          fullCheckText.includes('__NUXT__') ||
          fullCheckText.includes('__NUXT_DATA__') ||
          fullCheckText.includes('_nuxt/') ||
          fullCheckText.includes('__NEXT_DATA__') ||
          fullCheckText.includes('/_next/') ||
          fullCheckText.includes('data-reactroot');

        const hasClientRedirect =
          /<meta[^>]*http-equiv=["']?refresh["']?/i.test(fullCheckText) ||
          /location\.(href|replace|assign)\s*=/i.test(fullCheckText);

        if (isSpa || hasClientRedirect) {
          return {
            statusType: 'ok',
            badgeClass: 'badge-ok',
            badgeText: '🟢 정상 (자동 이동)',
            reason: '구 주소이지만 브라우저 접속 시 새 주소로 자동 이동되는 정상 사이트입니다 (SPA)'
          };
        }

        // B. 진짜 죽은 404 페이지
        return {
          statusType: 'dead',
          badgeClass: 'badge-dead',
          badgeText: '🔴 404 Not Found',
          reason: '웹페이지를 찾을 수 없습니다 (404 Not Found)'
        };
      }
      if (status === 410) {
        return {
          statusType: 'dead',
          badgeClass: 'badge-dead',
          badgeText: '🔴 410 Gone',
          reason: '영구적으로 삭제된 페이지입니다 (410 Gone)'
        };
      }
      if (status >= 500) {
        return {
          statusType: 'warning',
          badgeClass: 'badge-warning',
          badgeText: `🟡 서버 오류 (${status})`,
          reason: `웹사이트 서버 오류 응답 (HTTP ${status})`
        };
      }
      if (status === 401) {
        // HTTP Basic Auth / 로그인 팝업이 뜨는 정상 보안 사이트
        return {
          statusType: 'ok',
          badgeClass: 'badge-ok',
          badgeText: '🟢 정상 (로그인 인증)',
          reason: '아이디/비밀번호 입력 팝업(Basic Auth)이 정상적으로 뜨는 보안 인증 사이트입니다 (HTTP 401)'
        };
      }
      if (status === 403) {
        return {
          statusType: 'warning',
          badgeClass: 'badge-warning',
          badgeText: '🟡 접근 제한 (403)',
          reason: '접근 권한이 없거나 로그인이 필요합니다 (403 Forbidden)'
        };
      }
      if (status >= 400) {
        return {
          statusType: 'dead',
          badgeClass: 'badge-dead',
          badgeText: `🔴 오류 (${status})`,
          reason: `클라이언트 요청 오류 (HTTP ${status})`
        };
      }

      // 정상
      return {
        statusType: 'ok',
        badgeClass: 'badge-ok',
        badgeText: '🟢 정상 접속',
        reason: '정상 작동 중 (HTTP 200 OK)'
      };

    } catch (err) {
      clearTimeout(timeoutId);

      const errName = err.name || '';
      const errMsg = err.message || '';

      if (errName === 'AbortError' || errMsg.includes('abort') || errMsg.includes('timeout')) {
        return {
          statusType: 'dead',
          badgeClass: 'badge-dead',
          badgeText: '🔴 응답 시간 초과',
          reason: `서버가 ${this.timeoutMs / 1000}초 이상 응답하지 않음 (사이트 다운)`
        };
      }

      return {
        statusType: 'dead',
        badgeClass: 'badge-dead',
        badgeText: '🔴 사이트 접속 불가',
        reason: '서버 연결 실패 (도메인 만료, DNS 오류 또는 서버 다운)'
      };
    }
  }

  getFilteredBookmarks() {
    // 1. 'deleted' 탭일 때는 deletedBookmarks 배열 반환
    if (this.activeTab === 'deleted') {
      return this.deletedBookmarks.filter(item => {
        if (this.searchKeyword) {
          const matchesTitle = item.title.toLowerCase().includes(this.searchKeyword);
          const matchesUrl = item.url.toLowerCase().includes(this.searchKeyword);
          const badgeText = (item.res?.badgeText || '').toLowerCase();
          const reasonText = (item.res?.reason || '').toLowerCase();
          if (!matchesTitle && !matchesUrl && !badgeText.includes(this.searchKeyword) && !reasonText.includes(this.searchKeyword)) {
            return false;
          }
        }
        return true;
      });
    }

    // 2. 그 외 탭에서는 현재 살아있는 북마크(this.bookmarks)만 필터링
    return this.bookmarks.filter(item => {
      const res = this.results.get(item.id);

      // 검색어 필터 (제목, URL, 진단 결과 및 에러 내용 검색)
      if (this.searchKeyword) {
        const matchesTitle = item.title.toLowerCase().includes(this.searchKeyword);
        const matchesUrl = item.url.toLowerCase().includes(this.searchKeyword);
        const badgeText = res ? (res.badgeText || '').toLowerCase() : '';
        const reasonText = res ? (res.reason || '').toLowerCase() : '';
        const statusType = res ? (res.statusType || '').toLowerCase() : '';
        const matchesError = badgeText.includes(this.searchKeyword) ||
                             reasonText.includes(this.searchKeyword) ||
                             statusType.includes(this.searchKeyword);
        if (!matchesTitle && !matchesUrl && !matchesError) return false;
      }

      // 탭 필터
      if (this.activeTab === 'all') {
        return true;
      }
      if (this.activeTab === 'issues') {
        return res && ['dead', 'account_dead', 'blog_dead'].includes(res.statusType);
      }
      if (this.activeTab === 'warning') {
        return res && res.statusType === 'warning';
      }
      if (this.activeTab === 'ok') {
        return res && res.statusType === 'ok';
      }

      return true;
    });
  }

  renderTable() {
    const list = this.getFilteredBookmarks();

    if (list.length === 0) {
      let emptyMsg = '표시할 북마크가 없습니다.';
      if (this.activeTab === 'issues') {
        emptyMsg = this.isScanning
          ? '검사 중입니다. 문제가 발견되면 여기에 표시됩니다.'
          : (this.stats.issues === 0 && this.stats.ok > 0)
            ? '축하합니다! 발견된 죽은 사이트나 차단된 계정이 없습니다.'
            : '검사를 시작해주세요.';
      } else if (this.activeTab === 'deleted') {
        emptyMsg = '삭제된 북마크가 없습니다.';
      }

      this.tableBody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <div class="empty-state-icon">📂</div>
              <div class="empty-state-title">${emptyMsg}</div>
            </div>
          </td>
        </tr>
      `;
      this.selectAllCheckbox.checked = false;
      return;
    }

    let html = '';
    for (const item of list) {
      const res = this.results.get(item.id) || item.res;
      const isSelected = this.selectedIds.has(item.id);

      let badgeHtml = '<span class="badge badge-pending">⏳ 대기 중</span>';
      let reasonHtml = '<span class="reason-text">검사 대기 중...</span>';
      let rowClass = '';

      if (res) {
        if (res.deleted) {
          badgeHtml = '<span class="badge badge-deleted">🗑️ 삭제 완료</span>';
          reasonHtml = '<span class="reason-text">즐겨찾기에서 삭제되었습니다.</span>';
          rowClass = 'opacity: 0.6;';
        } else {
          badgeHtml = `<span class="badge ${res.badgeClass}">${res.badgeText}</span>`;
          const isDanger = ['dead', 'account_dead', 'blog_dead'].includes(res.statusType);
          const isWarning = res.statusType === 'warning';
          const reasonClass = isDanger ? 'danger' : (isWarning ? 'warning' : '');
          reasonHtml = `<span class="reason-text ${reasonClass}">${res.reason}</span>`;
        }
      }

      const isDeleted = res && res.deleted;

      html += `
        <tr data-id="${item.id}" style="${rowClass}">
          <td class="td-checkbox">
            <input type="checkbox" class="checkbox item-checkbox" data-id="${item.id}" ${isSelected ? 'checked' : ''} ${isDeleted ? 'disabled' : ''}>
          </td>
          <td>${badgeHtml}</td>
          <td>
            <div class="bookmark-meta">
              <div class="bookmark-title" title="${this.escapeHtml(item.title)}">${this.escapeHtml(item.title)}</div>
              <div class="bookmark-path" title="${this.escapeHtml(item.folderPath)}">📁 ${this.escapeHtml(item.folderPath)}</div>
            </div>
          </td>
          <td>
            <a href="${this.escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="bookmark-url" title="${this.escapeHtml(item.url)}">
              <span>${this.escapeHtml(item.url)}</span>
              <span>↗</span>
            </a>
          </td>
          <td>${reasonHtml}</td>
          <td style="text-align: center;">
            <button class="btn-delete-row" data-id="${item.id}" ${isDeleted ? 'disabled' : ''}>
              ${isDeleted ? '삭제됨' : '삭제'}
            </button>
          </td>
        </tr>
      `;
    }

    this.tableBody.innerHTML = html;

    // 이벤트 리스너 바인딩
    this.tableBody.querySelectorAll('.item-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) {
          this.selectedIds.add(id);
        } else {
          this.selectedIds.delete(id);
        }
        this.updateSelectedCounter();
      });
    });

    this.tableBody.querySelectorAll('.btn-delete-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        this.deleteSingleBookmark(id);
      });
    });

    // 전체 선택 체크박스 상태 동기화
    const selectable = list.filter(item => {
      const res = this.results.get(item.id);
      return !res || !res.deleted;
    });
    this.selectAllCheckbox.checked = selectable.length > 0 && selectable.every(item => this.selectedIds.has(item.id));
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  selectAllByStatus(isChecked, statusTypes) {
    for (const item of this.bookmarks) {
      const res = this.results.get(item.id);
      if (res && !res.deleted && statusTypes.includes(res.statusType)) {
        if (isChecked) {
          this.selectedIds.add(item.id);
        } else {
          this.selectedIds.delete(item.id);
        }
      }
    }
    this.updateSelectedCounter();
    this.renderTable();
  }

  selectVisibleItems(isChecked) {
    const list = this.getFilteredBookmarks();
    for (const item of list) {
      const res = this.results.get(item.id);
      if (!res || !res.deleted) {
        if (isChecked) {
          this.selectedIds.add(item.id);
        } else {
          this.selectedIds.delete(item.id);
        }
      }
    }
    this.updateSelectedCounter();
    this.renderTable();
  }

  /**
   * 단일 북마크 삭제
   */
  async deleteSingleBookmark(id) {
    const item = this.bookmarks.find(b => b.id === id);
    const title = item ? item.title : '선택한 북마크';

    if (!confirm(`"${title}" 북마크를 정말 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await chrome.bookmarks.remove(id);
      const res = this.results.get(id) || { statusType: 'deleted', badgeClass: 'badge-deleted', badgeText: '🗑️ 삭제 완료', reason: '즐겨찾기에서 삭제되었습니다.' };
      res.deleted = true;

      if (item) {
        this.deletedBookmarks.push({ ...item, res });
      }
      this.bookmarks = this.bookmarks.filter(b => b.id !== id);
      this.results.delete(id);
      this.selectedIds.delete(id);

      this.showToast('북마크가 삭제되었습니다.');
      this.updateStats();
      this.renderTable();
    } catch (err) {
      console.error('북마크 삭제 실패:', err);
      this.showToast('북마크 삭제에 실패했습니다: ' + err.message);
    }
  }

  /**
   * 선택 항목 일괄 삭제
   */
  async deleteSelected() {
    const count = this.selectedIds.size;
    if (count === 0) return;

    const ok = confirm(`선택한 ${count}개의 북마크를 정말 삭제하시겠습니까?\n\n* 삭제된 북마크는 되돌릴 수 없습니다.\n* 삭제 전 상단의 [💾 북마크 백업]을 권장합니다.`);
    if (!ok) return;

    let deletedCount = 0;
    const ids = Array.from(this.selectedIds);

    for (const id of ids) {
      try {
        await chrome.bookmarks.remove(id);
        const item = this.bookmarks.find(b => b.id === id);
        const res = this.results.get(id) || { statusType: 'deleted', badgeClass: 'badge-deleted', badgeText: '🗑️ 삭제 완료', reason: '즐겨찾기에서 삭제되었습니다.' };
        res.deleted = true;
        if (item) {
          this.deletedBookmarks.push({ ...item, res });
        }
        this.results.delete(id);
        this.selectedIds.delete(id);
        deletedCount++;
      } catch (err) {
        console.error(`북마크(${id}) 삭제 실패:`, err);
      }
    }

    const deletedIdSet = new Set(ids);
    this.bookmarks = this.bookmarks.filter(b => !deletedIdSet.has(b.id));

    this.showToast(`${deletedCount}개의 북마크가 삭제되었습니다.`);
    this.selectAllIssues.checked = false;
    this.selectAllCheckbox.checked = false;
    this.updateStats();
    this.renderTable();
  }

  /**
   * 북마크를 Netscape Bookmark HTML 형식으로 안전하게 백업 파일 내보내기
   */
  async exportBackup() {
    try {
      const tree = await chrome.bookmarks.getTree();

      let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;

      const generateNodeHtml = (node, indent = '    ') => {
        let nodeStr = '';
        if (node.url) {
          const addDate = node.dateAdded ? Math.floor(node.dateAdded / 1000) : Math.floor(Date.now() / 1000);
          nodeStr += `${indent}<DT><A HREF="${this.escapeHtml(node.url)}" ADD_DATE="${addDate}">${this.escapeHtml(node.title || '')}</A>\n`;
        } else if (node.children) {
          if (node.title) {
            const addDate = node.dateAdded ? Math.floor(node.dateAdded / 1000) : Math.floor(Date.now() / 1000);
            nodeStr += `${indent}<DT><H3 ADD_DATE="${addDate}">${this.escapeHtml(node.title)}</H3>\n`;
            nodeStr += `${indent}<DL><p>\n`;
            for (const child of node.children) {
              nodeStr += generateNodeHtml(child, indent + '    ');
            }
            nodeStr += `${indent}</DL><p>\n`;
          } else {
            for (const child of node.children) {
              nodeStr += generateNodeHtml(child, indent);
            }
          }
        }
        return nodeStr;
      };

      for (const root of tree) {
        html += generateNodeHtml(root);
      }

      html += '</DL><p>\n';

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `bookmarks_backup_${dateStr}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showToast('북마크 백업 파일(.html)이 다운로드되었습니다.');
    } catch (err) {
      console.error('백업 실패:', err);
      this.showToast('북마크 백업 생성 중 오류가 발생했습니다.');
    }
  }
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  new BookmarkCleaner();
});

