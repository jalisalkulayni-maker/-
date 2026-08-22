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
let currentBookTitle = "";

let currentSearchFilter = 'all';
let searchDebounceTimer = null;
let savedSelectionRange = null;

let dailyHadithCollection = [];
let currentDailyHadith = null;

const fallbackHadithCollection = [
    {
        text: "قال أمير المؤمنين (عليه السلام): «العِلْمُ وِرَاثَةٌ كَرِيمَةٌ، وَالأَدَبُ حُلَلٌ مُجَدَّدَةٌ، وَالفِكْرُ مِرْآةٌ صَافِيَةٌ».",
        source: "نهج البلاغة - حكمة 5"
    },
    {
        text: "عن أبي عبد الله الصادق (عليه السلام) قال: «حَدِيثِي حَدِيثُ أَبِي، وَحَدِيثُ أَبِي حَدِيثُ جَدِّي، وَحَدِيثُ جَدِّي حَدِيثُ الحُسَيْنِ، وَحَدِيثُ الحُسَيْنِ حَدِيثُ الحَسَنِ، وَحَدِيثُ الحَسَنِ حَدِيثُ أَمِيرِ المُؤْمِنِينَ، وَحَدِيثُ أَمِيرِ المُؤْمِنِينَ حَدِيثُ رَسُولِ اللهِ (صلى الله عليه وآله)».",
        source: "الكافي الشريف - ج1 ص53"
    },
    {
        text: "قال الإمام علي بن الحسين السجاد (عليه السلام): «لَوْ يَعْلَمُ النَّاسُ مَا فِي طَلَبِ العِلْمِ لَطَلَبُوهُ وَلَوْ بِسَفْكِ المُهَجِ وَخَوْضِ اللُّجَجِ».",
        source: "الكافي الشريف - ج1 ص35"
    },
    {
        text: "قال الإمام الباقر (عليه السلام): «تَفَقَّهُوا فِي دِينِ اللهِ، فَإِنَّهُ مَنْ لَمْ يَتَفَقَّهْ مِنْكُمْ فِي الدِّينِ فَهُوَ أَعْرَابِيٌّ».",
        source: "المحاسن - ج1 ص219"
    },
    {
        text: "قال رسول الله (صلى الله عليه وآله): «إِنِّي تَارِكٌ فِيكُمُ الثَّقَلَيْنِ: كِتَابَ اللهِ وَعِتْرَتِي أَهْلَ بَيْتِي، مَا إِنْ تَمَسَّكْتُمْ بِهِمَا لَنْ تَضِلُّوا بَعْدِي أَبَدًا».",
        source: "كمال الدين - ص237"
    }
];

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

// 2. تحميل ومعالجة الكتب سحابياً ومحلياً مع حماية الذاكرة ومنع التجميد
function loadBooksFromCloud() {
    const container = document.getElementById('dynamicBooksContainer');
    if (!container) return;

    // استرجاع الكاش الخفيف فوراً إن وجد
    const cachedData = localStorage.getItem('library_cache_metadata');
    if (cachedData) {
        try {
            allBooksData = JSON.parse(cachedData);
            processAndRenderBooks(allBooksData);
        } catch (e) {
            console.warn("خطأ في قراءة الكاش:", e);
        }
    }

    db.ref("books").once("value")
        .then(snapshot => {
            if (!snapshot.exists()) {
                container.innerHTML = '<div style="color:var(--text-muted); grid-column: span 2; text-align: center; padding: 20px;">لا توجد كتب متاحة في قاعدة البيانات.</div>';
                return;
            }

            allBooksData = snapshot.val();

            // حفظ نسخة البيانات الوصفية الخفيفة فقط لتجنب امتلاء localStorage
            try {
                const lightMetadata = {};
                Object.keys(allBooksData).forEach(id => {
                    const b = allBooksData[id];
                    lightMetadata[id] = {
                        id: id,
                        title: b.title || "",
                        series: b.series || "",
                        cover: b.cover || b.cover_url || "",
                        total_pages: b.total_pages || (b.pages ? Object.keys(b.pages).length : 0),
                        toc: b.toc || []
                    };
                });
                localStorage.setItem('library_cache_metadata', JSON.stringify(lightMetadata));
            } catch (quotaErr) {
                console.warn("تعذر التخزين المحلي لكبر الحجم:", quotaErr);
            }

            processAndRenderBooks(allBooksData);
        })
        .catch(error => {
            console.error("خطأ الاتصال بـ Firebase:", error);
            if (!cachedData) {
                container.innerHTML = `
                    <div style="color:#ff6b6b; grid-column: span 2; text-align: center; font-size: 13px; padding: 20px;">
                        تعذر تحميل الكتب (${error.message || 'تحقق من اتصال الشبكة وقواعد Firebase'}).
                    </div>
                `;
            }
        });
}

function processAndRenderBooks(data) {
    const container = document.getElementById('dynamicBooksContainer');
    if (!container) return;
    container.innerHTML = "";

    const bookKeys = Object.keys(data);
    if (bookKeys.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); grid-column: span 2; text-align: center;">قائمة الكتب فارغة.</div>';
        return;
    }

    const groups = {};

    bookKeys.forEach(bookId => {
        let book = data[bookId];
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
    currentBookTitle = bookTitle;
    document.getElementById('readerTitle').innerText = bookTitle;
    
    // إذا لم تكن الصفحات محملة (مثلاً تم فتح الكتاب من كاش الـ metadata)، نجلبها من السحابة أو الكاش المحلي
    if (pagesArray && pagesArray.length > 0) {
        try {
            localStorage.setItem(`book_content_${bookId}`, JSON.stringify(pagesArray));
        } catch (e) {}
        currentBookPages = pagesArray;
    } else {
        const savedPages = localStorage.getItem(`book_content_${bookId}`);
        if (savedPages) {
            currentBookPages = JSON.parse(savedPages);
        } else if (allBooksData[bookId] && allBooksData[bookId].pages) {
            const raw = allBooksData[bookId].pages;
            currentBookPages = Array.isArray(raw) ? raw : Object.values(raw);
        } else {
            currentBookPages = [];
        }
    }

    if (tocArray && tocArray.length > 0) {
        try {
            localStorage.setItem(`book_toc_${bookId}`, JSON.stringify(tocArray));
        } catch (e) {}
        currentBookToc = tocArray;
    } else {
        const savedToc = localStorage.getItem(`book_toc_${bookId}`);
        currentBookToc = savedToc ? JSON.parse(savedToc) : (allBooksData[bookId]?.toc || []);
    }

    currentBookPages.sort((a, b) => Number(a.page_number) - Number(b.page_number));

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

    const savedLastPage = localStorage.getItem(`last_page_${bookId}`);
    if (savedLastPage && parseInt(savedLastPage) > 1) {
        currentPageIndex = parseInt(savedLastPage);
    } else {
        currentPageIndex = 1;
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
    contentDiv.innerHTML = pageData ? (pageData.content || "صفحة فارغة") : "صفحة فارغة";
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

function shareSelectedQuote() {
    const selectedText = window.getSelection().toString().trim();
    if (!selectedText) return;

    let pageData = currentBookPages[currentPageIndex - 1];
    let pageNum = pageData ? (pageData.page_number || currentPageIndex) : currentPageIndex;
    let quoteFormatted = `"${selectedText}"\n\n📖 المصدر: ${currentBookTitle} (صـ ${pageNum})\n✦ مكتبة سيد الساجدين: https://t.me/Jali4s`;

    if (navigator.share) {
        navigator.share({
            title: currentBookTitle,
            text: quoteFormatted
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(quoteFormatted);
        alert("تم نسخ الاقتباس مع التوثيق والمصدر بنجاح!");
    }

    document.getElementById('selectionToolbar').style.display = 'none';
    window.getSelection().removeAllRanges();
}

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

// 5. محرك الإشراقات السحابية المتجددة
function initDailyHadithSystem() {
    const cachedQuotes = localStorage.getItem('daily_quotes_cache');
    if (cachedQuotes) {
        try {
            dailyHadithCollection = JSON.parse(cachedQuotes);
            loadRandomDailyHadith();
        } catch (e) {
            dailyHadithCollection = fallbackHadithCollection;
            loadRandomDailyHadith();
        }
    } else {
        dailyHadithCollection = fallbackHadithCollection;
        loadRandomDailyHadith();
    }

    db.ref("daily_quotes").once("value", snapshot => {
        if (snapshot.exists()) {
            const cloudQuotes = snapshot.val();
            if (Array.isArray(cloudQuotes) && cloudQuotes.length > 0) {
                dailyHadithCollection = cloudQuotes;
            } else if (typeof cloudQuotes === 'object' && cloudQuotes !== null) {
                dailyHadithCollection = Object.values(cloudQuotes);
            }
            try {
                localStorage.setItem('daily_quotes_cache', JSON.stringify(dailyHadithCollection));
            } catch (e) {}
            loadRandomDailyHadith();
        }
    });
}

function loadRandomDailyHadith() {
    const textEl = document.getElementById('dailyHadithText');
    const sourceEl = document.getElementById('dailyHadithSource');
    if (!textEl || !sourceEl || dailyHadithCollection.length === 0) return;

    const randomIndex = Math.floor(Math.random() * dailyHadithCollection.length);
    currentDailyHadith = dailyHadithCollection[randomIndex];

    textEl.style.opacity = 0;
    setTimeout(() => {
        textEl.innerText = currentDailyHadith.text || "";
        sourceEl.innerHTML = `<i class="fas fa-feather-pointed text-gold"></i> المصدر: ${currentDailyHadith.source || "غير محدد"}`;
        textEl.style.transition = 'opacity 0.3s ease';
        textEl.style.opacity = 1;
    }, 150);
}

function shareDailyHadith() {
    if (!currentDailyHadith) return;

    const shareContent = `✦ إشراقة النور من علوم آل محمد:\n\n${currentDailyHadith.text}\n\n📖 ${currentDailyHadith.source}\n✦ مكتبة سيد الساجدين: https://t.me/Jali4s`;

    if (navigator.share) {
        navigator.share({
            title: "إشراقة علوم العترة",
            text: shareContent
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(shareContent);
        alert("تم نسخ الإشراقة مع التوثيق والمصدر بنجاح!");
    }
}

document.querySelectorAll('.tactile-btn').forEach(btn => attachTactilePhysics(btn));
loadBooksFromCloud();
initDailyHadithSystem();
