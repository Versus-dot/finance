// ==========================================
// UI-улучшения (v55)
// ==========================================

// 1. Замена замка
setInterval(() => {
    const lockBtn = document.querySelector('.banks-header button[title="Режим редактирования"]');
    if (!lockBtn) return;
    const isEdit = (typeof S !== 'undefined' && S.ui && S.ui.bankEditMode);
    const svgOpen = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>';
    const svgClose = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';

    if (isEdit && lockBtn.dataset.svglock !== 'open') {
        lockBtn.className = 'btn-primary btn-small';
        lockBtn.innerHTML = svgOpen;
        lockBtn.dataset.svglock = 'open';
    } else if (!isEdit && lockBtn.dataset.svglock !== 'close') {
        lockBtn.className = 'btn-secondary btn-small';
        lockBtn.innerHTML = svgClose;
        lockBtn.dataset.svglock = 'close';
    }
}, 500);

// 2. Перехватываем клик по банкам (раскрытие/сворачивание)
const originalSetDashFilter = window.setDashFilter;
window.setDashFilter = function(bankId) {
    if (typeof S !== 'undefined' && S.ui) {
        if (bankId === 'all') {
            // Сворачиваем все банки
            S.ui.collapsedBanks = S.banks.map(b => b.id);
        } else {
            // Раскрываем конкретный банк
            const idx = S.ui.collapsedBanks.indexOf(bankId);
            if (idx > -1) {
                S.ui.collapsedBanks.splice(idx, 1);
            }
        }
        if (typeof save === 'function') save(false);
    }
    if (originalSetDashFilter) originalSetDashFilter(bankId);
};

// 3. Починка кнопки "+" (скрываем на Главной, показываем на остальных)
const originalSetActiveTab = window.setActiveTab;
window.setActiveTab = function(tab, fromPop) {
    if (originalSetActiveTab) originalSetActiveTab(tab, fromPop);
    const fab = document.getElementById('fabBtn');
    if (fab) {
        fab.style.display = (tab === 'home') ? 'none' : 'flex';
    }
};

// Сразу скрываем при загрузке, если мы на главной
document.addEventListener('DOMContentLoaded', () => {
    const fab = document.getElementById('fabBtn');
    if (fab && typeof activeTab !== 'undefined' && activeTab === 'home') {
        fab.style.display = 'none';
    }
});

// 4. Скролл мышкой
let isDown = false;
let startX;
let scrollLeft;
let moved = false;
document.addEventListener('mousedown', (e) => {
    const carousel = e.target.closest('.banks-carousel');
    if (!carousel) return;
    if (typeof S !== 'undefined' && S.ui && S.ui.bankEditMode) return;
    isDown = true; moved = false;
    startX = e.pageX - carousel.offsetLeft;
    scrollLeft = carousel.scrollLeft;
});
document.addEventListener('mouseleave', () => { isDown = false; });
document.addEventListener('mouseup', () => { isDown = false; });
document.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    const carousel = e.target.closest('.banks-carousel');
    if (!carousel) return;
    if (typeof S !== 'undefined' && S.ui && S.ui.bankEditMode) return;
    const x = e.pageX - carousel.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 5) moved = true;
    if (moved) e.preventDefault();
    carousel.scrollLeft = scrollLeft - walk;
});
document.addEventListener('wheel', (e) => {
    const carousel = e.target.closest('.banks-carousel');
    if (!carousel) return;
    if (e.deltaY !== 0) {
        e.preventDefault();
        carousel.scrollLeft += e.deltaY;
    }
}, { passive: false });

console.log('✅ UI Fixes (v55) загружены');
