// ==========================================
// Безопасные UI-улучшения (v44.1)
// ==========================================

// 1. Замена эмодзи-замка на четкую SVG-иконку
setInterval(() => {
    const lockBtn = document.querySelector('.banks-header button[title="Режим редактирования"]');
    if (!lockBtn) return;
    
    const isEdit = (typeof S !== 'undefined' && S.ui && S.ui.bankEditMode);
    
    const svgOpen = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>';
    const svgClose = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';

    if (isEdit && lockBtn.dataset.svglock !== 'open') {
        lockBtn.className = 'btn-primary btn-small';
        lockBtn.style.cssText = 'padding:4px 8px;border-radius:8px;line-height:1;display:flex;align-items:center;justify-content:center;';
        lockBtn.innerHTML = svgOpen;
        lockBtn.dataset.svglock = 'open';
    } else if (!isEdit && lockBtn.dataset.svglock !== 'close') {
        lockBtn.className = 'btn-secondary btn-small';
        lockBtn.style.cssText = 'padding:4px 8px;border-radius:8px;line-height:1;display:flex;align-items:center;justify-content:center;';
        lockBtn.innerHTML = svgClose;
        lockBtn.dataset.svglock = 'close';
    }
}, 500); // Проверяем каждые полсекунды (это безопасно, без нагрузки)

// 2. Скролл мышкой и колесиком для ленты банков
let isDown = false;
let startX;
let scrollLeft;
let moved = false;

document.addEventListener('mousedown', (e) => {
    const carousel = e.target.closest('.banks-carousel');
    if (!carousel) return;
    if (typeof S !== 'undefined' && S.ui && S.ui.bankEditMode) return; // Отключаем скролл в режиме редактирования
    
    isDown = true;
    moved = false;
    startX = e.pageX - carousel.offsetLeft;
    scrollLeft = carousel.scrollLeft;
});

document.addEventListener('mouseleave', () => { isDown = false; });
document.addEventListener('mouseup', () => { isDown = false; });

document.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    const carousel = e.target.closest('.banks-carousel');
    if (!carousel) return;
    
    const x = e.pageX - carousel.offsetLeft;
    const walk = (x - startX) * 1.5;
    
    if (Math.abs(walk) > 5) moved = true;
    if (moved) e.preventDefault();
    
    carousel.scrollLeft = scrollLeft - walk;
});

document.addEventListener('click', (e) => {
    if (moved && e.target.closest('.banks-carousel')) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
    }
}, true);

document.addEventListener('wheel', (e) => {
    const carousel = e.target.closest('.banks-carousel');
    if (!carousel) return;
    if (e.deltaY !== 0) {
        e.preventDefault();
        carousel.scrollLeft += e.deltaY;
    }
}, { passive: false });

console.log('✅ UI Fixes (v44.1) безопасно загружены');
