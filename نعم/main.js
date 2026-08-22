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

// متغيرات نظام البحث المتقدم
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

// دالة توحيد وتجميع العناوين بذكاء
function getGroupName(book, bookId) {
    if (book.series && book.series.trim() !== "") return book.series.trim();

    let title = book.title || "";

    if (bookId.toLowerCase().startsWith("kafi") || title.includes("الكافي")) {
        return "الكافي الشريف";
    }

    if (bookId.toLowerCase().startsWith("sahifa") || title.includes("الصحيفة السجادية")) {
        return "الصحيفة السجادية";
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

// 2. جلب الكتب من السحابة وتجميع المجلدات
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

        // إنشاء بطاقات العرض
        Object.keys(groups).forEach(groupTitle => {
            const booksInGroup = groups[groupTitle];
            
            // ترتيب المجلدات تصاعدياً بعدياً
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
                card.onclick = () => openReaderEngine(mainBook.id, mainBook.title, pagesArray, mainBook.toc);
            }

            container.appendChild(card);
        });

        // توليد أزرار فلترة البحث (Chips)
        renderSearchFilterPills(groups);
    });
}

// 3. نافذة اختيار المجلدات
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
            openReaderEngine(vol.id, vol.title, pagesArr, vol.toc);
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
function openReaderEngine(bookId, bookTitle, pagesArray, tocArray) {
    showView('readerView');
    
    document.getElementById('readerTitle').innerText = bookTitle;
    
    currentBookPages = pagesArray || [];
    currentBookPages.sort((a, b) => Number(a.page_number) - Number(b.page_number));
    currentBookToc = tocArray || [];

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

    if (rangeSlider) {
        rangeSlider.max = currentBookPages.length;
        rangeSlider.value = currentPageIndex;
    }
    if (currentLbl) currentLbl.innerText = currentPageIndex;
    if (totalLbl) totalLbl.innerText = currentBookPages.length;
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
            currentPageIndex = item.page_number;
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
    let num = parseInt(val);
    if (!isNaN(num) && num >= 1 && num <= currentBookPages.length) {
        currentPageIndex = num;
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
        let newSize = Math.min(Math.max(currentSize + delta, 15), 36);
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

// ==================== 6. محرك البحث الشامل المطور ====================

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

// توليد أزرار فلترة البحث (Filter Chips)
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
    
    // إعادة تنفيذ البحث مع الفلتر الجديد
    executeGlobalSearch();
}

function handleSearchInput(val) {
    const clearBtn = document.getElementById('searchClearBtn');
    if (clearBtn) clearBtn.style.display = val.trim().length > 0 ? 'block' : 'none';

    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        executeGlobalSearch();
    }, 250); // بحث فوري تلقائي بعد 250 جزء من الثانية
}

function clearSearch() {
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = '';
        input.focus();
    }
    handleSearchInput('');
}

// دالة استخراج المقتطف وتظليل الكلمة المطابقة
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

    // تمييز الكلمة المبحوث عنها بلون ذهبي متوهج
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
                <h4>ابحث في الآلاف من صفحات المتون</h4>
                <p>اكتب أي كلمة، عبارة، أو اسم راوٍ للوصول الفوري إلى نصه وموضعه بدقة.</p>
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
                    openReaderEngine(bookId, book.title, pages, book.toc);
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

// تفعيل التأثيرات عند التحميل
document.querySelectorAll('.tactile-btn').forEach(btn => attachTactilePhysics(btn));
loadBooksFromCloud();
