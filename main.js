// ==================== إعدادات ومسارات النظام ====================
// قائمة ملفات الفهرس المنفصلة (يمكنك إضافة المزيد هنا مستقبلاً)
const MANIFEST_FILES = [
    "./manifest.json",
    "./manifest_2.json",
    "./data/manifest.json",
    "./data/manifest_2.json"
];

// المسار الافتراضي للكتب ومجلد data
const BOOKS_FOLDER_PATH = "./data/";
const CLOUD_FALLBACK_URL = "https://cdn.jsdelivr.net/gh/jalisalkulayni-maker/-@main/";

let allBooksManifest = {};
let currentBookPages = [];
let currentBookToc = [];
let currentPageIndex = 1;
let currentBookTotalPages = 0;
let currentBookId = "";
let currentBookTitle = "";

let currentSearchScope = 'all';        // نطاق البحث: كل المكتبة / سلسلة معينة / جزء
let currentSearchTarget = 'toc';       // نوع البحث: 'toc' (أبواب وفصول) أو 'fulltext' (نصوص وصفحات)
let searchDebounceTimer = null;
let savedSelectionRange = null;
let savedSelectionText = "";

let currentTagFilter = 'all';
let dailyHadithCollection = [];
let currentDailyHadith = null;
let hadithIntervalTimer = null;
let isDeepSearching = false;

// متغير لحفظ موضع التمرير في الشاشة الرئيسية
let savedScrollPosition = 0;

// ==================== نظام التنبيهات والإشعارات ====================
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

// ==================== البيانات الافتراضية ====================
const defaultTags = [
    { name: "عقائد", color: "#D4AF37" },
    { name: "أخلاق ومواعظ", color: "#4caf50" },
    { name: "استدلال فقهي", color: "#2196f3" },
    { name: "مراجعة لاحقة", color: "#e91e63" }
];

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

// ==================== إدارة التبويبات والشاشات مع دعم الرجوع الذكي ====================
function showView(viewId, pushHistory = true) {
    // حفظ موضع التمرير إذا كنا نغادر الشاشة الرئيسية
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

    // إضافة الحالة لتاريخ المتصفح لمنع إعادة تحميل الصفحة
    if (pushHistory) {
        history.pushState({ view: viewId }, '', '');
    }

    // استعادة موضع التمرير عند الرجوع للرئيسية
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
    } else if (tabKey === 'catalog') {
        document.getElementById('navCatalogBtn')?.classList.add('active');
        showView('catalogView');
        renderCatalogAccordion();
    } else if (tabKey === 'tags') {
        document.getElementById('navTagsBtn')?.classList.add('active');
        showView('tagsView');
        renderTagsView(currentTagFilter);
    } else if (tabKey === 'search') {
        document.getElementById('navSearchBtn')?.classList.add('active');
        openSearch();
    }
}

// الاستماع لزر الرجوع في الهاتف للتعامل معه دون إعادة تحميل
window.addEventListener('popstate', (event) => {
    // 1. إغلاق النوافذ المنبثقة أولاً إن وجدت
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

    // 2. التنقل للشاشة السابقة بسلاسة
    const targetView = event.state?.view || 'homeView';
    showView(targetView, false);

    // تحديث أزرار شريط التنقل السفلي
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    if (targetView === 'homeView') {
        document.getElementById('navHomeBtn')?.classList.add('active');
    } else if (targetView === 'catalogView') {
        document.getElementById('navCatalogBtn')?.classList.add('active');
    } else if (targetView === 'tagsView') {
        document.getElementById('navTagsBtn')?.classList.add('active');
    }
});

// ==================== معالجة وتوحيد النصوص العربية واستخراج الأرقام ====================
function normalizeArabicText(text) {
    if (!text) return "";
    return text
        .replace(/[\u064B-\u065F\u0670ـ]/g, "")
        .replace(/[أإآ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .toLowerCase()
        .trim();
}

function getVolumeNumber(vol) {
    if (vol.volume) {
        let cleanVol = String(vol.volume).replace(/\D/g, '');
        if (cleanVol) return parseInt(cleanVol, 10);
    }

    let idMatch = (vol.id || "").match(/_(\d+)/);
    if (idMatch && idMatch) return parseInt(idMatch, 10);

    let textMatch = (vol.title || "").match(/\d+/);
    if (textMatch) return parseInt(textMatch[0], 10);

    const compoundMap = {
        "الحادي والتسعون": 91, "الثاني والتسعون": 92, "الثالث والتسعون": 93, "الرابع والتسعون": 94,
        "الخامس والتسعون": 95, "السادس والتسعون": 96, "السابع والتسعون": 97, "الثامن والتسعون": 98, "التاسع والتسعون": 99,
        "الحادي والثمانون": 81, "الثاني والثمانون": 82, "الثالث والثمانون": 83, "الرابع والثمانون": 84,
        "الخامس والثمانون": 85, "السادس والثمانون": 86, "السابع والثمانون": 87, "الثامن والثمانون": 88, "التاسع والثمانون": 89,
        "الحادي والسبعون": 71, "الثاني والسبعون": 72, "الثالث والسبعون": 73, "الرابع والسبعون": 74,
        "الخامس والسبعون": 75, "السادس والسبعون": 76, "السابع والسبعون": 77, "الثامن والسبعون": 78, "التاسع والسبعون": 79,
        "الحادي والستون": 61, "الثاني والستون": 62, "الثالث والستون": 63, "الرابع والستون": 64,
        "الخامس والستون": 65, "السادس والستون": 66, "السابع والستون": 67, "الثامن والستون": 68, "التاسع والستون": 69,
        "الحادي والخمسون": 51, "الثاني والخمسون": 52, "الثالث والخمسون": 53, "الرابع والخمسون": 54,
        "الخامس والخمسون": 55, "السادس والخمسون": 56, "السابع والخمسون": 57, "الثامن والخمسون": 58, "التاسع والخمسون": 59,
        "الحادي والاربعون": 41, "الحادي والأربعون": 41, "الثاني والاربعون": 42, "الثاني والأربعون": 42,
        "الثالث والاربعون": 43, "الثالث والأربعون": 43, "الرابع والاربعون": 44, "الرابع والأربعون": 44,
        "الخامس والاربعون": 45, "الخامس والأربعون": 45, "السادس والاربعون": 46, "السادس والأربعون": 46,
        "السابع والاربعون": 47, "السابع والأربعون": 47, "الثامن والاربعون": 48, "الثامن والأربعون": 48,
        "التاسع والاربعون": 49, "التاسع والأربعون": 49,
        "الحادي والثلاثون": 31, "الثاني والثلاثون": 32, "الثالث والثلاثون": 33, "الرابع والثلاثون": 34,
        "الخامس والثلاثون": 35, "السادس والثلاثون": 36, "السابع والثلاثون": 37, "الثامن والثلاثون": 38, "التاسع والثلاثون": 39,
        "الحادي والعشرون": 21, "الثاني والعشرون": 22, "الثالث والعشرون": 23, "الرابع والعشرون": 24,
        "الخامس والعشرون": 25, "السادس والعشرون": 26, "السابع والعشرون": 27, "الثامن والعشرون": 28, "التاسع والعشرون": 29,
        "الحادي عشر": 11, "الثاني عشر": 12, "الثالث عشر": 13, "الرابع عشر": 14, "الخامس عشر": 15,
        "السادس عشر": 16, "السابع عشر": 17, "الثامن عشر": 18, "التاسع عشر": 19,
        "المائة": 100, "المئة": 100, "التسعون": 90, "الثمانون": 80, "السبعون": 70,
        "الستون": 60, "الخمسون": 50, "الأربعون": 40, "الاربعون": 40, "الثلاثون": 30, "العشرون": 20,
        "العاشر": 10, "التاسع": 9, "الثامن": 8, "السابع": 7, "السادس": 6,
        "الخامس": 5, "الرابع": 4, "الثالث": 3, "الثاني": 2, "الأول": 1, "الاول": 1
    };

    let cleanTitle = (vol.title || "").replace(/[\u064B-\u065F\u0670ـ]/g, "");
    for (let [word, num] of Object.entries(compoundMap)) {
        if (cleanTitle.includes(word)) return num;
    }
    return 999;
}

// دالة التجميع الذكية والموسعة لجميع السلاسل
function getGroupName(book, bookId) {
    let lowerId = (bookId || "").toLowerCase();
    let rawTitle = (book.title || "").trim();
    let normTitle = normalizeArabicText(rawTitle);

    if (lowerId.startsWith("bhr") || lowerId.startsWith("bihar") || normTitle.includes("بحار الانوار")) return "بحار الأنوار";
    if (lowerId.startsWith("kafi") || normTitle.includes("الكافي") || normTitle.includes("الاصول") || normTitle.includes("الفروع") || normTitle.includes("الروضه")) return "الكافي الشريف";
    if (lowerId.startsWith("hdyq") || lowerId.startsWith("hadaiq") || normTitle.includes("الحدائق")) return "الحدائق الناضرة";
    if (lowerId.startsWith("brh") || lowerId.startsWith("burhan") || normTitle.includes("البرهان")) return "تفسير البرهان";
    if (lowerId.startsWith("ayash") || lowerId.startsWith("aysh") || normTitle.includes("العياشي")) return "تفسير العياشي";
    if (lowerId.startsWith("htj") || lowerId.startsWith("iht") || normTitle.includes("الاحتجاج") || normTitle.includes("الاحتجاء")) return "الإحتجاج للطبرسي";
    if (lowerId.startsWith("wsl") || lowerId.startsWith("wasail") || normTitle.includes("وسائل الشيعه")) return "وسائل الشيعة";
    if (lowerId.startsWith("mzn") || lowerId.startsWith("mizan") || normTitle.includes("الميزان")) return "تفسير الميزان";
    if (lowerId.startsWith("shf") || lowerId.startsWith("sahifa") || normTitle.includes("الصحيفه السجاديه")) return "الصحيفة السجادية";
    if (lowerId.startsWith("nahj") || normTitle.includes("نهج البلاغه")) return "نهج البلاغة";
    if (lowerId.startsWith("stb") || lowerId.startsWith("istibsar") || normTitle.includes("الاستبصار")) return "الاستبصار";
    if (lowerId.startsWith("thb") || lowerId.startsWith("tahdhib") || normTitle.includes("تهذيب الاحكام")) return "تهذيب الأحكام";
    if (lowerId.startsWith("knz") || normTitle.includes("كنز الدقائق")) return "تفسير كنز الدقائق وبحر الغرائب";
    if (normTitle.includes("من لا يحضره")) return "من لا يحضره الفقيه";
    if (normTitle.includes("مستدرك الوسائل")) return "مستدرك الوسائل";
    if (normTitle.includes("نور الثقلين")) return "تفسير نور الثقلين";

    if (book.series && book.series.trim() !== "") {
        return book.series.trim();
    }

    let clean = rawTitle
        .replace(/[\u064B-\u065F\u0670ـ]/g, "")
        .replace(/[-–—_:\/]/g, ' ')
        .replace(/(?:الجزء|المجلد|ج|م|vol|v)?\s*(?:الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|الحادي\s*عشر|الثاني\s*عشر|الثالث\s*عشر|الرابع\s*عشر|الخامس\s*عشر|السادس\s*عشر|السابع\s*عشر|الثامن\s*عشر|التاسع\s*عشر|العشرون|[ا-ي\s]+العشرون|[ا-ي\s]+الثلاثون|[ا-ي\s]+الأربعون|[ا-ي\s]+الخمسون|[ا-ي\s]+الستون|[ا-ي\s]+السبعون|[ا-ي\s]+الثمانون|[ا-ي\s]+التسعون|\d+)/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    clean = clean.replace(/^[-–—_:\s]+|[-–—_:\s]+$/g, '');
    return clean || rawTitle;
}

function getBookCategory(book) {
    if (book.category && book.category.trim() !== "") return book.category.trim();
    let title = (book.title || "").toLowerCase();
    if (title.includes("تفسير") || title.includes("القرآن") || title.includes("قرآن") || title.includes("بيان") || title.includes("برهان") || title.includes("عياشي") || title.includes("كنز")) return "التفسير وعلوم القرآن";
    if (title.includes("حديث") || title.includes("الكافي") || title.includes("بحار") || title.includes("استبصار") || title.includes("تهذیب") || title.includes("وافي") || title.includes("من لا يحضره") || title.includes("وسائل") || title.includes("إحتجاج") || title.includes("احتجاج")) return "الحديث الشريف ومصادره";
    if (title.includes("دعاء") || title.includes("صحيفة") || title.includes("زيارة") || title.includes("مناجات") || title.includes("مفاتيح")) return "الأدعية والزيارات";
    if (title.includes("عقائد") || title.includes("توحيد") || title.includes("امامة") || title.includes("عدل") || title.includes("اعتقادات")) return "العقائد";
    if (title.includes("فقه") || title.includes("احكام") || title.includes("شرايع") || title.includes("رسالة") || title.includes("حدائق")) return "الفقه والأحكام";
    if (title.includes("تاريخ") || title.includes("سيرة") || title.includes("مقتل") || title.includes("إرشاد")) return "السيرة والتاريخ";
    return "المتون العامة";
}

// ==================== تحميل ودمج الفهارس المتعددة ====================
async function loadLibraryManifest() {
    const container = document.getElementById('dynamicBooksContainer');
    if (!container) return;

    allBooksManifest = {};

    try {
        const fetchPromises = MANIFEST_FILES.map(async (fileUrl) => {
            try {
                let res = await fetch(fileUrl + '?v=' + Date.now());
                if (!res.ok) {
                    const fileName = fileUrl.replace('./', '').replace('data/', '');
                    res = await fetch(`${CLOUD_FALLBACK_URL}${fileName}?v=` + Date.now());
                }
                if (res.ok) {
                    const data = await res.json();
                    return data.books || data;
                }
            } catch (err) {
                console.warn(`تعذر تحميل الملف: ${fileUrl}`, err);
            }
            return {};
        });

        const results = await Promise.all(fetchPromises);

        results.forEach(booksObj => {
            allBooksManifest = { ...allBooksManifest, ...booksObj };
        });

        if (Object.keys(allBooksManifest).length === 0) {
            throw new Error("لم يتم العثور على أي بيانات في ملفات manifest");
        }

        processAndRenderBooks(allBooksManifest);

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div style="color:#ff6b6b; grid-column: span 2; text-align: center; font-size: 13px; padding: 20px;">تعذر تحميل الفهارس: تأكد من مسارات ملفات manifest.</div>`;
    }
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

    const sortedGroupTitles = Object.keys(groups).sort((a, b) => 
        a.localeCompare(b, 'ar', { numeric: true, sensitivity: 'base' })
    );

    sortedGroupTitles.forEach(groupTitle => {
        const booksInGroup = groups[groupTitle];
        booksInGroup.sort((a, b) => getVolumeNumber(a) - getVolumeNumber(b));

        const mainBook = booksInGroup[0];
        const isSeries = booksInGroup.length > 1;

        let coverSrc = "";
        for (let b of booksInGroup) {
            let candidate = (b.cover || "").trim();
            if (candidate !== "") { coverSrc = candidate; break; }
        }

        let coverHtml = coverSrc !== "" 
            ? `<div class="book-cover-wrapper"><img src="${coverSrc}" class="book-cover-img" alt="${groupTitle}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-book-open text-gold\\'></i>'"></div>`
            : `<div class="book-cover-wrapper"><i class="fas fa-book-open text-gold"></i></div>`;

        let subtitle = isSeries ? `${booksInGroup.length} أجزاء / مجلدات` : `${mainBook.total_pages || 0} صفحة`;

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
            card.onclick = () => loadAndOpenBook(mainBook.id, mainBook.title, mainBook.toc, mainBook.total_pages);
        }
        container.appendChild(card);
    });

    renderSearchFilterPills(groups);
}

function renderCatalogAccordion() {
    const catalogContainer = document.getElementById('catalogAccordionContainer');
    if (!catalogContainer) return;

    if (Object.keys(allBooksManifest).length === 0) {
        catalogContainer.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:30px;">جاري تحميل الفهرس...</div>';
        return;
    }

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

    const sortedCategories = Object.keys(categoriesMap).sort((a, b) => 
        a.localeCompare(b, 'ar', { numeric: true })
    );

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

            let coverSrc = "";
            for (let b of booksInGroup) {
                let candidate = (b.cover || "").trim();
                if (candidate !== "") { coverSrc = candidate; break; }
            }

            let coverHtml = coverSrc !== "" 
                ? `<div class="book-cover-wrapper"><img src="${coverSrc}" class="book-cover-img" alt="${groupTitle}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-book-open text-gold\\'></i>'"></div>`
                : `<div class="book-cover-wrapper"><i class="fas fa-book-open text-gold"></i></div>`;

            let subtitle = isSeries ? `${booksInGroup.length} أجزاء` : `${mainBook.total_pages || 0} صفحة`;

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
                card.onclick = () => loadAndOpenBook(mainBook.id, mainBook.title, mainBook.toc, mainBook.total_pages);
            }
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
            loadAndOpenBook(vol.id, vol.title, vol.toc, vol.total_pages);
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

// ==================== محرك القارئ وعرض الصفحات ====================
async function fetchBookData(bookId) {
    let res = await fetch(`${BOOKS_FOLDER_PATH}${bookId}.json`);
    if (!res.ok) res = await fetch(`./data/${bookId}.json`);
    if (!res.ok) res = await fetch(`./books/${bookId}.json`);
    if (!res.ok) res = await fetch(`./${bookId}.json`);
    if (!res.ok) res = await fetch(`${CLOUD_FALLBACK_URL}${bookId}.json`);
    if (!res.ok) throw new Error("تعذر جلب ملف الكتاب");
    return await res.json();
}

async function loadAndOpenBook(bookId, bookTitle, bookToc, totalPages, targetPageNumber = null) {
    showView('readerView');
    currentBookId = bookId;
    currentBookTitle = bookTitle;
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
        contentDiv.innerHTML = `<div style="text-align:center; color:#ff5252; padding:30px;">⚠️ تعذر فتح الكتاب (${bookId}.json). تأكد من اتصال الإنترنت أو رفع الأجزاء.</div>`;
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
    const cleanQ = normalizeArabicText(query);

    currentBookPages.forEach((page, idx) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = page.content || '';
        const rawText = tempDiv.textContent || '';
        const cleanText = normalizeArabicText(rawText);

        if (cleanText.includes(cleanQ)) {
            found++;
            const snippet = generateSearchSnippet(rawText, query);
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

function generateSearchSnippet(fullText, rawQuery) {
    const cleanText = normalizeArabicText(fullText);
    const cleanQuery = normalizeArabicText(rawQuery);
    const matchIndex = cleanText.indexOf(cleanQuery);

    if (matchIndex === -1) return fullText.substring(0, 90) + '...';

    const start = Math.max(0, matchIndex - 35);
    const end = Math.min(fullText.length, matchIndex + cleanQuery.length + 55);
    let snippet = fullText.substring(start, end);

    if (start > 0) snippet = '...' + snippet;
    if (end < fullText.length) snippet = snippet + '...';

    return snippet;
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

function closeReader() { 
    if (history.state && history.state.view === 'readerView') {
        history.back();
    } else {
        showView('homeView', false);
    }
}

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

// ==================== محرك البحث الشامل والمتقدم ====================
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

    container.innerHTML = `
        <button class="filter-pill ${currentSearchScope === 'all' ? 'active' : ''} tactile-btn" onclick="setSearchScope('all', this)">
            <i class="fas fa-globe"></i> كل المكتبة
        </button>
    `;

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
    if (input) { input.value = ''; input.focus(); }
    handleSearchInput('');
}

async function executeGlobalSearch() {
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
                <h4>ابحث في أسماء المتون، الأبواب، أو نصوص الصفحات</h4>
                <p>حدد النوع والنطاق من الأزرار أعلاه ثم اكتب عبارة البحث.</p>
            </div>
        `;
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
    const cleanQuery = normalizeArabicText(query);

    // 1. الوضع الأول: البحث في الأبواب والفهارس والعناوين
    if (currentSearchTarget === 'toc') {
        targetBookIds.forEach(bookId => {
            let book = allBooksManifest[bookId];
            let groupName = getGroupName(book, bookId);
            let cleanTitle = normalizeArabicText(book.title || "");
            let cleanGroup = normalizeArabicText(groupName);

            if (cleanTitle.includes(cleanQuery) || cleanGroup.includes(cleanQuery)) {
                foundCount++;
                const bookCard = document.createElement('div');
                bookCard.className = "search-result-card tactile-btn";
                bookCard.style.borderRight = "3px solid #D4AF37";
                bookCard.innerHTML = `
                    <div class="search-card-header">
                        <h4><i class="fas fa-book-open text-gold"></i> ${book.title || groupName}</h4>
                        <span class="search-page-badge">كتاب كامل</span>
                    </div>
                    <p class="search-snippet" style="color: var(--text-gold);">اضغط لفتح هذا المجلد مباشرة.</p>
                `;
                attachTactilePhysics(bookCard);
                bookCard.onclick = () => loadAndOpenBook(book.id, book.title, book.toc, book.total_pages);
                container.appendChild(bookCard);
            }

            if (book.toc && Array.isArray(book.toc)) {
                book.toc.forEach(tocItem => {
                    let cleanTocTitle = normalizeArabicText(tocItem.title || "");
                    if (cleanTocTitle.includes(cleanQuery)) {
                        foundCount++;
                        const tocCard = document.createElement('div');
                        tocCard.className = "search-result-card tactile-btn";
                        tocCard.innerHTML = `
                            <div class="search-card-header">
                                <h4 style="font-size: 13px;"><i class="fas fa-bookmark text-gold"></i> ${tocItem.title}</h4>
                                <span class="search-page-badge">صـ ${tocItem.page_number}</span>
                            </div>
                            <p class="search-snippet">${book.title || groupName}</p>
                        `;
                        attachTactilePhysics(tocCard);
                        tocCard.onclick = () => loadAndOpenBook(book.id, book.title, book.toc, book.total_pages, tocItem.page_number);
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
            container.innerHTML = `
                <div class="search-empty-state">
                    <div class="empty-icon-box"><i class="fas fa-search-minus" style="color: var(--text-muted);"></i></div>
                    <h4>لم نجد أبواباً مطابقة لـ "${query}"</h4>
                    <p>جرّب التحويل إلى خيار «نصوص وصفحات الكتب» بالأعلى.</p>
                </div>
            `;
        }
    } 
    // 2. الوضع الثاني: البحث المعمق في نصوص وصفحات الكتب
    else if (currentSearchTarget === 'fulltext') {
        const progressIndicator = document.createElement('div');
        progressIndicator.className = "glass-box";
        progressIndicator.style.padding = "10px 14px";
        progressIndicator.style.marginBottom = "10px";
        progressIndicator.style.textAlign = "center";
        progressIndicator.style.fontSize = "12px";
        progressIndicator.style.color = "var(--gold-bright)";
        progressIndicator.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري البحث في نصوص الصفحات... (<span id="deepSearchProgress">0%</span>)`;
        container.appendChild(progressIndicator);

        isDeepSearching = true;
        let total = targetBookIds.length;
        let processed = 0;

        for (const bookId of targetBookIds) {
            if (!isDeepSearching) break;

            try {
                const bookMeta = allBooksManifest[bookId];
                let bookData = null;

                const cached = localStorage.getItem(`book_pages_${bookId}`);
                if (cached) {
                    bookData = { pages: JSON.parse(cached) };
                } else {
                    bookData = await fetchBookData(bookId);
                }

                if (bookData && bookData.pages) {
                    bookData.pages.forEach(page => {
                        const temp = document.createElement('div');
                        temp.innerHTML = page.content || '';
                        const raw = temp.textContent || '';
                        const clean = normalizeArabicText(raw);

                        if (clean.includes(cleanQuery)) {
                            foundCount++;
                            const snippet = generateSearchSnippet(raw, query);
                            const card = document.createElement('div');
                            card.className = "search-result-card tactile-btn";
                            card.style.borderLeft = "3px solid #4caf50";
                            card.innerHTML = `
                                <div class="search-card-header">
                                    <h4 style="font-size: 13px;"><i class="fas fa-quote-right" style="color:#4caf50;"></i> ${bookMeta.title}</h4>
                                    <span class="search-page-badge">صـ ${page.page_number}</span>
                                </div>
                                <p class="search-snippet" style="color: #fff;">${snippet}</p>
                            `;
                            attachTactilePhysics(card);
                            card.onclick = () => loadAndOpenBook(bookId, bookMeta.title, bookMeta.toc, bookMeta.total_pages, page.page_number);
                            container.appendChild(card);
                        }
                    });
                }
            } catch (e) {}

            processed++;
            const progEl = document.getElementById('deepSearchProgress');
            if (progEl) progEl.innerText = `${Math.round((processed / total) * 100)}%`;
        }

        progressIndicator.remove();
        isDeepSearching = false;

        if (statusInfo && countBadge && filterBadge) {
            statusInfo.style.display = 'flex';
            countBadge.innerText = `${foundCount} نتائج`;
            filterBadge.innerText = `${filterLabel} (نصوص)`;
        }

        if (foundCount === 0) {
            container.innerHTML = `
                <div class="search-empty-state">
                    <div class="empty-icon-box"><i class="fas fa-search-minus" style="color: var(--text-muted);"></i></div>
                    <h4>لم نجد نصوصاً مطابقة لـ "${query}" في نطاق البحث</h4>
                    <p>تأكد من كتابة الكلمة بدون أخطاء إملائية.</p>
                </div>
            `;
        }
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
        navigator.share({ title: "إشراقة علوم العترة", text: shareContent }).catch(() => {});
    } else {
        navigator.clipboard.writeText(shareContent);
        showToast("تم نسخ الإشراقة المباركة مع التوثيق والمصدر", "fa-clipboard-check");
    }
}

// ==================== التهيئة عند بدء التشغيل ====================
document.querySelectorAll('.tactile-btn').forEach(btn => attachTactilePhysics(btn));
loadLibraryManifest();
initDailyHadithSystem();