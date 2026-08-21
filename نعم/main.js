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

function attachTactilePhysics(btn) {
    btn.addEventListener('touchstart', () => btn.classList.add('pressed'), { passive: true });
    btn.addEventListener('touchend', () => btn.classList.remove('pressed'), { passive: true });
    btn.addEventListener('touchcancel', () => btn.classList.remove('pressed'), { passive: true });
}

function showView(viewId) {
    document.querySelectorAll('.stage-view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');

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

// 2. جلب الكتب وعرضها
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

        bookKeys.forEach(bookId => {
            let book = allBooksData[bookId];
            let title = book.title || "كتاب تراثي";
            let pagesArray = book.pages ? (Array.isArray(book.pages) ? book.pages : Object.values(book.pages)) : [];
            let tocArray = book.toc || [];
            let subtitle = `${pagesArray.length} صفحة`;
            
            let coverHtml = '';
            if (book.cover_url && book.cover_url.trim() !== "") {
                coverHtml = `<div class="book-cover-wrapper"><img src="${book.cover_url}" alt="${title}"></div>`;
            } else {
                coverHtml = `<div class="book-cover-wrapper"><i class="fas fa-book text-dark"></i></div>`;
            }

            const card = document.createElement("div");
            card.className = "book-card tactile-btn";
            card.innerHTML = `
                ${coverHtml}
                <div class="book-info">
                    <h4 class="text-white">${title}</h4>
                    <p class="text-muted">${subtitle}</p>
                    <div class="progress-bar" style="width: 100%;"><div class="progress-fill" style="width: 100%;"></div></div>
                </div>
            `;
            
            attachTactilePhysics(card);
            card.onclick = () => openReaderEngine(bookId, title, pagesArray, tocArray);
            container.appendChild(card);
        });
    });
}

// 3. محرك القراءة وعرض الفهرس
function openReaderEngine(bookId, bookTitle, pagesArray, tocArray) {
    showView('readerView');
    
    document.getElementById('readerTitle').innerText = bookTitle;
    
    currentBookPages = pagesArray;
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
    contentDiv.innerHTML = pageData.content || "صفحة فارغة";
    contentDiv.parentElement.scrollTop = 0;

    if (rangeSlider) {
        rangeSlider.max = currentBookPages.length;
        rangeSlider.value = currentPageIndex;
    }
    if (currentLbl) currentLbl.innerText = currentPageIndex;
    if (totalLbl) totalLbl.innerText = currentBookPages.length;
}

// توليد قائمة الفهرست
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
        div.className = 'toc-item';
        div.innerHTML = `
            <span class="toc-item-title">${item.title}</span>
            <span class="toc-item-page">ص ${item.page_number}</span>
        `;
        div.onclick = () => {
            currentPageIndex = item.page_number;
            renderCurrentPage();
            closeTocModal();
        };
        tocContainer.appendChild(div);
    });
}

function openTocModal() { document.getElementById('tocModal').style.display = 'flex'; }
function closeTocModal() { document.getElementById('tocModal').style.display = 'none'; }

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

// الإعدادات والخطوط
function openSettings() { document.getElementById('settingsModal').style.display = 'flex'; }
function closeSettings() { document.getElementById('settingsModal').style.display = 'none'; }
function adjustFontSize(delta) {
    let content = document.getElementById('pageContent');
    if(content) {
        let currentSize = parseInt(window.getComputedStyle(content).fontSize);
        let newSize = Math.min(Math.max(currentSize + delta, 15), 36);
        content.style.fontSize = newSize + 'px';
        document.getElementById('fontSizeDisplay').innerText = newSize;
    }
}
function changeFontFamily(font) {
    document.getElementById('pageContent').style.fontFamily = font === 'Amiri' ? "'Amiri', serif" : "'Cairo', sans-serif";
}

// البحث الشامل
function openSearch() { showView('searchView'); }
function closeSearch() { showView('homeView'); }

function executeGlobalSearch() {
    const query = document.getElementById('searchInput').value.trim();
    const container = document.getElementById('searchResultsContainer');
    if (!query || Object.keys(allBooksData).length === 0) return;
    
    container.innerHTML = '<div style="color:var(--gold-main); text-align:center;">جاري البحث في المكتبة...</div>';
    container.innerHTML = "";
    
    let found = 0;
    const cleanQuery = query.replace(/[\u064B-\u065F\u0670ـ]/g, "");

    Object.keys(allBooksData).forEach(bookId => {
        let book = allBooksData[bookId];
        let pages = book.pages ? (Array.isArray(book.pages) ? book.pages : Object.values(book.pages)) : [];
        
        pages.forEach((page, idx) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = page.content || "";
            const plainText = tempDiv.textContent || tempDiv.innerText || "";
            const cleanContent = plainText.replace(/[\u064B-\u065F\u0670ـ]/g, "");

            if (cleanContent.includes(cleanQuery)) {
                found++;
                const card = document.createElement('div');
                card.className = "search-result-card tactile-btn";
                
                card.innerHTML = `
                    <h4 style="color:var(--gold-main);">${book.title || 'كتاب'} (صفحة ${page.page_number})</h4>
                    <p class="text-white" style="font-size:13px; line-height:1.6;">${plainText.substring(0, 90)}...</p>
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

    if (found === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); text-align:center;">لم يتم العثور على نتائج مطابقة.</div>';
    }
}

document.querySelectorAll('.tactile-btn').forEach(btn => attachTactilePhysics(btn));
loadBooksFromCloud();
