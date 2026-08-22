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

let currentSearchFilter = 'all';
let searchDebounceTimer = null;

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

// دالة توحيد وتجميع العناوين
function getGroupName(book, bookId) {
    if (book.series && book.series.trim() !== "") return book.series.trim();

    let title = book.title || "";
    let lowerId = (bookId || "").toLowerCase();

    if (lowerId.startsWith("kafi") || title.includes("الكافي")) {
        return "الكافي الشريف";
    }

    if (lowerId.startsWith("sahifa") || title.includes("الصحيفة السجادية")) {
        return "الصحيفة السجادية";
    }

    if (lowerId.startsWith("bihar") || lowerId.startsWith("behar") || title.includes("بحار الأنوار") || title.includes("بحار الانوار")) {
        return "بحار الأنوار";
    }

    return title
        .replace(/[\u064B-\u065F\u0670ـ]/g, "")
        .replace(/[أإآ]/g, "ا")
        .replace(/[-–—_]/g, ' ')
        .replace(/الجزء\s*(الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|\d+)/gi, '')
        .replace(/المجلد\s*(الأول|الاول|الثاني|الثالث|الرابع|الخامس|\d+)/gi, '')
        .replace(/\s+/g, ' ')
        .trim() || title;
}

// 2. جلب الكتب من السحابة
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
        if (bookKeys.length === 0) {
            container.innerHTML = '<div style="color:var(--text-muted); grid-column: span 2; text-align: center;">قائمة الكتب فارغة.</div>';
            return;
        }

        const groups = {};

        bookKeys.forEach(bookId => {
            let book = allBooksData[bookId];
            book.id = bookId;

            let groupName = getGroupName(book, bookId);
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
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
                if (candidate !== "") {
                    coverSrc = candidate;
                    break;
                }
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

// 4. محرك القراءة وعرض الفهرس
function openReaderEngine(bookId, bookTitle, pagesArray, tocArray, totalPages) {
    showView('readerView');
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
    contentDiv.querySelectorAll('.fnote, .footnote, .hawamish, .margin, .note, [class*="fnote"], [class*="footnote"]').forEach(el => {
        el.style.setProperty('font-size', '10px', 'important');
        el.style.setProperty('line-height', '1.3', 'important');
        el.style.setProperty('margin-top', '4px', 'important');
        el.style.setProperty('padding-top', '3px', 'important');
    });

    contentDiv.querySelectorAll('p, div, span').forEach(el => {
        let text = el.innerText.trim();
        if (text.includes('____________') || text.startsWith('انتهى')) {
            el.style.setProperty('font-size', '10px', 'important');
            el.style.setProperty('line-height', '1.3', 'important');
        }
    });

    if (rangeSlider) {
        rangeSlider.min = 1;
        rangeSlider.max = currentBookPages.length;
        rangeSlider.value = currentPageIndex;
    }

    if (currentLbl) currentLbl.innerText = displayPage;
    if (totalLbl) totalLbl.innerText = currentBookTotalPages;
}

// التقليب بالنقر على أطراف الشاشة
function handleScreenTap(e) {
    if (window.getSelection && window.getSelection().toString().length > 0) return;
    if (e.target.closest('a, button, input, .glass-modal')) return;

    const screenWidth = window.innerWidth;
    const tapX = e.clientX;

    if (tapX < screenWidth * 0.3) {
        nextPage();
    } else if (tapX > screenWidth * 0.7) {
        prevPage();
    }
}

// ==================== نظام الانتقال المطور للصفحات ====================

function openPageJumpModal() {
    const modal = document.getElementById('pageJumpModal');
    const input = document.getElementById('jumpPageInput');
    const minDisplay = document.getElementById('jumpMinPageDisplay');
    const maxDisplay = document.getElementById('jumpMaxPageDisplay');

    if (!modal) return;

    // استخراج أصغر وأكبر رقم صفحة مطبوع
    let firstPageNum = currentBookPages.length > 0 ? (currentBookPages[0].page_number || 1) : 1;
    let lastPageNum = currentBookTotalPages || currentBookPages.length;

    if (minDisplay) minDisplay.innerText = firstPageNum;
    if (maxDisplay) maxDisplay.innerText = lastPageNum;

    // استخراج رقم الصفحة الحالية
    let curPageData = currentBookPages[currentPageIndex - 1];
    let curPageNum = curPageData ? (curPageData.page_number || currentPageIndex) : currentPageIndex;

    if (input) {
        input.value = curPageNum;
        input.min = firstPageNum;
        input.max = lastPageNum;
    }

    modal.style.display = 'flex';
    setTimeout(() => {
        if (input) {
            input.focus();
            input.select();
        }
    }, 150);
}

function closePageJumpModal() {
    const modal = document.getElementById('pageJumpModal');
    if (modal) modal.style.display = 'none';
}

function executeCustomJump() {
    const input = document.getElementById('jumpPageInput');
    if (!input) return;

    let targetPage = parseInt(input.value.trim());
    if (isNaN(targetPage)) {
        alert("يرجى كتابة رقم صفحة صحيح.");
        return;
    }

    // 1. محاولة مطابقة رقم الصفحة المطبوعة الفعلي
    let foundIndex = currentBookPages.findIndex(p => Number(p.page_number) === targetPage);

    if (foundIndex !== -1) {
        currentPageIndex = foundIndex + 1;
    } else {
        // 2. إذا لم يطابق تماماً، البحث عن أقرب صفحة له
        let closestIndex = 0;
        let minDiff = Infinity;
        currentBookPages.forEach((p, idx) => {
            let pNum = Number(p.page_number) || (idx + 1);
            let diff = Math.abs(pNum - targetPage);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = idx;
            }
        });
        currentPageIndex = closestIndex + 1;
    }

    renderCurrentPage();
    closePageJumpModal();
}

function quickStepPage(step) {
    const input = document.getElementById('jumpPageInput');
    if (input) {
        let currentVal = parseInt(input.value) || currentPageIndex;
        let newVal = Math.max(1, currentVal + step);
        input.value = newVal;
    }
}

function jumpToBoundary(type) {
    if (type === 'first') {
        currentPageIndex = 1;
    } else {
        currentPageIndex = currentBookPages.length;
    }
    renderCurrentPage();
    closePageJumpModal();
}

function renderTocList() {
    const tocContainer = document.getElementById('tocListContainer');
    if (!tocContainer) return;
    
    tocContainer.innerHTML = '';
    
    if (currentBookToc.length === 0) {
        tocContainer.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding: 20px;">لا يوجد فهرس تفصيلي مسجل لهذا الكتاب.</div>';
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

function openTocModal() { 
    const modal = document.getElementById('tocModal');
    if (modal) modal.style.display = 'flex'; 
}

function closeTocModal() { 
    const modal = document.getElementById('tocModal');
    if (modal) modal.style.display = 'none'; 
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
    showView('homeView');
}

// 5. الإعدادات والخطوط
function openSettings() { 
    const modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'flex'; 
}

function closeSettings() { 
    const modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'none'; 
}

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
    if (content) {
        content.style.fontFamily = font === 'Amiri' ? "'Amiri', serif" : "'Cairo', sans-serif";
    }
}

// ==================== 6. محرك البحث الشامل والكتب ====================

function openSearch() { 
    showView('searchView');
    setTimeout(() => {
        const input = document.getElementById('searchInput');
        if (input) input.focus();
    }, 150);
}

function closeSearch() { 
    showView('homeView'); 
}

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
    searchDebounceTimer = setTimeout(() => {
        executeGlobalSearch();
    }, 250);
}

function clearSearch() {
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = '';
        input.focus();
    }
    handleSearchInput('');
}

function generateHighlightedSnippet(fullText, rawQuery) {
    const cleanText = fullText.replace(/[\u064B-\u065F\u0670ـ]/g, "");
    const cleanQuery = rawQuery.replace(/[\u064B-\u065F\u0670ـ]/g, "").trim();
    
    const matchIndex = cleanText.indexOf(cleanQuery);
    if (matchIndex === -1) {
        return fullText.substring(0, 110) + '...';
    }

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

    // 1. مطابقة أسماء الكتب أولاً
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

    // 2. البحث في المتون
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
