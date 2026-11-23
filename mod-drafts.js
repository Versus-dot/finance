(function() {
    console.log("✅ mod-drafts.js v5 загружен (MutationObserver)");
    const DRAFT_KEY = 'financeApp_draft';
    const MAX_AGE = 2 * 60 * 60 * 1000; // 2 часа
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
        if (!backdrop || !backdrop.classList.contains('active')) return;
        const type = getModalType();
        if (!type) return;
        const content = document.getElementById('modalContent');
        if (!content) return;

        const data = {};
        content.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.id) {
                data[el.id] = el.type === 'checkbox' ? el.checked : el.value;
            }
        });
        if (Object.keys(data).length === 0) return;

        localStorage.setItem(DRAFT_KEY, JSON.stringify({
            type,
            data,
            timestamp: Date.now()
        }));
        console.log("💾 Черновик сохранен:", type, "-", Object.keys(data).length, "полей");
    }

    function scheduleSave() {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveDraft, 400);
    }

    function getDraft() {
        const s = localStorage.getItem(DRAFT_KEY);
        if (!s) return null;
        try {
            const d = JSON.parse(s);
            if (Date.now() - d.timestamp > MAX_AGE) {
                localStorage.removeItem(DRAFT_KEY);
                console.log("⌛ Черновик старше 2 часов — удален");
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
        const data = draft.data;

        // Сначала тип транзакции — от него зависит видимость скрытых групп полей
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
            console.log("✅ Черновик восстановлен:", draft.type);
        }, 250);
    }

    function tryRestore() {
        const backdrop = document.getElementById('modalBackdrop');
        if (!backdrop || !backdrop.classList.contains('active')) return;
        if (currentModalRestored) return;

        const type = getModalType();
        if (!type) return;

        const draft = getDraft();
        if (!draft || draft.type !== type) {
            console.log("ℹ️ Нет подходящего черновика для типа:", type);
            currentModalRestored = true;
            return;
        }

        currentModalRestored = true;
        applyDraft(draft);
    }

    // --- Сохранение на ввод ---
    document.addEventListener('input', (e) => {
        if (e.target.closest('#modalContent')) scheduleSave();
    });
    document.addEventListener('change', (e) => {
        if (e.target.closest('#modalContent')) scheduleSave();
    });

    // --- Страховка при сворачивании/уходе со страницы ---
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') saveDraft();
    });
    window.addEventListener('pagehide', saveDraft);
    window.addEventListener('beforeunload', saveDraft);

    // --- Очистка по крестику "✕" ---
    document.addEventListener('click', (e) => {
        if (e.target.closest('.modal-header .btn-icon')) {
            clearDraft();
        }
    }, true);

    // --- Очистка после успешного submit (только если окно закрылось) ---
    document.addEventListener('submit', (e) => {
        if (['txForm', 'accForm', 'bankForm'].includes(e.target.id)) {
            setTimeout(() => {
                const backdrop = document.getElementById('modalBackdrop');
                if (!backdrop || !backdrop.classList.contains('active')) {
                    clearDraft();
                }
            }, 500);
        }
    }, true);

    // --- MutationObserver: ловим момент открытия модалки ---
    const observer = new MutationObserver(() => {
        const backdrop = document.getElementById('modalBackdrop');
        if (backdrop && backdrop.classList.contains('active')) {
            setTimeout(tryRestore, 300);
        } else {
            // Модалка закрылась — готовы восстанавливать при следующем открытии
            currentModalRestored = false;
        }
    });

    function startObserver() {
        const backdrop = document.getElementById('modalBackdrop');
        if (!backdrop) {
            setTimeout(startObserver, 100);
            return;
        }
        observer.observe(backdrop, { attributes: true, attributeFilter: ['class'] });
        console.log("👀 MutationObserver запущен на #modalBackdrop");
    }
    startObserver();
})();
