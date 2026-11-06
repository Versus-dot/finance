// ==========================================
// ВСЁ ДЛЯ v56 В ОДНОМ ФАЙЛЕ (v56.js)
// ==========================================

// 1. СТИЛИ (Кнопки "+" и тема "Минимализм")
const styleEl = document.createElement('style');
styleEl.innerHTML = `
    body:has(#page-accounts.active) #fabBtn { display: none !important; }
    body:has(#page-transactions.active) #fabBtn {
        width: 46px !important; height: 46px !important; font-size: 24px !important;
        bottom: calc(70px + env(safe-area-inset-bottom)) !important;
        right: 16px !important; box-shadow: 0 4px 10px rgba(77,127,255,0.3) !important;
    }
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

// 2. ТЕМА "МИНИМАЛИЗМ" (Настройки)
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

// 3. НОВОЕ МЕНЮ (Реструктуризация)
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
