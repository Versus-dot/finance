// ==========================================
// МОДУЛЬ ЧЕРНОВИКОВ (mod-drafts.js) v2
// ==========================================
(function() {
    console.log("✅ Модуль черновиков (mod-drafts.js) v2 загружен");
    const DRAFT_KEY = 'financeApp_draft';
    let saveTimeout = null;

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
        saveTimeout = setTimeout(saveDraft, 300); // Сохраняем через 300мс после последнего ввода
    }

    function clearDraft() {
        localStorage.removeItem(DRAFT_KEY);
    }

    // Сохраняем при каждом изменении в полях модального окна
    document.addEventListener('input', (e) => {
        if (e.target.closest('#modalContent')) scheduleSave();
    });
    document.addEventListener('change', (e) => {
        if (e.target.closest('#modalContent')) scheduleSave();
    });

    // Дополнительная страховка при уходе в фон
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') saveDraft();
    });

    // Очистка при закрытии окна
    const originalCloseModal = window.closeModal;
    window.closeModal = function() {
        clearDraft();
        if (originalCloseModal) originalCloseModal();
    };

    // Очистка при успешном сохранении формы
    document.addEventListener('submit', (e) => {
        if (e.target.id === 'txForm' || e.target.id === 'accForm' || e.target.id === 'bankForm') {
            clearDraft();
        }
    }, true);

    // Восстановление при загрузке (с ожиданием инициализации app.js)
    let restoreAttempts = 0;
    const restoreInterval = setInterval(() => {
        restoreAttempts++;
        if (restoreAttempts > 20) { clearInterval(restoreInterval); return; } // Ждем максимум 4 секунды

        const draftStr = localStorage.getItem(DRAFT_KEY);
        if (!draftStr) { clearInterval(restoreInterval); return; }

        if (typeof window.openTxModal === 'function') {
            clearInterval(restoreInterval);
            try {
                const draft = JSON.parse(draftStr);
                if (Date.now() - draft.timestamp > 2 * 60 * 60 * 1000) {
                    clearDraft();
                    return;
                }

                if (draft.type === 'tx') window.openTxModal(draft.id);
                else if (draft.type === 'acc') window.openAccountModal(draft.id, draft.bankId);
                else if (draft.type === 'bank') window.openBankModal(draft.id);

                setTimeout(() => {
                    const content = document.getElementById('modalContent');
                    if (!content) return;
                    
                    Object.keys(draft.data).forEach(id => {
                        const el = document.getElementById(id);
                        if (el) {
                            if (el.type === 'checkbox') el.checked = draft.data[id];
                            else {
                                el.value = draft.data[id];
                                el.dispatchEvent(new Event('change', { bubbles: true }));
                                if (id === 'txAccount' || id === 'txToAccount') {
                                    if (typeof updateAccDisplay === 'function') {
                                        updateAccDisplay(el.value, id + 'Name', id + 'Badge');
                                    }
                                }
                            }
                        }
                    });
                    console.log("Черновик успешно восстановлен");
                }, 200);
            } catch(e) { console.error('Ошибка восстановления черновика', e); }
        }
    }, 200);
})();
