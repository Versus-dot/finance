// ==========================================
// МОДУЛЬ ЧЕРНОВИКОВ (mod-drafts.js) v4
// ==========================================
(function() {
    console.log("✅ Модуль черновиков (mod-drafts.js) v4 загружен");
    const DRAFT_KEY = 'financeApp_draft';
    const MAX_AGE = 2 * 60 * 60 * 1000; // 2 часа
    let saveTimeout = null;
    let hadModalOnHide = false;

    function saveDraft() {
        const backdrop = document.getElementById('modalBackdrop');
        if (!backdrop || !backdrop.classList.contains('active')) return;
        const content = document.getElementById('modalContent');
        if (!content) return;

        let type = null;
        if (document.getElementById('txForm')) type = 'tx';
        else if (document.getElementById('accForm')) type = 'acc';
        else if (document.getElementById('bankForm')) type = 'bank';
        if (!type) return;

        const data = {};
        content.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.id) {
                if (el.type === 'checkbox') data[el.id] = el.checked;
                else data[el.id] = el.value;
            }
        });

        localStorage.setItem(DRAFT_KEY, JSON.stringify({ 
            type, 
            id: window._currentDraftId || null, 
            bankId: window._currentDraftBankId || null,
            data, 
            timestamp: Date.now() 
        }));
    }

    function scheduleSave() {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveDraft, 300);
    }

    function clearDraft() {
        localStorage.removeItem(DRAFT_KEY);
    }

    function getDraft() {
        const s = localStorage.getItem(DRAFT_KEY);
        if (!s) return null;
        try {
            const d = JSON.parse(s);
            if (Date.now() - d.timestamp > MAX_AGE) { clearDraft(); return null; }
            return d;
        } catch(e) { return null; }
    }

    document.addEventListener('input', (e) => {
        if (e.target.closest('#modalContent')) scheduleSave();
    });
    document.addEventListener('change', (e) => {
        if (e.target.closest('#modalContent')) scheduleSave();
    });

    // Очистка ТОЛЬКО при клике на крестик в шапке окна
    document.addEventListener('click', (e) => {
        if (e.target.closest('.modal-header .btn-icon')) {
            clearDraft();
        }
    }, true);

    document.addEventListener('submit', (e) => {
        if (e.target.id === 'txForm' || e.target.id === 'accForm' || e.target.id === 'bankForm') {
            clearDraft();
        }
    }, true);

    function applyDraftToForm(draft) {
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
                if (!el) return;
                if (id === 'txType') return;
                
                if (el.type === 'checkbox') {
                    el.checked = data[id];
                } else if (el.tagName === 'SELECT') {
                    const exists = Array.from(el.options).some(opt => String(opt.value) === String(data[id]));
                    if (exists) el.value = data[id];
                } else {
                    el.value = data[id];
                }
            });
            
            ['txAccount', 'txToAccount'].forEach(id => {
                if (data[id] && typeof updateAccDisplay === 'function') {
                    updateAccDisplay(data[id], id + 'Name', id + 'Badge');
                }
            });
            
            if (data['txCounterparty'] !== undefined) {
                const wrapper = document.getElementById('newCpWrapper');
                if (wrapper) {
                    wrapper.style.display = (data['txCounterparty'] === '__new') ? 'block' : 'none';
                }
            }
            console.log("✅ Черновик восстановлен");
        }, 250);
    }

    function hookModal(name, type) {
        const orig = window[name];
        if (!orig || orig._isHooked) return;
        const wrapped = function() {
            const id = arguments[0] || null;
            const bankId = arguments[1] || null;
            const result = orig.apply(this, arguments);
            setTimeout(() => {
                const draft = getDraft();
                if (!draft || draft.type !== type) return;
                if ((draft.id || null) !== (id || null)) return;
                if (type === 'acc' && (draft.bankId || null) !== (bankId || null) && !id) return;
                applyDraftToForm(draft);
            }, 150);
            return result;
        };
        wrapped._isHooked = true;
        window[name] = wrapped;
    }

    function tryRestoreModal() {
        const draft = getDraft();
        if (!draft) return;
        const backdrop = document.getElementById('modalBackdrop');
        if (backdrop && backdrop.classList.contains('active')) return;
        
        if (draft.type === 'tx' && window.openTxModal) window.openTxModal(draft.id);
        else if (draft.type === 'acc' && window.openAccountModal) window.openAccountModal(draft.id, draft.bankId);
        else if (draft.type === 'bank' && window.openBankModal) window.openBankModal(draft.id);
    }

    let loadAttempts = 0;
    const loadInterval = setInterval(() => {
        loadAttempts++;
        if (loadAttempts > 30) { clearInterval(loadInterval); return; }
        if (typeof window.openTxModal === 'function' && typeof window.openAccountModal === 'function' && typeof window.openBankModal === 'function') {
            clearInterval(loadInterval);
            hookModal('openTxModal', 'tx');
            hookModal('openAccountModal', 'acc');
            hookModal('openBankModal', 'bank');
            setTimeout(tryRestoreModal, 500);
        }
    }, 200);

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            const backdrop = document.getElementById('modalBackdrop');
            if (backdrop && backdrop.classList.contains('active')) {
                hadModalOnHide = true;
                saveDraft();
            } else {
                hadModalOnHide = false;
            }
        } else if (document.visibilityState === 'visible') {
            if (hadModalOnHide) {
                hadModalOnHide = false;
                setTimeout(tryRestoreModal, 200);
            }
        }
    });
})();
