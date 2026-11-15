# Antigravity (Gemini) Rules for Chrome Extension Development

이 문서는 크롬 확장 프로그램 개발 및 타겟 웹사이트의 동작(DOM, JS)을 우회/수정할 때 발생할 수 있는 시행착오와 부작용을 방지하기 위한 절대 원칙입니다. **Antigravity(Gemini)는 코드를 작성하거나 수정할 때 다음 원칙을 반드시 준수해야 하며, 새로운 문제나 피드백이 발생할 때마다 이 문서를 스스로 갱신해야 합니다.**

---

## 0. 자기 학습 및 규칙 자동 갱신 원칙 (Self-Updating Rulebook) ★★★
**Antigravity(Gemini)는 새로운 시행착오를 겪거나 사용자의 피드백을 받을 때마다 스스로 이 문서를 최신 상태로 업데이트해야 합니다.**

- **[실수 및 피드백 즉시 기록]**: 사용자의 버그 제보, 지적, 부작용(사이드 이펙트) 피드백이 있거나, 새로운 사이트의 방어 기제를 해결하면서 새로운 패턴/주의사항을 발견한 경우, **해당 턴에서 코드 수정을 완료한 즉시 이 문서(`gemini.md`)를 열어 새로운 원칙이나 금기 사항을 스스로 추가/수정**하세요.
- **[원인과 해결책 명문화]**: 단순히 현상만 적지 말고, 무엇이 원인이었고(예: `:has` 선택자가 `.container`를 가림), 어떻게 방지해야 하는지(예: 광고 본체만 직접 타겟팅) 구체적인 규칙을 문서화하세요.
- **[작업 완료 전 자가 점검 (Self-Audit)]**: 작업 후 코드가 이 문서에 정의된 원칙들(도메인 격리, `:has` 금지, 안전 가드, 문법 검증 등)을 준수했는지 반드시 재검토한 후 최종 완료 보고를 제출하세요.

---

## 1. 사이트별 특화 및 스코프 격리 원칙 (일반론 적용 금지) ★★★
**공통 스크립트(`<all_urls>`)나 공통 CSS에 특정 사이트용 차단/우회 로직을 일반론(General)으로 적용하지 마세요.** 특정 사이트의 광고를 막겠다고 만든 규칙이 다른 정상 사이트나 대상 사이트의 메인/목록 페이지 전체를 파괴하는 치명적인 사이드 이펙트를 유발합니다.

- **[도메인 격리 필수]**: 특정 사이트(mrjav, sextb, twidouga, swiftuploads 등)의 동작을 제어할 때는 반드시 도메인 검사(`if (currentHost.includes('target.com'))`) 블록 내부로 로직을 완전히 가두세요.
- **[CSS 격리]**: 사이트별 스타일은 공통 인젝션이 아니라 해당 사이트 플래그(`if (isTwidougaSite) { css += ... }`) 하위에서만 주입되도록 분리하세요.
- **[전역 속성 조작 격리]**: `window` 전역 객체 모킹, `sessionStorage`/`localStorage` 위조, `document.documentElement` 속성 조작 등은 해당 사이트가 아닌 다른 사이트(포털, 쇼핑몰, 일반 웹앱)의 정상 동작을 망칠 수 있으므로 반드시 타겟 도메인 안에서만 실행해야 합니다.

---

## 2. 광범위한 부모 은닉(`:has()`, `parentElement`) 절대 금지 ★★★
광고 박스를 감추려다 사이트의 메인 레이아웃 전체를 날려버리는 실수가 반복되지 않도록 다음 수칙을 엄수하세요.

- **[CSS `div:has(...)` 사용 금지]**:
  - `div:has(> [data-asg-ins])`, `div:has(a[href*="adspyglass"])`, `div:has(img[src*="xxx"])` 같은 선택자는 **절대 사용하지 마세요.**
  - 사이트의 최상위 메인 래퍼(`<div class="container">`, `<div id="root">`, `<div id="app">`)의 직계/하위 자식으로 배너나 링크가 위치한 경우, **페이지 전체가 `display: none !important`로 증발하여 백지 상태가 됩니다.**
  - **해결책**: 부모를 찾아서 숨기려 하지 말고, **광고 엘리먼트 본체 자체**(`[data-asg-ins]`, `[class*="native-widget"]`, `a[href*="xxx"]` 등)를 직접 지정하여 숨기세요.
- **[JS 부모 탐색 시 안전 가드 필수 (`removeAdWidgets` 등)]**:
  - 부모 노드를 거슬러 올라가며 광고 래퍼를 숨길 때는 `.container`, `.tray`, `#app`, `#root`, `#main`, `#content`, `main`, `section`, `article`, `header`, `nav`, `footer`, 플레이어 래퍼(`sextb-player` 등)는 **절대 부모 은닉 대상이 되어서는 안 됩니다.**
  - 부모의 텍스트가 풍부하거나(예: 80자 초과), 내부에 정상 컨텐츠(영상 카드, 헤딩, 네비게이션 등)를 포함하고 있다면 **즉시 탐색을 중단(`break`)**하여 본문 레이아웃을 보존해야 합니다.

---

## 3. 투명 오버레이 감지 시 정상 UI 및 미디어 보호
화면 전체를 덮는 클릭 가로채기 팝업 레이어를 무력화할 때, 게임/동영상/에뮬레이터/모달 화면이 오버레이로 오인되지 않도록 방어하세요.

- **[정상 UI 키워드 예외]**: `modal`, `backdrop`, `display`, `game`, `player`, `canvas`, `screen`, `viewer`, `stage`, `emulator`, `video`, `tray`, `container`, `navbar`, `header`, `footer` 등이 포함된 요소는 오버레이 무력화 대상에서 제외하세요.
- **[내부 미디어 태그 확인]**: 내부에 `canvas, video, audio, embed, object, svg, img` 등 실제 인터랙션이나 컨텐츠를 포함하고 있다면 투명 오버레이가 아니므로 건드리지 마세요.
- **[쇼핑몰/포털 보호]**: 네이버, 다음, 유튜브, 쿠팡 등 정상 사이트(`isSafeSite`)에서는 오버레이 범용 스캔 자체를 실행하지 마세요.

---

## 4. 사이트 스크립트 우회 시 주의사항 (MAIN World vs ISOLATED World)
크롬 확장 프로그램의 기본 Content Script는 **ISOLATED world**에서 실행됩니다. 따라서 페이지 내의 전역 변수(`window.xxx`)나 함수를 직접 수정해도 실제 웹페이지에는 반영되지 않습니다.

- **[잘못된 방법] Inline Script 주입 금지**: `document.createElement('script')` 후 `script.textContent = '...'`로 코드를 주입하는 방식은 피하세요. 최신 웹사이트들은 **CSP (Content-Security-Policy)** 설정으로 인해 `unsafe-inline` 스크립트 실행을 조용히 차단하므로 원인 분석이 매우 어려워집니다.
- **[올바른 방법] Manifest V3의 `"world": "MAIN"` 사용**: 페이지의 자바스크립트 환경에 직접 개입해야 한다면, `manifest.json`의 `content_scripts` 선언부에 `"world": "MAIN"` 옵션을 추가한 전용 js 파일(`mrjavOverride.js` 등)을 만들어 주입하세요. CSP 제약을 우회하면서도 `document_start` 시점에 안전하고 확실하게 코드를 메인 컨텍스트에서 실행할 수 있습니다.

---

## 5. 지역 변수(IIFE/Closure) 한계 극복 (Global API Hooking)
목표 웹사이트의 로직이 즉시실행함수(IIFE) 내부에 갇혀 있는 경우 (예: `(function(){ var AD_SECONDS = 5; })()`), 외부에서 `window.AD_SECONDS = 0;` 이나 `Object.defineProperty`를 사용해 값을 덮어쓸 수 없습니다.

- **해결책 (Global API Hooking)**: 변수 자체를 건드리기보다는 해당 변수를 사용하는 **전역 함수(Global API)를 가로채는(Hooking) 방식**을 사용해야 합니다.
- **예시 (타이머 무력화)**: 대기 시간이 지역 변수에 갇혀 있다면, MAIN world에서 `window.setInterval`이나 `window.setTimeout`을 오버라이드하세요. 콜백 함수(fn)의 내용을 `toString()`으로 검사한 뒤, 타겟 함수일 경우 delay 값을 강제로 10ms 등으로 줄여버리면 대기 시간을 효과적으로 무력화할 수 있습니다.

---

## 6. 전역 DOM 코어 메서드 임의 변조 지양
- `Element.prototype.getAttribute`, `hasAttribute` 같은 브라우저 표준 DOM 코어 메서드를 전역적으로 변조하여 임의의 값을 반환하게 만들지 마세요.
- 프레임워크(React, Vue, jQuery, LazyLoad, Postscribe 등)가 속성을 정상적으로 읽지 못해 예기치 못한 스크립트 크래시를 유발합니다.
- 광고 차단은 가급적 `rules.json`(네트워크 레벨 차단)이나 전역 광고 객체 스텁(Proxy 모킹)으로 처리하고, 코어 프로토타입 변조는 극도로 제한된 상황에서만 신중하게 사용하세요.

---

## 7. 코드 수정 (Replace) 시 문법 훼손 주의
- 코드를 교체하거나 삭제할 때 중괄호(`{`, `}`)나 제어문(`if`)이 짝이 맞지 않게 삭제되지 않도록 컨텍스트를 반드시 두 번 확인하세요.
- 스크립트 덩어리를 삭제하다가 윗줄에 있던 `if (...) {` 블록의 시작점까지 날려버려 Syntax Error가 발생하는 일이 없도록 편집 후 반드시 문법 유효성 검증(Node.js vm 실행 등)을 거치세요.

---

## 8. 동영상 스트리밍 사이트 투명 클릭재킹 및 팝언더 차단 원칙
- `sextb.net` 및 3rd-party 임베드 플레이어(`hglink.to`, `hanerix.com` 등)는 화면 전체에 `z-index: 9999999` 투명 div를 얹고 `window.open`을 호출하여 강제 광고 팝업을 유발함.
- **방어 기제**:
  1. MAIN world(`mrjavOverride.js`)에서 해당 패밀리 도메인에 한해 `window.open`을 무력화하여 새 탭 팝업을 원천 차단할 것.
  2. 광고 초기화 함수(`window.pickDirect`, `window.uas = []`)를 사전 스텁 처리하고, DOM 내 투명 오버레이 레이어(`__directlink` 등)를 탐지 즉시 제거할 것.
