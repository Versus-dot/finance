// ==========================================
// МОДУЛЬ БЕЗОПАСНОСТИ (mod-security.js)
// ==========================================
(function() {
    console.log("✅ Модуль безопасности (mod-security.js) загружен");

    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        #lockScreen { position: fixed; inset: 0; background: var(--bg); z-index: 99999; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        #lockScreen .dots { display: flex; gap: 15px; margin: 30px 0; }
        #lockScreen .dot { width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--muted); transition: all 0.2s; }
        #lockScreen .dot.filled { background: var(--accent); border-color: var(--accent); }
        #lockScreen .numpad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        #lockScreen .num-btn { width: 70px; height: 70px; border-radius: 50%; background: var(--card2); color: var(--text); font-size: 24px; font-weight: 600; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        #lockScreen .num-btn:active { background: var(--accent); color: #fff; }
        #lockScreen .forgot-btn { margin-top: 20px; color: var(--muted); background: none; border: none; text-decoration: underline; }
        #lockScreen .error-msg { color: var(--red); font-size: 14px; margin-top: 10px; height: 20px; }
        .shake { animation: shake 0.4s; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }
    `;
    document.head.appendChild(styleEl);

    let pinBuffer = '';
    let lastActiveTime = Date.now();

    function showLockScreen() {
        if (document.getElementById('lockScreen')) return;
        const ls = document.createElement('div'); ls.id = 'lockScreen';
        ls.innerHTML = `<div style="font-size: 40px; margin-bottom: 20px;">🔒</div><div style="font-size: 18px; font-weight: 600;">Введите PIN-код</div><div class="dots" id="pinDots"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div><div class="error-msg" id="pinError"></div><div class="numpad" id="pinNumpad">${[1,2,3,4,5,6,7,8,9].map(n => `<button class="num-btn" data-val="${n}">${n}</button>`).join('')}<div></div><button class="num-btn" data-val="0">0</button><button class="num-btn" data-val="back">⌫</button></div><button class="forgot-btn" id="forgotPinBtn">Забыли PIN-код?</button>`;
        document.body.appendChild(ls);
        const dots = document.querySelectorAll('#pinDots .dot');
        const errorEl = document.getElementById('pinError');
        
        function updateDots() { dots.forEach((dot, i) => dot.classList.toggle('filled', i < pinBuffer.length)); }
        
        document.getElementById('pinNumpad').onclick = (e) => {
            const btn = e.target.closest('.num-btn'); if (!btn) return; const val = btn.dataset.val;
            if (val === 'back') { pinBuffer = pinBuffer.slice(0, -1); updateDots(); } 
            else {
                if (pinBuffer.length < 4) { pinBuffer += val; updateDots(); }
                if (pinBuffer.length === 4) {
                    setTimeout(() => {
                        if (pinBuffer === S.settings.pinCode) { ls.remove(); lastActiveTime = Date.now(); } 
                        else { errorEl.textContent = 'Неверный PIN'; ls.classList.add('shake'); setTimeout(() => ls.classList.remove('shake'), 400); pinBuffer = ''; updateDots(); }
                    }, 100);
                }
            }
        };
        document.getElementById('forgotPinBtn').onclick = () => {
            if (confirm("Сбросить PIN? Данные будут удалены. Восстановить можно только из облака.")) {
                if (confirm("ВНИМАНИЕ! Восстановление потребует ввода Облачного токена заново. Вы точно хотите стереть данные?")) {
                    localStorage.setItem('financeApp_isReset', 'true'); localStorage.removeItem('financeApp_v25'); location.reload();
                }
            }
        };
    }

    function checkLock() {
        if (typeof S !== 'undefined' && S.settings && S.settings.pinCode) {
            const timePassed = Date.now() - lastActiveTime;
            if (timePassed > 5 * 60 * 1000 || !sessionStorage.getItem('app_unlocked')) { 
                showLockScreen(); 
                sessionStorage.setItem('app_unlocked', 'true'); 
            }
        }
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') { lastActiveTime = Date.now(); } 
        else if (document.visibilityState === 'visible') { checkLock(); }
    });
    
    setTimeout(checkLock, 500);

    // ==========================================
    // ОКНО БЕЗОПАСНОСТИ
    // ==========================================
    window.openSecuritySettings = function() {
        openModal(`
        <div class="modal-header"><h2>Безопасность</h2><button class="btn-icon" onclick="openMenu()">✕</button></div>
        
        <div class="form-group"><label>PIN-код (4 цифры, пусто = отключен)</label><input type="text" id="secPin" maxlength="4" value="${S.settings.pinCode || ''}" placeholder="****"></div>
        
        <hr style="border-color:var(--border); margin: 16px 0;">
        
        <div style="font-weight:700; margin-bottom:10px;">☁️ Токен облачного бэкапа (Яндекс)</div>
        <div class="form-group"><input type="password" id="secYandexToken" value="${S.settings.yandexToken || ''}" placeholder="Вставьте токен"></div>
        
        <hr style="border-color:var(--border); margin: 16px 0;">
        
        <div style="font-weight:700; margin-bottom:10px;">📈 Токен Т-Инвестиций</div>
        <div class="form-group"><input type="password" id="secTInvestToken" value="${S.settings.tInvestToken || ''}" placeholder="Вставьте токен (Read-only)"></div>
        
        <button class="btn-primary btn-block" onclick="window.saveSecuritySettings()">Сохранить всё</button>

        <hr style="border-color:var(--border); margin: 24px 0 16px;">
        
        <div style="font-weight:700; color:var(--red); margin-bottom:8px;">⚠️ Опасная зона</div>
        <div style="font-size:12px; color:var(--muted); margin-bottom:12px; line-height:1.4;">Перед сбросом настоятельно рекомендуем сохранить резервную копию в облако. Эти действия нельзя отменить.</div>
        
        <button class="btn-secondary btn-block" style="margin-bottom:8px; border-color:var(--red); color:var(--red);" onclick="window.softReset()">Очистить историю (сохранить счета)</button>
        <button class="btn-danger btn-block" onclick="window.hardReset()">Полный сброс (удалить всё)</button>
        `);
    };

    window.saveSecuritySettings = function() {
        const pin = document.getElementById('secPin').value.trim();
        if (pin && !/^\d{4}$/.test(pin)) { toast('PIN должен состоять из 4 цифр'); return; }
        S.settings.pinCode = pin;
        S.settings.yandexToken = document.getElementById('secYandexToken').value.trim();
        S.settings.tInvestToken = document.getElementById('secTInvestToken').value.trim();
        save(); 
        toast('Настройки безопасности сохранены'); 
        window.openMenu();
        if (typeof syncSmart === 'function') syncSmart(true); 
    };

    window.softReset = function() {
        if (!confirm('Удалить ВСЕ операции, бюджеты и снимки капитала?\n\nСчета и банки останутся, но их балансы сбросятся к начальным значениям.')) return;
        S.transactions = [];
        S.budgets = [];
        S.snapshots = [];
        S.accounts.forEach(a => a.balance = a.initialBalance || 0);
        save();
        renderAll();
        if (typeof syncSmart === 'function') syncSmart(true);
        toast('История очищена');
        closeModal();
    };

    window.hardReset = function() {
        if (!confirm('ПОЛНЫЙ СБРОС. Удалить ВСЕ данные: счета, банки, операции, настройки?\n\nЭто действие НЕЛЬЗЯ отменить.')) return;
        if (prompt('Для подтверждения введите слово "УДАЛИТЬ" заглавными буквами:') !== 'УДАЛИТЬ') {
            toast('Сброс отменен');
            return;
        }
        localStorage.setItem('financeApp_isReset', 'true');
        localStorage.removeItem('financeApp_v25');
        localStorage.removeItem('financeApp_lastSync');
        localStorage.removeItem('financeApp_localChange');
        location.reload();
    };

    const prevOpenSettings = window.openSettings;
    window.openSettings = function() {
        if (prevOpenSettings) prevOpenSettings();
        const oldPin = document.getElementById('setPin'); 
        if (oldPin) oldPin.closest('.form-group').style.display = 'none';
        const oldToken = document.getElementById('setYandexToken'); 
        if (oldToken) oldToken.closest('.form-group').style.display = 'none';
    };

})();
