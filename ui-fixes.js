// ==========================================
// Файл ui-fixes.js — дополнительные улучшения
// ==========================================

// 1. Следим за обновлением главного экрана, чтобы менять иконку замка на SVG
const observer = new MutationObserver(() => {
    const lockBtn = document.querySelector('.banks-header button[title="Режим редактирования"]');
    if (!lockBtn) return;
    
    // Проверяем, включен ли сейчас режим редактирования
    const isEdit = (typeof S !== 'undefined' && S.ui && S.ui.bankEditMode);
    
    if (isEdit) {
        // Открытый замок (синяя кнопка)
        lockBtn.className = 'btn-primary btn-small';
        lockBtn.style.padding = '4px 8px';
        lockBtn.style.display = 'flex';
        lockBtn.style.alignItems = 'center';
        lockBtn.style.justifyContent = 'center';
        lockBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>';
    } else {
        // Закрытый замок (серая кнопка)
        lockBtn.className = 'btn-secondary btn-small';
        lockBtn.style.padding = '4px 8px';
        lockBtn.style.display = 'flex';
        lockBtn.style.alignItems = 'center';
        lockBtn.style.justifyContent = 'center';
        lockBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
    }
});

// Запускаем слежку за блоком, где находятся банки
document.addEventListener('DOMContentLoaded', () => {
    const homePage = document.getElementById('page-home');
    if (homePage) {
        observer.observe(homePage, { childList: true, subtree: true });
    }
});

// 2. Добавляем скролл мышкой для ленты банков
let isDown = false;
let startX;
let scrollLeft;
let moved = false;

document.addEventListener('mousedown', (e) => {
    const carousel = e.target.closest('.banks-carousel');
    if (!carousel) return;
    
    // Если режим редактирования включен, скролл мышкой отключаем
    if (typeof S !== 'undefined' && S.ui && S.ui.bankEditMode) return;
    
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

// Защита от случайного клика по банку, если мы его тащили
document.addEventListener('click', (e) => {
    if (moved && e.target.closest('.banks-carousel')) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
    }
}, true);

// 3. Прокрутка колесиком мыши по горизонтали
document.addEventListener('wheel', (e) => {
    const carousel = e.target.closest('.banks-carousel');
    if (!carousel) return;
    
    if (e.deltaY !== 0) {
        e.preventDefault();
        carousel.scrollLeft += e.deltaY;
    }
}, { passive: false });

console.log('✅ UI Fixes (v44.1) загружены');
