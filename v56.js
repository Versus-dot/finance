// ==========================================
// ВСЁ ДЛЯ v56 В ОДНОМ ФАЙЛЕ (v56.js)
// ==========================================
console.log("✅ Файл v56.js успешно загружен");

// 1. СТИЛИ ДЛЯ ТЕМЫ "МИНИМАЛИЗМ" (кнопку + трогаем через JS ниже)
const styleEl = document.createElement('style');
styleEl.innerHTML = `
    body.theme-minimal .account-row {
        border-left: none !important; background: var(--card2) !important;
        margin: 6px 10px !important; border-radius: 10px !important;
        border-bottom: none !important; border: 1px solid var(--border) !important;
    }
    body.theme-minimal .account-row[data-acc-type="credit"] { background: rgba(255, 92, 92, 0.08) !important; }
    body.theme-minimal .account-row[data-acc-type="debit"] { background: rgba(46, 204, 113, 0.08) !important; }
    body.theme-minimal .bank-chip { background: var(--card2) !important; border: 1px solid var(--border) !important; }
    body.theme-minimal .bank-chip.active { border-color: var(--accent) !important; }
`;
document.head.appendChild(styleEl);

// 2. УПРАВЛЕНИЕ КНОПКОЙ "+" ЧЕРЕЗ JS (Надежнее, чем CSS)
function updateFabVisibility(tab) {
    const fab = document.getElementById('fabBtn');
    if (!fab) return;
    
    if (tab === 'home' || tab === 'accounts') {
        // На Главной и Счетах скрываем полностью
        fab.style.display = 'none';
    } else if (tab === 'transactions') {
        // На Операциях показываем, но делаем маленькой
        fab.style.display = 'flex';
        fab.style.width = '46px';
        fab.style.height = '46px';
        fab.style.fontSize = '24px';
    } else {
        // На Статистике (и других) возвращаем стандартный вид
        fab.style.display = 'flex';
        fab.style.width = '56px';
        fab.style.height = '56px';
        fab.style.fontSize = '28px';
    }
}

// Перехватываем переключение вкладок (сработает поверх старого кода)
const originalSetActiveTab = window.setActiveTab;
window.setActiveTab = function(tab, fromPop) {
    if (originalSetActiveTab) originalSetActiveTab(tab, fromPop);
    updateFabVisibility(tab);
};

// Проверяем при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const activeBtn = document.querySelector('.nav-tab.active');
        if (activeBtn) updateFabVisibility(activeBtn.dataset.tab);
    }, 300);
});

// 3. ТЕМА "МИНИМАЛИЗМ" (Настройки)
const originalOpenSettings = window.openSettings;
window.openSettings = function() {
    originalOpenSettings();
    const badgeSelect = document.getElementById('setBadge');
    if (badgeSelect && !badgeSelect.querySelector('option[value="minimal"]')) {
        const opt = document.createElement('option');
        opt.value = 'minimal'; opt.textContent = 'Минимализм';
        if (S.settings.badgeStyle === 'minimal') opt.selected = true;
        badgeSelect.appendChild(opt);
    }
};
const originalSaveSettings = window.saveSettings;
window.saveSettings = function() {
    originalSaveSettings();
    if (typeof S !== 'undefined' && S.settings.badgeStyle === 'minimal') {
        document.body.classList.add('theme-minimal');
    } else {
        document.body.classList.remove('theme-minimal');
    }
};
const originalRenderAccountRow = window.renderAccountRow;
window.renderAccountRow = function(a, bank) {
    let html = originalRenderAccountRow(a, bank);
    if (html.includes('class="account-row"')) {
        html = html.replace('class="account-row"', `class="account-row" data-acc-type="${a.type}"`);
    }
    return html;
};
setTimeout(() => {
    if (typeof S !== 'undefined' && S.settings.badgeStyle === 'minimal') document.body.classList.add('theme-minimal');
}, 100);

// 4. НОВОЕ МЕНЮ (Реструктуризация)
window.openMenu = function() {
    openModal(`
    <div class="modal-header"><h2>Меню</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>
    <div class="menu-list">
        <button class="menu-item" onclick="openSettings()"><span class="menu-icon">⚙️</span>Настройки</button>
        <button class="menu-item" onclick="openSecuritySettings()"><span class="menu-icon">🔒</span>Безопасность</button>
        <button class="menu-item" onclick="openCatAndDebtsMenu()"><span class="menu-icon">📂</span>Категории и Долги</button>
        <button class="menu-item" onclick="openBackupMenu()"><span class="menu-icon">💾</span>Резервные копии</button>
        <button class="menu-item warn" onclick="clearLocalData()"><span class="menu-icon">🗑</span>Очистить данные</button>
    </div>`);
};

function openCatAndDebtsMenu() {
    openModal(`
    <div class="modal-header"><h2>Категории и Долги</h2><button class="btn-icon" onclick="openMenu()">✕</button></div>
    <div class="menu-list">
        <button class="menu-item" onclick="openCategoryEditor()"><span class="menu-icon">📑</span>Редактор категорий</button>
        <button class="menu-item" onclick="openCounterparties()"><span class="menu-icon">👥</span>Контрагенты (Долги)</button>
    </div>`);
}

function openBackupMenu() {
    openModal(`
    <div class="modal-header"><h2>Резервные копии</h2><button class="btn-icon" onclick="openMenu()">✕</button></div>
    <div class="menu-list">
        <button class="menu-item" onclick="exportJSON()"><span class="menu-icon">📥</span>Скачать бэкап (JSON)</button>
        <button class="menu-item" onclick="importJSON()"><span class="menu-icon">📤</span>Восстановить из JSON</button>
        <button class="menu-item" onclick="openBackupHistoryModal()"><span class="menu-icon">🕒</span>История 7 дней (Облако)</button>
    </div>`);
}

function openSecuritySettings() {
    openModal(`
    <div class="modal-header"><h2>Безопасность</h2><button class="btn-icon" onclick="openMenu()">✕</button></div>
    <div class="form-group">
        <label>PIN-код (4 цифры, пусто = отключен)</label>
        <input type="text" id="secPin" maxlength="4" value="${S.settings.pinCode || ''}" placeholder="****">
    </div>
    <button class="btn-primary btn-block" onclick="saveSecuritySettings()">Сохранить</button>`);
}

function saveSecuritySettings() {
    const pin = document.getElementById('secPin').value.trim();
    if (pin && !/^\d{4}$/.test(pin)) { toast('PIN должен состоять из 4 цифр'); return; }
    S.settings.pinCode = pin;
    save();
    toast('Настройки безопасности сохранены');
    openMenu();
}

function clearLocalData() {
    if (!confirm('Удалить ВСЕ локальные данные? Данные в облаке останутся.')) return;
    const token = S.settings.yandexToken;
    localStorage.removeItem('financeApp_v25');
    if (token) localStorage.setItem('financeApp_v25', JSON.stringify({ settings: { yandexToken: token } }));
    location.reload();
}
