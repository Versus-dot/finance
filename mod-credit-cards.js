// ==========================================
// МОДУЛЬ КРЕДИТНЫХ КАРТ (mod-credit-cards.js) v11
// ==========================================
(function() {
    console.log("✅ Модуль кредитных карт (mod-credit-cards.js) v11 загружен");
    
    const prevOpenAccountModal = window.openAccountModal;
    
    window.openAccountModal = function(id, bankId) {
        if (prevOpenAccountModal) prevOpenAccountModal(id, bankId);
        
        const form = document.getElementById('accForm');
        const typeSel = document.getElementById('accType');
        if (!form || !typeSel) return;

        const creditFields = document.getElementById('creditFields');
        const accBalanceInput = document.getElementById('accBalance');
        if (!creditFields || !accBalanceInput) return;
        
        const accBalanceGroup = accBalanceInput.closest('.form-group') || accBalanceInput.closest('.form-row');
        const acc = id ? getAcc(id) : null;

        const accCurrency = document.getElementById('accCurrency');
        const currencyGroup = accCurrency ? accCurrency.closest('.form-group') : null;
        
        const modalContent = document.getElementById('modalContent');
        let topBalanceBlock = null;
        
        // Ищем блок корректировки сверху
        const reconcileBtn = modalContent.querySelector('button[onclick^="openReconcileModal"]');
        if (reconcileBtn) {
            topBalanceBlock = reconcileBtn.closest('div[style*="background:var(--card2)"]');
        }

        const originalOnchange = typeSel.onchange;
        typeSel.onchange = function(e) {
            if (originalOnchange) originalOnchange.call(this, e);
            toggleUI();
        };

        function toggleUI() {
            const isCredit = (typeSel.value === 'credit');
            
            if (isCredit) {
                // ДЛЯ КРЕДИТОК: скрываем старое, показываем новое
                if (accBalanceGroup) accBalanceGroup.style.display = 'none'; 
                if (currencyGroup) currencyGroup.style.display = 'none';
                if (topBalanceBlock) topBalanceBlock.style.display = 'none'; 
                
                creditFields.style.display = 'block';
                buildUI();
            } else {
                // ДЛЯ ОСТАЛЬНЫХ: возвращаем всё как было
                if (accBalanceGroup) accBalanceGroup.style.display = 'block';
                if (currencyGroup) currencyGroup.style.display = 'block';
                if (topBalanceBlock) topBalanceBlock.style.display = 'flex'; 
                
                const ccUI = document.getElementById('ccCustomUI');
                if (ccUI) ccUI.style.display = 'none';
                
                // Возвращаем стандартное поле лимита (если оно было скрыто)
                const origLimitGroup = document.getElementById('accCreditLimit')?.closest('.form-group');
                if (origLimitGroup) origLimitGroup.style.display = 'block';
            }
        }
        
        setTimeout(toggleUI, 50);

        function buildUI() {
            let ccUI = document.getElementById('ccCustomUI');
            
            const limit = acc ? (acc.creditLimit || 0) : 0;
            const currentBalance = acc ? accValue(acc) : 0;
            
            if (!ccUI) {
                ccUI = document.createElement('div');
                ccUI.id = 'ccCustomUI';
                ccUI.className = 'form-row';
                ccUI.style.marginTop = '0'; 
                ccUI.style.marginBottom = '16px';
                ccUI.style.gap = '8px';
                ccUI.style.gridTemplateColumns = '1fr 1fr';
                
                ccUI.innerHTML = `
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Кредитный лимит</label>
                        <input type="number" step="0.01" id="ccLimitInput" value="${limit}">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Текущий баланс</label>
                        <input type="number" step="0.01" id="ccBalanceInput" value="${currentBalance}">
                    </div>
                    <div class="form-group" style="margin-bottom: 0; grid-column: span 2;">
                        <label>Задолженность</label>
                        <input type="text" id="ccDebtInput" readonly style="background: transparent; border: 1px solid var(--border); padding: 14px 16px; font-weight: 700; font-size: 15px; outline: none;">
                    </div>
                `;
                
                const origLimitGroup = document.getElementById('accCreditLimit')?.closest('.form-group');
                if (origLimitGroup) {
                    origLimitGroup.style.display = 'none';
                    origLimitGroup.after(ccUI);
                } else {
                    creditFields.appendChild(ccUI);
                }

                const limitInp = document.getElementById('ccLimitInput');
                const balInp = document.getElementById('ccBalanceInput');
                const debtInp = document.getElementById('ccDebtInput');

                function updateDebtUI() {
                    const L = parseFloat(limitInp.value) || 0;
                    const B = parseFloat(balInp.value) || 0;
                    const D = L - B;
                    
                    if (D > 0) {
                        debtInp.value = '-' + fmt(D);
                        debtInp.style.color = 'var(--red)';
                    } else if (D < 0) {
                        debtInp.value = 'Ваши средства: +' + fmt(Math.abs(D));
                        debtInp.style.color = 'var(--green)';
                    } else {
                        debtInp.value = '0 ₽';
                        debtInp.style.color = 'var(--text)';
                    }
                }

                limitInp.addEventListener('input', updateDebtUI);
                balInp.addEventListener('input', updateDebtUI);
                updateDebtUI(); 

                // Перехват сохранения для кредиток
                const originalSubmit = form.onsubmit;
                form.onsubmit = function(e) {
                    const L = parseFloat(limitInp.value) || 0;
                    const B = parseFloat(balInp.value) || 0;

                    const origLimitInp = document.getElementById('accCreditLimit');
                    if (origLimitInp) origLimitInp.value = L;

                    if (acc) {
                        let netFlow = 0;
                        S.transactions.forEach(t => {
                            if (t.isHistory) return;
                            if (t.type === 'income' && t.accountId === acc.id) netFlow += t.amount;
                            else if (t.type === 'expense' && t.accountId === acc.id) netFlow -= t.amount;
                            else if (t.type === 'transfer') {
                                if (t.accountId === acc.id) netFlow -= t.amount;
                                if (t.toAccountId === acc.id) netFlow += t.amount;
                            }
                        });
                        accBalanceInput.value = B - netFlow;
                    } else {
                        accBalanceInput.value = B;
                    }

                    if (originalSubmit) return originalSubmit.call(this, e);
                };
            }
            ccUI.style.display = 'flex';
        }
    };
})();
