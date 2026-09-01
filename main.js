// ==================== إعدادات ومسارات النظام ====================
const MANIFEST_FILES = [
    "./manifest.json",
    "./manifest_2.json",
    "./manifest_3.json",
    "./manifest_4.json",
    "./manifest_5.json",
    "./data/manifest.json",
    "./data/manifest_2.json",
    "./data2/manifest.json",
    "./data2/manifest_2.json",
    "./data3/manifest.json",
    "./data3/manifest_3.json",
    "./data4/manifest.json",
    "./data4/manifest_4.json",
    "./data5/manifest.json",
    "./data5/manifest_5.json",
    "./data6/manifest_6.json",
    "./books/manifest.json"
];

const SEARCH_FOLDERS = [
    "./data6/", "./data5/", "./data4/", "./data3/", 
    "./data2/", "./data/", "./books/", "./"
];
const CLOUD_FALLBACK_URL = "https://cdn.jsdelivr.net/gh/jalisalkulayni-maker/-@main/";

let allBooksManifest = {};
let currentBookPages = [];
let currentBookToc = [];
let currentPageIndex = 1;
let currentBookTotalPages = 0;
let currentBookId = "";
let currentBookTitle = "";

let currentSearchScope = 'all';
let currentSearchTarget = 'toc';
let searchDebounceTimer = null;
let savedSelectionRange = null;
let savedSelectionText = "";

let currentTagFilter = 'all';
let dailyHadithCollection = [];
let currentDailyHadith = null;
let hadithIntervalTimer = null;
let isDeepSearching = false;

let savedScrollPosition = 0;
let currentActiveSearchHighlight = "";

// ==================== نظام خويدم أنيس (الشخصية التفاعلية كعلامة عائمة) ====================
const guideTips = [
    "هل تعلم أنه يمكنك تظليل أي نص وحفظه تحت 'مستودع الوسوم' بضغطة زر؟",
    "استخدم زر الفهرس في أعلى القارئ للتنقل السريع بين فصول الكتاب.",
    "في شاشة البحث، يمكنك التبديل بين البحث في 'الأبواب' أو 'نصوص الكتب'.",
    "تستطيع تغيير ثيم القراءة وحجم الخط في أي وقت عبر أيقونة لوحة الألوان بالأعلى.",
    "هل ترغب بمشاركة حديث شريف؟ حدد النص واضغط على زر الاقتباس لتوثيقه."
];

let currentTipIndex = 0;
let bubbleTimeout;

function updateGuideSpeech(customMsg = null) {
    const bubble = document.getElementById('guideSpeechBubble');
    const speechEl = document.getElementById('guideSpeechText');
    if (!bubble || !speechEl) return;
    
    speechEl.innerText = customMsg || guideTips[currentTipIndex];
    if (!customMsg) {
        currentTipIndex = (currentTipIndex + 1) % guideTips.length;
    }

    bubble.classList.add('show');
    
    clearTimeout(bubbleTimeout);
    bubbleTimeout = setTimeout(() => {
        bubble.classList.remove('show');
    }, 5000);
}

function toggleGuideBubble() {
    const bubble = document.getElementById('guideSpeechBubble');
    if (bubble.classList.contains('show')) {
        bubble.classList.remove('show');
    } else {
        updateGuideSpeech();
    }
}

function hideGuideBubble() {
    const bubble = document.getElementById('guideSpeechBubble');
    if (bubble) bubble.classList.remove('show');
}

// تذكير صامت كل 45 ثانية إذا كانت الفقاعة مغلقة
setInterval(() => {
    const bubble = document.getElementById('guideSpeechBubble');
    if (bubble && !bubble.classList.contains('show')) {
        updateGuideSpeech();
    }
}, 45000);

setTimeout(() => {
    updateGuideSpeech("أهلاً بك! أنا 'خويدم أنيس'. اضغط على أيقونتي في أي وقت لأرشدك.");
}, 2000);

// ==================== نظام التنبيهات ====================
let toastTimeout = null;
function showToast(message, iconClass = 'fa-circle-check') {
    const toast = document.getElementById('royalToast');
    const toastText = document.getElementById('royalToastText');
    if (!toast || !toastText) return;

    toast.innerHTML = `<i class="fas ${iconClass}"></i> <span>${message}</span>`;
    toast.classList.add('show');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 2800);
}

let confirmCallback = null;
function showConfirm(message, onConfirm) {
    const modal = document.getElementById('customConfirmModal');
    const msgEl = document.getElementById('confirmModalMsg');
    if (!modal || !msgEl) return;

    msgEl.innerText = message;
    confirmCallback = onConfirm;
    modal.style.display = 'flex';
}

function closeConfirmModal(isConfirmed) {
    const modal = document.getElementById('customConfirmModal');
    if (modal) modal.style.display = 'none';

    if (isConfirmed && typeof confirmCallback === 'function') {
        confirmCallback();
    }
    confirmCallback = null;
}

function attachTactilePhysics(btn) {
    if (!btn) return;
    btn.addEventListener('touchstart', () => btn.classList.add('pressed'), { passive: true });
    btn.addEventListener('touchend', () => btn.classList.remove('pressed'), { passive: true });
    btn.addEventListener('touchcancel', () => btn.classList.remove('pressed'), { passive: true });
}

// ==================== إدارة التبويبات ====================
function showView(viewId, pushHistory = true) {
    if (document.getElementById('homeView')?.classList.contains('active') && viewId !== 'homeView') {
        savedScrollPosition = window.scrollY || document.documentElement.scrollTop || 0;
    }

    document.querySelectorAll('.stage-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');

    const bottomNav = document.querySelector('.glass-bottom-nav');
    if (bottomNav) {
        bottomNav.style.display = (viewId === 'readerView') ? 'none' : 'block';
    }

    if (pushHistory) {
        history.pushState({ view: viewId }, '', '');
    }

    if (viewId === 'homeView') {
        setTimeout(() => {
            window.scrollTo({ top: savedScrollPosition, behavior: 'instant' });
        }, 40);
    }
}

function switchTab(tabKey) {
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

    if (tabKey === 'home') {
        document.getElementById('navHomeBtn')?.classList.add('active');
        showView('homeView');
        updateGuideSpeech("أنت الآن في 'الرواق الرئيسي' حيث تظهر الخزانة بـ 3 رفوف متناسقة.");
    } else if (tabKey === 'catalog') {
        document.getElementById('navCatalogBtn')?.classList.add('active');
        showView('catalogView');
        renderCatalogAccordion();
        updateGuideSpeech("هنا 'قائمة الكتب والتصنيفات'. انقر على أي قسم لفتحه.");
    } else if (tabKey === 'tags') {
        document.getElementById('navTagsBtn')?.classList.add('active');
        showView('tagsView');
        renderTagsView(currentTagFilter);
        updateGuideSpeech("هذا 'مستودع الوسوم' يجمع كل الأحاديث التي قمت بحفظها.");
    } else if (tabKey === 'search') {
        document.getElementById('navSearchBtn')?.classList.add('active');
        openSearch();
        updateGuideSpeech("استخدم محرك البحث المتقدم أدناه للعثور على مبتغاك بدقة.");
    }
}

window.addEventListener('popstate', (event) => {
    const openModals = [
        document.getElementById('volumesModal'),
        document.getElementById('tocModal'),
        document.getElementById('settingsModal'),
        document.getElementById('inBookSearchModal'),
        document.getElementById('addTagModal'),
        document.getElementById('customConfirmModal')
    ];

    let modalClosed = false;
    for (let modal of openModals) {
        if (modal && (modal.style.display === 'flex' || modal.style.display === 'block')) {
            modal.style.display = 'none';
            modalClosed = true;
        }
    }
    if (modalClosed) return;

    const targetView = event.state?.view || 'homeView';
    showView(targetView, false);

    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    if (targetView === 'homeView') {
        document.getElementById('navHomeBtn')?.classList.add('active');
    } else if (targetView === 'catalogView') {
        document.getElementById('navCatalogBtn')?.classList.add('active');
    } else if (targetView === 'tagsView') {
        document.getElementById('navTagsBtn')?.classList.add('active');
    }
});

// ==================== تطوير محرك البحث الشامل والمتقدم ====================
let currentSearchMatchType = 'exact';

function setSearchMatchType(type) {
    currentSearchMatchType = type;
    document.getElementById('searchMatchTypeExact')?.classList.toggle('active', type === 'exact');
    document.getElementById('searchMatchTypeAll')?.classList.toggle('active', type === 'all');
    document.getElementById('searchMatchTypeAny')?.classList.toggle('active', type === 'any');
    executeGlobalSearch();
}

function cleanArabicForSearch(str) {
    if (!str) return "";
    return str.replace(/[\u064B-\u065F\u0670ـ]/g, '')
              .replace(/[أإآ]/g, 'ا')
              .replace(/ة/g, 'ه')
              .toLowerCase();
}

function checkSearchMatch(text, query, matchType) {
    if (!text || !query) return false;
    let cleanText = cleanArabicForSearch(text);
    let cleanQ = cleanArabicForSearch(query).trim();
    let words = cleanQ.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return false;

    if (matchType === 'exact') {
        return cleanText.includes(cleanQ);
    } else if (matchType === 'all') {
        return words.every(w => cleanText.includes(w));
    } else if (matchType === 'any') {
        return words.some(w => cleanText.includes(w));
    }
    return false;
}

function highlightArabicText(text, query) {
    if (!text || !query) return text || "";
    let cleanQ = cleanArabicForSearch(query).trim();
    let words = cleanQ.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return text;

    const tashkeel = "[\\u064B-\\u065F\\u0670ـ]*";
    let buildWordPattern = (w) => {
        let p = "";
        for (let i = 0; i < w.length; i++) {
            let c = w[i];
            if (c === "ا" || c === "أ" || c === "إ" || c === "آ") p += "[اأإآ]" + tashkeel;
            else if (c === "ه" || c === "ة") p += "[هة]" + tashkeel;
            else if (c === "ي" || c === "ى") p += "[يى]" + tashkeel;
            else if (/[a-zA-Z0-9\u0621-\u064A]/.test(c)) p += c + tashkeel;
            else p += "\\" + c;
        }
        return p;
    };

    let pattern = "(" + words.map(buildWordPattern).join("|") + ")";
    let reg;
    try {
        reg = new RegExp(pattern, "gim");
    } catch(e) {
        return text;
    }
    
    return text.replace(reg, (match) => {
        return '<mark class="search-highlight">' + match + '</mark>';
    });
}

function generateSearchSnippet(fullHtml, query) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = fullHtml || '';
    const rawText = tempDiv.textContent || tempDiv.innerText || '';
    
    if (!rawText || !query) return rawText.substring(0, 100) + '...';

    let cleanText = cleanArabicForSearch(rawText);
    let cleanQ = cleanArabicForSearch(query).trim();
    let words = cleanQ.split(/\s+/).filter(w => w.length > 0);
    
    let firstMatchIndex = -1;
    for (let w of words) {
        let idx = cleanText.indexOf(w);
        if (idx !== -1) {
            firstMatchIndex = idx;
            break;
        }
    }

    let snippet = "";
    if (firstMatchIndex !== -1) {
        let start = Math.max(0, firstMatchIndex - 40);
        let end = Math.min(rawText.length, firstMatchIndex + 60);
        snippet = rawText.substring(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < rawText.length) snippet = '...';
    } else {
        snippet = rawText.substring(0, 100) + '...';
    }

    return highlightArabicText(snippet, query);
}


// ==================== محرك القارئ وجلب البيانات ====================
async function fetchBookData(bookId) {
    const cleanId = (bookId || "").trim();
    const encodedId = encodeURIComponent(cleanId);
    
    for (let folder of SEARCH_FOLDERS) {
        try {
            let res = await fetch(`${folder}${cleanId}.json`);
            if (!res.ok) res = await fetch(`${folder}${encodedId}.json`);
            if (res.ok) return await res.json();
        } catch (e) {}
    }

    let fallbackId = cleanId.replace(/_[0-9]+$/, '').replace(/_ج[0-9]+$/, '');
    if (fallbackId && fallbackId !== cleanId) {
        for (let folder of SEARCH_FOLDERS) {
            try {
                let res = await fetch(`${folder}${fallbackId}.json`);
                if (!res.ok) res = await fetch(`${folder}${encodeURIComponent(fallbackId)}.json`);
                if (res.ok) return await res.json();
            } catch (e) {}
        }
    }

    try {
        let res = await fetch(`${CLOUD_FALLBACK_URL}${encodedId}.json`);
        if (res.ok) return await res.json();
    } catch (e) {}

    throw new Error("تعذر جلب ملف الكتاب");
}

async function loadAndOpenBook(bookId, bookTitle, bookToc, totalPages, targetPageNumber = null, highlightQuery = "") {
    showView('readerView');
    currentBookId = bookId;
    currentBookTitle = bookTitle;
    currentActiveSearchHighlight = highlightQuery || "";
    document.getElementById('readerTitle').innerText = bookTitle;

    const contentDiv = document.getElementById('pageContent');
    contentDiv.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:50px;"><i class="fas fa-spinner fa-spin fa-2x text-gold"></i><p style="margin-top:10px;">جاري فتح المتن المبارك...</p></div>';

    const cachedPages = localStorage.getItem(`book_pages_${bookId}`);
    if (cachedPages) {
        try {
            currentBookPages = JSON.parse(cachedPages);
            currentBookToc = bookToc || [];
            currentBookTotalPages = totalPages || currentBookPages.length;
            initReaderEngine(targetPageNumber);
            return;
        } catch (e) {}
    }

    try {
        const bookData = await fetchBookData(bookId);

        currentBookPages = bookData.pages || [];
        currentBookToc = bookData.toc || bookToc || [];
        currentBookTotalPages = bookData.total_pages || totalPages || currentBookPages.length;

        try {
            localStorage.setItem(`book_pages_${bookId}`, JSON.stringify(currentBookPages));
        } catch (e) {}

        initReaderEngine(targetPageNumber);
    } catch (err) {
        contentDiv.innerHTML = `<div style="text-align:center; color:#ff5252; padding:30px;">⚠️ تعذر فتح الكتاب. تأكد من اتصال الإنترنت أو رفع الأجزاء.</div>`;
    }
}

function initReaderEngine(targetPageNumber = null) {
    currentBookPages.sort((a, b) => Number(a.page_number) - Number(b.page_number));

    if (targetPageNumber) {
        const targetIdx = currentBookPages.findIndex(p => Number(p.page_number) === Number(targetPageNumber));
        currentPageIndex = targetIdx !== -1 ? (targetIdx + 1) : 1;
    } else {
        const savedLastPage = localStorage.getItem(`last_page_${currentBookId}`);
        if (savedLastPage && parseInt(savedLastPage) > 1) {
            currentPageIndex = parseInt(savedLastPage);
        } else {
            currentPageIndex = 1;
        }
    }

    renderCurrentPage();
    renderTocList();
    renderBookmarksList();
}

function renderCurrentPage() {
    const contentDiv = document.getElementById('pageContent');
    const rangeSlider = document.getElementById('pageRangeSlider');
    const currentLbl = document.getElementById('currentPaginationLabel');
    const totalLbl = document.getElementById('totalPaginationLabel');

    if (currentBookPages.length === 0) {
        contentDiv.innerHTML = '<div style="text-align:center; color:#888;">لا توجد صفحات متاحة.</div>';
        return;
    }

    const pageData = currentBookPages[currentPageIndex - 1];
    let rawHtml = pageData ? (pageData.content || "صفحة فارغة") : "صفحة فارغة";

    // 1. تنظيف العلامات المائية القديمة
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawHtml;
    const elements = tempDiv.querySelectorAll('*');
    elements.forEach(el => {
        if (el.textContent && el.textContent.toLowerCase().includes('t.me/jali4s') && el.textContent.length < 250) {
            el.remove();
        }
    });
    rawHtml = tempDiv.innerHTML;
    
    rawHtml = rawHtml.replace(/مكتبة\s*الامام\s*السجاد:\s*جليس\s*الكليني\s*-\s*https:\/\/t\.me\/Jali4s/gi, '');
    rawHtml = rawHtml.replace(/مكتبة\s*جليس\s*-\s*https:\/\/t\.me\/Jali4s/gi, '');
    rawHtml = rawHtml.replace(/<div[^>]*border-top[^>]*dashed[^>]*>\s*<\/div>/gi, '');

    // 2. السحر التقني: تلوين المتون والآيات تلقائياً بناءً على الأقواس 🌟
    rawHtml = rawHtml.replace(/«([\s\S]*?)»/g, '<span class="matn">«$1»</span>');
    rawHtml = rawHtml.replace(/﴿([\s\S]*?)﴾/g, '<span class="aya">﴿$1﴾</span>');

    // 3. إضافة العلامة المائية مرة واحدة
    const watermarkHtml = `
        <div style="margin-top: 40px; padding-top: 15px; border-top: 1px dashed rgba(150, 150, 150, 0.3); text-align: center; font-size: 14px; font-weight: 500; font-family: 'Cairo', sans-serif; direction: rtl; clear: both; user-select: none; opacity: 0.9;">
            <span style="color: #a0a0a0;">مكتبة الامام السجاد: </span>
            <span style="color: #D4AF37;">جليس الكليني - https://t.me/Jali4s</span>
        </div>
    `;
    rawHtml += watermarkHtml;

    if (currentActiveSearchHighlight) {
        contentDiv.innerHTML = highlightArabicText(rawHtml, currentActiveSearchHighlight);
    } else {
        contentDiv.innerHTML = rawHtml;
    }

    contentDiv.parentElement.scrollTop = 0;

    let displayPage = pageData ? (pageData.page_number || currentPageIndex) : currentPageIndex;
    const pagenEl = contentDiv.querySelector('.pagen');
    if (pagenEl) {
        const match = pagenEl.innerText.match(/\d+/);
        if (match) displayPage = match[0];
    }

    contentDiv.querySelectorAll('.fnote, .footnote, .hawamish, .margin, .note').forEach(el => {
        el.style.setProperty('font-size', '10px', 'important');
        el.style.setProperty('line-height', '1.3', 'important');
    });

    if (rangeSlider) {
        rangeSlider.min = 1;
        rangeSlider.max = currentBookPages.length;
        rangeSlider.value = currentPageIndex;
    }

    if (currentLbl) currentLbl.innerText = displayPage;
    if (totalLbl) totalLbl.innerText = currentBookTotalPages;

    if (currentBookId) {
        try {
            localStorage.setItem(`last_page_${currentBookId}`, currentPageIndex);
        } catch (e) {}
    }

    updateBookmarkIconState();
}

function handleScreenTap(e) {
    if (window.getSelection && window.getSelection().toString().length > 0) return;
    if (e.target.closest('a, button, input, .glass-modal, .selection-toolbar')) return;

    const screenWidth = window.innerWidth;
    const tapX = e.clientX;

    if (tapX < screenWidth * 0.35) nextPage();
    else if (tapX > screenWidth * 0.65) prevPage();
}

function executeInlineJump() {
    const input = document.getElementById('inlineJumpInput');
    if (!input || !input.value.trim()) return;

    let targetPage = parseInt(input.value.trim());
    if (isNaN(targetPage)) return;

    let foundIndex = currentBookPages.findIndex(p => Number(p.page_number) === targetPage);
    if (foundIndex !== -1) {
        currentPageIndex = foundIndex + 1;
    } else {
        let closestIndex = 0;
        let minDiff = Infinity;
        currentBookPages.forEach((p, idx) => {
            let pNum = Number(p.page_number) || (idx + 1);
            let diff = Math.abs(pNum - targetPage);
            if (diff < minDiff) { minDiff = diff; closestIndex = idx; }
        });
        currentPageIndex = closestIndex + 1;
    }

    input.value = '';
    renderCurrentPage();
}

function nextPage() {
    if (currentPageIndex < currentBookPages.length) {
        currentPageIndex++;
        renderCurrentPage();
    }
}

function prevPage() {
    if (currentPageIndex > 1) {
        currentPageIndex--;
        renderCurrentPage();
    }
}

function slidePageChanged(val) {
    let idx = parseInt(val);
    if (!isNaN(idx) && idx >= 1 && idx <= currentBookPages.length) {
        currentPageIndex = idx;
        renderCurrentPage();
    }
}

function closeReader() { 
    currentActiveSearchHighlight = "";
    if (history.state && history.state.view === 'readerView') {
        history.back();
    } else {
        showView('homeView', false);
    }
}

// ==================== شريط الأدوات والوسوم والاقتباسات ====================
document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    const toolbar = document.getElementById('selectionToolbar');
    if (!toolbar) return;

    if (selection && selection.toString().trim().length > 0) {
        savedSelectionRange = selection.getRangeAt(0).cloneRange();
        savedSelectionText = selection.toString().trim();
        toolbar.style.display = 'flex';
    } else {
        setTimeout(() => {
            if (!window.getSelection().toString().trim()) {
                toolbar.style.display = 'none';
            }
        }, 300);
    }
});

function applyHighlight(className) {
    if (!savedSelectionRange) return;
    const span = document.createElement('span');
    span.className = className;
    try {
        savedSelectionRange.surroundContents(span);
    } catch (e) {
        document.execCommand('backColor', false, className === 'hl-yellow' ? '#ffeb3b' : (className === 'hl-green' ? '#4caf50' : '#e91e63'));
    }
    document.getElementById('selectionToolbar').style.display = 'none';
    window.getSelection().removeAllRanges();
    showToast("تم تظليل النص بنجاح", "fa-highlighter");
}

function removeHighlight() {
    if (!savedSelectionRange) return;
    document.execCommand('removeFormat', false, null);
    document.getElementById('selectionToolbar').style.display = 'none';
    window.getSelection().removeAllRanges();
    showToast("تمت إزالة التظليل", "fa-eraser");
}

function shareSelectedQuote() {
    const selectedText = window.getSelection().toString().trim() || savedSelectionText;
    if (!selectedText) return;

    let pageData = currentBookPages[currentPageIndex - 1];
    let pageNum = pageData ? (pageData.page_number || currentPageIndex) : currentPageIndex;
    let quoteFormatted = `"${selectedText}"\n\n📖 المصدر: ${currentBookTitle} (صـ ${pageNum})\n✦ مكتبة سيد الساجدين: https://t.me/Jali4s`;

    if (navigator.share) {
        navigator.share({ title: currentBookTitle, text: quoteFormatted }).catch(() => {});
    } else {
        navigator.clipboard.writeText(quoteFormatted);
        showToast("تم نسخ الاقتباس مع التوثيق والمصدر", "fa-clipboard-check");
    }

    document.getElementById('selectionToolbar').style.display = 'none';
    window.getSelection().removeAllRanges();
}

function getStoredTags() {
    const data = localStorage.getItem('custom_tags_list');
    return data ? JSON.parse(data) : defaultTags;
}

function saveStoredTags(tags) {
    localStorage.setItem('custom_tags_list', JSON.stringify(tags));
}

function getStoredTaggedSnippets() {
    const data = localStorage.getItem('custom_tagged_snippets');
    return data ? JSON.parse(data) : [];
}

function saveStoredTaggedSnippets(items) {
    localStorage.setItem('custom_tagged_snippets', JSON.stringify(items));
}

function openAddTagModal() {
    const text = window.getSelection().toString().trim() || savedSelectionText;
    if (!text) {
        showToast("يرجى تحديد نص لتصنيفه أولاً", "fa-triangle-exclamation");
        return;
    }
    savedSelectionText = text;
    if (window.getSelection) window.getSelection().removeAllRanges();

    renderAvailableTagsSelection();
    const modal = document.getElementById('addTagModal');
    if (modal) modal.style.display = 'flex';
    document.getElementById('selectionToolbar').style.display = 'none';
}

function closeAddTagModal() {
    const modal = document.getElementById('addTagModal');
    if (modal) modal.style.display = 'none';
    if (window.getSelection) window.getSelection().removeAllRanges();
}

function renderAvailableTagsSelection() {
    const container = document.getElementById('availableTagsList');
    if (!container) return;

    const tags = getStoredTags();
    container.innerHTML = '';

    tags.forEach(t => {
        const btn = document.createElement('div');
        btn.className = 'tag-badge-select tactile-btn';
        btn.style.backgroundColor = t.color;
        btn.innerHTML = `<i class="fas fa-tag"></i> ${t.name}`;
        attachTactilePhysics(btn);
        btn.onclick = () => assignTagToSelection(t.name, t.color);
        container.appendChild(btn);
    });
}

function createNewCustomTag() {
    const nameInput = document.getElementById('newTagNameInput');
    const colorInput = document.getElementById('newTagColorInput');
    const name = nameInput.value.trim();
    const color = colorInput.value;

    if (!name) {
        showToast("يرجى كتابة اسم للوسم أولاً", "fa-triangle-exclamation");
        return;
    }

    const tags = getStoredTags();
    if (!tags.some(t => t.name === name)) {
        tags.push({ name, color });
        saveStoredTags(tags);
    }

    nameInput.value = '';
    assignTagToSelection(name, color);
}

function assignTagToSelection(tagName, tagColor) {
    if (!savedSelectionText) return;

    let pageData = currentBookPages[currentPageIndex - 1];
    let pageNum = pageData ? (pageData.page_number || currentPageIndex) : currentPageIndex;

    const taggedItems = getStoredTaggedSnippets();
    taggedItems.unshift({
        id: 'tag_' + Date.now(),
        tagName: tagName,
        tagColor: tagColor,
        text: savedSelectionText,
        bookId: currentBookId,
        bookTitle: currentBookTitle,
        pageNum: pageNum,
        pageIndex: currentPageIndex,
        date: new Date().toLocaleDateString('ar-IQ')
    });

    saveStoredTaggedSnippets(taggedItems);
    closeAddTagModal();
    showToast(`تم تصنيف النص تحت وسم [${tagName}]`, "fa-tag");
}

function renderTagsView(filterTag = 'all') {
    currentTagFilter = filterTag;
    const pillsContainer = document.getElementById('tagsFilterPillsContainer');
    const listContainer = document.getElementById('taggedItemsListContainer');
    if (!pillsContainer || !listContainer) return;

    const tags = getStoredTags();
    const items = getStoredTaggedSnippets();

    pillsContainer.innerHTML = `
        <button class="filter-pill ${currentTagFilter === 'all' ? 'active' : ''} tactile-btn" onclick="renderTagsView('all')">
            <i class="fas fa-layer-group"></i> كل الوسوم (${items.length})
        </button>
    `;

    tags.forEach(t => {
        const count = items.filter(i => i.tagName === t.name).length;
        const btn = document.createElement('button');
        btn.className = `filter-pill ${currentTagFilter === t.name ? 'active' : ''} tactile-btn`;
        btn.style.borderColor = t.color;
        btn.innerHTML = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${t.color}; margin-left:4px;"></span> ${t.name} (${count})`;
        btn.onclick = () => renderTagsView(t.name);
        pillsContainer.appendChild(btn);
    });

    const filteredItems = (currentTagFilter === 'all') 
        ? items 
        : items.filter(i => i.tagName === currentTagFilter);

    listContainer.innerHTML = '';

    if (filteredItems.length === 0) {
        listContainer.innerHTML = `
            <div class="search-empty-state">
                <div class="empty-icon-box"><i class="fas fa-tags text-gold"></i></div>
                <h4>لا توجد نصوص موسومة في هذا التصنيف</h4>
                <p>حدد أي نص أثناء قراءة الكتب واضغط على «وسم» لإضافته هنا.</p>
            </div>
        `;
        return;
    }

    filteredItems.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'tagged-item-card';
        card.innerHTML = `
            <div class="tagged-card-header">
                <span class="tag-pill-badge" style="background-color: ${item.tagColor || '#D4AF37'};">
                    <i class="fas fa-tag"></i> ${item.tagName}
                </span>
                <span style="font-size: 10px; color: var(--text-muted);">${item.date || ''}</span>
            </div>
            <p class="tagged-quote-text">«${item.text}»</p>
            <div class="tagged-card-footer">
                <div>
                    <i class="fas fa-book-bookmark text-gold"></i> ${item.bookTitle} (صـ ${item.pageNum})
                </div>
                <div class="tagged-actions">
                    <button class="tactile-btn mini-action-btn" title="انتقال للموضع في الكتاب" onclick="jumpToTaggedSnippet('${item.bookId}', '${item.bookTitle}', ${item.pageIndex || item.pageNum})">
                        <i class="fas fa-arrow-up-right-from-square"></i>
                    </button>
                    <button class="tactile-btn mini-action-btn" title="مشاركة" onclick="shareTaggedSnippet('${item.id}')">
                        <i class="fas fa-share-nodes"></i>
                    </button>
                    <button class="tactile-btn mini-action-btn" title="حذف" style="color:#ff5252;" onclick="deleteTaggedSnippet('${item.id}')">
                        <i class="fas fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `;
        attachTactilePhysics(card);
        listContainer.appendChild(card);
    });
}

async function jumpToTaggedSnippet(bookId, bookTitle, pageIndexOrNum) {
    const book = allBooksManifest[bookId] || {};
    if (book.pdf_url) {
        window.open(book.pdf_url, '_blank');
        return;
    }
    await loadAndOpenBook(bookId, bookTitle || book.title, book.toc, book.total_pages);
    currentPageIndex = parseInt(pageIndexOrNum) || 1;
    renderCurrentPage();
}

function shareTaggedSnippet(itemId) {
    const items = getStoredTaggedSnippets();
    const target = items.find(i => i.id === itemId);
    if (!target) return;

    const shareContent = `✦ [${target.tagName}] من علوم آل محمد:\n\n«${target.text}»\n\n📖 المصدر: ${target.bookTitle} (صـ ${target.pageNum})\n✦ مكتبة سيد الساجدين: https://t.me/Jali4s`;

    if (navigator.share) {
        navigator.share({ title: target.bookTitle, text: shareContent }).catch(() => {});
    } else {
        navigator.clipboard.writeText(shareContent);
        showToast("تم نسخ النص الموسوم مع المصدر", "fa-clipboard-check");
    }
}

function deleteTaggedSnippet(itemId) {
    showConfirm("هل أنت متأكد من رغبتك في إزالة هذا الحديث من الوسوم؟", () => {
        let items = getStoredTaggedSnippets();
        items = items.filter(i => i.id !== itemId);
        saveStoredTaggedSnippets(items);
        renderTagsView(currentTagFilter);
        showToast("تمت إزالة الحديث من الوسوم", "fa-trash-can");
    });
}

// ==================== المفضلة والإشارات المرجعية ====================
function getStoredBookmarks() {
    const data = localStorage.getItem(`bookmarks_${currentBookId}`);
    return data ? JSON.parse(data) : [];
}

function toggleBookmark() {
    if (!currentBookId) return;

    let bookmarks = getStoredBookmarks();
    let curPageData = currentBookPages[currentPageIndex - 1];
    let curPageNum = curPageData ? (curPageData.page_number || currentPageIndex) : currentPageIndex;

    const existingIndex = bookmarks.findIndex(b => b.pageIndex === currentPageIndex);

    if (existingIndex !== -1) {
        bookmarks.splice(existingIndex, 1);
        showToast("تمت إزالة الإشارة المرجعية", "fa-bookmark");
    } else {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = curPageData ? curPageData.content : '';
        const preview = (tempDiv.textContent || '').trim().substring(0, 50) + '...';

        bookmarks.push({
            pageIndex: currentPageIndex,
            pageNum: curPageNum,
            preview: preview,
            date: new Date().toLocaleDateString('ar-IQ')
        });
        showToast(`تم حفظ الإشارة المرجعية (صـ ${curPageNum})`, "fa-bookmark");
    }

    try {
        localStorage.setItem(`bookmarks_${currentBookId}`, JSON.stringify(bookmarks));
    } catch (e) {}
    updateBookmarkIconState();
    renderBookmarksList();
}

function updateBookmarkIconState() {
    const btn = document.getElementById('bookmarkBtn');
    if (!btn || !currentBookId) return;
    let bookmarks = getStoredBookmarks();
    const isBookmarked = bookmarks.some(b => b.pageIndex === currentPageIndex);
    btn.innerHTML = isBookmarked ? '<i class="fas fa-bookmark" style="color:#D4AF37;"></i>' : '<i class="far fa-bookmark"></i>';
}

function renderBookmarksList() {
    const container = document.getElementById('bookmarksListContainer');
    if (!container || !currentBookId) return;

    const bookmarks = getStoredBookmarks();
    container.innerHTML = '';

    if (bookmarks.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding: 25px; font-size:12px;">لا توجد إشارات مرجعية محفوظة في هذا الكتاب.</div>';
        return;
    }

    bookmarks.forEach((b, bIdx) => {
        const div = document.createElement('div');
        div.className = 'toc-item tactile-btn';
        div.innerHTML = `
            <div style="flex:1; overflow:hidden;">
                <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                    <span class="toc-item-page">صفحة ${b.pageNum}</span>
                    <span style="font-size:10px; color:#888;">${b.date || ''}</span>
                </div>
                <p style="font-size:11px; color:#aaa; margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${b.preview}</p>
            </div>
            <button style="background:none; border:none; color:#ff5252; margin-right:8px; cursor:pointer;" onclick="deleteBookmark(${bIdx}, event)"><i class="fas fa-trash-can"></i></button>
        `;
        attachTactilePhysics(div);
        div.onclick = () => {
            currentPageIndex = b.pageIndex;
            renderCurrentPage();
            closeTocModal();
        };
        container.appendChild(div);
    });
}

function deleteBookmark(idx, event) {
    event.stopPropagation();
    let bookmarks = getStoredBookmarks();
    bookmarks.splice(idx, 1);
    try {
        localStorage.setItem(`bookmarks_${currentBookId}`, JSON.stringify(bookmarks));
    } catch (e) {}
    updateBookmarkIconState();
    renderBookmarksList();
    showToast("تم حذف الإشارة المرجعية", "fa-trash-can");
}

function switchModalTab(tab) {
    const tocTab = document.getElementById('tabTocBtn');
    const bmarksTab = document.getElementById('tabBookmarksBtn');
    const tocList = document.getElementById('tocListContainer');
    const bmarksList = document.getElementById('bookmarksListContainer');

    if (tab === 'toc') {
        tocTab.classList.add('active');
        bmarksTab.classList.remove('active');
        tocList.style.display = 'block';
        bmarksList.style.display = 'none';
    } else {
        bmarksTab.classList.add('active');
        tocTab.classList.remove('active');
        tocList.style.display = 'none';
        bmarksList.style.display = 'block';
    }
}

// ==================== تخصيص المظهر والقراءة ====================
function setReadingTheme(themeName) {
    const appBody = document.getElementById('appBody');
    if (!appBody) return;
    appBody.classList.remove('theme-royal', 'theme-sepia', 'theme-dark', 'theme-light');
    appBody.classList.add(themeName);
    try {
        localStorage.setItem('reading_theme', themeName);
    } catch (e) {}
}

const savedTheme = localStorage.getItem('reading_theme');
if (savedTheme) setReadingTheme(savedTheme);

function openSettings() { const m = document.getElementById('settingsModal'); if (m) m.style.display = 'flex'; }
function closeSettings() { const m = document.getElementById('settingsModal'); if (m) m.style.display = 'none'; }

function adjustFontSize(delta) {
    let content = document.getElementById('pageContent');
    if (content) {
        let currentSize = parseInt(window.getComputedStyle(content).fontSize);
        let newSize = Math.min(Math.max(currentSize + delta, 10), 36);
        content.style.fontSize = newSize + 'px';
        const display = document.getElementById('fontSizeDisplay');
        if (display) display.innerText = newSize;
    }
}

function changeFontFamily(font) {
    const content = document.getElementById('pageContent');
    if (content) content.style.fontFamily = font === 'Amiri' ? "'Amiri', serif" : "'Cairo', sans-serif";
}

function renderTocList() {
    const tocContainer = document.getElementById('tocListContainer');
    if (!tocContainer) return;
    tocContainer.innerHTML = '';
    
    if (currentBookToc.length === 0) {
        tocContainer.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding: 20px;">لا يوجد فهرس تفصيلي مسجل.</div>';
        return;
    }

    currentBookToc.forEach(item => {
        const div = document.createElement('div');
        div.className = 'toc-item tactile-btn';
        div.innerHTML = `
            <span class="toc-item-title">${item.title}</span>
            <span class="toc-item-page">ص ${item.page_number}</span>
        `;
        attachTactilePhysics(div);
        div.onclick = () => {
            const targetIdx = currentBookPages.findIndex(p => Number(p.page_number) === Number(item.page_number));
            currentPageIndex = targetIdx !== -1 ? (targetIdx + 1) : 1;
            currentActiveSearchHighlight = "";
            renderCurrentPage();
            closeTocModal();
        };
        tocContainer.appendChild(div);
    });
}

function openTocModal() { const m = document.getElementById('tocModal'); if (m) m.style.display = 'flex'; }
function closeTocModal() { const m = document.getElementById('tocModal'); if (m) m.style.display = 'none'; }

// ==================== البحث الداخلي في الكتاب ====================
function openInBookSearch() {
    const modal = document.getElementById('inBookSearchModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            const input = document.getElementById('inBookSearchInput');
            if (input) input.focus();
        }, 150);
    }
}

function closeInBookSearch() {
    const modal = document.getElementById('inBookSearchModal');
    if (modal) modal.style.display = 'none';
}

function executeInBookSearch(val) {
    const query = val.trim();
    const container = document.getElementById('inBookSearchResults');
    if (!container) return;

    if (!query) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">اكتب كلمة للبحث داخل هذا الكتاب...</p>';
        return;
    }

    container.innerHTML = '';
    let found = 0;
    const searchRegex = createArabicSearchRegex(query);
    if (!searchRegex) return;

    currentBookPages.forEach((page, idx) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = page.content || '';
        const rawText = tempDiv.textContent || '';

        if (searchRegex.test(rawText)) {
            found++;
            const snippet = generateSearchSnippet(page.content, query);
            const item = document.createElement('div');
            item.className = 'toc-item tactile-btn';
            item.innerHTML = `
                <div style="flex:1;">
                    <span style="color:#D4AF37; font-size:12px; font-weight:bold;">صفحة ${page.page_number}</span>
                    <p style="font-size:12px; color:#ddd; margin:4px 0; line-height:1.6;">${snippet}</p>
                </div>
            `;
            attachTactilePhysics(item);
            item.onclick = () => {
                currentActiveSearchHighlight = query;
                currentPageIndex = idx + 1;
                renderCurrentPage();
                closeInBookSearch();
            };
            container.appendChild(item);
        }
    });

    if (found === 0) {
        container.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:20px;">لا توجد نتائج مطابقة لـ "${query}" في هذا الكتاب.</p>`;
    }
}


// ==================== محرك الإشراقات اليومية ====================
function initDailyHadithSystem() {
    dailyHadithCollection = fallbackHadithCollection;
    loadRandomDailyHadith();

    if (hadithIntervalTimer) clearInterval(hadithIntervalTimer);
    hadithIntervalTimer = setInterval(() => {
        if (dailyHadithCollection.length > 0) {
            loadRandomDailyHadith();
        }
    }, 10000);
}

function loadRandomDailyHadith() {
    const textEl = document.getElementById('dailyHadithText');
    const sourceEl = document.getElementById('dailyHadithSource');
    if (!textEl || !sourceEl || dailyHadithCollection.length === 0) return;

    const randomIndex = Math.floor(Math.random() * dailyHadithCollection.length);
    currentDailyHadith = dailyHadithCollection[randomIndex];

    textEl.style.opacity = '0';
    setTimeout(() => {
        textEl.innerText = currentDailyHadith.text || "";
        sourceEl.innerHTML = `<i class="fas fa-feather-pointed text-gold"></i> المصدر: ${currentDailyHadith.source || "غير محدد"}`;
        textEl.style.transition = 'opacity 0.3s ease';
        textEl.style.opacity = '1';
    }, 150);
}

function shareDailyHadith() {
    if (!currentDailyHadith) return;
    const shareContent = `✦ إشراقة النور من علوم آل محمد:\n\n${currentDailyHadith.text}\n\n📖 ${currentDailyHadith.source}\n✦ مكتبة سيد الساجدين: https://t.me/Jali4s`;

    if (navigator.share) {
        navigator.share({ title: "إشراقة علوم العترة", text: shareContent }).catch(() => {});
    } else {
        navigator.clipboard.writeText(shareContent);
        showToast("تم نسخ الإشراقة المباركة مع التوثيق والمصدر", "fa-clipboard-check");
    }
}

// ==================== بناء الأغلفة والكتب ====================
function createProceduralCover(title, isPdf = false) {
    let clean = (title || "").replace(/[\u064B-\u065F\u0670ـ]/g, "").trim();
    if (clean.length > 32) clean = clean.substring(0, 30) + '...';
    let icon = isPdf ? 'fa-file-pdf' : 'fa-book-quran';
    return `
        <div class="procedural-book-cover" style="
            width: 100%; height: 100%; min-height: 140px; background: linear-gradient(135deg, #1c1815 0%, #2b211a 50%, #15110e 100%);
            border: 1px solid rgba(212, 175, 55, 0.45); border-radius: 6px; display: flex; flex-direction: column;
            align-items: center; justify-content: center; padding: 10px; box-sizing: border-box; text-align: center;
            position: relative; box-shadow: inset 0 0 14px rgba(0,0,0,0.85); overflow: hidden;
        ">
            <div style="position: absolute; top: 4px; left: 4px; right: 4px; bottom: 4px; border: 1px dashed rgba(212, 175, 55, 0.3); border-radius: 4px; pointer-events: none;"></div>
            <i class="fas ${icon}" style="color: #D4AF37; font-size: 22px; margin-bottom: 8px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));"></i>
            <span style="color: #f5eedb; font-family: 'Amiri', serif; font-size: 11.5px; font-weight: bold; line-height: 1.4; text-shadow: 0 2px 4px rgba(0,0,0,0.9); z-index: 1;">${clean}</span>
        </div>
    `;
}

// ==================== دمج وتحميل بيانات الكتب ====================
async function loadLibraryManifest() {
    const container = document.getElementById('dynamicBooksContainer');
    if (!container) return;

    allBooksManifest = {};

    try {
        const fetchPromises = MANIFEST_FILES.map(async (fileUrl) => {
            try {
                let res = await fetch(fileUrl + '?v=' + Date.now());
                if (res.ok) {
                    const data = await res.json();
                    return data.books || data;
                }
            } catch (err) {}
            return {};
        });

        const results = await Promise.all(fetchPromises);

        results.forEach(booksObj => {
            for (let [id, bookData] of Object.entries(booksObj)) {
                if (!bookData) continue;
                if (allBooksManifest[id]) {
                    const existingCover = (allBooksManifest[id].cover || "").trim();
                    const newCover = (bookData.cover || "").trim();
                    allBooksManifest[id] = { ...allBooksManifest[id], ...bookData };
                    if (existingCover !== "" && newCover === "") {
                        allBooksManifest[id].cover = existingCover;
                    }
                } else {
                    allBooksManifest[id] = bookData;
                }
            }
        });

        if (Object.keys(allBooksManifest).length === 0) {
            throw new Error("لم يتم العثور على بيانات");
        }

        processAndRenderBooks(allBooksManifest);

        const urlParams = new URLSearchParams(window.location.search);
        const targetBookId = urlParams.get('book');
        if (targetBookId && allBooksManifest[targetBookId]) {
            const b = allBooksManifest[targetBookId];
            if (b.pdf_url) {
                window.open(b.pdf_url, '_blank');
            } else {
                loadAndOpenBook(targetBookId, b.title, b.toc, b.total_pages);
            }
        }

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div style="color:#ff6b6b; grid-column: span 3; text-align: center; font-size: 13px; padding: 20px;">تعذر تحميل الفهارس. تأكد من توفر الملفات.</div>`;
    }
}

const compoundMap = {
    "الحادي والتسعون": 91, "الثاني والتسعون": 92, "الثالث والتسعون": 93, "الرابع والتسعون": 94, "الخامس والتسعون": 95, "السادس والتسعون": 96, "السابع والتسعون": 97, "الثامن والتسعون": 98, "التاسع والتسعون": 99,
    "الحادي والثمانون": 81, "الثاني والثمانون": 82, "الثالث والثمانون": 83, "الرابع والثمانون": 84, "الخامس والثمانون": 85, "السادس والثمانون": 86, "السابع والثمانون": 87, "الثامن والثمانون": 88, "التاسع والثمانون": 89,
    "الحادي والسبعون": 71, "الثاني والسبعون": 72, "الثالث والسبعون": 73, "الرابع والسبعون": 74, "الخامس والسبعون": 75, "السادس والسبعون": 76, "السابع والسبعون": 77, "الثامن والسبعون": 78, "التاسع والسبعون": 79,
    "الحادي والستون": 61, "الثاني والستون": 62, "الثالث والستون": 63, "الرابع والستون": 64, "الخامس والستون": 65, "السادس والستون": 66, "السابع والستون": 67, "الثامن والستون": 68, "التاسع والستون": 69,
    "الحادي والخمسون": 51, "الثاني والخمسون": 52, "الثالث والخمسون": 53, "الرابع والخمسون": 54, "الخامس والخمسون": 55, "السادس والخمسون": 56, "السابع والخمسون": 57, "الثامن والخمسون": 58, "التاسع والخمسون": 59,
    "الحادي والاربعون": 41, "الثاني والاربعون": 42, "الثالث والاربعون": 43, "الرابع والاربعون": 44, "الخامس والاربعون": 45, "السادس والاربعون": 46, "السابع والاربعون": 47, "الثامن والاربعون": 48, "التاسع والاربعون": 49,
    "الحادي والثلاثون": 31, "الثاني والثلاثون": 32, "الثالث والثلاثون": 33, "الرابع والثلاثون": 34, "الخامس والثلاثون": 35, "السادس والثلاثون": 36, "السابع والثلاثون": 37, "الثامن والثلاثون": 38, "التاسع والثلاثون": 39,
    "الحادي والعشرون": 21, "الثاني والعشرون": 22, "الثالث والعشرون": 23, "الرابع والعشرون": 24, "الخامس والعشرون": 25, "السادس والعشرون": 26, "السابع والعشرون": 27, "الثامن والعشرون": 28, "التاسع والعشرون": 29,
    "الحادي عشر": 11, "الثاني عشر": 12, "الثالث عشر": 13, "الرابع عشر": 14, "الخامس عشر": 15, "السادس عشر": 16, "السابع عشر": 17, "الثامن عشر": 18, "التاسع عشر": 19,
    "المائة": 100, "التسعون": 90, "الثمانون": 80, "السبعون": 70, "الستون": 60, "الخمسون": 50, "الأربعون": 40, "الثلاثون": 30, "العشرون": 20,
    "العاشر": 10, "التاسع": 9, "الثامن": 8, "السابع": 7, "السادس": 6, "الخامس": 5, "الرابع": 4, "الثالث": 3, "الثاني": 2, "الأول": 1
};

function getVolumeNumber(vol) {
    if (vol.pdf_url) return 1;
    let cleanTitle = (vol.title || "").replace(/[\u064B-\u065F\u0670ـ]/g, "");
    let norm = cleanArabicForSearch(cleanTitle);
    let lowerId = (vol.id || "").toLowerCase();

    if (norm.includes("الروضه") || lowerId.includes("rawda")) return 8;
    if (cleanTitle.includes("مخطوط") || cleanTitle.includes("نسخة")) return 1;

    if (vol.volume) {
        let cleanVol = String(vol.volume).replace(/\D/g, '');
        if (cleanVol && !isNaN(parseInt(cleanVol, 10))) return parseInt(cleanVol, 10);
    }

    let idMatch = (vol.id || "").match(/_(\d+)/);
    if (idMatch && idMatch && !isNaN(parseInt(idMatch, 10))) return parseInt(idMatch, 10);

    for (let [word, num] of Object.entries(compoundMap)) {
        if (cleanTitle.includes(word)) return num;
    }

    let textMatch = cleanTitle.match(/\d+/);
    if (textMatch && !isNaN(parseInt(textMatch[0], 10))) return parseInt(textMatch[0], 10);

    return 999;
}

function getGroupName(book, bookId) {
    let lowerId = (bookId || "").toLowerCase();
    let rawTitle = (book.title || "").trim();
    let normTitle = cleanArabicForSearch(rawTitle);

    if (book.pdf_url || lowerId.includes("mkh") || normTitle.includes("مخطوط") || normTitle.includes("وثيقه")) return rawTitle;
    if (normTitle.includes("الاصول السته عشر") || lowerId.includes("osol16")) return "الأصول الستة عشر";
    if (normTitle.includes("مناقب الامام امير") || lowerId.startsWith("mnqb_amr")) return "مناقب الإمام أمير المؤمنين (عليه السلام)";
    
    if (lowerId.startsWith("kafi") || lowerId.startsWith("rawda") || 
       (normTitle.includes("الكافي") && !normTitle.includes("مرآه")) || 
       (normTitle.includes("الروضه") && !normTitle.includes("الواعظين"))) {
        return "الكافي الشريف";
    }

    if (lowerId.startsWith("bhr") || normTitle.includes("بحار الانوار")) return "بحار الأنوار";
    if (lowerId.startsWith("mrat") || normTitle.includes("العقول")) return "مرآة العقول في شرح أخبار آل الرسول";
    if (lowerId.startsWith("iqbal") || normTitle.includes("اقبال")) return "الإقبال بالأعمال الحسنة";
    if (lowerId.startsWith("mtehjd") || normTitle.includes("المتهجد")) return "مصباح المتهجد وسلاح المتعبد";
    if (lowerId.startsWith("mhj") || normTitle.includes("مهج الدعوات")) return "مهج الدعوات ومنهج العبادات";
    if (lowerId.startsWith("hdyq") || normTitle.includes("الحدائق")) return "الحدائق الناضرة";
    if (lowerId.startsWith("brh") || normTitle.includes("البرهان")) return "تفسير البرهان";
    if (lowerId.startsWith("knz") || normTitle.includes("كنز الدقائق")) return "تفسير كنز الدقائق";
    if (lowerId.startsWith("nwr") || normTitle.includes("نور الثقلين")) return "تفسير نور الثقلين";
    if (lowerId.startsWith("kml") || normTitle.includes("كمال الدين")) return "كمال الدين وتمام النعمة";
    if (lowerId.startsWith("wsl") || normTitle.includes("وسائل الشيعه")) return "وسائل الشيعة";
    if (lowerId.startsWith("mstdrk") || normTitle.includes("مستدرك الوسائل")) return "مستدرك الوسائل";
    if (lowerId.startsWith("mzn") || normTitle.includes("الميزان")) return "تفسير الميزان";
    if (lowerId.startsWith("shf") || normTitle.includes("الصحيفه السجاديه")) return "الصحيفة السجادية";
    if (lowerId.startsWith("nahj") || normTitle.includes("نهج البلاغه")) return "نهج البلاغة";
    if (lowerId.startsWith("stb") || normTitle.includes("الاستبصار")) return "الاستبصار";
    if (lowerId.startsWith("thb") || normTitle.includes("تهذيب الاحكام")) return "تهذيب الأحكام";
    if (lowerId.startsWith("faqih") || normTitle.includes("من لا يحضره")) return "من لا يحضره الفقيه";
    if (lowerId.startsWith("ayash") || normTitle.includes("العياشي")) return "تفسير العياشي";
    if (lowerId.startsWith("htj") || normTitle.includes("الاحتجاج")) return "الإحتجاج للطبرسي";
    if (lowerId.startsWith("irshad") || normTitle.includes("الارشاد")) return "الإرشاد في معرفة حجج الله على العباد";
    if (lowerId.startsWith("amli") || normTitle.includes("امالي")) return "الأمالي";
    if (lowerId.startsWith("ilzam") || normTitle.includes("الزام الناصب")) return "إلزام الناصب في إثبات الحجة الغائب";
    if (lowerId.startsWith("bsayr") || normTitle.includes("بصائر الدرجات")) return "بصائر الدرجات";
    if (lowerId.startsWith("thwab") || normTitle.includes("ثواب الاعمال")) return "ثواب الأعمال وعقاب الأعمال";
    if (lowerId.startsWith("zad") || normTitle.includes("زاد المعاد")) return "زاد المعاد";

    if (book.series && book.series.trim() !== "") {
        return book.series.trim();
    }

    let clean = rawTitle.replace(/[\u064B-\u065F\u0670ـ]/g, "").replace(/[-–—_:\/,\.،؛\(\)]/g, ' ');
    for (let w of Object.keys(compoundMap).sort((a, b) => b.length - a.length)) {
        clean = clean.replace(new RegExp(`\\b${w}\\b`, 'gi'), '');
    }
    clean = clean.replace(/\b(?:الجزء|المجلد|جزء|مجلد|ج|م|vol|v)\b\s*\d*/gi, '')
                 .replace(/\s+\d+\s*$/g, '')
                 .replace(/\s+/g, ' ').trim();

    return clean || rawTitle;
}

function getBookCategory(book) {
    let rawTitle = (book.title || "").toLowerCase();
    let rawCat = (book.category || "").trim().toLowerCase();
    let combined = cleanArabicForSearch(rawTitle + " " + rawCat);

    if (book.pdf_url || combined.includes("مخطوط") || combined.includes("وثيقه")) return "المخطوطات والوثائق التراثية";
    if (combined.includes("كامل الزيارات") || combined.includes("علل الشرايع") || combined.includes("دلائل الامامه") || combined.includes("ارشاد القلوب") || combined.includes("كمال الدين")) return "الحديث والرواية";
    if (combined.includes("الكافي") || combined.includes("من لا يحضره") || combined.includes("تهذيب الاحكام") || combined.includes("الاستبصار")) return "الكتب الأربعة";
    if (combined.includes("غيبه") || combined.includes("الزام الناصب") || combined.includes("المهدي") || combined.includes("توقيعات") || combined.includes("الرجعه")) return "كتب الغيبة";
    if (combined.includes("تفسير") || combined.includes("قران") || combined.includes("عياشي") || combined.includes("برهان") || combined.includes("الميزان") || combined.includes("الثقلين")) return "تفسير أهل البيت";
    if (combined.includes("شبهات") || combined.includes("رد") || combined.includes("مناظرات") || combined.includes("مراجعات") || combined.includes("نقض")) return "رد الشبهات";
    if (combined.includes("سيره") || combined.includes("تاريخ") || combined.includes("مقتل") || combined.includes("ارشاد") || combined.includes("هجوم") || combined.includes("فاطمه")) return "سيرة النبي وأهل بيته";
    if (combined.includes("فقه") || combined.includes("احكام") || combined.includes("شرايع") || combined.includes("حدائق") || combined.includes("رساله")) return "الفقه";
    if (combined.includes("عقائد") || combined.includes("توحيد") || combined.includes("امامه") || combined.includes("عدل") || combined.includes("اعتقادات")) return "عقائد";
    if (combined.includes("اخلاق") || combined.includes("اداب") || combined.includes("مواعظ")) return "الأخلاق";
    if (combined.includes("دعاء") || combined.includes("ادعيه") || combined.includes("صحيفه") || combined.includes("زياره") || combined.includes("مناجات") || combined.includes("مفاتيح") || combined.includes("مزار")) return "الدعاء والزيارة";
    if (combined.includes("حديث") || combined.includes("بحار") || combined.includes("وافي") || combined.includes("وسائل") || combined.includes("مستدرك") || combined.includes("احتجاج") || combined.includes("امالي")) return "الحديث والرواية";
    
    return "المتون العامة";
}

function processAndRenderBooks(data) {
    const container = document.getElementById('dynamicBooksContainer');
    const track = document.getElementById('heroSliderTrack');
    const indicators = document.getElementById('heroIndicators');
    
    if (!container) return;
    container.innerHTML = "";
    if (track) track.innerHTML = "";
    if (indicators) indicators.innerHTML = "";

    const bookKeys = Object.keys(data);
    if (bookKeys.length === 0) return;

    const groups = {};
    bookKeys.forEach(bookId => {
        let book = data[bookId];
        book.id = bookId;
        let groupName = getGroupName(book, bookId);
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(book);
    });

    const sortedGroupTitles = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'ar', { numeric: true, sensitivity: 'base' }));

    let heroCount = 0;
    sortedGroupTitles.forEach(groupTitle => {
        const booksInGroup = groups[groupTitle];
        booksInGroup.sort((a, b) => getVolumeNumber(a) - getVolumeNumber(b));

        const mainBook = booksInGroup[0];
        const isSeries = booksInGroup.length > 1;
        const isPdfManuscript = !!mainBook.pdf_url;

        let coverSrc = "";
        for (let b of booksInGroup) {
            let candidate = (b.cover || "").trim();
            if (candidate !== "") { coverSrc = candidate; break; }
        }

        let coverHtml = coverSrc !== "" 
            ? `<div class="book-cover-wrapper"><img src="${coverSrc}" class="book-cover-img" onerror="this.onerror=null; this.parentElement.innerHTML=createProceduralCover('${groupTitle}', ${isPdfManuscript});"></div>`
            : `<div class="book-cover-wrapper">${createProceduralCover(groupTitle, isPdfManuscript)}</div>`;

        let subtitle = isPdfManuscript ? `${mainBook.total_pages || 0} لوحة` : (isSeries ? `${booksInGroup.length} أجزاء` : `${mainBook.total_pages || 0} صـ`);
        let cleanTitleForSearch = groupTitle.replace(/ی/g, "ي").replace(/ک/g, "ك").replace(/ة/g, "ه").replace(/[أإآ]/g, "ا");
        
        let isFeatured = false;
        if (cleanTitleForSearch.includes("الهجوم") || cleanTitleForSearch.includes("نعماني") || cleanTitleForSearch.includes("الكافي") || cleanTitleForSearch.includes("سجاديه") || cleanTitleForSearch.includes("توحيد المفضل")) {
            isFeatured = true;
        }

        if (track && isFeatured && heroCount < 10) {
            const slide = document.createElement('div');
            slide.className = 'hero-slide tactile-btn';
            slide.innerHTML = `
                ${coverHtml}
                <div class="hero-slide-content">
                    <span class="hero-slide-tag">مميز</span>
                    <h4 class="hero-slide-title">${groupTitle}</h4>
                    <p class="hero-slide-desc">${subtitle}</p>
                    <button class="hero-slide-btn">قراءة الآن</button>
                </div>
            `;
            attachTactilePhysics(slide);
            
            if (isPdfManuscript) slide.onclick = () => window.open(mainBook.pdf_url, '_blank');
            else if (isSeries) slide.onclick = () => openVolumesModal(groupTitle, booksInGroup);
            else slide.onclick = () => loadAndOpenBook(mainBook.id, mainBook.title, mainBook.toc, mainBook.total_pages);
            
            track.appendChild(slide);
            
            const dot = document.createElement('div');
            dot.className = 'hero-dot' + (heroCount === 0 ? ' active' : '');
            indicators.appendChild(dot);
            heroCount++;
        }

        const card = document.createElement("div");
        card.className = "book-card tactile-btn";
        card.innerHTML = `
            ${coverHtml}
            <div class="book-info">
                <h4 class="text-white">${groupTitle}</h4>
                <p class="text-muted">${subtitle}</p>
                <div class="progress-bar" style="width: 100%;"><div class="progress-fill" style="width: 100%;"></div></div>
            </div>
        `;
        attachTactilePhysics(card);

        if (isPdfManuscript) card.onclick = () => window.open(mainBook.pdf_url, '_blank');
        else if (isSeries) card.onclick = () => openVolumesModal(groupTitle, booksInGroup);
        else card.onclick = () => loadAndOpenBook(mainBook.id, mainBook.title, mainBook.toc, mainBook.total_pages);
        
        container.appendChild(card);
    });

    renderSearchFilterPills(groups);
    if (heroCount > 0) setupHeroSlider(heroCount);
}

let heroSliderTimer = null;
function setupHeroSlider(count) {
    clearInterval(heroSliderTimer);
    let currentIndex = 0;
    const track = document.getElementById('heroSliderTrack');
    const dots = document.querySelectorAll('.hero-dot');
    if (!track) return;

    track.addEventListener('scroll', () => {
        let index = Math.round(Math.abs(track.scrollLeft) / track.clientWidth);
        if (index < count) {
            currentIndex = index;
            dots.forEach(d => d.classList.remove('active'));
            if (dots[currentIndex]) dots[currentIndex].classList.add('active');
        }
    }, { passive: true });

    heroSliderTimer = setInterval(() => {
        currentIndex++;
        if (currentIndex >= count) currentIndex = 0;
        const slide = track.children[currentIndex];
        if (slide) {
            track.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
        }
    }, 4000);
}

function renderCatalogAccordion() {
    const catalogContainer = document.getElementById('catalogAccordionContainer');
    if (!catalogContainer) return;
    if (Object.keys(allBooksManifest).length === 0) return;

    const categoriesMap = {};
    const bookKeys = Object.keys(allBooksManifest);
    const groups = {};

    bookKeys.forEach(bookId => {
        let book = allBooksManifest[bookId];
        book.id = bookId;
        let groupName = getGroupName(book, bookId);
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(book);
    });

    Object.keys(groups).forEach(groupTitle => {
        const booksInGroup = groups[groupTitle];
        booksInGroup.sort((a, b) => getVolumeNumber(a) - getVolumeNumber(b));
        const mainBook = booksInGroup[0];
        const cat = getBookCategory(mainBook);

        if (!categoriesMap[cat]) categoriesMap[cat] = [];
        categoriesMap[cat].push({ groupTitle, booksInGroup, mainBook });
    });

    catalogContainer.innerHTML = '';

    const categoryOrder = [
        "تفسير أهل البيت", "الكتب الأربعة", "الحديث والرواية", "كتب الغيبة", 
        "عقائد", "الفقه", "سيرة النبي وأهل بيته", "رد الشبهات", "الأخلاق", 
        "الدعاء والزيارة", "المخطوطات والوثائق التراثية", "المتون العامة"
    ];

    const sortedCategories = Object.keys(categoriesMap).sort((a, b) => {
        let indexA = categoryOrder.indexOf(a.trim());
        let indexB = categoryOrder.indexOf(b.trim());
        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;
        if (indexA === 999 && indexB === 999) return a.localeCompare(b, 'ar');
        return indexA - indexB;
    });

    sortedCategories.forEach((catName, index) => {
        const items = categoriesMap[catName];
        if (!items || items.length === 0) return;

        items.sort((a, b) => a.groupTitle.localeCompare(b.groupTitle, 'ar', { numeric: true }));

        const accordionId = `acc_item_${index}`;
        const itemDiv = document.createElement('div');
        itemDiv.className = 'catalog-accordion-item';
        itemDiv.innerHTML = `
            <div class="catalog-accordion-header tactile-btn" onclick="toggleAccordionBody('${accordionId}')">
                <h4><i class="fas fa-bookmark text-gold"></i> ${catName} <span class="results-badge" style="font-size: 10px; margin-right: 6px;">${items.length} كتاب</span></h4>
                <i class="fas fa-chevron-down text-gold" id="icon_${accordionId}" style="transition: transform 0.3s;"></i>
            </div>
            <div class="catalog-accordion-body" id="${accordionId}">
                <div class="books-grid-container" id="grid_${accordionId}" style="padding: 4px 0 !important;"></div>
            </div>
        `;
        attachTactilePhysics(itemDiv.querySelector('.catalog-accordion-header'));
        catalogContainer.appendChild(itemDiv);

        const gridEl = itemDiv.querySelector(`#grid_${accordionId}`);
        items.forEach(item => {
            const { groupTitle, booksInGroup, mainBook } = item;
            const isSeries = booksInGroup.length > 1;
            const isPdfManuscript = !!mainBook.pdf_url;

            let coverSrc = "";
            for (let b of booksInGroup) {
                let candidate = (b.cover || "").trim();
                if (candidate !== "") { coverSrc = candidate; break; }
            }

            let coverHtml = coverSrc !== "" 
                ? `<div class="book-cover-wrapper"><img src="${coverSrc}" class="book-cover-img" onerror="this.onerror=null; this.parentElement.innerHTML=createProceduralCover('${groupTitle}', ${isPdfManuscript});"></div>`
                : `<div class="book-cover-wrapper">${createProceduralCover(groupTitle, isPdfManuscript)}</div>`;

            let subtitle = isPdfManuscript ? `${mainBook.total_pages || 0} لوحة` : (isSeries ? `${booksInGroup.length} أجزاء` : `${mainBook.total_pages || 0} صـ`);

            const card = document.createElement("div");
            card.className = "book-card tactile-btn";
            card.innerHTML = `
                ${coverHtml}
                <div class="book-info">
                    <h4 class="text-white">${groupTitle}</h4>
                    <p class="text-muted">${subtitle}</p>
                    <div class="progress-bar" style="width: 100%;"><div class="progress-fill" style="width: 100%;"></div></div>
                </div>
            `;
            attachTactilePhysics(card);

            if (isPdfManuscript) card.onclick = () => window.open(mainBook.pdf_url, '_blank');
            else if (isSeries) card.onclick = () => openVolumesModal(groupTitle, booksInGroup);
            else card.onclick = () => loadAndOpenBook(mainBook.id, mainBook.title, mainBook.toc, mainBook.total_pages);
            
            gridEl.appendChild(card);
        });
    });
}

function toggleAccordionBody(accId) {
    const bodyEl = document.getElementById(accId);
    const iconEl = document.getElementById(`icon_${accId}`);
    if (!bodyEl) return;

    const isOpen = bodyEl.classList.contains('open');
    document.querySelectorAll('.catalog-accordion-body').forEach(b => b.classList.remove('open'));
    document.querySelectorAll('.catalog-accordion-header i.fa-chevron-up').forEach(i => i.className = 'fas fa-chevron-down text-gold');

    if (!isOpen) {
        bodyEl.classList.add('open');
        if (iconEl) iconEl.className = 'fas fa-chevron-up text-gold';
    }
}

// ==================== قائمة اختيار الأجزاء ====================
function openVolumesModal(seriesTitle, volumesList) {
    const modalTitle = document.getElementById('volumesModalTitle');
    const container = document.getElementById('volumesListContainer');
    if (modalTitle) modalTitle.innerText = seriesTitle;
    if (!container) return;

    volumesList.sort((a, b) => getVolumeNumber(a) - getVolumeNumber(b));
    container.innerHTML = '';
    
    volumesList.forEach(vol => {
        let volNum = getVolumeNumber(vol);
        let volLabel = (volNum !== 999 && !isNaN(volNum)) ? `الجزء ${volNum}` : (vol.title || seriesTitle);

        const item = document.createElement('div');
        item.className = 'toc-item tactile-btn';
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                <i class="fas fa-book text-gold"></i>
                <span class="toc-item-title" style="font-weight: bold; font-size: 14px;">${volLabel}</span>
            </div>
            <span class="toc-item-page">${vol.total_pages || 0} ص</span>
        `;
        attachTactilePhysics(item);
        item.onclick = () => {
            closeVolumesModal();
            if (vol.pdf_url) {
                window.open(vol.pdf_url, '_blank');
            } else {
                loadAndOpenBook(vol.id, vol.title, vol.toc, vol.total_pages);
            }
        };
        container.appendChild(item);
    });

    const modal = document.getElementById('volumesModal');
    if (modal) modal.style.display = 'flex';
}

function closeVolumesModal() {
    const modal = document.getElementById('volumesModal');
    if (modal) modal.style.display = 'none';
}

// ==================== محرك تصدير الكتاب كـ PDF ====================
function downloadBookAsPDF() {
    if (!currentBookPages || currentBookPages.length === 0) {
        showToast("لا يوجد كتاب", "fa-triangle-exclamation");
        return;
    }
    showToast("جاري تجهيز PDF...", "fa-spinner");
    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'absolute';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = 'none';
    document.body.appendChild(printIframe);
    const doc = printIframe.contentWindow.document;
    let fullContent = `<html dir="rtl" lang="ar"><head><title>${currentBookTitle}</title><style>@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap'); body { font-family: 'Amiri', serif; line-height: 1.8; padding: 20px; color: #000; background: #fff; } .page-break { page-break-after: always; } .book-cover { text-align: center; margin-top: 30%; page-break-after: always; } h1 { font-size: 32px; margin-bottom: 20px; } .pagen { display: none; }</style></head><body><div class="book-cover"><h1>${currentBookTitle}</h1><p>تم التصدير من مكتبة سيد الساجدين</p></div>`;
    currentBookPages.forEach((page, index) => {
        fullContent += `<div class="page-content">${page.content}</div><div style="text-align: center; font-size: 12px; margin-top: 20px;">- صـ ${page.page_number || (index + 1)} -</div><div class="page-break"></div>`;
    });
    fullContent += `</body></html>`;
    doc.open();
    doc.write(fullContent);
    doc.close();
    setTimeout(() => {
        printIframe.contentWindow.focus();
        printIframe.contentWindow.print();
        setTimeout(() => { document.body.removeChild(printIframe); }, 1000);
    }, 1500);
}

// ==================== محرك البحث الشامل والمتكامل ====================
async function executeGlobalSearch() {
    const query = document.getElementById('searchInput').value.trim();
    const container = document.getElementById('searchResultsContainer');
    const statusInfo = document.getElementById('searchStatusInfo');
    const countBadge = document.getElementById('searchResultCount');
    const filterBadge = document.getElementById('searchFilterName');

    if (!container) return;

    if (!query) {
        if (statusInfo) statusInfo.style.display = 'none';
        container.innerHTML = `<div class="search-empty-state"><div class="empty-icon-box"><i class="fas fa-book-bookmark text-gold"></i></div><h4>ابحث في أسماء المتون، الأبواب، أو نصوص الصفحات</h4><p>حدد النوع والنطاق من الأزرار أعلاه ثم اكتب عبارة البحث.</p></div>`;
        return;
    }

    let targetBookIds = Object.keys(allBooksManifest);
    let filterLabel = "في كل المكتبة";

    if (currentSearchScope !== 'all') {
        if (currentSearchScope.startsWith('group:')) {
            const gTarget = currentSearchScope.replace('group:', '');
            targetBookIds = targetBookIds.filter(bId => getGroupName(allBooksManifest[bId], bId) === gTarget);
            filterLabel = `في ${gTarget}`;
        }
    }

    container.innerHTML = "";
    let foundCount = 0;

    if (currentSearchTarget === 'toc') {
        targetBookIds.forEach(bookId => {
            let book = allBooksManifest[bookId];
            let groupName = getGroupName(book, bookId);
            let rawTitle = book.title || "";

            if (checkSearchMatch(rawTitle, query, currentSearchMatchType) || checkSearchMatch(groupName, query, currentSearchMatchType)) {
                foundCount++;
                const bookCard = document.createElement('div');
                bookCard.className = "search-result-card tactile-btn";
                bookCard.style.borderRight = "3px solid #D4AF37";
                const highlightedHeader = highlightArabicText(rawTitle || groupName, query);
                bookCard.innerHTML = `<div class="search-card-header"><h4><i class="fas fa-book-open text-gold"></i> ${highlightedHeader}</h4><span class="search-page-badge">${book.pdf_url ? 'مخطوط PDF' : 'كتاب كامل'}</span></div><p class="search-snippet" style="color: var(--text-gold);">اضغط لفتح هذا المجلد مباشرة.</p>`;
                attachTactilePhysics(bookCard);
                bookCard.onclick = () => { if (book.pdf_url) window.open(book.pdf_url, '_blank'); else loadAndOpenBook(book.id, book.title, book.toc, book.total_pages, null, query); };
                container.appendChild(bookCard);
            }

            if (book.toc && Array.isArray(book.toc)) {
                book.toc.forEach(tocItem => {
                    let tocTitle = tocItem.title || "";
                    if (checkSearchMatch(tocTitle, query, currentSearchMatchType)) {
                        foundCount++;
                        const tocCard = document.createElement('div');
                        tocCard.className = "search-result-card tactile-btn";
                        const highlightedToc = highlightArabicText(tocItem.title, query);
                        tocCard.innerHTML = `<div class="search-card-header"><h4 style="font-size: 13px;"><i class="fas fa-bookmark text-gold"></i> ${highlightedToc}</h4><span class="search-page-badge">صـ ${tocItem.page_number}</span></div><p class="search-snippet">${rawTitle || groupName}</p>`;
                        attachTactilePhysics(tocCard);
                        tocCard.onclick = () => loadAndOpenBook(book.id, book.title, book.toc, book.total_pages, tocItem.page_number, query);
                        container.appendChild(tocCard);
                    }
                });
            }
        });

        if (statusInfo && countBadge && filterBadge) {
            statusInfo.style.display = 'flex';
            countBadge.innerText = `${foundCount} نتائج`;
            filterBadge.innerText = `${filterLabel} (أبواب)`;
        }

        if (foundCount === 0) {
            container.innerHTML = `<div class="search-empty-state"><div class="empty-icon-box"><i class="fas fa-search-minus" style="color: var(--text-muted);"></i></div><h4>لم نجد أبواباً مطابقة.</h4></div>`;
        }
    } 
    else if (currentSearchTarget === 'fulltext') {
        const progressIndicator = document.createElement('div');
        progressIndicator.className = "glass-box";
        progressIndicator.style.padding = "10px 14px";
        progressIndicator.style.marginBottom = "10px";
        progressIndicator.style.textAlign = "center";
        progressIndicator.style.fontSize = "12px";
        progressIndicator.style.color = "var(--gold-bright)";
        progressIndicator.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري البحث المتقدم... (<span id="deepSearchProgress">0%</span>)`;
        container.appendChild(progressIndicator);

        isDeepSearching = true;
        let total = targetBookIds.length;
        let processed = 0;

        for (const bookId of targetBookIds) {
            if (!isDeepSearching) break;
            try {
                const bookMeta = allBooksManifest[bookId];
                if (bookMeta.pdf_url) continue;

                let bookData = null;
                const cached = localStorage.getItem(`book_pages_${bookId}`);
                if (cached) {
                    bookData = { pages: JSON.parse(cached) };
                } else {
                    bookData = await fetchBookData(bookId);
                }

                if (bookData && bookData.pages) {
                    bookData.pages.forEach(page => {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = page.content || '';
                        const rawText = tempDiv.textContent || tempDiv.innerText || '';

                        if (checkSearchMatch(rawText, query, currentSearchMatchType)) {
                            foundCount++;
                            const snippet = generateSearchSnippet(page.content, query);
                            const card = document.createElement('div');
                            card.className = "search-result-card tactile-btn";
                            card.style.borderLeft = "3px solid #4caf50";
                            card.innerHTML = `<div class="search-card-header"><h4 style="font-size: 13px;"><i class="fas fa-quote-right" style="color:#4caf50;"></i> ${bookMeta.title}</h4><span class="search-page-badge">صـ ${page.page_number}</span></div><p class="search-snippet" style="color: #fff;">${snippet}</p>`;
                            attachTactilePhysics(card);
                            card.onclick = () => loadAndOpenBook(bookId, bookMeta.title, bookMeta.toc, bookMeta.total_pages, page.page_number, query);
                            container.appendChild(card);
                        }
                    });
                }
            } catch (e) {}

            processed++;
            const progEl = document.getElementById('deepSearchProgress');
            if (progEl) {
                progEl.innerText = `${Math.round((processed / total) * 100)}%`;
            }
        }

        progressIndicator.remove();
        isDeepSearching = false;

        if (statusInfo && countBadge && filterBadge) {
            statusInfo.style.display = 'flex';
            countBadge.innerText = `${foundCount} نتائج`;
            filterBadge.innerText = `${filterLabel} (نصوص)`;
        }

        if (foundCount === 0) {
            container.innerHTML = `<div class="search-empty-state"><div class="empty-icon-box"><i class="fas fa-search-minus" style="color: var(--text-muted);"></i></div><h4>لم نجد نصوصاً مطابقة.</h4></div>`;
        }
    }
}

function openSearch() { 
    showView('searchView'); 
    setTimeout(() => { 
        const input = document.getElementById('searchInput'); 
        if (input) input.focus(); 
    }, 150); 
}

function closeSearch() { 
    isDeepSearching = false; 
    if (history.state && history.state.view === 'searchView') {
        history.back(); 
    } else {
        showView('homeView', false); 
    }
}

function setSearchTargetMode(mode) { 
    currentSearchTarget = mode; 
    document.getElementById('searchTargetTocBtn')?.classList.toggle('active', mode === 'toc'); 
    document.getElementById('searchTargetTextBtn')?.classList.toggle('active', mode === 'fulltext'); 
    executeGlobalSearch(); 
}

function renderSearchFilterPills(groups) { 
    const container = document.getElementById('searchFilterPills'); 
    if (!container) return; 
    
    container.innerHTML = `<button class="filter-pill ${currentSearchScope === 'all' ? 'active' : ''} tactile-btn" onclick="setSearchScope('all', this)"><i class="fas fa-globe"></i> كل المكتبة</button>`; 
    
    Object.keys(groups).forEach(gName => { 
        const btn = document.createElement('button'); 
        btn.className = `filter-pill ${currentSearchScope === 'group:' + gName ? 'active' : ''} tactile-btn`; 
        btn.innerHTML = `<i class="fas fa-book"></i> ${gName}`; 
        btn.onclick = () => setSearchScope('group:' + gName, btn); 
        container.appendChild(btn); 
    }); 
}

function setSearchScope(scopeKey, element) { 
    currentSearchScope = scopeKey; 
    document.querySelectorAll('#searchFilterPills .filter-pill').forEach(el => el.classList.remove('active')); 
    if (element) element.classList.add('active'); 
    executeGlobalSearch(); 
}

function handleSearchInput(val) { 
    const clearBtn = document.getElementById('searchClearBtn'); 
    if (clearBtn) clearBtn.style.display = val.trim().length > 0 ? 'block' : 'none'; 
    isDeepSearching = false; 
    clearTimeout(searchDebounceTimer); 
    searchDebounceTimer = setTimeout(() => { executeGlobalSearch(); }, 250); 
}

function clearSearch() { 
    const input = document.getElementById('searchInput'); 
    if (input) { 
        input.value = ''; 
        input.focus(); 
    } 
    handleSearchInput(''); 
}

// ==================== تفعيل نظام الحواشي المنبثقة الذكي عند الضغط ====================
document.addEventListener('click', function(e) {
    let target = e.target.closest('a');
    if (!target) return;

    let href = target.getAttribute('href');
    if (href && href.startsWith('#') && (target.classList.contains('footnote-ref') || target.classList.contains('note') || href.includes('fn'))) {
        e.preventDefault(); 
        
        let footnoteId = href.substring(1);
        let footnoteElement = document.getElementById(footnoteId);
        
        if (footnoteElement) {
            let fnText = footnoteElement.innerHTML;
            showFootnoteToast(fnText);
        }
    }
});

// تهيئة المشروع عند التحميل
document.querySelectorAll('.tactile-btn').forEach(btn => attachTactilePhysics(btn));
loadLibraryManifest();
initDailyHadithSystem();
