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

const SEARCH_FOLDERS = ["./data6/", "./data5/", "./data4/", "./data3/", "./data2/", "./data/", "./books/", "./"];
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
let currentSearchMatchType = 'exact';
let searchRequestId = 0;
let searchIndex = [];
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
let currentDeepLinkQuote = "";
let currentPersonalLibraryTab = 'recent';
let readingHistory = [];
const RECENT_SEARCH_KEY = 'recent_searches_v2';
const FAVORITE_BOOKS_KEY = 'favorite_books_v2';
const READING_HISTORY_KEY = 'reading_history_v2';
const SAVED_QUOTES_KEY = 'saved_quotes_v2';
const SAVED_NOTES_KEY = 'saved_notes_v2';

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

// ==================== مولّد الأغلفة الملكية التراثية ====================
function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function handleCoverError(img) {
    if (!img || !img.parentElement) return;
    img.onerror = null;
    const title = img.dataset.coverTitle || img.alt || "كتاب";
    const isPdf = img.dataset.pdf === "true";
    img.parentElement.innerHTML = createProceduralCover(title, isPdf);
}

function createCoverHtml(coverSrc, title, isPdf = false) {
    if (!coverSrc) {
        return `<div class="book-cover-wrapper">${createProceduralCover(title, isPdf)}</div>`;
    }
    const safeSrc = escapeHtml(String(coverSrc).trim());
    const safeTitle = escapeHtml(title);
    return `<div class="book-cover-wrapper"><img src="${safeSrc}" class="book-cover-img" alt="${safeTitle}" data-cover-title="${safeTitle}" data-pdf="${isPdf}" onerror="handleCoverError(this)"></div>`;
}

function createProceduralCover(title, isPdf = false) {
    let clean = (title || "").replace(/[\u064B-\u065F\u0670ـ]/g, "").trim();
    if (clean.length > 32) clean = clean.substring(0, 30) + '...';
    clean = escapeHtml(clean);
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
        text: "عن أبي عبد الله الصادق (عليه السلام) قال: «حَدِيثِي حَدِيثُ أَبِي، وَحَدِيثُ أَبِي حَدِيثُ جَدِّي، وَحَدِيثُ جَدِّي حَدِيثُ الحُسَيْنِ، وَحَدِيثُ الحَسَنِ حَدِيثُ أَمِيرِ المُؤْمِنِينَ، وَحَدِيثُ أَمِيرِ المُؤْمِنِينَ حَدِيثُ رَسُولِ اللهِ (صلى الله عليه وآله)».",
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

// ==================== المرشد العائم الذكي ====================
const GUIDE_STORAGE_KEY = 'library_guide_position_v2';
let guideDragState = null;
let guideStep = 0;
const guideTargets = {
    homeView: [
        {selector:'#navCatalogBtn', text:'هذه قائمة الكتب. اضغط عليها لعرض الكتب والمجموعات.'},
        {selector:'#navSearchBtn', text:'من هنا تبحث عن كتاب أو نص داخل المكتبة.'},
        {selector:'#navTagsBtn', text:'الوسوم تجمع اقتباساتك وتصنيفاتك المحفوظة.'},
        {selector:'#navAppearanceBtn', text:'من هنا تغيّر ألوان واجهة المكتبة خارج الكتب.'}
    ],
    catalogView: [
        {selector:'#navHomeBtn', text:'للعودة إلى الرواق اضغط هذا الزر.'},
        {selector:'#navSearchBtn', text:'للعثور على كتاب بسرعة استخدم البحث.'},
        {selector:'#navAppearanceBtn', text:'هنا تخصيص ألوان واجهة المكتبة.'}
    ],
    tagsView: [
        {selector:'#navHomeBtn', text:'للعودة إلى الرواق.'},
        {selector:'#navSearchBtn', text:'يمكنك البحث عن نص أو كتاب.'},
        {selector:'#navAppearanceBtn', text:'تخصيص ألوان الواجهة موجود هنا.'}
    ],
    searchView: [
        {selector:'#navCatalogBtn', text:'افتح قائمة الكتب للوصول إلى بقية الكتب.'},
        {selector:'#navHomeBtn', text:'للعودة إلى الرواق.'},
        {selector:'#navAppearanceBtn', text:'غيّر ألوان الواجهة من هنا.'}
    ],
    readerView: [
        {selector:'#downloadPdfBtn', text:'هذا الزر لتنزيل الكتاب كملف PDF.'},
        {selector:'#bookmarkBtn', text:'هنا تحفظ موضعك كإشارة مرجعية.'},
        {selector:'button[onclick="copyCurrentCitation()"]', text:'ينسخ الصفحة مع المصدر للاستشهاد.'},
        {selector:'button[onclick="shareCurrentPage()"]', text:'يشارك موضعك الحالي مع رابط مباشر.'},
        {selector:'#openTocBtn', text:'يفتح الفهرس ويساعدك على التنقل بين أبواب الكتاب.'},
        {selector:'button[onclick="openSettings()"]', text:'إعدادات القراءة: الخط والحجم ووضع القراءة.'}
    ]
};

function currentGuideSteps(){ return guideTargets[document.querySelector('.stage-view.active')?.id || 'homeView'] || guideTargets.homeView; }
function getGuideStep(){
    const steps=currentGuideSteps();
    if(!steps.length) return null;
    guideStep = guideStep % steps.length;
    return steps[guideStep];
}
function updateGuideContext(viewId = document.querySelector('.stage-view.active')?.id || 'homeView'){
    const text=document.getElementById('guideSpeechText');
    const steps=guideTargets[viewId]||guideTargets.homeView;
    guideStep=Math.min(guideStep, Math.max(0,steps.length-1));
    if(text) text.textContent = steps[guideStep]?.text || 'اضغط عليّ لأشرح لك طريقة استعمال الصفحة.';
}
function getGuideTarget(){
    const spec=getGuideStep();
    if(!spec) return null;
    const selectors=(spec.selector||'').split(',').map(x=>x.trim()).filter(Boolean);
    for(const selector of selectors){
        const el=document.querySelector(selector);
        if(el && el.offsetParent!==null) return el;
    }
    return null;
}
function guideFocusTarget(){
    const target=getGuideTarget();
    updateGuideContext();
    if(!target) return;
    target.scrollIntoView({behavior:'smooth',block:'center',inline:'center'});
    target.classList.remove('guide-focus-pulse'); void target.offsetWidth; target.classList.add('guide-focus-pulse');
    positionGuideBubbleNearTarget(target);
    setTimeout(()=>target.classList.remove('guide-focus-pulse'),1800);
}
function positionGuideBubbleNearTarget(target){
    const bubble=document.getElementById('guideSpeechBubble'); const guide=document.getElementById('floatingGuide');
    if(!bubble||!guide||bubble.style.display==='none') return;
    const r=target.getBoundingClientRect(); const g=guide.getBoundingClientRect();
    bubble.style.setProperty('--target-x', Math.max(14, Math.min(bubble.offsetWidth-14, r.left + r.width/2 - g.left))+'px');
}
function toggleGuideBubble(){
    const bubble=document.getElementById('guideSpeechBubble'); if(!bubble) return;
    const opening = getComputedStyle(bubble).display==='none';
    bubble.style.display=opening?'block':'none';
    if(opening) guideFocusTarget();
}
function hideGuideBubble(){ const b=document.getElementById('guideSpeechBubble'); if(b)b.style.display='none'; }
function advanceGuide(){
    const steps=currentGuideSteps(); if(!steps.length)return;
    guideStep=(guideStep+1)%steps.length;
    updateGuideContext(); guideFocusTarget();
}
function initFloatingGuide(){
    const guide=document.getElementById('floatingGuide'); const handle=guide?.querySelector('.guide-avatar');
    if(!guide||!handle||guide.dataset.dragReady==='1')return;
    guide.dataset.dragReady='1';
    try{
        const saved=JSON.parse(localStorage.getItem(GUIDE_STORAGE_KEY)||'null');
        if(saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)){
            guide.style.left=Math.max(4,Math.min(window.innerWidth-44,saved.x))+'px';
            guide.style.top=Math.max(4,Math.min(window.innerHeight-44,saved.y))+'px'; guide.style.right='auto'; guide.style.bottom='auto';
        }
    }catch(e){}
    const point=(ev)=>{const t=ev.touches?.[0]||ev; return {x:t.clientX,y:t.clientY};};
    const down=(ev)=>{
        const {x,y}=point(ev); const r=guide.getBoundingClientRect();
        guideDragState={startX:x,startY:y,baseLeft:r.left,baseTop:r.top,moved:false}; handle.classList.add('is-dragging');
        ev.preventDefault();
    };
    const move=(ev)=>{
        if(!guideDragState)return; const {x,y}=point(ev); const dx=x-guideDragState.startX, dy=y-guideDragState.startY;
        if(Math.abs(dx)+Math.abs(dy)>5)guideDragState.moved=true;
        const w=guide.offsetWidth||44,h=guide.offsetHeight||44;
        const nx=Math.max(4,Math.min(window.innerWidth-w-4,guideDragState.baseLeft+dx));
        const ny=Math.max(4,Math.min(window.innerHeight-h-4,guideDragState.baseTop+dy));
        guide.style.left=nx+'px';guide.style.top=ny+'px';guide.style.right='auto';guide.style.bottom='auto';
        ev.preventDefault();
    };
    const up=()=>{
        if(!guideDragState)return; const moved=guideDragState.moved; guideDragState=null; handle.classList.remove('is-dragging');
        try{const r=guide.getBoundingClientRect();localStorage.setItem(GUIDE_STORAGE_KEY,JSON.stringify({x:r.left,y:r.top}));}catch(e){}
        if(!moved) toggleGuideBubble();
    };
    handle.addEventListener('pointerdown',down); window.addEventListener('pointermove',move,{passive:false}); window.addEventListener('pointerup',up);
    handle.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleGuideBubble();}});
    const next=document.createElement('button'); next.className='guide-next-btn'; next.type='button'; next.textContent='التالي'; next.setAttribute('aria-label','الشرح التالي');
    next.addEventListener('click',advanceGuide); guide.querySelector('.guide-speech-bubble')?.appendChild(next);
    updateGuideContext();
}
window.addEventListener('resize',()=>{
    const guide=document.getElementById('floatingGuide'); if(!guide)return;
    if(guide.style.left){ const w=guide.offsetWidth||44,h=guide.offsetHeight||44; const x=Math.max(4,Math.min(window.innerWidth-w-4,parseFloat(guide.style.left)||4)); const y=Math.max(4,Math.min(window.innerHeight-h-4,parseFloat(guide.style.top)||4)); guide.style.left=x+'px'; guide.style.top=y+'px'; }
});
document.addEventListener('DOMContentLoaded',initFloatingGuide);

// ==================== محرك القارئ وجلب البيانات ====================
async function fetchBookData(bookId) {
    const cleanId = (bookId || "").trim();
    const encodedId = encodeURIComponent(cleanId);
    
    for (let folder of SEARCH_FOLDERS) {
        try {
            let res = await fetchWithTimeout(`${folder}${cleanId}.json`, {}, 6000);
            if (!res.ok) res = await fetchWithTimeout(`${folder}${encodedId}.json`, {}, 6000);
            if (res.ok) return await res.json();
        } catch (e) {}
    }

    let fallbackId = cleanId.replace(/_[0-9]+$/, '').replace(/_ج[0-9]+$/, '');
    if (fallbackId && fallbackId !== cleanId) {
        for (let folder of SEARCH_FOLDERS) {
            try {
                let res = await fetchWithTimeout(`${folder}${fallbackId}.json`, {}, 6000);
                if (!res.ok) res = await fetchWithTimeout(`${folder}${encodeURIComponent(fallbackId)}.json`, {}, 6000);
                if (res.ok) return await res.json();
            } catch (e) {}
        }
    }

    try {
        let res = await fetchWithTimeout(`${CLOUD_FALLBACK_URL}${encodedId}.json`, {}, 7000);
        if (res.ok) return await res.json();
    } catch (e) {}

    throw new Error("تعذر جلب ملف الكتاب");
}

async function loadAndOpenBook(bookId, bookTitle, bookToc, totalPages, targetPageNumber = null, highlightQuery = "") {
    showView('readerView');
    currentBookId = bookId;
    currentBookTitle = bookTitle;
    currentActiveSearchHighlight = "";
    currentDeepLinkQuote = highlightQuery || "";
    document.getElementById('readerTitle').innerText = bookTitle;
    rememberRecentBook(bookId, bookTitle, bookTotal(bookId));

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
        const savedLastPage = parseInt(localStorage.getItem(`last_page_${currentBookId}`), 10);
        if (Number.isFinite(savedLastPage) && savedLastPage >= 1 && savedLastPage <= currentBookPages.length) {
            currentPageIndex = savedLastPage;
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

    // ================== تنظيف جذري للعلامة المائية المكررة/القديمة ==================
    // 1. استخدام DOMParser لاصطياد وإزالة أي حاويات (div, p, span) تحتوي على العلامة المائية
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawHtml;
    const elements = tempDiv.querySelectorAll('*');
    
    elements.forEach(el => {
        // إذا كان العنصر يحتوي على رابط التليجرام، وحجم نصه الإجمالي صغير (لتأكيد أنه تذييل وليس فقرة من الكتاب)
        if (el.textContent && el.textContent.toLowerCase().includes('t.me/jali4s') && el.textContent.length < 250) {
            el.remove(); // تدمير العنصر بالكامل (بما فيه الخطوط المنقطة القديمة)
        }
    });
    rawHtml = tempDiv.innerHTML; // استرجاع النص النظيف
    
    // 2. إزالة أي نصوص خام بجميع صيغها في حال كانت مرمية في الصفحة بدون وسوم HTML
    rawHtml = rawHtml.replace(/مكتبة\s*الامام\s*السجاد:\s*جليس\s*الكليني\s*-\s*https:\/\/t\.me\/Jali4s/gi, '');
    rawHtml = rawHtml.replace(/مكتبة\s*جليس\s*-\s*https:\/\/t\.me\/Jali4s/gi, '');
    
    // 3. تنظيف أي حاويات فارغة متبقية ذات خطوط متقطعة (dashed)
    rawHtml = rawHtml.replace(/<div[^>]*border-top[^>]*dashed[^>]*>\s*<\/div>/gi, '');
    // ==================================================================================

    // ================== إضافة العلامة المائية الملكية (لمرة واحدة فقط) ==================
    const watermarkHtml = `
        <div style="margin-top: 40px; padding-top: 15px; border-top: 1px dashed rgba(150, 150, 150, 0.3); text-align: center; font-size: 14px; font-weight: 500; font-family: 'Cairo', sans-serif; direction: rtl; clear: both; user-select: none; opacity: 0.9;">
            <span style="color: #a0a0a0;">مكتبة الامام السجاد: </span>
            <span style="color: #D4AF37;">جليس الكليني - https://t.me/Jali4s</span>
        </div>
    `;
    rawHtml += watermarkHtml;
    // ====================================================================================

    const activeHighlight = currentActiveSearchHighlight || currentDeepLinkQuote;
    if (activeHighlight) {
        contentDiv.innerHTML = highlightArabicText(rawHtml, activeHighlight);
    } else {
        contentDiv.innerHTML = rawHtml;
    }
    // تظليل الرابط المُشارك يُستخدم مرة واحدة فقط حتى لا ينتقل إلى الصفحات التالية.
    currentDeepLinkQuote = "";

    contentDiv.parentElement.scrollTop = 0;

    let displayPage = pageData ? (pageData.page_number || currentPageIndex) : currentPageIndex;
    const pagenEl = contentDiv.querySelector('.pagen');
    if (pagenEl) {
        const match = pagenEl.innerText.match(/\d+/);
        if (match) displayPage = match[0];
    }

    // الرابط العام يطابق رقم الصفحة الحقيقي الموجود في JSON.
    syncReaderUrl(currentPageIndex, true);

    contentDiv.querySelectorAll('.fnote, .footnote, .hawamish, .margin, .note').forEach(el => {
        el.style.setProperty('font-size', '9px', 'important');
        el.style.setProperty('line-height', '1.45', 'important');
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

    const pct = Math.min(100, Math.max(0, Math.round((currentPageIndex / Math.max(currentBookPages.length, 1)) * 100)));
    const progressFill = document.getElementById('readerProgressFill');
    if (progressFill) progressFill.style.width = `${pct}%`;
    rememberRecentBook(currentBookId, currentBookTitle, currentBookTotalPages);
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
    // عند اختيار أحد الثيمات التقليدية نعيد أيضاً لوحة الألوان المقابلة،
    // حتى لا تبقى ألوان التخصيص اليدوي عالقة فوق الثيم الجديد.
    const themePresetMap = {
        'theme-royal':'royal',
        'theme-sepia':'paper',
        'theme-dark':'slate',
        'theme-light':'paper'
    };
    const preset = themePresetMap[themeName];
    if (preset && typeof applyAppearance === 'function') {
        applyAppearance({...APPEARANCE_PRESETS[preset], preset}, true);
    }
    try {
        localStorage.setItem('reading_theme', themeName);
    } catch (e) {}
}

function openSettings() { const m = document.getElementById('settingsModal'); if (m) { m.style.display = 'flex'; syncAppearanceControls(); } }
function closeSettings() { const m = document.getElementById('settingsModal'); if (m) m.style.display = 'none'; }
function openAppearanceSettings() { const m=document.getElementById('appearanceModal'); if(m){m.style.display='flex'; syncAppearanceControls();} }
function closeAppearanceSettings() { const m=document.getElementById('appearanceModal'); if(m)m.style.display='none'; }

// ==================== نظام المظهر الاحترافي القابل للتخصيص ====================
const APPEARANCE_KEY = 'library_appearance_v3';
const APPEARANCE_PRESETS = {
    emerald: { accent:'#2E8B57', bg:'#07110D', text:'#F3F7F2', brightness:100 },
    royal:   { accent:'#D4AF37', bg:'#030705', text:'#F8F9FA', brightness:100 },
    navy:    { accent:'#B9A35A', bg:'#07101C', text:'#F2F5F8', brightness:100 },
    burgundy:{ accent:'#C49A6C', bg:'#1A080C', text:'#F8F1EC', brightness:100 },
    paper:   { accent:'#8C6239', bg:'#F4ECD8', text:'#2B2118', brightness:100 },
    slate:   { accent:'#AAB7C4', bg:'#0C1016', text:'#EEF2F6', brightness:100 }
};

function hexToRgb(hex) {
    const h = String(hex || '').replace('#','').trim();
    if (!/^[0-9a-f]{6}$/i.test(h)) return {r:212,g:175,b:55};
    return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)};
}
function rgbToHex(r,g,b) {
    return '#' + [r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}
function mixHex(a,b,t=0.5) {
    const x=hexToRgb(a), y=hexToRgb(b);
    return rgbToHex(x.r+(y.r-x.r)*t,x.g+(y.g-x.g)*t,x.b+(y.b-x.b)*t);
}
function luminance(hex) {
    const c=hexToRgb(hex);
    const f=v=>{v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};
    return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b);
}
function contrastRatio(a,b) {
    const l1=luminance(a), l2=luminance(b);
    return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
}
function setCssVar(name,value) { document.documentElement.style.setProperty(name,value); }
function applyAppearance(data, save=true) {
    const d={...APPEARANCE_PRESETS.royal,...(data||{})};
    const dark=luminance(d.bg)<0.45;
    const surface=mixHex(d.bg, dark ? '#FFFFFF' : '#000000', dark ? .08 : .045);
    const surface2=mixHex(d.bg, dark ? '#FFFFFF' : '#000000', dark ? .13 : .075);
    const border=mixHex(d.bg,d.accent,.48);
    const muted=mixHex(d.text,d.bg,.48);
    const heading=contrastRatio(d.accent,d.bg)>=3 ? d.accent : mixHex(d.accent,d.text,.35);
    setCssVar('--bg-dark',d.bg); setCssVar('--gold-main',d.accent); setCssVar('--gold-bright',mixHex(d.accent,d.text,.28));
    setCssVar('--gold-dim',mixHex(d.bg,d.accent,.14)); setCssVar('--gold-border',border); setCssVar('--surface-glass',surface);
    setCssVar('--surface-glass-strong',surface2); setCssVar('--surface-border',`rgba(${hexToRgb(d.text).r},${hexToRgb(d.text).g},${hexToRgb(d.text).b},.10)`);
    setCssVar('--text-white',d.text); setCssVar('--text-muted',muted); setCssVar('--text-gold',mixHex(d.accent,d.text,.18)); setCssVar('--appearance-brightness',(Number(d.brightness)||100)/100);
    document.body.dataset.appearance = 'custom';
    document.body.style.removeProperty('filter');
    document.body.dataset.uiBrightness = String(Number(d.brightness)||100);
    const badge=document.getElementById('appearanceContrastBadge');
    if(badge){const ratio=contrastRatio(d.text,d.bg); badge.textContent=ratio>=4.5?'متناسق ومريح':ratio>=3?'جيد':'يحتاج ضبط'; badge.classList.toggle('is-warning',ratio<4.5);}
    const active=document.querySelectorAll('.palette-preset'); active.forEach(b=>b.classList.toggle('active', b.dataset.preset===d.preset));
    if(save){try{localStorage.setItem(APPEARANCE_KEY,JSON.stringify(d));}catch(e){}}
}
function applyPalettePreset(name){
    const p=APPEARANCE_PRESETS[name]||APPEARANCE_PRESETS.royal;
    const a=document.getElementById('uiAccentColor'), bg=document.getElementById('uiBackgroundColor'), t=document.getElementById('uiTextColor'), br=document.getElementById('uiBrightness');
    if(a)a.value=p.accent;if(bg)bg.value=p.bg;if(t)t.value=p.text;if(br)br.value=p.brightness;
    applyAppearance({...p,preset:name});
}
function applyCustomAppearance(){
    const a=document.getElementById('uiAccentColor'), bg=document.getElementById('uiBackgroundColor'), t=document.getElementById('uiTextColor'), br=document.getElementById('uiBrightness'), out=document.getElementById('uiBrightnessValue');
    const d={accent:a?.value||'#D4AF37',bg:bg?.value||'#030705',text:t?.value||'#F8F9FA',brightness:Number(br?.value||100),preset:'custom'};
    if(out)out.textContent=d.brightness+'%';
    applyAppearance(d);
}
function autoBalanceAppearance(){
    const bg=document.getElementById('uiBackgroundColor')?.value||'#030705';
    let text=document.getElementById('uiTextColor')?.value||'#F8F9FA';
    const accent=document.getElementById('uiAccentColor')?.value||'#D4AF37';
    if(contrastRatio(text,bg)<4.5) text=luminance(bg)<.45?'#F8F9FA':'#111111';
    if(contrastRatio(accent,bg)<3) document.getElementById('uiAccentColor').value=mixHex(accent,text,.42);
    document.getElementById('uiTextColor').value=text;
    applyCustomAppearance();
}
function syncAppearanceControls(){
    let d=APPEARANCE_PRESETS.royal;
    try{d={...d,...JSON.parse(localStorage.getItem(APPEARANCE_KEY)||'{}')}}catch(e){}
    const a=document.getElementById('uiAccentColor'),bg=document.getElementById('uiBackgroundColor'),t=document.getElementById('uiTextColor'),br=document.getElementById('uiBrightness'),out=document.getElementById('uiBrightnessValue');
    if(a)a.value=d.accent;if(bg)bg.value=d.bg;if(t)t.value=d.text;if(br)br.value=d.brightness||100;if(out)out.textContent=(d.brightness||100)+'%';
    applyAppearance(d,false);
}
function resetCustomAppearance(){ applyPalettePreset('royal'); }
(function initAppearance(){
    // جميع ثوابت المظهر معرفة قبل استعادة الإعدادات المحفوظة.
    let saved=null; try{saved=JSON.parse(localStorage.getItem(APPEARANCE_KEY)||'null')}catch(e){}
    if(saved) applyAppearance(saved,false);

    const savedTheme = localStorage.getItem('reading_theme');
    if(savedTheme && ['theme-royal','theme-sepia','theme-dark','theme-light'].includes(savedTheme)){
        setReadingTheme(savedTheme);
    }
})();

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

function generateSearchSnippet(fullText, rawQuery) {
    if (!fullText || !rawQuery) return fullText || "";
    
    let regex = createArabicSearchRegex(rawQuery);
    if (!regex) return fullText.substring(0, 100) + '...';

    let match = regex.exec(fullText);
    let snippet = "";

    if (match) {
        let matchIdx = match.index;
        let start = Math.max(0, matchIdx - 35);
        let end = Math.min(fullText.length, matchIdx + match[0].length + 65);
        snippet = fullText.substring(start, end);

        if (start > 0) snippet = '...' + snippet;
        if (end < fullText.length) snippet = snippet + '...';
    } else {
        snippet = fullText.substring(0, 100) + '...';
    }

    return highlightArabicText(snippet, rawQuery);
}

// ==================== محرك تصدير الكتاب كـ PDF ====================
async function downloadBookAsPDF() {
    const book = getBookById(currentBookId);
    if (!book) {
        showToast("لا يوجد كتاب مفتوح", "fa-triangle-exclamation");
        return;
    }

    const fileName = sanitizeFileName(book.title || currentBookTitle || 'book') + '.pdf';

    if (book.pdf_url) {
        showToast("جاري تجهيز ملف PDF...", "fa-file-pdf");
        try {
            const response = await fetch(book.pdf_url, {
                mode: 'cors',
                cache: 'no-store'
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const blob = await response.blob();
            if (!blob.size) throw new Error("empty PDF");

            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = fileName;
            a.rel = 'noopener';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);

            showToast("تم تنزيل الكتاب بصيغة PDF", "fa-circle-check");
            return;
        } catch (error) {
            // عند منع CORS يفتح الملف الأصلي بدل تعطل الزر.
            const a = document.createElement('a');
            a.href = book.pdf_url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            a.remove();
            showToast("تم فتح ملف PDF الأصلي", "fa-file-pdf");
            return;
        }
    }

    if (!currentBookPages || currentBookPages.length === 0) {
        showToast("لا توجد صفحات متاحة للتصدير", "fa-triangle-exclamation");
        return;
    }

    showToast("جاري تجهيز الكتاب للحفظ كـ PDF...", "fa-file-pdf");

    const printIframe = document.createElement('iframe');
    printIframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;border:0;opacity:0;';
    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow.document;
    const safeTitle = escapeHtml(currentBookTitle || 'كتاب');

    let fullContent = `
        <!doctype html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="utf-8">
            <title>${safeTitle}</title>
            <style>
                @page { size:A4; margin:16mm 14mm; }
                @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
                body { font-family:'Amiri',serif; line-height:1.9; color:#111; background:#fff; }
                .cover { text-align:center; min-height:240mm; display:flex; flex-direction:column; justify-content:center; page-break-after:always; }
                .cover h1 { font-size:30px; margin:0 0 16px; }
                .cover p { font-family:Arial,sans-serif; font-size:12px; color:#666; }
                .page { page-break-after:always; }
                .page-num { text-align:center; font:12px Arial,sans-serif; color:#777; margin-top:14px; }
                .watermark { text-align:center; margin-top:22px; padding-top:8px; border-top:1px solid #ddd; font:10px Arial,sans-serif; color:#777; }

                .fnote, .fnote *, .footnote, .footnote *, .hawamish, .hawamish *,
                .margin, .margin *, .note, .note *, .footnote-item, .footnote-item * {
                    font-size:9px !important;
                    line-height:1.45 !important;
                }
                img { max-width:100%; }
            </style>
        </head>
        <body>
            <section class="cover">
                <h1>${safeTitle}</h1>
                <p>تم التصدير من خزانة علوم العترة — جليس الكليني</p>
            </section>`;

    currentBookPages.forEach((page, index) => {
        const content = page?.content || '';
        const pageNumber = escapeHtml(String(page?.page_number ?? index + 1));
        fullContent += `
            <section class="page">
                <div>${content}</div>
                <div class="page-num">صـ ${pageNumber}</div>
                <div class="watermark">جليس الكليني | Jali4s</div>
            </section>`;
    });

    fullContent += '</body></html>';

    doc.open();
    doc.write(fullContent);
    doc.close();

    setTimeout(() => {
        printIframe.contentWindow.focus();
        printIframe.contentWindow.print();
        setTimeout(() => printIframe.remove(), 2000);
    }, 700);
}
function sanitizeFileName(name) {
    return String(name || 'book').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 140) || 'book';
}

// ==================== مكتبة المستخدم V2 ====================
function readJsonStorage(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (_) { return fallback; }
}
function writeJsonStorage(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
}
function getFavoriteBookIds() { return readJsonStorage(FAVORITE_BOOKS_KEY, []); }
function isFavoriteBook(id) { return getFavoriteBookIds().includes(id); }
function toggleFavoriteBook(id, event) {
    if (event) event.stopPropagation();
    const list = getFavoriteBookIds();
    const idx = list.indexOf(id);
    if (idx >= 0) { list.splice(idx, 1); showToast('أزيل الكتاب من المفضلة', 'fa-star'); }
    else { list.unshift(id); showToast('أضيف الكتاب إلى المفضلة', 'fa-star'); }
    writeJsonStorage(FAVORITE_BOOKS_KEY, list.slice(0, 100));
    if (typeof processAndRenderBooks === 'function' && Object.keys(allBooksManifest).length) {
        processAndRenderBooks(allBooksManifest);
        renderCatalogAccordion();
    }
    renderPersonalLibrary();
}
function rememberRecentBook(id, title, totalPages) {
    if (!id || !title) return;
    const history = readJsonStorage(READING_HISTORY_KEY, []).filter(x => x.id !== id);
    const page = Number(localStorage.getItem(`last_page_${id}`)) || 1;
    const item = { id, title, totalPages: totalPages || 1, page, updatedAt: Date.now() };
    history.unshift(item);
    readingHistory = history.slice(0, 12);
    writeJsonStorage(READING_HISTORY_KEY, readingHistory);
    renderContinueReading();
}
function getBookProgressPercent(id) {
    const total = Number(allBooksManifest[id]?.total_pages) || Number(readJsonStorage(READING_HISTORY_KEY, []).find(x => x.id === id)?.totalPages) || 1;
    const page = Number(localStorage.getItem(`last_page_${id}`)) || 0;
    return Math.min(100, Math.max(0, Math.round((page / total) * 100)));
}
function getBookById(id) {
    return allBooksManifest[id] || null;
}
function renderContinueReading() {
    const section = document.getElementById('continueReadingSection');
    const card = document.getElementById('continueReadingCard');
    if (!section || !card) return;
    const history = readJsonStorage(READING_HISTORY_KEY, []).filter(x => getBookById(x.id));
    readingHistory = history;
    if (!history.length) { section.style.display = 'none'; return; }
    const item = history[0];
    const book = getBookById(item.id);
    const group = getGroupName(book, item.id);
    const total = Number(book.total_pages) || item.totalPages || 1;
    const page = Number(localStorage.getItem(`last_page_${item.id}`)) || item.page || 1;
    const pct = Math.min(100, Math.max(0, Math.round((page / total) * 100)));
    section.style.display = 'block';
    card.innerHTML = `
        <div class="continue-reading-cover">${createCoverHtml((book.cover || '').trim(), group, !!book.pdf_url)}</div>
        <div class="continue-reading-main">
            <div class="continue-reading-kicker"><i class="fas fa-book-open"></i> آخر قراءة</div>
            <h4>${escapeHtml(group)}</h4>
            <p>صفحة <b>${page}</b> من ${total} · ${pct}%</p>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
            <button class="v2-primary-btn tactile-btn" onclick="resumeRecentBook('${escapeHtml(item.id)}', event)">متابعة القراءة <i class="fas fa-arrow-left"></i></button>
        </div>`;
    attachTactilePhysics(card.querySelector('.v2-primary-btn'));
}
function resumeRecentBook(id, event) {
    if (event) event.stopPropagation();
    const book = getBookById(id); if (!book) return;
    loadAndOpenBook(id, book.title || getGroupName(book,id), book.toc, book.total_pages);
}
function getRecentSearches() { return readJsonStorage(RECENT_SEARCH_KEY, []); }
function rememberSearchQuery(query) {
    const q = query.trim(); if (!q) return;
    const next = [q, ...getRecentSearches().filter(x => x !== q)].slice(0, 10);
    writeJsonStorage(RECENT_SEARCH_KEY, next);
}
function renderSmartSearchPanel(query='') {
    const panel = document.getElementById('searchSmartPanel'); if(!panel) return;
    const q = query.trim();
    if (!q) {
        const recent = getRecentSearches();
        if (!recent.length) { panel.style.display='none'; panel.innerHTML=''; return; }
        panel.innerHTML = `<div class="smart-panel-head"><span>بحثك الأخير</span><button class="tactile-btn" onclick="clearRecentSearches()">مسح</button></div><div class="smart-chip-row">${recent.map(x=>`<button class="smart-search-chip tactile-btn" onclick="useSmartSearch(this.dataset.q)" data-q="${escapeHtml(x)}"><i class="fas fa-clock"></i>${escapeHtml(x)}</button>`).join('')}</div>`;
        panel.style.display='block'; return;
    }
    const matcher = createSearchMatcher(q);
    const suggestions=[];
    getScopedSearchIndex().forEach(item=>{
        if(suggestions.length>=8) return;
        if(matcher(item.title) || matcher(item.group)) suggestions.push({label:item.title||item.group, icon:'fa-book'});
        if(suggestions.length>=8) return;
        for(const t of item.toc || []) { if(matcher(t.title||'')){ suggestions.push({label:t.title,icon:'fa-bookmark'}); if(suggestions.length>=8) break; } }
    });
    panel.innerHTML = suggestions.length ? `<div class="smart-panel-head"><span>اقتراحات من مكتبتك</span></div><div class="smart-chip-row">${suggestions.map(x=>`<button class="smart-search-chip tactile-btn" onclick="useSmartSearch(this.dataset.q)" data-q="${escapeHtml(x.label)}"><i class="fas ${x.icon}"></i>${escapeHtml(x.label)}</button>`).join('')}</div>` : '';
    panel.style.display = suggestions.length ? 'block' : 'none';
}
function useSmartSearch(query) { const input=document.getElementById('searchInput'); if(!input)return; input.value=query; rememberSearchQuery(query); handleSearchInput(query); setTimeout(()=>{ document.getElementById('searchSmartPanel')?.style.setProperty('display','none'); }, 50); }
function clearRecentSearches() { writeJsonStorage(RECENT_SEARCH_KEY, []); renderSmartSearchPanel(''); }

function getSavedQuotes() { return readJsonStorage(SAVED_QUOTES_KEY, []); }
function saveSelectedQuote() {
    const text = (window.getSelection().toString().trim() || savedSelectionText).trim();
    if (!text) { showToast('حدد نصًا أولًا لحفظه', 'fa-text-height'); return; }
    const pageData = currentBookPages[currentPageIndex - 1];
    const pageNum = pageData ? (pageData.page_number || currentPageIndex) : currentPageIndex;
    const quotes = getSavedQuotes();
    const key = `${currentBookId}|${pageNum}|${text}`;
    if (quotes.some(q => q.key === key)) { showToast('الاقتباس محفوظ مسبقًا', 'fa-bookmark'); return; }
    quotes.unshift({ id:'q_'+Date.now(), key, text, bookId:currentBookId, bookTitle:currentBookTitle, pageNum, pageIndex:currentPageIndex, date:new Date().toLocaleDateString('ar-IQ') });
    writeJsonStorage(SAVED_QUOTES_KEY, quotes.slice(0, 300));
    hideSelectionToolbar();
    showToast('تم حفظ الاقتباس في مكتبك', 'fa-bookmark');
}
function getCurrentRealPageNumber(pageIndex = currentPageIndex) {
    const page = currentBookPages?.[Math.max(0, Number(pageIndex) - 1)];
    const n = Number(page?.page_number);
    return Number.isFinite(n) ? n : Number(pageIndex) || 1;
}

function syncReaderUrl(pageIndex = currentPageIndex, replace = true) {
    if (!currentBookId) return;
    const pageNumber = getCurrentRealPageNumber(pageIndex);
    const url = new URL(window.location.href);
    url.searchParams.set('book', currentBookId);
    url.searchParams.set('page', String(pageNumber));
    url.searchParams.delete('quote');

    try {
        const state = {
            ...(window.history.state || {}),
            view: 'readerView',
            book: currentBookId,
            page: pageNumber
        };
        if (replace) window.history.replaceState(state, '', url.toString());
        else window.history.pushState(state, '', url.toString());
    } catch (e) {}
    return url.toString();
}

function buildDeepLink(pageIndex = currentPageIndex, quote = '') {
    const url = new URL(window.location.href);
    url.searchParams.set('book', currentBookId);
    url.searchParams.set('page', String(getCurrentRealPageNumber(pageIndex)));
    if (quote) url.searchParams.set('quote', quote.slice(0, 1200));
    return url.toString();
}

async function shareSelectedQuote() {
    const selectedText = (window.getSelection().toString().trim() || savedSelectionText).trim();
    if (!selectedText || !currentBookId) return;
    const pageData = currentBookPages[currentPageIndex - 1];
    const pageNum = pageData ? (pageData.page_number || currentPageIndex) : currentPageIndex;
    const deepLink = buildDeepLink(currentPageIndex, selectedText);
    const quoteFormatted = `«${selectedText}»\n\n📖 ${currentBookTitle} — صـ ${pageNum}\n🔗 فتح الموضع مباشرة: ${deepLink}\n✦ جليس الكليني | Jali4s`;

    try {
        if (navigator.share) {
            await navigator.share({ title: `اقتباس من ${currentBookTitle}`, text: quoteFormatted, url: deepLink });
            showToast('تمت مشاركة الاقتباس مع رابط الموضع', 'fa-share-nodes');
        } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(quoteFormatted);
            showToast('تم نسخ الاقتباس مع رابط الصفحة', 'fa-link');
        }
    } catch (_) {}
    hideSelectionToolbar();
}
function hideSelectionToolbar() { document.getElementById('selectionToolbar').style.display='none'; window.getSelection()?.removeAllRanges(); }
function getSavedNotes() { return readJsonStorage(SAVED_NOTES_KEY, []); }
function saveSelectedNote() {
    const text = (window.getSelection().toString().trim() || savedSelectionText).trim();
    if (!text) { showToast('حدد نصًا أولًا لإضافة ملاحظة', 'fa-note-sticky'); return; }
    savedSelectionText = text;
    const preview=document.getElementById('selectedTextPreview');
    if(preview) preview.textContent = `«${text.slice(0,420)}${text.length>420?'…':''}»`;
    const input=document.getElementById('noteEditorInput'); if(input) input.value='';
    document.getElementById('noteEditorModal').style.display='flex';
    hideSelectionToolbar();
    setTimeout(()=>input?.focus(),80);
}
function closeNoteEditor(){ const m=document.getElementById('noteEditorModal'); if(m)m.style.display='none'; }
function commitNote(){
    const note=(document.getElementById('noteEditorInput')?.value||'').trim();
    if(!note){ showToast('اكتب الملاحظة أولًا','fa-triangle-exclamation'); return; }
    const pageData=currentBookPages[currentPageIndex-1]; const pageNum=pageData?(pageData.page_number||currentPageIndex):currentPageIndex;
    const notes=getSavedNotes(); notes.unshift({id:'n_'+Date.now(), note, text:savedSelectionText, bookId:currentBookId, bookTitle:currentBookTitle, pageNum, pageIndex:currentPageIndex, date:new Date().toLocaleDateString('ar-IQ')});
    writeJsonStorage(SAVED_NOTES_KEY, notes.slice(0,300));
    closeNoteEditor(); showToast('تم حفظ الملاحظة','fa-note-sticky');
}
function deleteSavedQuote(id){ writeJsonStorage(SAVED_QUOTES_KEY,getSavedQuotes().filter(x=>x.id!==id)); renderPersonalLibrary(); showToast('تم حذف الاقتباس','fa-trash-can'); }
function deleteSavedNote(id){ writeJsonStorage(SAVED_NOTES_KEY,getSavedNotes().filter(x=>x.id!==id)); renderPersonalLibrary(); showToast('تم حذف الملاحظة','fa-trash-can'); }

function copyCurrentCitation() {
    const pageData=currentBookPages[currentPageIndex-1]; if(!pageData) return;
    const tmp=document.createElement('div'); tmp.innerHTML=pageData.content||'';
    const text=(tmp.textContent||'').trim(); if(!text) return;
    const pageNum=pageData.page_number||currentPageIndex;
    const citation=`${text}\n\n📖 ${currentBookTitle} — صـ ${pageNum}\nجليس الكليني | Jali4s`;
    navigator.clipboard?.writeText(citation).then(()=>showToast('تم نسخ الصفحة مع المصدر','fa-copy')).catch(()=>showToast('تعذر النسخ التلقائي','fa-triangle-exclamation'));
}
async function shareCurrentPage() {
    if (!currentBookId) return;
    const pageData = currentBookPages[currentPageIndex - 1];
    const pageNum = pageData?.page_number || currentPageIndex;
    const url = buildDeepLink(currentPageIndex);
    const data={title:currentBookTitle,text:`${currentBookTitle} — صـ ${pageNum}\nفتح هذه الصفحة مباشرة:`,url};
    try {
        if (navigator.share) {
            await navigator.share(data);
        } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(`${currentBookTitle} — صـ ${pageNum}\n${url}`);
            showToast('تم نسخ رابط الموضع', 'fa-link');
        }
    } catch (_) {}
}

function renderPersonalLibraryDashboard(){
    const el=document.getElementById('personalLibraryDashboard'); if(!el)return;
    const recent=readJsonStorage(READING_HISTORY_KEY,[]).filter(x=>getBookById(x.id)).length;
    const fav=getFavoriteBookIds().filter(id=>getBookById(id)).length;
    const quotes=getSavedQuotes().length;
    const notes=getSavedNotes().length;
    el.innerHTML=`<div class="v2-stat"><b>${recent}</b><span>قراءات</span></div><div class="v2-stat"><b>${fav}</b><span>مفضلة</span></div><div class="v2-stat"><b>${quotes}</b><span>اقتباسات</span></div><div class="v2-stat"><b>${notes}</b><span>ملاحظات</span></div>`;
}
function openPersonalLibrary() { const modal=document.getElementById('personalLibraryModal'); if(!modal)return; modal.style.display='flex'; renderPersonalLibraryDashboard(); renderPersonalLibrary(); }
function closePersonalLibrary() { const m=document.getElementById('personalLibraryModal'); if(m)m.style.display='none'; }
function openLibraryCommandCenter(){ const m=document.getElementById('libraryCommandCenterModal'); if(m)m.style.display='flex'; }
function closeLibraryCommandCenter(){ const m=document.getElementById('libraryCommandCenterModal'); if(m)m.style.display='none'; }
function switchPersonalLibraryTab(tab, btn) { currentPersonalLibraryTab=tab; document.querySelectorAll('.v2-library-tab').forEach(x=>x.classList.remove('active')); if(btn)btn.classList.add('active'); renderPersonalLibrary(); }
function renderPersonalLibrary(){
    const container=document.getElementById('personalLibraryList'); if(!container)return;
    renderPersonalLibraryDashboard();
    let items=[];
    if(currentPersonalLibraryTab==='favorites') items=getFavoriteBookIds().map(id=>({...getBookById(id),id})).filter(Boolean);
    else if(currentPersonalLibraryTab==='bookmarks'){
        Object.keys(localStorage).filter(k=>k.startsWith('bookmarks_')).forEach(k=>{const id=k.replace(/^bookmarks_/,'');const book=getBookById(id);if(!book)return;readJsonStorage(k,[]).forEach(b=>items.push({...b,id,book}));});
        items.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''),'ar'));
    } else if(currentPersonalLibraryTab==='quotes') items=getSavedQuotes();
    else if(currentPersonalLibraryTab==='notes') items=getSavedNotes();
    else if(currentPersonalLibraryTab==='tags') items=getStoredTaggedSnippets();
    else items=readJsonStorage(READING_HISTORY_KEY,[]).filter(x=>getBookById(x.id));
    if(!items.length){ const titles={recent:'ابدأ القراءة لتظهر آثارك هنا',favorites:'لا توجد كتب مفضلة بعد',bookmarks:'لا توجد علامات محفوظة بعد',quotes:'لم تحفظ اقتباسات بعد',notes:'لا توجد ملاحظات بعد',tags:'لا توجد نصوص موسومة بعد'}; const icons={recent:'fa-book-open',favorites:'fa-star',bookmarks:'fa-bookmark',quotes:'fa-quote-right',notes:'fa-note-sticky',tags:'fa-tags'}; container.innerHTML=`<div class="v2-empty"><i class="fas ${icons[currentPersonalLibraryTab]||'fa-book-open'}"></i><h4>${titles[currentPersonalLibraryTab]||titles.recent}</h4><p>كل شيء يبقى محفوظًا على هذا الجهاز.</p></div>`;return; }
    container.innerHTML='';
    items.slice(0,40).forEach(item=>{
        const row=document.createElement('div'); row.className='v2-library-row';
        if(currentPersonalLibraryTab==='quotes'){
            row.innerHTML=`<div class="v2-library-icon"><i class="fas fa-quote-right"></i></div><div class="v2-library-row-main"><b>${escapeHtml(item.bookTitle||'كتاب')}</b><span>«${escapeHtml(item.text.slice(0,150))}${item.text.length>150?'…':''}» · صـ ${item.pageNum}</span></div><button class="mini-action-btn tactile-btn" title="حذف" onclick="deleteSavedQuote('${item.id}')"><i class="fas fa-trash-can"></i></button>`;
            row.onclick=(e)=>{if(e.target.closest('button'))return;closePersonalLibrary();jumpToTaggedSnippet(item.bookId,item.bookTitle,item.pageIndex||item.pageNum);};
        } else if(currentPersonalLibraryTab==='notes'){
            row.innerHTML=`<div class="v2-library-icon"><i class="fas fa-note-sticky"></i></div><div class="v2-library-row-main"><b>${escapeHtml(item.bookTitle||'كتاب')}</b><span>${escapeHtml(item.note.slice(0,150))}${item.note.length>150?'…':''} · صـ ${item.pageNum}</span></div><button class="mini-action-btn tactile-btn" title="حذف" onclick="deleteSavedNote('${item.id}')"><i class="fas fa-trash-can"></i></button>`;
            row.onclick=(e)=>{if(e.target.closest('button'))return;closePersonalLibrary();jumpToTaggedSnippet(item.bookId,item.bookTitle,item.pageIndex||item.pageNum);};
        } else if(currentPersonalLibraryTab==='tags'){
            row.innerHTML=`<div class="v2-library-icon"><i class="fas fa-tag"></i></div><div class="v2-library-row-main"><b>${escapeHtml(item.tagName||'وسم')}</b><span>${escapeHtml(item.bookTitle||'كتاب')} · صـ ${item.pageNum}</span></div><i class="fas fa-chevron-left text-gold"></i>`;
            row.onclick=()=>{closePersonalLibrary();jumpToTaggedSnippet(item.bookId,item.bookTitle,item.pageIndex||item.pageNum);};
        } else {
            const id=item.id; const book=item.book||getBookById(id); const title=book?.title||getGroupName(book||{},id); const group=getGroupName(book||{},id); const page=currentPersonalLibraryTab==='bookmarks'?(item.pageNum||item.pageIndex||1):(Number(localStorage.getItem(`last_page_${id}`))||item.page||1);
            row.innerHTML=`<div class="v2-library-icon"><i class="fas ${currentPersonalLibraryTab==='favorites'?'fa-star':'fa-book'}"></i></div><div class="v2-library-row-main"><b>${escapeHtml(group)}</b><span>${escapeHtml(title)} · صـ ${page}</span></div><i class="fas fa-chevron-left text-gold"></i>`;
            row.onclick=()=>{closePersonalLibrary();if(book)loadAndOpenBook(id,title,book.toc,book.total_pages,currentPersonalLibraryTab==='bookmarks'?(item.pageNum||item.pageIndex):null);};
        }
        container.appendChild(row);
    });
}
function exportPersonalLibrary(){
    const data={version:2,exportedAt:new Date().toISOString(),favorites:getFavoriteBookIds(),history:readJsonStorage(READING_HISTORY_KEY,[]),quotes:getSavedQuotes(),notes:getSavedNotes(),tags:getStoredTaggedSnippets(),customTags:getStoredTags()};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='jalis-alkulayni-library.json'; a.click(); URL.revokeObjectURL(a.href); showToast('تم تصدير مكتبك','fa-download');
}
// ==================== محرك البحث الشامل ====================
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

function setSearchMatchType(type) {
    currentSearchMatchType = ['exact', 'all', 'any'].includes(type) ? type : 'exact';
    document.getElementById('searchMatchTypeExact')?.classList.toggle('active', currentSearchMatchType === 'exact');
    document.getElementById('searchMatchTypeAll')?.classList.toggle('active', currentSearchMatchType === 'all');
    document.getElementById('searchMatchTypeAny')?.classList.toggle('active', currentSearchMatchType === 'any');
    executeGlobalSearch();
}

function searchTokens(value) {
    return normalizeArabicText(value).split(/\s+/).filter(Boolean);
}

function searchTextMatch(text, query, mode = currentSearchMatchType) {
    const hay = normalizeArabicText(text);
    const needle = normalizeArabicText(query);
    if (!hay || !needle) return false;
    const tokens = searchTokens(query);
    if (mode === 'exact') return hay.includes(needle);
    if (mode === 'all') return tokens.every(token => hay.includes(token));
    return tokens.some(token => hay.includes(token));
}

function createSearchMatcher(query) {
    const normalized = normalizeArabicText(query);
    const tokens = searchTokens(query);
    return text => {
        const hay = normalizeArabicText(text);
        if (!hay || !normalized) return false;
        if (currentSearchMatchType === 'exact') return hay.includes(normalized);
        if (currentSearchMatchType === 'all') return tokens.every(t => hay.includes(t));
        return tokens.some(t => hay.includes(t));
    };
}

function highlightSearchText(text, query) {
    if (!text || !query) return text || '';
    return highlightArabicText(text, query);
}

function handleSearchInput(val) {
    renderSmartSearchPanel(val);
    const clearBtn = document.getElementById('searchClearBtn');
    if (clearBtn) clearBtn.style.display = val.trim() ? 'block' : 'none';
    clearTimeout(searchDebounceTimer);
    isDeepSearching = false;
    searchRequestId++;
    const request = searchRequestId;
    searchDebounceTimer = setTimeout(() => {
        if (request === searchRequestId) { if (val.trim()) rememberSearchQuery(val); executeGlobalSearch(request); }
    }, 90);
}

function clearSearch() {
    const input = document.getElementById('searchInput');
    if (input) { input.value = ''; input.focus(); }
    handleSearchInput('');
}

function getScopedSearchIndex() {
    let items = searchIndex.length ? searchIndex : Object.keys(allBooksManifest).map(id => ({
        id, title: allBooksManifest[id]?.title || '', author: allBooksManifest[id]?.author || allBooksManifest[id]?.writer || allBooksManifest[id]?.authors || '', category: allBooksManifest[id]?.category || '', group: getGroupName(allBooksManifest[id], id),
        toc: Array.isArray(allBooksManifest[id]?.toc) ? allBooksManifest[id].toc : [], pdf: !!allBooksManifest[id]?.pdf_url
    }));
    if (currentSearchScope === 'all') return items;
    const group = currentSearchScope.replace(/^group:/, '');
    return items.filter(x => x.group === group);
}

function renderSearchBookResult(item, query, matcher) {
    const book = allBooksManifest[item.id];
    if (!book) return null;
    const card = document.createElement('div');
    card.className = 'search-result-card search-book-result tactile-btn';
    card.innerHTML = `
        <div class="search-result-icon"><i class="fas ${item.pdf ? 'fa-file-pdf' : 'fa-book-open'}"></i></div>
        <div class="search-result-main">
            <div class="search-card-header">
                <h4>${highlightSearchText(item.title || item.group, query)}</h4>
                <span class="search-page-badge">${item.pdf ? 'PDF' : 'كتاب'}</span>
            </div>
            <div class="search-result-meta"><span>${highlightSearchText(item.author || item.group, query)}</span><span>${highlightSearchText(item.group, query)} · ${item.toc.length} باب</span></div>
        </div>`;
    attachTactilePhysics(card);
    card.onclick = () => item.pdf ? window.open(book.pdf_url, '_blank', 'noopener,noreferrer') : loadAndOpenBook(item.id, book.title, book.toc, book.total_pages, null, query);
    return card;
}

async function executeGlobalSearch(requestId = searchRequestId) {
    const input = document.getElementById('searchInput');
    const query = input ? input.value.trim() : '';
    const container = document.getElementById('searchResultsContainer');
    const statusInfo = document.getElementById('searchStatusInfo');
    const countBadge = document.getElementById('searchResultCount');
    const filterBadge = document.getElementById('searchFilterName');
    if (!container) return;
    if (requestId !== searchRequestId) return;

    if (!query) {
        if (statusInfo) statusInfo.style.display = 'none';
        container.innerHTML = `<div class="search-empty-state search-start-state"><div class="empty-icon-box"><i class="fas fa-magnifying-glass text-gold"></i></div><h4>ابحث باسم الكتاب أو المؤلف أو الباب</h4><p>البحث يدعم التطابق التام، كل الكلمات، أو أي كلمة.</p></div>`;
        return;
    }

    const matcher = createSearchMatcher(query);
    const items = getScopedSearchIndex();
    const filterLabel = currentSearchScope === 'all' ? 'كل المكتبة' : `في ${currentSearchScope.replace(/^group:/, '')}`;
    container.innerHTML = '';
    let foundCount = 0;
    let resultLimit = currentSearchTarget === 'fulltext' ? 120 : 250;

    if (currentSearchTarget === 'toc') {
        const fragment = document.createDocumentFragment();
        for (const item of items) {
            if (requestId !== searchRequestId) return;
            if (matcher(`${item.title} ${item.author || ''} ${item.category || ''} ${item.group}`)) {
                const card = renderSearchBookResult(item, query, matcher);
                if (card) { fragment.appendChild(card); foundCount++; }
                if (foundCount >= resultLimit) break;
            }
            if (foundCount < resultLimit) {
                for (const tocItem of item.toc) {
                    if (!matcher(tocItem.title || '')) continue;
                    const card = document.createElement('div');
                    card.className = 'search-result-card search-toc-result tactile-btn';
                    card.innerHTML = `<div class="search-result-icon"><i class="fas fa-bookmark"></i></div><div class="search-result-main"><div class="search-card-header"><h4>${highlightSearchText(tocItem.title || 'باب', query)}</h4><span class="search-page-badge">صـ ${tocItem.page_number ?? '-'}</span></div><div class="search-result-meta"><span>${highlightSearchText(item.title, query)}</span><span>${item.group}</span></div></div>`;
                    attachTactilePhysics(card);
                    card.onclick = () => loadAndOpenBook(item.id, item.title, item.toc, bookTotal(item.id), tocItem.page_number, query);
                    fragment.appendChild(card); foundCount++;
                    if (foundCount >= resultLimit) break;
                }
            }
            if (foundCount >= resultLimit) break;
        }
        container.appendChild(fragment);
    } else {
        const progress = document.createElement('div');
        progress.className = 'search-progress-card';
        progress.innerHTML = `<i class="fas fa-bolt"></i><span>بحث سريع داخل نصوص الصفحات</span><b id="deepSearchProgress">0%</b>`;
        container.appendChild(progress);
        isDeepSearching = true;
        const total = items.length;
        let processed = 0;
        const fragment = document.createDocumentFragment();
        const batchSize = 4;
        for (let i = 0; i < items.length && foundCount < resultLimit; i += batchSize) {
            if (requestId !== searchRequestId) return;
            const batch = items.slice(i, i + batchSize);
            await Promise.all(batch.map(async item => {
                if (requestId !== searchRequestId || foundCount >= resultLimit || item.pdf) return;
                try {
                    let bookData;
                    const cached = localStorage.getItem(`book_pages_${item.id}`);
                    if (cached) bookData = { pages: JSON.parse(cached) };
                    else bookData = await fetchBookData(item.id);
                    if (!bookData?.pages) return;
                    for (const page of bookData.pages) {
                        if (requestId !== searchRequestId || foundCount >= resultLimit) break;
                        const temp = document.createElement('div'); temp.innerHTML = page.content || '';
                        const raw = temp.textContent || '';
                        if (!matcher(raw)) continue;
                        const card = document.createElement('div');
                        card.className = 'search-result-card search-text-result tactile-btn';
                        card.innerHTML = `<div class="search-result-icon"><i class="fas fa-align-right"></i></div><div class="search-result-main"><div class="search-card-header"><h4>${highlightSearchText(item.title, query)}</h4><span class="search-page-badge">صـ ${page.page_number ?? '-'}</span></div><p class="search-snippet">${generateSearchSnippet(raw, query)}</p></div>`;
                        attachTactilePhysics(card);
                        card.onclick = () => loadAndOpenBook(item.id, item.title, item.toc, bookTotal(item.id), page.page_number, query);
                        fragment.appendChild(card); foundCount++;
                    }
                } catch (_) {}
            }));
            processed += batch.length;
            const p = document.getElementById('deepSearchProgress');
            if (p) p.textContent = `${Math.round((processed / Math.max(total, 1)) * 100)}%`;
            if (foundCount) { container.appendChild(fragment); }
        }
        isDeepSearching = false;
        progress.remove();
    }

    if (requestId !== searchRequestId) return;
    if (statusInfo) statusInfo.style.display = 'flex';
    if (countBadge) countBadge.textContent = `${foundCount}${foundCount >= resultLimit ? '+' : ''} نتائج`;
    if (filterBadge) filterBadge.textContent = `${filterLabel} · ${currentSearchTarget === 'toc' ? 'أسماء وأبواب' : 'نصوص'}`;
    if (!foundCount) container.innerHTML = `<div class="search-empty-state"><div class="empty-icon-box"><i class="fas fa-search-minus"></i></div><h4>لا توجد نتائج لـ «${query}»</h4><p>جرّب اسمًا آخر أو غيّر طريقة المطابقة.</p></div>`;
}

function bookTotal(id) {
    return allBooksManifest[id]?.total_pages || 1;
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

// ==================== نظام الحواشي المنبثقة الذكي ====================
let footnoteTimeout;

function showFootnoteToast(text) {
    let toast = document.getElementById('footnoteToast');
    
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'footnoteToast';
        toast.className = 'footnote-toast';
        document.body.appendChild(toast);
    }
    
    toast.innerHTML = text;
    toast.classList.add('show');

    clearTimeout(footnoteTimeout);
    footnoteTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 7000); 

    toast.onclick = () => toast.classList.remove('show');
}

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

// ==================== التهيئة عند بدء التشغيل ====================
document.querySelectorAll('.tactile-btn').forEach(btn => attachTactilePhysics(btn));
loadLibraryManifest();
initDailyHadithSystem();

// ==================== اختصارات V2 ومركز التحكم ====================
document.addEventListener('keydown',(event)=>{
    const tag=(event.target?.tagName||'').toLowerCase();
    const typing=tag==='input'||tag==='textarea'||event.target?.isContentEditable;
    if(event.key==='Escape'){ ['personalLibraryModal','libraryCommandCenterModal','noteEditorModal'].forEach(id=>{const m=document.getElementById(id);if(m)m.style.display='none';}); }
    if(event.ctrlKey&&event.key.toLowerCase()==='k'){event.preventDefault();openLibraryCommandCenter();return;}
    if(event.key==='/'&&!typing){event.preventDefault();openSearch();}
});


document.addEventListener('DOMContentLoaded', initGuideWhenReady, {once:true});
