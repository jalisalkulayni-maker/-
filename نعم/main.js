// 1. إعداد السحابة (Firebase)
const firebaseConfig = {
    apiKey: "AIzaSyCJbtJIg2rWaeepTVT3sgK19vjV2KdDRZI",
    authDomain: "library-3ad36.firebaseapp.com",
    databaseURL: "https://library-3ad36-default-rtdb.firebaseio.com",
    projectId: "library-3ad36",
    storageBucket: "library-3ad36.firebasestorage.app",
    messagingSenderId: "1031442308287",
    appId: "1:1031442308287:web:59cfe611c56a8858587a0a"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let allBooksData = {};
let currentBookPages = [];
let currentBookToc = [];
let currentPageIndex = 1;
let currentBookTotalPages = 0;
let currentBookId = "";

let currentSearchFilter = 'all';
let searchDebounceTimer = null;
let savedSelectionRange = null;

function attachTactilePhysics(btn) {
    if (!btn) return;
    btn.addEventListener('touchstart', () => btn.classList.add('pressed'), { passive: true });
    btn.addEventListener('touchend', () => btn.classList.remove('pressed'), { passive: true });
    btn.addEventListener('touchcancel', () => btn.classList.remove('pressed'), { passive: true });
}

function showView(viewId) {
    document.querySelectorAll('.stage-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');

    const bottomNav = document.querySelector('.glass-bottom-nav');
    if (bottomNav) {
        bottomNav.style.display = (viewId === 'readerView') ? 'none' : 'block';
    }
}

function switchTab(clickedBtn) {
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    clickedBtn.classList.add('active');
    if (clickedBtn.innerText.includes('الرواق')) showView('homeView');
}

// دالة تجميع الكتب
function getGroupName(book, bookId) {
    if (book.series && book.series.trim() !== "") return book.series.trim();

    let title = book.title || "";
    let lowerId = (bookId || "").toLowerCase();

    if (lowerId.startsWith("kafi") || title.includes("الكافي")) return "الكافي الشريف";
    if (lowerId.startsWith("sahifa") || title.includes("الصحيفة السجادية")) return "الصحيفة السجادية";
    if (lowerId.startsWith("bihar") || lowerId.startsWith("behar") || title.includes("بحار الأنوار") || title.includes("بحار الانوار")) return "بحار الأنوار";

    return title
        .replace(/[\u064B-\u065F\u0670ـ]/g, "")
        .replace(/[أإآ]/g, "ا")
        .replace(/[-–—_]/g, ' ')
        .replace(/الجزء\s*(الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|\d+)/gi, '')
        .replace(/المجلد\s*(الأول|الاول|الثاني|الثالث|الرابع|الخامس|\d+)/gi, '')
        .replace(/\s+/g, ' ')
        .trim() || title;
}

// 2. تحميل الكتب
function loadBooksFromCloud() {
    const container = document.getElementById('dynamicBooksContainer');
    if (!container) return;

    db.ref("books").once("value", snapshot => {
        if (!snapshot.exists()) {
            container.innerHTML = '<div style="color:var(--text-muted); grid-column: span 2; text-align: center;">لا توجد كتب حالياً.</div>';
            return;
        }

        container.innerHTML = ""; 
        allBooksData = snapshot.val(); 

        const bookKeys = Object.keys(allBooksData);
        const groups = {};

        bookKeys.forEach(bookId => {
            let book = allBooksData[bookId];
            book.id = bookId;
            let groupName = getGroupName(book, bookId);
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(book);
        });

        Object.keys(groups).forEach(groupTitle => {
            const booksInGroup = groups[groupTitle];
            booksInGroup.sort((a, b) => (a.id || "").localeCompare(b.id || "", undefined, { numeric: true }));

            const mainBook = booksInGroup[0];
            const isSeries = booksInGroup.length > 1;

            let coverSrc = "";
            for (let b of booksInGroup) {
                let candidate = (b.cover || b.cover_url || "").trim();
                if (candidate !== "") { coverSrc = candidate; break; }
            }

            let coverHtml = coverSrc !== "" 
                ? `<div class="book-cover-wrapper"><img src="${coverSrc}" alt="${groupTitle}"></div>`
                : `<div class="book-cover-wrapper"><i class="fas fa-book-open text-dark"></i></div>`;

            let pagesArray = mainBook.pages ? (Array.isArray(mainBook.pages) ? mainBook.pages : Object.values(mainBook.pages)) : [];
            let totalPages = mainBook.total_pages || pagesArray.length;
            let subtitle = isSeries ? `${booksInGroup.length} أجزاء / مجلدات` : `${totalPages} صفحة`;

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
            if (isSeries) {
                card.onclick = () => openVolumesModal(groupTitle, booksInGroup);
            } else {
                card.onclick = () => openReaderEngine(mainBook.id, mainBook.title, pagesArray, mainBook.toc, mainBook.total_pages);
            }
            container.appendChild(card);
        });

        renderSearchFilterPills(groups);
    });
}

// 3. نافذة المجلدات
function openVolumesModal(seriesTitle, volumesList) {
    const modalTitle = document.getElementById('volumesModalTitle');
    const container = document.getElementById('volumesListContainer');
    if (modalTitle) modalTitle.innerText = seriesTitle;
    if (!container) return;

    container.innerHTML = '';
    volumesList.forEach(vol => {
        let pagesArr = vol.pages ? (Array.isArray(vol.pages) ? vol.pages : Object.values(vol.pages)) : [];
        let pagesCount = vol.total_pages || pagesArr.length || 0;

        const item = document.createElement('div');
        item.className = 'toc-item tactile-btn';
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                <i class="fas fa-book text-gold"></i>
                <span class="toc-item-title">${vol.title || seriesTitle}</span>
            </div>
            <span class="toc-item-page">${pagesCount} ص</span>
        `;
        attachTactilePhysics(item);
        item.onclick = () => {
            closeVolumesModal();
            openReaderEngine(vol.id, vol.title, pagesArr, vol.toc, vol.total_pages);
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

// 4. محرك القراءة وعرض الصفحات
function openReaderEngine(bookId, bookTitle, pagesArray, tocArray, totalPages) {
    showView('readerView');
    currentBookId = bookId;
    document.getElementById('readerTitle').innerText = bookTitle;
    
    currentBookPages = pagesArray || [];
    currentBookPages.sort((a, b) => Number(a.page_number) - Number(b.page_number));
    currentBookToc = tocArray || [];

    let maxNum = 0;
    currentBookPages.forEach(p => {
        let n = Number(p.page_number);
        if (!isNaN(n) && n > maxNum) maxNum = n;
        if (p.content) {
            let m = p.content.match(/الصفحة\s*(\d+)/);
            if (m && Number(m[1]) > maxNum) maxNum = Number(m[1]);
        }
    });

    currentBookTotalPages = totalPages || (maxNum > 0 ? maxNum : currentBookPages.length);

    currentPageIndex = 1;
    renderCurrentPage();
    renderTocList();
}

function renderCurrentPage() {
    const contentDiv = document.getElementById('pageContent');
    const rangeSlider = document.getElementById('pageRangeSlider');
    const currentLbl = document.getElementById('currentPaginationLabel');
    const totalLbl = document.getElementById('totalPaginationLabel');
    const topIndicator = document.getElementById('topPageIndicator');

    if (currentBookPages.length === 0) {
        contentDiv.innerHTML = '<div style="text-align:center; color:#888;">لا توجد صفحات متاحة.</div>';
        return;
    }

    const pageData = currentBookPages[currentPageIndex - 1];
    contentDiv.innerHTML = pageData ? (pageData.content || "صفحة فارغة") : "صفحة فارغة";
    contentDiv.parentElement.scrollTop = 0;

    let displayPage = pageData ? (pageData.page_number || currentPageIndex) : currentPageIndex;
    const pagenEl = contentDiv.querySelector('.pagen');
    if (pagenEl) {
        const match = pagenEl.innerText.match(/\d+/);
        if (match) displayPage = match[0];
    }

    // تصغير الحواشي
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
    if (topIndicator) topIndicator.innerText = `صفحة ${displayPage} من ${currentBookTotalPages}`;
}

// التقليب بالنقر على أطراف الشاشة
function handleScreenTap(e) {
    if (window.getSelection && window.getSelection().toString().length > 0) return;
    if (e.target.closest('a, button, input, .glass-modal, .selection-toolbar')) return;

    const screenWidth = window.innerWidth;
    const tapX = e.clientX;

    if (tapX < screenWidth * 0.3) nextPage();
    else if (tapX > screenWidth * 0.7) prevPage();
}

// ==================== تلوين وتظليل النصوص المحددة ====================

document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    const toolbar = document.getElementById('selectionToolbar');
    if (!toolbar) return;

    if (selection && selection.toString().trim().length > 0) {
        savedSelectionRange = selection.getRangeAt(0).cloneRange();
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
}

function removeHighlight() {
    if (!savedSelectionRange) return;
    document.execCommand('removeFormat', false, null);
    document.getElementById('selectionToolbar').style.display = 'none';
    window.getSelection().removeAllRanges();
}

// ==================== وضعيات ألوان القراءة ====================

function setReadingTheme(themeName) {
    const appBody = document.getElementById('appBody');
    if (!appBody) return;
    appBody.classList.remove('theme-royal', 'theme-sepia', 'theme-dark', 'theme-light');
    appBody.classList.add(themeName);
    localStorage.setItem('reading_theme', themeName);
}

// استعادة الثيم المحفوظ
const savedTheme = localStorage.getItem('reading_theme');
if (savedTheme) setReadingTheme(savedTheme);

// ==================== البحث داخل الكتاب المفتوح ====================

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
    const query = val.trim().toLowerCase();
    const container = document.getElementById('inBookSearchResults');
    if (!container) return;

    if (!query) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">اكتب كلمة للبحث داخل هذا الكتاب...</p>';
        return;
    }

    container.innerHTML = '';
    let found = 0;
    const cleanQ = query.replace(/[\u064B-\u065F\u0670ـ]/g, "");

    currentBookPages.forEach((page, idx) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = page.content || '';
        const text = tempDiv.textContent || '';
        const cleanText = text.replace(/[\u064B-\u065F\u0670ـ]/g, "").toLowerCase();

        if (cleanText.includes(cleanQ)) {
            found++;
            const item = document.createElement('div');
            item.className = 'toc-item tactile-btn';
            item.innerHTML = `
                <div style="flex:1;">
                    <span style="color:#D4AF37; font-size:12px; font-weight:bold;">صفحة ${page.page_number}</span>
                    <p style="font-size:12px; color:#aaa; margin:2px 0;">${text.substring(0, 80)}...</p>
                </div>
            `;
            attachTactilePhysics(item);
            item.onclick = () => {
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

// ==================== الانتقال المطور للصفحات ====================

function openPageJumpModal() {
    const modal = document.getElementById('pageJumpModal');
    const input = document.getElementById('jumpPageInput');
    const minDisplay = document.getElementById('jumpMinPageDisplay');
    const maxDisplay = document.getElementById('jumpMaxPageDisplay');
    if (!modal) return;

    let firstPageNum = currentBookPages.length > 0 ? (currentBookPages[0].page_number || 1) : 1;
    let lastPageNum = currentBookTotalPages || currentBookPages.length;

    if (minDisplay) minDisplay.innerText = firstPageNum;
    if (maxDisplay) maxDisplay.innerText = lastPageNum;

    let curPageData = currentBookPages[currentPageIndex - 1];
    let curPageNum = curPageData ? (curPageData.page_number || currentPageIndex) : currentPageIndex;

    if (input) {
        input.value = curPageNum;
        input.min = firstPageNum;
        input.max = lastPageNum;
    }

    modal.style.display = 'flex';
    setTimeout(() => { if (input) { input.focus(); input.select(); } }, 150);
}

function closePageJumpModal() {
    const modal = document.getElementById('pageJumpModal');
    if (modal) modal.style.display = 'none';
}

function executeCustomJump() {
    const input = document.getElementById('jumpPageInput');
    if (!input) return;

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

    renderCurrentPage();
    closePageJumpModal();
}

function quickStepPage(step) {
    const input = document.getElementById('jumpPageInput');
    if (input) {
        let cur = parseInt(input.value) || currentPageIndex;
        input.value = Math.max(1, cur + step);
    }
}

function jumpToBoundary(type) {
    currentPageIndex = (type === 'first') ? 1 : currentBookPages.length;
    renderCurrentPage();
    closePageJumpModal();
}

// 5. الفهرست والتحكم بالصفحات
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
            renderCurrentPage();
            closeTocModal();
        };
        tocContainer.appendChild(div);
    });
}

function openTocModal() { const m = document.getElementById('tocModal'); if (m) m.style.display = 'flex'; }
function closeTocModal() { const m = document.getElementById('tocModal'); if (m) m.style.display = 'none'; }

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

function closeReader() { showView('homeView'); }

// 6. الإعدادات والخطوط
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

// 7. البحث الشامل
function openSearch() { 
    showView('searchView');
    setTimeout(() => {
        const input = document.getElementById('searchInput');
        if (input) input.focus();
    }, 150);
}

function closeSearch() { showView('homeView'); }

function renderSearchFilterPills(groups) {
    const container = document.getElementById('searchFilterPills');
    if (!container) return;

    container.innerHTML = `
        <button class="filter-pill ${currentSearchFilter === 'all' ? 'active' : ''} tactile-btn" onclick="setSearchFilter('all', this)">
            <i class="fas fa-globe"></i> كل المكتبة
        </button>
    `;

    Object.keys(groups).forEach(gName => {
        const btn = document.createElement('button');
        btn.className = `filter-pill ${currentSearchFilter === 'group:' + gName ? 'active' : ''} tactile-btn`;
        btn.innerHTML = `<i class="fas fa-book"></i> ${gName}`;
        btn.onclick = () => setSearchFilter('group:' + gName, btn);
        container.appendChild(btn);
    });
}

function setSearchFilter(filterKey, element) {
    currentSearchFilter = filterKey;
    document.querySelectorAll('.filter-pill').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');
    executeGlobalSearch();
}

function handleSearchInput(val) {
    const clearBtn = document.getElementById('searchClearBtn');
    if (clearBtn) clearBtn.style.display = val.trim().length > 0 ? 'block' : 'none';

    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => { executeGlobalSearch(); }, 250);
}

function clearSearch() {
    const input = document.getElementById('searchInput');
    if (input) { input.value = ''; input.focus(); }
    handleSearchInput('');
}

function generateHighlightedSnippet(fullText, rawQuery) {
    const cleanText = fullText.replace(/[\u064B-\u065F\u0670ـ]/g, "");
    const cleanQuery = rawQuery.replace(/[\u064B-\u065F\u0670ـ]/g, "").trim();
    
    const matchIndex = cleanText.indexOf(cleanQuery);
    if (matchIndex === -1) return fullText.substring(0, 110) + '...';

    const start = Math.max(0, matchIndex - 35);
    const end = Math.min(fullText.length, matchIndex + cleanQuery.length + 65);
    let snippet = fullText.substring(start, end);

    if (start > 0) snippet = '...' + snippet;
    if (end < fullText.length) snippet = snippet + '...';

    const regex = new RegExp(`(${rawQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return snippet.replace(regex, `<mark class="search-highlight">$1</mark>`);
}

function executeGlobalSearch() {
    const query = document.getElementById('searchInput').value.trim();
    const container = document.getElementById('searchResultsContainer');
    const statusInfo = document.getElementById('searchStatusInfo');
    const countBadge = document.getElementById('searchResultCount');
    const filterBadge = document.getElementById('searchFilterName');

    if (!container) return;

    if (!query) {
        if (statusInfo) statusInfo.style.display = 'none';
        container.innerHTML = `
            <div class="search-empty-state">
                <div class="empty-icon-box"><i class="fas fa-book-bookmark text-gold"></i></div>
                <h4>ابحث في أسماء الكتب والمتون</h4>
                <p>اكتب اسم الكتاب أو أي عبارة للوصول الفوري إلى الموضع بدقة.</p>
            </div>
        `;
        return;
    }

    let targetBookIds = Object.keys(allBooksData);
    let filterLabel = "في كل الكتب";

    if (currentSearchFilter !== 'all') {
        if (currentSearchFilter.startsWith('group:')) {
            const gTarget = currentSearchFilter.replace('group:', '');
            targetBookIds = targetBookIds.filter(bId => getGroupName(allBooksData[bId], bId) === gTarget);
            filterLabel = `في ${gTarget}`;
        } else {
            targetBookIds = targetBookIds.filter(bId => bId === currentSearchFilter);
        }
    }

    container.innerHTML = "";
    let foundCount = 0;
    const cleanQuery = query.replace(/[\u064B-\u065F\u0670ـ]/g, "").toLowerCase();

    // البحث في أسماء الكتب
    const matchedGroups = {};
    targetBookIds.forEach(bookId => {
        let book = allBooksData[bookId];
        let groupName = getGroupName(book, bookId);
        let cleanTitle = (book.title || "").replace(/[\u064B-\u065F\u0670ـ]/g, "").toLowerCase();
        let cleanGroup = groupName.replace(/[\u064B-\u065F\u0670ـ]/g, "").toLowerCase();

        if (cleanTitle.includes(cleanQuery) || cleanGroup.includes(cleanQuery)) {
            if (!matchedGroups[groupName]) matchedGroups[groupName] = [];
            matchedGroups[groupName].push(book);
        }
    });

    Object.keys(matchedGroups).forEach(gTitle => {
        foundCount++;
        const books = matchedGroups[gTitle];
        const isSeries = books.length > 1;
        const main = books[0];
        const pArr = main.pages ? (Array.isArray(main.pages) ? main.pages : Object.values(main.pages)) : [];

        const bookResult = document.createElement('div');
        bookResult.className = "search-result-card tactile-btn";
        bookResult.style.borderRight = "3px solid #D4AF37";
        bookResult.innerHTML = `
            <div class="search-card-header">
                <h4><i class="fas fa-book-open text-gold"></i> كتاب: ${gTitle}</h4>
                <span class="search-page-badge">${isSeries ? books.length + ' مجلدات' : 'متن كامل'}</span>
            </div>
            <p class="search-snippet" style="color: var(--text-gold);">اضغط لفتح هذا الكتاب مباشرة من قائمة النتائج.</p>
        `;
        attachTactilePhysics(bookResult);
        bookResult.onclick = () => {
            if (isSeries) openVolumesModal(gTitle, books);
            else openReaderEngine(main.id, main.title, pArr, main.toc, main.total_pages);
        };
        container.appendChild(bookResult);
    });

    // البحث في المتون
    targetBookIds.forEach(bookId => {
        let book = allBooksData[bookId];
        let pages = book.pages ? (Array.isArray(book.pages) ? book.pages : Object.values(book.pages)) : [];
        
        pages.forEach((page, idx) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = page.content || "";
            const plainText = tempDiv.textContent || tempDiv.innerText || "";
            const cleanContent = plainText.replace(/[\u064B-\u065F\u0670ـ]/g, "").toLowerCase();

            if (cleanContent.includes(cleanQuery)) {
                foundCount++;
                const snippetHTML = generateHighlightedSnippet(plainText, query);
                const card = document.createElement('div');
                card.className = "search-result-card tactile-btn";
                card.innerHTML = `
                    <div class="search-card-header">
                        <h4><i class="fas fa-feather-pointed text-gold"></i> ${book.title || 'كتاب'}</h4>
                        <span class="search-page-badge">صفحة ${page.page_number}</span>
                    </div>
                    <p class="search-snippet">${snippetHTML}</p>
                `;
                attachTactilePhysics(card);
                card.onclick = () => {
                    openReaderEngine(bookId, book.title, pages, book.toc, book.total_pages);
                    currentPageIndex = idx + 1;
                    renderCurrentPage();
                };
                container.appendChild(card);
            }
        });
    });

    if (statusInfo && countBadge && filterBadge) {
        statusInfo.style.display = 'flex';
        countBadge.innerText = `${foundCount} نتيجة`;
        filterBadge.innerText = filterLabel;
    }

    if (foundCount === 0) {
        container.innerHTML = `
            <div class="search-empty-state">
                <div class="empty-icon-box"><i class="fas fa-search-minus" style="color: var(--text-muted);"></i></div>
                <h4>لم نجد نتائج مطابقة لـ "${query}"</h4>
                <p>تأكد من كتابة الكلمة بدون أخطاء إملائية أو جرب البحث بكلمة مرادفة.</p>
            </div>
        `;
    }
}

document.querySelectorAll('.tactile-btn').forEach(btn => attachTactilePhysics(btn));
loadBooksFromCloud();
