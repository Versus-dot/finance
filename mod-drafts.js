// ==========================================
// МОДУЛЬ ЧЕРНОВИКОВ (mod-drafts.js) v1
// ==========================================
(function() {
    console.log("✅ Модуль черновиков (mod-drafts.js) загружен");
    const DRAFT_KEY = 'financeApp_draft';
    
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

    function clearDraft() {
        localStorage.removeItem(DRAFT_KEY);
    }

    // Сохранение при уходе в фон
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') saveDraft();
    });

    // Страховка на случай перезагрузки страницы
    setInterval(() => {
        if (document.visibilityState === 'visible') saveDraft();
    }, 2000);

    // Очистка при закрытии окна
    const originalCloseModal = window.closeModal;
    window.closeModal = function() {
        clearDraft();
        if (originalCloseModal) originalCloseModal();
    };

    // Восстановление при загрузке
    window.addEventListener('load', () => {
        setTimeout(() => {
            const draftStr = localStorage.getItem(DRAFT_KEY);
            if (!draftStr) return;

            try {
                const draft = JSON.parse(draftStr);
                // Черновик живет 2 часа
                if (Date.now() - draft.timestamp > 2 * 60 * 60 * 1000) {
                    clearDraft();
                    return;
                }

                if (draft.type === 'tx' && window.openTxModal) window.openTxModal(draft.id);
                else if (draft.type === 'acc' && window.openAccountModal) window.openAccountModal(draft.id, draft.bankId);
                else if (draft.type === 'bank' && window.openBankModal) window.openBankModal(draft.id);

                // Подстановка значений после отрисовки окна
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
                                // Обновление кастомных селектов счетов
                                if (id === 'txAccount' || id === 'txToAccount') {
                                    if (typeof updateAccDisplay === 'function') {
                                        updateAccDisplay(el.value, id + 'Name', id + 'Badge');
                                    }
                                }
                            }
                        }
                    });
                    console.log("Черновик восстановлен");
                }, 150);
            } catch(e) { console.error('Ошибка восстановления черновика', e); }
        }, 500);
    });

    // Очистка при успешном сохранении формы
    document.addEventListener('submit', (e) => {
        if (e.target.id === 'txForm' || e.target.id === 'accForm' || e.target.id === 'bankForm') {
            clearDraft();
        }
    }, true);
})();
