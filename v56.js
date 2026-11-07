// ==========================================
// ФИНАЛЬНЫЙ МОДУЛЬ v56 (ВСЁ В ОДНОМ ФАЙЛЕ)
// ==========================================
(function() {
    console.log("✅ Файл v56.js успешно загружен (Финальная сборка)");

    // ==========================================
    // 1. ГЛОБАЛЬНЫЕ СТИЛИ (Скролл, Минимализм, Экран блокировки)
    // ==========================================
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        /* --- ФИКС СКРОЛЛА В МОДАЛКАХ --- */
        .modal {
            overscroll-behavior: contain !important;
            -webkit-overflow-scrolling: touch;
        }
        body.modal-open {
            overflow: hidden !important;
        }

        /* --- ПРЯЧЕМ ПЛАВАЮЩУЮ КНОПКУ --- */
        #fabBtn { display: none !important; }
        .account-row { transition: all 0.2s ease; }

        /* --- СТИЛИ ТЕМ --- */
        /* 1. Цветные полосы */
        body.style-stripe .account-row {
            border-left: 4px solid var(--bank-color) !important;
            background: var(--card) !important;
            margin: 0 6px 0 10px !important;
            border-radius: 0 8px 8px 0 !important;
            border-bottom: 1px solid var(--border) !important;
        }
        body.style-stripe .account-row:has(.acc-debt) { background: rgba(255, 92, 92, 0.05) !important; }
        body.style-stripe .account-row:not(:has(.acc-debt)) { background: rgba(46, 204, 113, 0.04) !important; }

        /* 2. Легкий фон */
        body.style-bg .account-row {
            border-left: none !important;
            background: rgba(46, 204, 113, 0.1) !important;
            margin: 6px 10px !important;
            border-radius: 10px !important;
            border: 1px solid rgba(46, 204, 113, 0.2) !important;
        }
        body.style-bg .account-row:has(.acc-debt) {
            background: rgba(255, 92, 92, 0.1) !important; 
            border-color: rgba(255, 92, 92, 0.3) !important;
        }

        /* 3. Минимализм */
        body.style-minimal .account-row {
            border-left: none !important;
            background: var(--card2) !important;
            margin: 6px 10px !important;
            border-radius: 10px !important;
            border: 1px solid var(--border) !important;
        }
        body.style-minimal .acc-icon-wrap { transition: all 0.2s ease; }
        body.style-minimal .account-row:not(:has(.acc-debt)) .acc-icon-wrap { background: #2d3647 !important; color: #9aa5b8 !important; }
        body.style-minimal .account-row:has(.acc-debt) .acc-icon-wrap { background: #1f2532 !important; color: #6b778c !important; }

        /* Визуальная пометка "Не в балансе" */
        .account-row.ignore-balance { opacity: 0.5; filter: grayscale(1); }
        .account-row.ignore-balance .acc-balance::after { content: ' 👁️‍🗨️'; font-size: 12px; }

        /* --- ЭКРАН БЛОКИРОВКИ --- */
        #lockScreen {
            position: fixed; inset: 0; background: var(--bg); z-index: 99999;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            font-family: inherit;
        }
        #lockScreen .dots { display: flex; gap: 15px; margin: 30px 0; }
        #lockScreen .dot {
            width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--muted);
            transition: all 0.2s;
        }
        #lockScreen .dot.filled { background: var(--accent); border-color: var(--accent); }
        #lockScreen .numpad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        #lockScreen .num-btn {
            width: 70px; height: 70px; border-radius: 50%; background: var(--card2);
            color: var(--text); font-size: 24px; font-weight: 600; border: none; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
        }
        #lockScreen .num-btn:active { background: var(--accent); color: #fff; }
        #lockScreen .forgot-btn { margin-top: 20px; color: var(--muted); background: none; border: none; text-decoration: underline; }
        #lockScreen .error-msg { color: var(--red); font-size: 14px; margin-top: 10px; height: 20px; }
        .shake { animation: shake 0.4s; }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
        }

        /* Баннер восстановления */
        #restoreBanner {
            background: var(--yellow); color: #000; padding: 10px 15px; border-radius: 10px;
            margin: 10px; display: flex; justify-content: space-between; align-items: center;
            font-weight: 600; font-size: 13px;
        }
        #restoreBanner button { background: #000; color: #fff; padding: 5px 10px; border-radius: 5px; }
    `;
    document.head.appendChild(styleEl);

    // ==========================================
    // 2. ЭКРАН БЛОКИРОВКИ И БЕЗОПАСНОСТЬ
    // ==========================================
    let pinBuffer = '';
    let lastActiveTime = Date.now();

    function showLockScreen() {
        if (document.getElementById('lockScreen')) return;
        const ls = document.createElement('div');
        ls.id = 'lockScreen';
        ls.innerHTML = `
            <div style="font-size: 40px; margin-bottom: 20px;">🔒</div>
            <div style="font-size: 18px; font-weight: 600;">Введите PIN-код</div>
            <div class="dots" id="pinDots">
                <div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>
            </div>
            <div class="error-msg" id="pinError"></div>
            <div class="numpad" id="pinNumpad">
                ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="num-btn" data-val="${n}">${n}</button>`).join('')}
                <div></div>
                <button class="num-btn" data-val="0">0</button>
                <button class="num-btn" data-val="back">⌫</button>
            </div>
            <button class="forgot-btn" id="forgotPinBtn">Забыли PIN-код?</button>
        `;
        document.body.appendChild(ls);

        const dots = document.querySelectorAll('#pinDots .dot');
        const errorEl = document.getElementById('pinError');

        function updateDots() {
            dots.forEach((dot, i) => dot.classList.toggle('filled', i < pinBuffer.length));
        }

        document.getElementById('pinNumpad').onclick = (e) => {
            const btn = e.target.closest('.num-btn');
            if (!btn) return;
            const val = btn.dataset.val;

            if (val === 'back') {
                pinBuffer = pinBuffer.slice(0, -1);
                updateDots();
            } else {
                if (pinBuffer.length < 4) {
                    pinBuffer += val;
                    updateDots();
                }
                if (pinBuffer.length === 4) {
                    setTimeout(() => {
                        if (pinBuffer === S.settings.pinCode) {
                            ls.remove();
                            lastActiveTime = Date.now();
                            document.body.classList.remove('modal-open'); // освобождаем скролл
                        } else {
                            errorEl.textContent = 'Неверный PIN';
                            ls.classList.add('shake');
                            setTimeout(() => ls.classList.remove('shake'), 400);
                            pinBuffer = '';
                            updateDots();
                        }
                    }, 100);
                }
            }
        };

        document.getElementById('forgotPinBtn').onclick = () => {
            if (confirm("Сбросить PIN? Данные будут удалены. Восстановить можно только из облака.")) {
                if (confirm("ВНИМАНИЕ! Восстановление потребует ввода Облачного токена заново. Вы точно хотите стереть данные?")) {
                    localStorage.setItem('financeApp_isReset', 'true');
                    localStorage.removeItem('financeApp_v25');
                    location.reload();
                }
            }
        };
    }

    function checkLock() {
        if (typeof S !== 'undefined' && S.settings && S.settings.pinCode) {
            const timePassed = Date.now() - lastActiveTime;
            // Если прошло больше 5 минут (300000 мс) или приложение открыто впервые
            if (timePassed > 5 * 60 * 1000 || !sessionStorage.getItem('app_unlocked')) {
                showLockScreen();
                sessionStorage.setItem('app_unlocked', 'true');
            }
        }
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            lastActiveTime = Date.now();
        } else if (document.visibilityState === 'visible') {
            checkLock();
        }
    });

    // Запускаем проверку при загрузке
    setTimeout(() => {
        checkLock();
        // Блокируем скролл body, если открыт экран блокировки
        if (document.getElementById('lockScreen')) document.body.classList.add('modal-open');
    }, 500);

    // ==========================================
    // 3. ФИКС СОРТИРОВКИ СЧЕТОВ
    // ==========================================
    const originalInitSortable = window.initSortable;
    window.initSortable = function() {
        if (originalInitSortable) originalInitSortable();
        if (typeof Sortable === 'undefined') return;
        
        document.querySelectorAll('.account-list-wrapper').forEach(container => {
            if (container.dataset.sortableInit) return; // Предотвращаем дублирование
            container.dataset.sortableInit = 'true';
            new Sortable(container, {
                animation: 150,
                group: { name: 'accounts', pull: false, put: false },
                handle: '.drag-handle',
                filter: 'button, input, select, .sub-bank-section',
                onEnd: function() {
                    const items = container.querySelectorAll(':scope > [data-acc-id]');
                    items.forEach((item, index) => {
                        const id = item.dataset.accId;
                        const a = getAcc(id);
                        if (a) a.order = index;
                    });
                    save();
                    renderAll();
                }
            });
        });
    };

    // ==========================================
    // 4. НАСТРОЙКИ (Минимализм, Смена PIN, Email)
    // ==========================================
    function applyBadgeStyle() {
        document.body.classList.remove('style-stripe', 'style-bg', 'style-minimal');
        const style = (typeof S !== 'undefined' && S.settings && S.settings.badgeStyle) ? S.settings.badgeStyle : 'stripe';
        if (style === 'minimal') document.body.classList.add('style-minimal');
        else if (style === 'bg') document.body.classList.add('style-bg');
        else document.body.classList.add('style-stripe');
    }
    setTimeout(applyBadgeStyle, 100);

    const prevOpenSettings = window.openSettings;
    window.openSettings = function() {
        prevOpenSettings();
        const badgeSelect = document.getElementById('setBadge');
        if (badgeSelect) {
            badgeSelect.innerHTML = `
                <option value="stripe" ${S.settings.badgeStyle==='stripe'?'selected':''}>Цветные полосы</option>
                <option value="bg" ${S.settings.badgeStyle==='bg'?'selected':''}>Легкий фон</option>
                <option value="minimal" ${S.settings.badgeStyle==='minimal'?'selected':''}>Минимализм</option>
            `;
        }
    };

    const prevSaveSettings = window.saveSettings;
    window.saveSettings = function() {
        prevSaveSettings();
        applyBadgeStyle();
    };

    window.openSecuritySettings = function() {
        openModal(`
        <div class="modal-header"><h2>Безопасность</h2><button class="btn-icon" onclick="openMenu()">✕</button></div>
        <div class="form-group">
            <label>PIN-код (4 цифры, пусто = отключен)</label>
            <input type="text" id="secPin" maxlength="4" value="${S.settings.pinCode || ''}" placeholder="****">
        </div>
        <button class="btn-primary btn-block" onclick="window.saveSecuritySettings()">Сохранить</button>`);
    };

    window.saveSecuritySettings = function() {
        const pin = document.getElementById('secPin').value.trim();
        if (pin && !/^\d{4}$/.test(pin)) { toast('PIN должен состоять из 4 цифр'); return; }
        S.settings.pinCode = pin;
        save();
        toast('Настройки безопасности сохранены');
        window.openMenu();
    };

    // ==========================================
    // 5. ОКНО СЧЕТА (Срок в днях, Исключить из баланса, Хедж)
    // ==========================================
    const prevOpenAccountModal = window.openAccountModal;
    window.openAccountModal = function(id, bankId) {
        prevOpenAccountModal(id, bankId);
        
        const modal = document.getElementById('modalContent');
        if (!modal) return;
        const acc = id ? getAcc(id) : null;
        const form = document.getElementById('accForm');
        if (!form) return;

        // А) ДОБАВЛЯЕМ "УЧИТЫВАТЬ В БАЛАНСЕ"
        const cushionLabel = form.querySelector('input[id="accCushion"]').closest('.form-group');
        const ignoreDiv = document.createElement('div');
        ignoreDiv.className = 'form-group';
        ignoreDiv.innerHTML = `<label><input type="checkbox" id="accIgnoreBalance" style="width:auto;margin-right:8px" ${acc && acc.ignoreBalance ? 'checked' : ''}>👁️‍🗨️ Исключить из общего баланса</label>`;
        cushionLabel.after(ignoreDiv);

        // Б) СРОК В ДНЯХ
        const termSelect = document.getElementById('accTerm');
        if (termSelect) {
            termSelect.insertAdjacentHTML('beforeend', `<option value="custom">Свой срок (в днях)</option>`);
            const customDiv = document.createElement('div');
            customDiv.className = 'form-group';
            customDiv.style.display = 'none';
            customDiv.innerHTML = `<label>Количество дней</label><input type="number" id="accTermDays" placeholder="Например, 181" min="1">`;
            termSelect.closest('.form-group').after(customDiv);

            // Восстановление значения, если это кастомный срок
            if (acc && acc.term && acc.term.endsWith('d')) {
                termSelect.value = 'custom';
                customDiv.style.display = 'block';
                document.getElementById('accTermDays').value = acc.term.replace('d', '');
            }

            termSelect.onchange = function() {
                customDiv.style.display = this.value === 'custom' ? 'block' : 'none';
            };

            // При отправке формы подменяем значение селекта
            form.addEventListener('submit', function(e) {
                if (termSelect.value === 'custom') {
                    const days = document.getElementById('accTermDays').value;
                    if (days) {
                        const val = days + 'd';
                        if (!TERMS[val]) TERMS[val] = days + ' дн.';
                        termSelect.innerHTML += `<option value="${val}" selected>${days} дн.</option>`;
                    }
                }
            }, true); // Используем capture phase, чтобы сработало до app.js
        }

        // В) ХЕДЖ (Формат [Банк] Имя)
        setTimeout(() => {
            const hedgeSelect = document.getElementById('accHedgeFor');
            if (hedgeSelect) {
                Array.from(hedgeSelect.options).forEach(opt => {
                    if (!opt.value) return;
                    const card = getAcc(opt.value);
                    if (card) {
                        const bank = getBank(card.bankId);
                        opt.textContent = `[${bank ? bank.name : 'Банк'}] ${card.name}`;
                    }
                });
            }
        }, 100);
    };

    // Перехват сохранения формы счета для записи ignoreBalance
    const originalSave = window.save;
    window.save = function(...args) {
        originalSave.apply(this, args);
        applyBadgeStyle();
    };

    // Сохраняем ignoreBalance в объект (вклиниваемся в момент изменения)
    document.addEventListener('change', function(e) {
        if (e.target.id === 'accIgnoreBalance') {
            const form = e.target.closest('#accForm');
            if (form) {
                form.dataset.ignoreBalance = e.target.checked ? 'true' : 'false';
            }
        }
    });

    // Перехватываем submit формы счета (чтобы записать ignoreBalance)
    document.addEventListener('submit', function(e) {
        if (e.target.id === 'accForm') {
            const ignoreCb = document.getElementById('accIgnoreBalance');
            if (ignoreCb) {
                // Находим ID текущего счета (либо редактируем, либо новый)
                const urlId = document.querySelector('#modalContent h2').textContent.includes('Счёт') ? document.querySelector('[onclick*="deleteAccount"]')?.getAttribute('onclick')?.match(/'([^']+)'/)?.[1] : null;
                // Проще перехватить функцию сохранения счета, но сделаем костыль через таймаут:
                setTimeout(() => {
                    // app.js уже сохранил счет, последний элемент — наш
                    const accs = S.accounts;
                    if (accs.length) {
                        const last = accs[accs.length - 1];
                        if (!window._editingAccId) last.ignoreBalance = ignoreCb.checked;
                    }
                }, 10);
            }
        }
    });

    // ==========================================
    // 6. ПЕРЕРАСЧЕТ БАЛАНСА (Исключаем ignoreBalance)
    // ==========================================
    const originalComputeTotals = window.computeTotals;
    window.computeTotals = function() {
        let totals = originalComputeTotals();
        if (typeof S !== 'undefined') {
            let ignoredSum = 0;
            S.accounts.filter(a => a.ignoreBalance && !a.archived).forEach(a => {
                ignoredSum += accValue(a);
            });
            // Вычитаем из общего капитала, но не из долгов
            totals.totalCap -= ignoredSum;
        }
        return totals;
    };

    // ==========================================
    // 7. ПРЕДОХРАНИТЕЛЬ ОТ ПУСТОГО БЭКАПА
    // ==========================================
    const originalBackup = window.backupToYandexDisk;
    window.backupToYandexDisk = async function(silent = false) {
        if (typeof S !== 'undefined') {
            const isEmpty = (!S.accounts || S.accounts.length === 0) && (!S.transactions || S.transactions.length === 0);
            const isReset = localStorage.getItem('financeApp_isReset') === 'true';
            if (isEmpty && isReset) {
                console.warn('⚠️ Отправка пустых данных в облако заблокирована!');
                if (!silent) toast('Отправка пустых данных заблокирована');
                return;
            }
        }
        return originalBackup(silent);
    };

    // Проверка флага сброса при запуске
    setTimeout(() => {
        if (localStorage.getItem('financeApp_isReset') === 'true') {
            const banner = document.createElement('div');
            banner.id = 'restoreBanner';
            banner.innerHTML = `
                <span>Данные очищены. Восстановить из облака?</span>
                <button onclick="window.restoreFromYandexDisk()">Восстановить</button>
            `;
            const main = document.querySelector('main');
            if (main) main.prepend(banner);
        }
    }, 1000);

    // ==========================================
    // 8. ОСТАЛЬНОЕ (Кнопка + на операциях, Меню)
    // ==========================================
    const prevRenderTransactions = window.renderTransactions;
    window.renderTransactions = function() {
        if (prevRenderTransactions) prevRenderTransactions();
        const page = document.getElementById('page-transactions');
        if (page && page.classList.contains('active')) {
            const formRow = page.querySelector('.form-row');
            if (formRow && !document.getElementById('inlineTxBtn')) {
                formRow.style.display = 'flex'; formRow.style.gap = '8px'; formRow.style.alignItems = 'center';
                const btn = document.createElement('button');
                btn.id = 'inlineTxBtn'; btn.className = 'btn-primary';
                btn.style = 'padding: 0; width: 42px; height: 42px; flex-shrink: 0; border-radius: 10px; font-size: 24px; display: flex; align-items: center; justify-content: center;';
                btn.innerHTML = '+';
                btn.onclick = () => { if(typeof openTxModal === 'function') openTxModal(); };
                formRow.appendChild(btn);
            }
        }
    };

    window.openMenu = function() {
        openModal(`
        <div class="modal-header"><h2>Меню</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>
        <div class="menu-list">
            <button class="menu-item" onclick="openSettings()"><span class="menu-icon">⚙️</span>Настройки</button>
            <button class="menu-item" onclick="window.openSecuritySettings()"><span class="menu-icon">🔒</span>Безопасность</button>
            <button class="menu-item" onclick="window.openCatAndDebtsMenu()"><span class="menu-icon">📂</span>Категории и Долги</button>
            <button class="menu-item" onclick="window.openBackupMenu()"><span class="menu-icon">💾</span>Резервные копии</button>
            <button class="menu-item warn" onclick="window.clearLocalData()"><span class="menu-icon">🗑</span>Очистить данные</button>
        </div>`);
    };

    window.openCatAndDebtsMenu = function() {
        openModal(`
        <div class="modal-header"><h2>Категории и Долги</h2><button class="btn-icon" onclick="openMenu()">✕</button></div>
        <div class="menu-list">
            <button class="menu-item" onclick="openCategoryEditor()"><span class="menu-icon">📑</span>Редактор категорий</button>
            <button class="menu-item" onclick="openCounterparties()"><span class="menu-icon">👥</span>Контрагенты (Долги)</button>
        </div>`);
    };

    window.openBackupMenu = function() {
        openModal(`
        <div class="modal-header"><h2>Резервные копии</h2><button class="btn-icon" onclick="openMenu()">✕</button></div>
        <div class="menu-list">
            <button class="menu-item" onclick="exportJSON()"><span class="menu-icon">📥</span>Скачать бэкап (JSON)</button>
            <button class="menu-item" onclick="importJSON()"><span class="menu-icon">📤</span>Восстановить из JSON</button>
            <button class="menu-item" onclick="openBackupHistoryModal()"><span class="menu-icon">🕒</span>История 7 дней (Облако)</button>
        </div>`);
    };

    // Двойное подтверждение сброса
    window.clearLocalData = function() {
        if (!confirm('Вы уверены, что хотите удалить все локальные данные? Приложение вернется в исходное состояние.')) return;
        if (confirm('ВНИМАНИЕ! Это действие необратимо. Ваши данные будут удалены с этого устройства. Восстановить их можно будет ТОЛЬКО если вы введете свой Облачный токен заново. Вы точно хотите стереть всё?')) {
            localStorage.setItem('financeApp_isReset', 'true');
            localStorage.removeItem('financeApp_v25');
            location.reload();
        }
    };

})();
