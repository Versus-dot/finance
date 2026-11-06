// ==========================================
// UI-улучшения (v56) - ui-v56.js
// ==========================================

// 1. Внедряем CSS для кнопок "+" и темы "Минимализм"
const styleEl = document.createElement('style');
styleEl.innerHTML = `
    /* Кнопка "+" на вкладке Счета - скрываем полностью */
    body:has(#page-accounts.active) #fabBtn { 
        display: none !important; 
    }
    
    /* Кнопка "+" на вкладке Операции - делаем аккуратной и маленькой */
    body:has(#page-transactions.active) #fabBtn {
        width: 46px !important;
        height: 46px !important;
        font-size: 24px !important;
        bottom: calc(70px + env(safe-area-inset-bottom)) !important;
        right: 16px !important;
        box-shadow: 0 4px 10px rgba(77,127,255,0.3) !important;
    }

    /* --- СТИЛИ ДЛЯ ТЕМЫ "МИНИМАЛИЗМ" --- */
    body.theme-minimal .account-row {
        border-left: none !important;
        background: var(--card2) !important;
        margin: 6px 10px !important;
        border-radius: 10px !important;
        border-bottom: none !important;
        border: 1px solid var(--border) !important;
    }
    /* Разные оттенки для дебетовых и кредитных */
    body.theme-minimal .account-row[data-acc-type="credit"] {
        background: rgba(255, 92, 92, 0.08) !important; /* Легкий красноватый */
    }
    body.theme-minimal .account-row[data-acc-type="debit"] {
        background: rgba(46, 204, 113, 0.08) !important; /* Легкий зеленоватый */
    }
    
    /* Карточки банков на главной тоже делаем минималистичными */
    body.theme-minimal .bank-chip {
        background: var(--card2) !important;
        border: 1px solid var(--border) !important;
    }
    body.theme-minimal .bank-chip.active {
        border-color: var(--accent) !important;
    }
    /* Цветные кружочки банков остаются (они выводятся через app.js) */
`;
document.head.appendChild(styleEl);

// 2. Перехватываем открытие настроек, чтобы добавить 3-й вариант
const originalOpenSettings = window.openSettings;
window.openSettings = function() {
    originalOpenSettings();
    
    const badgeSelect = document.getElementById('setBadge');
    if (badgeSelect) {
        // Проверяем, нет ли уже нашего варианта
        if (!badgeSelect.querySelector('option[value="minimal"]')) {
            const opt = document.createElement('option');
            opt.value = 'minimal';
            opt.textContent = 'Минимализм';
            // Если текущий стиль minimal, то делаем его выбранным
            if (S.settings.badgeStyle === 'minimal') opt.selected = true;
            badgeSelect.appendChild(opt);
        }
    }
};

// 3. Перехватываем сохранение настроек, чтобы применить класс на body
const originalSaveSettings = window.saveSettings;
window.saveSettings = function() {
    originalSaveSettings();
    applyMinimalTheme();
};

// Функция применения темы
function applyMinimalTheme() {
    if (typeof S !== 'undefined' && S.settings.badgeStyle === 'minimal') {
        document.body.classList.add('theme-minimal');
    } else {
        document.body.classList.remove('theme-minimal');
    }
}

// 4. Перехватываем отрисовку счета, чтобы добавить data-атрибут для CSS
const originalRenderAccountRow = window.renderAccountRow;
window.renderAccountRow = function(a, bank) {
    let html = originalRenderAccountRow(a, bank);
    // Внедряем data-acc-type, чтобы CSS мог покрасить дебет/кредит в разные оттенки
    if (html.includes('class="account-row"')) {
        html = html.replace('class="account-row"', `class="account-row" data-acc-type="${a.type}"`);
    }
    return html;
};

// Применяем тему при загрузке страницы
setTimeout(applyMinimalTheme, 100);

console.log('✅ UI v56 (кнопки и минимализм) загружен');
