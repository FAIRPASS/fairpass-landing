// ========================================
// FAIRPASS Landing Page — JavaScript
// ========================================

(function () {
  "use strict";

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

  // ============================
  // 1. SCROLL FADE-UP ANIMATION
  // ============================
  const fadeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          fadeObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  $$(".fade-up").forEach((el) => fadeObserver.observe(el));

  // ============================
  // 2. NAVIGATION
  // ============================
  const nav = $("#nav");
  const navToggle = $("#navToggle");
  const navLinks = $("#navLinks");

  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 60);
  });

  if (navToggle) {
    navToggle.addEventListener("click", () => {
      navToggle.classList.toggle("open");
      navLinks.classList.toggle("open");
    });
  }

  // Close mobile nav on link click
  $$(".nav-link:not(.nav-link--dropdown)").forEach((link) => {
    link.addEventListener("click", () => {
      if (navToggle) {
        navToggle.classList.remove("open");
        navLinks.classList.remove("open");
      }
    });
  });

  // ============================
  // 3. DROPDOWN MENU
  // ============================
  const dropdownBtn = $("#navDropdownBtn");
  const dropdown = dropdownBtn ? dropdownBtn.closest(".nav-dropdown") : null;

  if (dropdownBtn && dropdown) {
    dropdownBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("open");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove("open");
      }
    });

    // Close dropdown on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        dropdown.classList.remove("open");
      }
    });
  }

  // ============================
  // 4. TRUST BAR COUNTER ANIMATION
  // ============================
  const trustBar = $("#trustBar");
  const counters = $$(".counter");
  let counterAnimated = false;

  if (trustBar && counters.length) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !counterAnimated) {
            counterAnimated = true;
            animateCounters();
          }
        });
      },
      { threshold: 0.3 }
    );
    counterObserver.observe(trustBar);
  }

  function animateCounters() {
    counters.forEach((el, idx) => {
      const target = parseFloat(el.dataset.target);
      const suffix = el.dataset.suffix || "";
      const hasDecimal = el.dataset.decimal ? parseInt(el.dataset.decimal, 10) : 0;
      const useComma = el.dataset.format === "comma";
      const duration = 1800;
      const startTime = performance.now() + idx * 120;

      function update(now) {
        const elapsed = now - startTime;
        if (elapsed < 0) { requestAnimationFrame(update); return; }
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        let current = eased * target;

        if (hasDecimal > 0) {
          current = current.toFixed(hasDecimal);
        } else {
          current = Math.round(current);
        }

        if (useComma) {
          current = Number(current).toLocaleString();
        }

        el.textContent = current + suffix;
        if (progress < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
    });
  }

  // ============================
  // 5. FLOATING DOCK
  // ============================
  const dock = $("#dock");
  const hero = $("#hero");

  function checkDock() {
    if (!hero || !dock) return;
    const heroBottom = hero.getBoundingClientRect().bottom;
    dock.classList.toggle("visible", heroBottom < 0);
  }
  window.addEventListener("scroll", checkDock);
  checkDock();

  // ============================
  // 5. FLOW ANIMATION
  // ============================
  const flowWrapper = $(".flow-wrapper");
  const flowSteps = $$(".flow-step");
  const flowLineFill = $("#flowLineFill");
  let flowAnimated = false;

  const flowObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !flowAnimated) {
          flowAnimated = true;
          animateFlow();
        }
      });
    },
    { threshold: 0.4 }
  );
  if (flowWrapper) flowObserver.observe(flowWrapper);

  function animateFlow() {
    flowSteps.forEach((step, i) => {
      setTimeout(() => {
        step.classList.add("active");
        const pct = ((i + 1) / flowSteps.length) * 100;
        if (flowLineFill) flowLineFill.style.width = pct + "%";
      }, i * 400);
    });
  }

  // ============================
  // 6. QUOTE CALCULATOR
  // ============================
  const PRICING = {
    currencySymbol: "\u20A9",
    // #1 솔루션 사용료 (참가자수 구간별)
    solutionTiers: [
      { max: 300, price: 399000 },
      { max: 1000, price: 599000 },
      { max: 10000, price: 1590000 },
      { max: 30000, price: 1990000 },
      { max: 50000, price: 2590000 },
    ],
    // #2 종이명찰 단가 (일반형 중, 기본)
    badgeUnit: 1500,
    // #5 키오스크 단가 (1대/1일)
    kioskPerUnitPerDay: 100000,
    // 설치/철거 매니저 인건비
    installFee: { oneDay: 300000, multiDay: 600000 },
    // 목걸이줄 단가
    lanyardUnit: 500,
    // 매니저 인건비 (1인/1일)
    managerDailyPay: 300000,
    // #6 운송비 & #7 매니저 출장비 (지역별)
    regions: {
      seoul:      { shipping: 200000, bizTrip: 0 },
      incheon:    { shipping: 300000, bizTrip: 150000 },
      suwon:      { shipping: 300000, bizTrip: 150000 },
      pyeongtaek: { shipping: 400000, bizTrip: 150000 },
      sejong:     { shipping: 400000, bizTrip: 150000 },
      daejeon:    { shipping: 400000, bizTrip: 150000 },
      cheongju:   { shipping: 400000, bizTrip: 150000 },
      hongseong:  { shipping: 500000, bizTrip: 150000 },
      chuncheon:  { shipping: 400000, bizTrip: 150000 },
      hongcheon:  { shipping: 500000, bizTrip: 150000 },
      sokcho:     { shipping: 600000, bizTrip: 150000 },
      gwangju:    { shipping: 700000, bizTrip: 150000 },
      jeonju:     { shipping: 600000, bizTrip: 150000 },
      muan:       { shipping: 800000, bizTrip: 150000 },
      daegu:      { shipping: 700000, bizTrip: 150000 },
      busan:      { shipping: 800000, bizTrip: 150000 },
      ulsan:      { shipping: 800000, bizTrip: 150000 },
      changwon:   { shipping: 800000, bizTrip: 150000 },
      gyeongju:   { shipping: 800000, bizTrip: 150000 },
      andong:     { shipping: 600000, bizTrip: 150000 },
      jeju:       { shipping: 1200000, bizTrip: 200000 },
    },
    // 기술료율
    techFeeRate: 0.10,
    // 부가가치세율
    vatRate: 0.10,
    // 패키지 구성
    packageAdjust: {
      platform_only: { badgeIncluded: false, kioskIncluded: false },
      platform_badge: { badgeIncluded: true, kioskIncluded: false },
      platform_kiosk_badge: { badgeIncluded: true, kioskIncluded: true },
    },
    // #4 키오스크 자동 제안 대수
    kioskRecommend: {
      oneDay: [
        { max: 100, units: 2 }, { max: 200, units: 2 }, { max: 300, units: 3 },
        { max: 800, units: 8 }, { max: 1000, units: 9 }, { max: Infinity, units: 12 },
      ],
      multiDay: [
        { max: 100, units: 2 }, { max: 200, units: 2 }, { max: 300, units: 3 },
        { max: 800, units: 4 }, { max: 1000, units: 6 }, { max: Infinity, units: 10 },
      ],
    },
  };

  const quoteForm = $("#quoteForm");

  if (quoteForm) {
    function toInt(value, fallback) {
      const n = parseInt(value, 10);
      return Number.isFinite(n) ? n : (fallback || 0);
    }

    function formatKRW(amount) {
      const sign = amount < 0 ? "-" : "";
      const abs = Math.abs(Math.round(amount));
      return sign + PRICING.currencySymbol + abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function getSelectedPackage() {
      const pkg = quoteForm.querySelector('input[name="package"]:checked');
      return pkg ? pkg.value : "platform_only";
    }

    function packageLabel(key) {
      const labels = {
        platform_only: "플랫폼만 사용",
        platform_badge: "플랫폼 + 종이명찰",
        platform_kiosk_badge: "플랫폼 + 키오스크 + 명찰",
      };
      return labels[key] || key;
    }

    function escapeHTML(s) {
      const div = document.createElement("div");
      div.textContent = s;
      return div.innerHTML;
    }

    function getRecommendedKiosks(attendees, days) {
      var table = days === 1 ? PRICING.kioskRecommend.oneDay : PRICING.kioskRecommend.multiDay;
      for (var i = 0; i < table.length; i++) {
        if (attendees <= table[i].max) return table[i].units;
      }
      return 2;
    }

    function getSolutionPrice(attendees) {
      for (var i = 0; i < PRICING.solutionTiers.length; i++) {
        if (attendees <= PRICING.solutionTiers[i].max) return PRICING.solutionTiers[i].price;
      }
      return 0; // 50,000명 초과 — 협의
    }

    function getRegionLabel(key) {
      var sel = quoteForm.region;
      if (!sel) return key;
      for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === key) return sel.options[i].textContent;
      }
      return key;
    }

    var kioskQtyManuallySet = false;

    function syncKioskOptions() {
      var pkgKey = getSelectedPackage();
      var pkg = PRICING.packageAdjust[pkgKey];
      var el = $("#kioskOptions");
      if (el) el.hidden = !pkg.kioskIncluded;

      if (pkg.kioskIncluded) {
        var attendees = Math.max(1, toInt(quoteForm.attendees.value, 300));
        var _sd = quoteForm.eventStartDate ? new Date(quoteForm.eventStartDate.value) : null;
        var _ed = quoteForm.eventEndDate   ? new Date(quoteForm.eventEndDate.value)   : null;
        var days = (_sd && _ed && !isNaN(_sd) && !isNaN(_ed) && _ed >= _sd)
          ? Math.max(1, Math.round((_ed - _sd) / 86400000) + 1) : 1;
        var recommended = getRecommendedKiosks(attendees, days);
        var hint = $("#kioskRecommendHint");
        if (hint) hint.textContent = "100,000원/대/일 · 권장: " + recommended + "대";

        var sel = $("#kioskQtySelect");
        if (sel && !kioskQtyManuallySet) {
          sel.value = String(recommended);
        }
      }
    }

    var kioskQtySelect = $("#kioskQtySelect");
    if (kioskQtySelect) {
      kioskQtySelect.addEventListener("change", function () {
        kioskQtyManuallySet = true;
      });
    }

    // 참가자수/일수 변경 시 추천값으로 리셋
    if (quoteForm.attendees) {
      quoteForm.attendees.addEventListener("input", function () { kioskQtyManuallySet = false; });
    }
    if (quoteForm.eventStartDate) {
      quoteForm.eventStartDate.addEventListener("change", function () { kioskQtyManuallySet = false; });
    }
    if (quoteForm.eventEndDate) {
      quoteForm.eventEndDate.addEventListener("change", function () { kioskQtyManuallySet = false; });
    }
    // 패키지 변경 시에도 리셋
    $$('input[name="package"]', quoteForm).forEach(function (radio) {
      radio.addEventListener("change", function () { kioskQtyManuallySet = false; });
    });

    function calculate() {
      const attendees = Math.max(1, toInt(quoteForm.attendees.value, 300));

      // 날짜 범위로 운영일수 계산
      var eventStartDate = quoteForm.eventStartDate ? quoteForm.eventStartDate.value : "";
      var eventEndDate   = quoteForm.eventEndDate   ? quoteForm.eventEndDate.value   : "";
      var days = 1;
      if (eventStartDate && eventEndDate) {
        var sd = new Date(eventStartDate), ed = new Date(eventEndDate);
        if (!isNaN(sd) && !isNaN(ed) && ed >= sd) {
          days = Math.round((ed - sd) / 86400000) + 1;
        }
      }
      days = Math.max(1, days);

      const pkgKey = getSelectedPackage();
      const pkg = PRICING.packageAdjust[pkgKey];

      const contactName  = quoteForm.contactName  ? quoteForm.contactName.value.trim()  : "";
      const contactOrg   = quoteForm.contactOrg   ? quoteForm.contactOrg.value.trim()   : "";
      const eventName    = quoteForm.eventName    ? quoteForm.eventName.value.trim()    : "";
      const eventVenue   = quoteForm.eventVenue   ? quoteForm.eventVenue.value.trim()   : "";
      const installDate  = quoteForm.installDate  ? quoteForm.installDate.value         : "";
      const teardownDate = quoteForm.teardownDate ? quoteForm.teardownDate.value        : "";
      const regionKey = quoteForm.region ? quoteForm.region.value : "seoul";
      const regionData = PRICING.regions[regionKey] || PRICING.regions.seoul;
      const regionLabel = getRegionLabel(regionKey);

      // 명찰: 패키지에 포함 시 참가자 수와 동일
      const badgeQty = pkg.badgeIncluded ? attendees : 0;
      // 키오스크: 패키지에 포함 시 사용자 선택값 사용
      const kioskQty = pkg.kioskIncluded ? Math.max(1, toInt(quoteForm.kioskQty.value, getRecommendedKiosks(attendees, days))) : 0;
      // 매니저: 키오스크 포함 시에만
      const managerQty = pkg.kioskIncluded ? Math.max(0, toInt(quoteForm.managerQty.value, 1)) : 0;

      const items = [];
      let subtotal = 0;

      // I. 솔루션 사용료
      const solutionCost = getSolutionPrice(attendees);
      if (solutionCost > 0) {
        items.push({ label: "솔루션 사용료", cost: solutionCost });
        subtotal += solutionCost;
      } else {
        items.push({ label: "솔루션 사용료 (협의)", cost: 0 });
      }

      // II. 종이명찰 + 목걸이줄
      if (badgeQty > 0) {
        const badgeCost = badgeQty * PRICING.badgeUnit;
        items.push({ label: "종이명찰 (" + badgeQty.toLocaleString() + "장 \u00D7 " + PRICING.badgeUnit.toLocaleString() + "원)", cost: badgeCost });
        subtotal += badgeCost;

        const lanyardCost = badgeQty * PRICING.lanyardUnit;
        items.push({ label: "목걸이줄 (" + badgeQty.toLocaleString() + "개 \u00D7 " + PRICING.lanyardUnit.toLocaleString() + "원)", cost: lanyardCost });
        subtotal += lanyardCost;
      }

      // III. 키오스크
      if (kioskQty > 0) {
        const kioskCost = kioskQty * days * PRICING.kioskPerUnitPerDay;
        items.push({ label: "키오스크 (" + kioskQty + "대 \u00D7 " + days + "일 \u00D7 " + PRICING.kioskPerUnitPerDay.toLocaleString() + "원)", cost: kioskCost });
        subtotal += kioskCost;

        // 설치/철거 인건비
        const installCost = days === 1 ? PRICING.installFee.oneDay : PRICING.installFee.multiDay;
        items.push({ label: "설치/철거 인건비", cost: installCost });
        subtotal += installCost;

        // 운송비 (지역별)
        items.push({ label: "운송비 (" + regionLabel + ")", cost: regionData.shipping });
        subtotal += regionData.shipping;

        // 매니저 인건비
        if (managerQty > 0) {
          const mgrPay = managerQty * days * PRICING.managerDailyPay;
          items.push({ label: "매니저 인건비 (" + managerQty + "인 \u00D7 " + days + "일)", cost: mgrPay });
          subtotal += mgrPay;

          // 매니저 출장비 (지역별)
          if (regionData.bizTrip > 0) {
            const bizTripCost = managerQty * days * regionData.bizTrip;
            items.push({ label: "매니저 출장비 (" + regionLabel + ")", cost: bizTripCost });
            subtotal += bizTripCost;
          }
        }
      }

      // 기술료 10%
      const techFee = Math.round(subtotal * PRICING.techFeeRate);
      items.push({ label: "기술료 (10%)", cost: techFee, isFee: true });

      // 공급가액 (천단위 절삭)
      const supplyAmount = Math.floor((subtotal + techFee) / 1000) * 1000;

      // 부가가치세 10%
      const vat = Math.round(supplyAmount * PRICING.vatRate);
      items.push({ label: "부가가치세 (10%)", cost: vat, isFee: true });

      const total = supplyAmount + vat;

      return {
        pkgKey,
        pkgLabel: packageLabel(pkgKey),
        contactName,
        contactOrg,
        eventName,
        eventVenue,
        installDate,
        teardownDate,
        eventStartDate,
        eventEndDate,
        regionKey,
        regionLabel,
        attendees,
        days,
        badgeQty,
        kioskQty,
        managerQty,
        items,
        total,
      };
    }

    function buildExportText(data) {
      const lines = [];
      lines.push("[FAIRPASS 모의견적 요약]");
      if (data.contactName) lines.push("- 담당자: " + data.contactName);
      if (data.contactOrg) lines.push("- 소속: " + data.contactOrg);
      if (data.eventName) lines.push("- 행사명: " + data.eventName);
      lines.push("- 행사 지역: " + data.regionLabel);
      if (data.eventVenue) lines.push("- 행사 장소: " + data.eventVenue);
      var periodStr = data.eventStartDate && data.eventEndDate
        ? data.eventStartDate + " ~ " + data.eventEndDate + " (" + data.days + "일)"
        : data.days + "일";
      lines.push("- 행사 기간: " + periodStr);
      if (data.installDate) lines.push("- 설치일시: " + data.installDate);
      else lines.push("- 설치일시: 미정");
      if (data.teardownDate) lines.push("- 철거일시: " + data.teardownDate);
      else lines.push("- 철거일시: 미정");
      lines.push("- 패키지: " + data.pkgLabel);
      lines.push("- 참가자/일수: " + data.attendees.toLocaleString() + "명 / " + data.days + "일");
      if (data.badgeQty > 0) lines.push("- 종이명찰: " + data.badgeQty.toLocaleString() + "장");
      if (data.kioskQty > 0) lines.push("- 키오스크: " + data.kioskQty + "대");
      if (data.managerQty > 0) lines.push("- 매니저: " + data.managerQty + "인");
      lines.push("");
      lines.push("[비용 상세]");
      data.items.forEach((it) => lines.push("- " + it.label + ": " + formatKRW(it.cost)));
      lines.push("");
      lines.push("[총계] " + formatKRW(data.total));
      lines.push("");
      lines.push("* 본 견적은 모의 견적이며, 실제 견적과 차이가 있을 수 있습니다.");
      lines.push("* 부가서비스(출입관리·알림톡·문자 등)는 실제 견적 시 반영됩니다.");
      lines.push("* 유료 결제 서비스 이용 시 결제액의 5% (행사 후 정산)");
      return lines.join("\n");
    }

    function render() {
      syncKioskOptions();
      const res = calculate();

      // 운영일수 자동 표시
      var daysDisplay = $("#daysDisplay");
      if (daysDisplay) daysDisplay.value = res.days + "일";

      if ($("#sumPackage")) $("#sumPackage").textContent = res.pkgLabel;
      if ($("#sumBasics")) $("#sumBasics").textContent = res.attendees.toLocaleString() + "명 / " + res.days + "일";

      const sumItems = $("#sumItems");
      if (sumItems) {
        sumItems.innerHTML = "";
        res.items.forEach((it) => {
          const row = document.createElement("div");
          row.className = "sum-item";
          row.innerHTML = "<span>" + escapeHTML(it.label) + "</span><strong>" + formatKRW(it.cost) + "</strong>";
          sumItems.appendChild(row);
        });
      }

      if ($("#sumTotal")) $("#sumTotal").textContent = formatKRW(res.total);
    }

    var _quoteStarted = false;
    quoteForm.addEventListener("input", () => {
      if (!_quoteStarted) {
        _quoteStarted = true;
        if (typeof gtag === 'function') gtag('event', 'quote_start', { event_category: 'engagement', event_label: '모의견적 입력 시작' });
      }
      render();
    });
    quoteForm.addEventListener("change", () => {
      render();
    });

    // Reset button
    const resetBtn = $("#quoteResetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        kioskQtyManuallySet = false;
        var consentCheck = $("#consentCheck");
        if (consentCheck) consentCheck.checked = false;
        setTimeout(() => {
          render();
        }, 0);
      });
    }

    // ============================
    // 6-a. CONSENT CHECKBOX
    // ============================
    var consentToggle = $("#consentToggle");
    var consentTerms = $("#consentTerms");

    if (consentToggle && consentTerms) {
      consentToggle.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        consentTerms.hidden = !consentTerms.hidden;
      });
    }

    function checkConsent() {
      var consentCheck = $("#consentCheck");
      if (!consentCheck || !consentCheck.checked) {
        var wrap = consentCheck ? consentCheck.closest(".consent-wrap") : null;
        if (wrap) {
          wrap.classList.remove("consent-shake");
          void wrap.offsetWidth;
          wrap.classList.add("consent-shake");
        }
        alert("견적서 이메일 발송을 위해 개인정보 수집·이용에 동의해주세요.");
        return false;
      }
      return true;
    }

    // ============================
    // 6-b. PDF DOWNLOAD
    // ============================
    function populatePDFTemplate(data) {
      const today = new Date();
      const dateStr = today.getFullYear() + "년 " + (today.getMonth() + 1) + "월 " + today.getDate() + "일";
      $("#pdfDate").textContent = "발행일: " + dateStr;

      var pdfContactName = $("#pdfContactName");
      var pdfContactOrg = $("#pdfContactOrg");
      if (pdfContactName) pdfContactName.textContent = data.contactName || "-";
      if (pdfContactOrg) pdfContactOrg.textContent = data.contactOrg || "-";

      var pdfEventName = $("#pdfEventName");
      var pdfEventRegion = $("#pdfEventRegion");
      if (pdfEventName) pdfEventName.textContent = data.eventName || "-";
      if (pdfEventRegion) {
        var regionStr = data.regionLabel || "-";
        if (data.eventVenue) regionStr += " · " + data.eventVenue;
        pdfEventRegion.textContent = regionStr;
      }

      $("#pdfPackage").textContent = data.pkgLabel;
      $("#pdfBasics").textContent = data.attendees.toLocaleString() + "명 / " + data.days + "일";
      var pdfOps = $("#pdfOps");
      var pdfPeak = $("#pdfPeak");
      if (pdfOps) pdfOps.textContent = data.kioskQty > 0 ? data.kioskQty + "대" : "미포함";
      if (pdfPeak) pdfPeak.textContent = data.managerQty > 0 ? data.managerQty + "인" : "미포함";

      const itemsBody = $("#pdfItems");
      itemsBody.innerHTML = "";
      data.items.forEach(function (it) {
        const tr = document.createElement("tr");
        tr.innerHTML =
          '<td class="pdf-tpl-td-label">' + escapeHTML(it.label) + "</td><td>" + formatKRW(it.cost) + "</td>";
        itemsBody.appendChild(tr);
      });

      $("#pdfTotal").textContent = formatKRW(data.total);
    }

    var pendingPdfDoc = null;
    var pdfPreviewModal = $("#pdfPreviewModal");
    var pdfPreviewClose = $("#pdfPreviewClose");
    var pdfPreviewImg = $("#pdfPreviewImg");
    var pdfDownloadConfirm = $("#pdfDownloadConfirm");

    async function generateQuotePDF() {
      if (typeof html2canvas === "undefined") {
        throw new Error("html2canvas 라이브러리를 불러오지 못했습니다.");
      }
      if (!window.jspdf || !window.jspdf.jsPDF) {
        throw new Error("jsPDF 라이브러리를 불러오지 못했습니다.");
      }

      var res = calculate();
      populatePDFTemplate(res);

      var tpl = $("#pdfTemplate");
      var tplInner = tpl.querySelector(".pdf-tpl-inner");

      // Make template visible for rendering
      tpl.style.position = "absolute";
      tpl.style.left = "0";
      tpl.style.top = "0";
      tpl.style.zIndex = "-1";
      tpl.style.opacity = "1";
      tpl.style.pointerEvents = "none";

      // Wait a frame for layout to settle
      await new Promise(function (resolve) { requestAnimationFrame(resolve); });

      var canvas = await html2canvas(tplInner, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 700,
      });

      // Hide template again
      tpl.style.position = "fixed";
      tpl.style.left = "-9999px";
      tpl.style.top = "0";
      tpl.style.opacity = "";
      tpl.style.pointerEvents = "none";

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error("PDF 렌더링에 실패했습니다. 페이지를 새로고침 후 다시 시도해주세요.");
      }

      var imgData = canvas.toDataURL("image/png");

      // Show preview
      pdfPreviewImg.src = imgData;

      // Prepare PDF
      var jsPDF = window.jspdf.jsPDF;
      var doc = new jsPDF("p", "mm", "a4");
      var pageWidth = 210;
      var margin = 10;
      var imgWidth = pageWidth - margin * 2;
      var imgHeight = (canvas.height * imgWidth) / canvas.width;
      doc.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);
      pendingPdfDoc = doc;

      // Open preview modal
      if (pdfPreviewModal) pdfPreviewModal.classList.add("active");
    }

    var pdfBtn = $("#quotePdfBtn");
    if (pdfBtn) {
      pdfBtn.addEventListener("click", async function () {
        if (!checkConsent()) return;

        pdfBtn.textContent = "생성 중...";
        pdfBtn.disabled = true;
        try {
          await generateQuotePDF();
        } catch (e) {
          console.error("PDF generation failed:", e);
          alert(e.message || "PDF 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
        pdfBtn.innerHTML =
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> PDF 다운로드';
        pdfBtn.disabled = false;
      });
    }

    if (pdfDownloadConfirm) {
      pdfDownloadConfirm.addEventListener("click", function () {
        if (pendingPdfDoc) {
          pendingPdfDoc.save("FAIRPASS_모의견적.pdf");
          pdfPreviewModal.classList.remove("active");
        }
      });
    }
    if (pdfPreviewClose) {
      pdfPreviewClose.addEventListener("click", function () {
        pdfPreviewModal.classList.remove("active");
      });
    }
    if (pdfPreviewModal) {
      pdfPreviewModal.addEventListener("click", function (e) {
        if (e.target === pdfPreviewModal) pdfPreviewModal.classList.remove("active");
      });
    }

    // ============================
    // 6-c. EMAIL MODAL
    // ============================
    var emailBtn = $("#quoteEmailBtn");
    var emailModal = $("#emailModal");
    var emailModalClose = $("#emailModalClose");
    var emailForm = $("#emailForm");
    var emailSuccess = $("#emailSuccess");

    function openEmailModal() {
      if (emailModal) emailModal.classList.add("active");
    }
    function closeEmailModal() {
      if (emailModal) emailModal.classList.remove("active");
    }
    function resetEmailModal() {
      if (emailForm) {
        emailForm.reset();
        emailForm.style.display = "";
      }
      if (emailSuccess) emailSuccess.style.display = "none";
      var submitBtn = $("#emailSubmitBtn");
      if (submitBtn) {
        submitBtn.textContent = "발송하기";
        submitBtn.disabled = false;
      }
    }

    if (emailBtn) {
      emailBtn.addEventListener("click", function () {
        if (!checkConsent()) return;
        if (typeof gtag === 'function') gtag('event', 'quote_email_click', { event_category: 'conversion', event_label: '견적서 이메일 받기 클릭' });
        window._quoteEmailModalOpenTime = new Date().toISOString();
        resetEmailModal();
        openEmailModal();
      });
    }
    if (emailModalClose) {
      emailModalClose.addEventListener("click", closeEmailModal);
    }
    if (emailModal) {
      emailModal.addEventListener("click", function (e) {
        if (e.target === emailModal) closeEmailModal();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && emailModal.classList.contains("active")) {
          closeEmailModal();
        }
      });
    }

    if (emailForm) {
      emailForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        var formData = new FormData(emailForm);
        var quoteData = calculate();
        var payload = {
          name: quoteData.contactName,
          org: quoteData.contactOrg,
          email: formData.get("email"),
          phone: formData.get("phone") || "",
          quoteText: buildExportText(quoteData),
          quoteTotal: formatKRW(quoteData.total),
          timestamp: window._quoteEmailModalOpenTime || new Date().toISOString(),
          website: formData.get("website") || "",
          turnstileToken: formData.get("cf-turnstile-response") || "",
        };

        var submitBtn = $("#emailSubmitBtn");
        submitBtn.textContent = "발송 중...";
        submitBtn.disabled = true;

        try {
          var res = await fetch("/api/quote-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            if (typeof gtag === 'function') gtag('event', 'quote_submit', { event_category: 'conversion', event_label: '견적서 발송 성공' });
            emailForm.style.display = "none";
            emailSuccess.style.display = "";
            setTimeout(closeEmailModal, 2500);
          } else {
            throw new Error("서버 오류");
          }
        } catch (err) {
          submitBtn.textContent = "발송하기";
          submitBtn.disabled = false;
          alert("발송에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
      });
    }

    // Initial render
    render();
  }

  // ============================
  // 7. SMOOTH SCROLL (for older browsers)
  // ============================
  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (href === "#") return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // 8. PLATFORM IMAGE SLIDER
  // ============================
  const slider = document.getElementById("platformSlider");
  const dots = document.querySelectorAll(".slider-dot");
  if (slider && dots.length) {
    const total = dots.length;
    let current = 0;
    let timer = null;

    function goTo(idx) {
      current = (idx + total) % total;
      slider.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle("active", i === current));
    }

    function startAuto() {
      timer = setInterval(() => goTo(current + 1), 2000);
    }

    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        clearInterval(timer);
        goTo(parseInt(dot.dataset.idx, 10));
        startAuto();
      });
    });

    startAuto();
  }
})();

// OUR VALUES — Animated Word Cloud (3 blue anchors in triangle, others float freely)
(function() {
  var canvas = document.getElementById('wordCloudCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, dpr = 1;

  var BLUE  = '#22d3ee';
  var MUTED = 'rgba(255,255,255,0.45)';
  var K_NEAREST = 3;

  // tri: triangle anchor index (0=top-center, 1=bottom-left, 2=bottom-right)
  var rawNodes = [
    { t:'Smart Check-IN',     sz:22,   fw:700, col:BLUE,  fixed:true,  tri:0 },
    { t:'registration',        sz:14,   fw:400, col:MUTED, fixed:false },
    { t:'Sustainable',         sz:20,   fw:700, col:BLUE,  fixed:true,  tri:1 },
    { t:'Entry-to-Exit OS',    sz:14,   fw:400, col:MUTED, fixed:false },
    { t:'MICE TECH',           sz:16,   fw:500, col:MUTED, fixed:false },
    { t:'Online to Offline',   sz:14,   fw:400, col:MUTED, fixed:false },
    { t:'Zero Waste Event',    sz:14,   fw:400, col:MUTED, fixed:false },
    { t:'QR Gateway',          sz:14,   fw:400, col:MUTED, fixed:false },
    { t:'Hybrid',              sz:20,   fw:700, col:BLUE,  fixed:true,  tri:2 },
    { t:'Archiver',            sz:14,   fw:400, col:MUTED, fixed:false },
    { t:'Moment Tag',          sz:14,   fw:400, col:MUTED, fixed:false },
    { t:'Digital Identity',    sz:14,   fw:400, col:MUTED, fixed:false },
    { t:'Participation Infra', sz:14,   fw:400, col:MUTED, fixed:false },
    { t:'Event Tech',          sz:14,   fw:400, col:MUTED, fixed:false },
  ];

  // Triangle anchor proportional positions (rx: x ratio, ry: y ratio)
  var triAnchors = [
    { rx: 0.50, ry: 0.22 }, // top center
    { rx: 0.22, ry: 0.78 }, // bottom left
    { rx: 0.78, ry: 0.78 }, // bottom right
  ];

  var SPEED    = 0.55;
  var DRIFT    = 0.012;
  var REPULSE  = 0.32;
  var MIN_DIST = 100;

  var nodes = [];

  function initNodes() {
    nodes = rawNodes.map(function(d) {
      var pad = Math.max(d.sz * 4.2, 38);
      if (d.fixed) {
        var anchor = triAnchors[d.tri];
        return {
          text: d.t, sz: d.sz, fw: d.fw, col: d.col,
          fixed: true, tri: d.tri,
          x: W * anchor.rx,
          y: H * anchor.ry,
          vx: 0, vy: 0,
          pad: pad,
        };
      }
      var angle = Math.random() * Math.PI * 2;
      return {
        text: d.t, sz: d.sz, fw: d.fw, col: d.col,
        fixed: false,
        x: pad + Math.random() * Math.max(1, W - pad * 2),
        y: pad + Math.random() * Math.max(1, H - pad * 2),
        vx: Math.cos(angle) * SPEED,
        vy: Math.sin(angle) * SPEED,
        pad: pad,
      };
    });
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    var cw = canvas.parentElement.offsetWidth || 820;
    W = cw;
    H = Math.max(320, Math.round(cw * 0.50));
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initNodes();
  }

  resize();
  var rTimer;
  window.addEventListener('resize', function() { clearTimeout(rTimer); rTimer = setTimeout(resize, 150); });

  function getKNNEdges() {
    var edgeSet = {};
    var edges = [];
    for (var i = 0; i < nodes.length; i++) {
      var dists = [];
      for (var j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        var dx = nodes[i].x - nodes[j].x;
        var dy = nodes[i].y - nodes[j].y;
        dists.push({ j: j, d: Math.sqrt(dx*dx + dy*dy) });
      }
      dists.sort(function(a, b) { return a.d - b.d; });
      for (var k = 0; k < K_NEAREST && k < dists.length; k++) {
        var a = Math.min(i, dists[k].j);
        var b = Math.max(i, dists[k].j);
        var key = a + '_' + b;
        if (!edgeSet[key]) {
          edgeSet[key] = true;
          edges.push({ a: a, b: b, d: dists[k].d });
        }
      }
    }
    return edges;
  }

  var MAX_EDGE_DIST = 0;

  function tick() {
    var i, j, n, o, dx, dy, dist, spd, push;

    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      if (n.fixed) continue; // anchors don't move

      // Random walk
      n.vx += (Math.random() - 0.5) * DRIFT;
      n.vy += (Math.random() - 0.5) * DRIFT;

      spd = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      if (spd > 0) { n.vx = n.vx / spd * SPEED; n.vy = n.vy / spd * SPEED; }

      // Repulsion from all nodes (including fixed anchors)
      for (j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        o = nodes[j];
        dx = n.x - o.x; dy = n.y - o.y;
        dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        if (dist < MIN_DIST) {
          push = (MIN_DIST - dist) / MIN_DIST * REPULSE;
          n.vx += dx / dist * push;
          n.vy += dy / dist * push;
        }
      }

      n.x += n.vx;
      n.y += n.vy;

      // Bounce off edges
      if (n.x < n.pad)   { n.x = n.pad;     n.vx =  Math.abs(n.vx); }
      if (n.x > W-n.pad) { n.x = W - n.pad; n.vx = -Math.abs(n.vx); }
      if (n.y < n.pad)   { n.y = n.pad;     n.vy =  Math.abs(n.vy); }
      if (n.y > H-n.pad) { n.y = H - n.pad; n.vy = -Math.abs(n.vy); }
    }

    ctx.clearRect(0, 0, W, H);

    var edges = getKNNEdges();
    MAX_EDGE_DIST = 0;
    for (i = 0; i < edges.length; i++) {
      if (edges[i].d > MAX_EDGE_DIST) MAX_EDGE_DIST = edges[i].d;
    }
    var refDist = Math.max(MAX_EDGE_DIST, W * 0.15);

    ctx.lineWidth = 0.8;
    for (i = 0; i < edges.length; i++) {
      var e = edges[i];
      var a = nodes[e.a], b = nodes[e.b];
      var t = Math.min(1, e.d / refDist);
      var alpha = 0.12 + (1 - t) * 0.26;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = 'rgba(255,255,255,' + alpha.toFixed(3) + ')';
      ctx.stroke();
    }

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      ctx.font      = n.fw + ' ' + n.sz + 'px Inter, system-ui, sans-serif';
      ctx.fillStyle = n.col;
      ctx.fillText(n.text, n.x, n.y);
    }

    requestAnimationFrame(tick);
  }

  tick();
})();


// Brochure Modal
(function() {
  var btn = document.getElementById('brochureBtn');
  var modal = document.getElementById('brochureModal');
  var closeBtn = document.getElementById('brochureModalClose');
  var form = document.getElementById('brochureForm');
  var success = document.getElementById('brochureSuccess');
  if (!btn || !modal) return;

  btn.addEventListener('click', function() {
    if (typeof gtag === 'function') gtag('event', 'brochure_open', { event_category: 'engagement', event_label: '소개서 모달 열기' });
    window._brochureModalOpenTime = new Date().toISOString();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  });
  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function(e) { if (e.target === modal) closeModal(); });

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var consent = document.getElementById('brochureConsent');
    if (!consent || !consent.checked) {
      alert('개인정보 수집·이용에 동의해주세요.');
      return;
    }
    var submitBtn = document.getElementById('brochureSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = '전송 중...';
    var data = {
      name: form.name.value.trim(),
      company: form.company.value.trim(),
      position: form.position.value.trim(),
      email: form.email.value.trim(),
      timestamp: window._brochureModalOpenTime || new Date().toISOString(),
      website: (form.website ? form.website.value : "") || "",
      turnstileToken: (form.querySelector('[name="cf-turnstile-response"]') ? form.querySelector('[name="cf-turnstile-response"]').value : "") || "",
    };
    fetch('/api/brochure-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(function(res) { return res.json(); })
    .then(function(json) {
      if (json.success) {
        if (typeof gtag === 'function') gtag('event', 'brochure_submit', { event_category: 'conversion', event_label: '소개서 발송 성공' });
        form.style.display = 'none';
        success.style.display = 'flex';
      } else {
        alert('전송 중 오류가 발생했습니다. 다시 시도해주세요.');
        submitBtn.disabled = false;
        submitBtn.textContent = '소개서 요청하기';
      }
    })
    .catch(function() {
      alert('전송 중 오류가 발생했습니다. 다시 시도해주세요.');
      submitBtn.disabled = false;
      submitBtn.textContent = '소개서 요청하기';
    });
  });
})();

// EN Waitlist Modal
(function() {
  var btn = document.getElementById('enWaitlistBtn');
  var modal = document.getElementById('enWaitlistModal');
  var closeBtn = document.getElementById('enWaitlistModalClose');
  var form = document.getElementById('enWaitlistForm');
  var success = document.getElementById('enWaitlistSuccess');
  if (!btn || !modal) return;

  btn.addEventListener('click', function() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  });
  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function(e) { if (e.target === modal) closeModal(); });

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var consent = document.getElementById('enWaitlistConsent');
    if (!consent || !consent.checked) {
      alert('Please agree to the collection and use of personal information.');
      return;
    }
    var submitBtn = document.getElementById('enWaitlistSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    var turnstileEl = form.querySelector('[name="cf-turnstile-response"]');
    var turnstileToken = turnstileEl ? turnstileEl.value : '';
    var data = {
      email: form.email.value.trim(),
      company: form.company.value.trim(),
      website: form.website ? form.website.value : '',
      timestamp: new Date().toISOString(),
      turnstileToken: turnstileToken
    };
    fetch('/api/en-waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(function(res) { return res.json(); })
    .then(function(json) {
      if (json.success) {
        form.style.display = 'none';
        success.style.display = 'flex';
      } else {
        alert('Something went wrong. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send inquiry';
      }
    })
    .catch(function() {
      alert('Something went wrong. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send inquiry';
    });
  });
})();

// Language switcher
window.setLang = function(l) {
  localStorage.setItem('preferredLang', l);
  document.documentElement.setAttribute('data-lang', l);
  var enTitle = document.querySelector('meta[name="title-en"]');
  if (enTitle) {
    var koTitle = document.querySelector('meta[name="title-ko"]');
    document.title = (l === 'en') ? enTitle.getAttribute('content') : (koTitle ? koTitle.getAttribute('content') : document.title);
  }
  var descMeta = document.querySelector('meta[name="description"]');
  if (descMeta) {
    var enDesc = document.querySelector('meta[name="description-en"]');
    var koDesc = document.querySelector('meta[name="description-ko"]');
    if (l === 'en' && enDesc) descMeta.setAttribute('content', enDesc.getAttribute('content'));
    else if (l === 'ko' && koDesc) descMeta.setAttribute('content', koDesc.getAttribute('content'));
  }
  document.querySelectorAll('.nav-lang-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === l);
  });
  document.querySelectorAll('[data-ph-ko]').forEach(function(el) {
    el.placeholder = l === 'en' ? (el.getAttribute('data-ph-en') || el.placeholder) : el.getAttribute('data-ph-ko');
  });
  document.querySelectorAll('video.lang-video').forEach(function(vid) {
    var newSrc = l === 'en' ? vid.getAttribute('data-src-en') : vid.getAttribute('data-src-ko');
    if (newSrc && vid.getAttribute('src') !== newSrc) {
      vid.src = newSrc;
      vid.load();
    }
  });
  var journalLink = document.getElementById('journalNavLink');
  if (journalLink) journalLink.href = l === 'en' ? '/journal/en/' : '/journal/ko/';
};
(function() {
  var urlLang = new URLSearchParams(window.location.search).get('lang');
  if (urlLang === 'en' || urlLang === 'ko') { localStorage.setItem('preferredLang', urlLang); }
  var lang = localStorage.getItem('preferredLang') ||
             (navigator.language.startsWith('ko') ? 'ko' : 'en');
  document.documentElement.setAttribute('data-lang', lang);
  var _enTitle = document.querySelector('meta[name="title-en"]');
  var _koTitle = document.querySelector('meta[name="title-ko"]');
  if (_enTitle && lang === 'en') document.title = _enTitle.getAttribute('content');
  else if (_koTitle && lang === 'ko') document.title = _koTitle.getAttribute('content');
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.nav-lang-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
    var journalLink = document.getElementById('journalNavLink');
    if (journalLink) journalLink.href = lang === 'en' ? '/journal/en/' : '/journal/ko/';
    if (lang === 'en') {
      document.querySelectorAll('[data-ph-ko]').forEach(function(el) {
        el.placeholder = el.getAttribute('data-ph-en') || el.placeholder;
      });
      document.querySelectorAll('video.lang-video').forEach(function(vid) {
        var newSrc = vid.getAttribute('data-src-en');
        if (newSrc && vid.getAttribute('src') !== newSrc) {
          vid.src = newSrc;
          vid.load();
        }
      });
    }
  });
})();

// Footer company info accordion
(function() {
  const btn = document.getElementById('footerInfoBtn');
  const info = document.getElementById('footerInfo');
  const chevron = document.getElementById('footerInfoChevron');
  if (!btn || !info) return;
  btn.addEventListener('click', function() {
    info.classList.toggle('open');
    chevron.classList.toggle('open');
  });
})();

// ── GA4 CTA 이벤트 ──
(function() {
  if (typeof gtag !== 'function') return;
  document.addEventListener('DOMContentLoaded', function() {
    // 무료로 시작하기
    document.querySelectorAll('a[href*="admin.fairpass.co.kr/Join"], a[href*="admin.fairpass.co.kr/Login"]').forEach(function(el) {
      el.addEventListener('click', function() {
        gtag('event', 'cta_signup_click', { event_category: 'conversion', event_label: el.textContent.trim() });
      });
    });
    // 1분 모의 견적 버튼
    document.querySelectorAll('a[href="#quote"]').forEach(function(el) {
      el.addEventListener('click', function() {
        gtag('event', 'cta_quote_click', { event_category: 'engagement', event_label: '모의견적 버튼 클릭' });
      });
    });
  });
})();
