(function() {
    console.log("✅ mod-drafts.js v8 загружен (исправлен класс visible)");
    const DRAFT_KEY = 'financeApp_draft';
    const MAX_AGE = 2 * 60 * 60 * 1000;
    let saveTimeout = null;
    let currentModalRestored = false;

    function getModalType() {
        if (document.getElementById('txForm')) return 'tx';
        if (document.getElementById('accForm')) return 'acc';
        if (document.getElementById('bankForm')) return 'bank';
        return null;
    }

    function saveDraft() {
        const backdrop = document.getElementById('modalBackdrop');
        if (!backdrop) return;

        const type = getModalType();
        if (!type) return;

        // ИСПРАВЛЕНО: проверяем класс visible
        if (!backdrop.classList.contains('visible')) {
            console.log("⚠️ saveDraft: бэкдроп НЕ имеет класса 'visible', отмена сохранения");
            return;
        }

        const inputs = backdrop.querySelectorAll('input, select, textarea');
        const data = {};
        
        inputs.forEach(el => {
            if (el.id) {
                data[el.id] = el.type === 'checkbox' ? el.checked : el.value;
            }
        });

        if (Object.keys(data).length === 0) return;

        localStorage.setItem(DRAFT_KEY, JSON.stringify({
            type: type,
            data: data,
            timestamp: Date.now()
        }));
        console.log("💾 ЧЕРНОВИК СОХРАНЕН:", type, "-", Object.keys(data).length, "полей");
    }

    function scheduleSave() {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveDraft, 500);
    }

    function getDraft() {
        const s = localStorage.getItem(DRAFT_KEY);
        if (!s) return null;
        try {
            const d = JSON.parse(s);
            if (Date.now() - d.timestamp > MAX_AGE) {
                localStorage.removeItem(DRAFT_KEY);
                return null;
            }
            return d;
        } catch(e) { return null; }
    }

    function clearDraft() {
        localStorage.removeItem(DRAFT_KEY);
        console.log("🗑️ Черновик удален");
    }

    function applyDraft(draft) {
        console.log("✅ applyDraft: начинаю восстановление", draft.type);
        const data = draft.data;

        if (draft.type === 'tx' && data['txType']) {
            const typeEl = document.getElementById('txType');
            if (typeEl && typeEl.value !== data['txType']) {
                typeEl.value = data['txType'];
                typeEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        setTimeout(() => {
            Object.keys(data).forEach(id => {
                const el = document.getElementById(id);
                if (!el || id === 'txType') return;

                if (el.type === 'checkbox') {
                    el.checked = !!data[id];
                } else if (el.tagName === 'SELECT') {
                    const exists = Array.from(el.options).some(o => String(o.value) === String(data[id]));
                    if (exists) el.value = data[id];
                } else {
                    el.value = data[id];
                }
            });

            if (typeof updateAccDisplay === 'function') {
                ['txAccount', 'txToAccount'].forEach(id => {
                    if (data[id]) updateAccDisplay(data[id], id + 'Name', id + 'Badge');
                });
            }

            const wrapper = document.getElementById('newCpWrapper');
            if (wrapper && data['txCounterparty'] !== undefined) {
                wrapper.style.display = (data['txCounterparty'] === '__new') ? 'block' : 'none';
            }
            console.log("✅ ЧЕРНОВИК ВОССТАНОВЛЕН:", draft.type);
        }, 300);
    }

    function tryRestore() {
        const backdrop = document.getElementById('modalBackdrop');
        
        // ИСПРАВЛЕНО: проверяем класс visible
        if (!backdrop || !backdrop.classList.contains('visible')) return;
        if (currentModalRestored) return;

        const type = getModalType();
        if (!type) return;

        const draft = getDraft();
        if (!draft || draft.type !== type) {
            currentModalRestored = true;
            return;
        }

        currentModalRestored = true;
        applyDraft(draft);
    }

    document.addEventListener('input', (e) => {
        if (e.target.closest('#modalBackdrop')) scheduleSave();
    });
    document.addEventListener('change', (e) => {
        if (e.target.closest('#modalBackdrop')) scheduleSave();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') saveDraft();
    });
    window.addEventListener('pagehide', saveDraft);

    document.addEventListener('click', (e) => {
        if (e.target.closest('.modal-header .btn-icon') || e.target.closest('.modal-header .close-btn')) {
            clearDraft();
        }
    }, true);

    document.addEventListener('submit', (e) => {
        if (['txForm', 'accForm', 'bankForm'].includes(e.target.id)) {
            setTimeout(() => {
                const backdrop = document.getElementById('modalBackdrop');
                // ИСПРАВЛЕНО: проверяем класс visible
                if (!backdrop || !backdrop.classList.contains('visible')) {
                    clearDraft();
                }
            }, 500);
        }
    }, true);

    const observer = new MutationObserver(() => {
        const backdrop = document.getElementById('modalBackdrop');
        // ИСПРАВЛЕНО: проверяем класс visible
        if (backdrop && backdrop.classList.contains('visible')) {
            setTimeout(tryRestore, 300);
        } else {
            currentModalRestored = false;
        }
    });

    function startObserver() {
        const backdrop = document.getElementById('modalBackdrop');
        if (!backdrop) {
            setTimeout(startObserver, 100);
            return;
        }
        observer.observe(backdrop, { attributes: true, attributeFilter: ['class', 'style'] });
        console.log("👀 MutationObserver запущен на #modalBackdrop");
    }
    startObserver();
})();
