// ==========================================
// МОДУЛЬ КРЕДИТНЫХ КАРТ (mod-credit-cards.js) v5
// ==========================================
(function() {
    const prevOpenAccountModal = window.openAccountModal;
    
    window.openAccountModal = function(id, bankId) {
        if (prevOpenAccountModal) prevOpenAccountModal(id, bankId);
        
        const form = document.getElementById('accForm');
        const typeSel = document.getElementById('accType');
        if (!form || !typeSel) return;

        const creditFields = document.getElementById('creditFields');
        const accBalanceInput = document.getElementById('accBalance');
        if (!creditFields || !accBalanceInput) return;
        
        const accBalanceGroup = accBalanceInput.closest('.form-group');
        const acc = id ? getAcc(id) : null;

        const accCurrency = document.getElementById('accCurrency');
        const currencyGroup = accCurrency ? accCurrency.closest('.form-group') : null;
        
        const modalContent = document.getElementById('modalContent');
        let topBalanceBlock = null;
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
                if (accBalanceGroup) accBalanceGroup.style.display = 'none'; 
                if (currencyGroup) currencyGroup.style.display = 'none';
                if (topBalanceBlock) topBalanceBlock.style.display = 'none';
                
                creditFields.style.display = 'block';
                buildUI();
            } else {
                if (accBalanceGroup) accBalanceGroup.style.display = 'block';
                if (currencyGroup) currencyGroup.style.display = 'block';
                if (topBalanceBlock) topBalanceBlock.style.display = 'flex';
                
                const ccUI = document.getElementById('ccCustomUI');
                if (ccUI) ccUI.style.display = 'none';
            }
        }
        
        setTimeout(toggleUI, 50);

        function buildUI() {
            let ccUI = document.getElementById('ccCustomUI');
            const limit = acc ? (acc.creditLimit || 0) : 0;
            const avail = acc ? accValue(acc) : 0;
            const debt = Math.max(0, limit - avail);

            if (!ccUI) {
                ccUI = document.createElement('div');
                ccUI.id = 'ccCustomUI';
                ccUI.className = 'form-row';
                ccUI.style.marginTop = '0'; 
                ccUI.style.alignItems = 'flex-end';
                ccUI.style.gap = '12px';
                
                // Вернул стандартный margin-bottom для полей
                ccUI.innerHTML = `
                    <div class="form-group">
                        <label style="white-space: nowrap; font-size: 11px;">Задолженность (₽)</label>
                        <input type="number" step="0.01" id="ccDebt" value="${debt.toFixed(2)}">
                    </div>
                    <div class="form-group">
                        <label style="white-space: nowrap; font-size: 11px;">Текущий баланс (₽)</label>
                        <input type="number" step="0.01" id="ccAvailable" value="${avail.toFixed(2)}">
                    </div>
                `;
                
                const limitRow = creditFields.querySelector('.form-row');
                if (limitRow) limitRow.after(ccUI); else creditFields.appendChild(ccUI);

                const limitInp = document.getElementById('accCreditLimit');
                const debtInp = document.getElementById('ccDebt');
                const availInp = document.getElementById('ccAvailable');

                accBalanceInput.value = avail.toFixed(2);

                limitInp.addEventListener('input', () => {
                    const L = parseFloat(limitInp.value) || 0;
                    const D = parseFloat(debtInp.value) || 0;
                    const A = Math.max(0, L - D);
                    availInp.value = A.toFixed(2);
                    accBalanceInput.value = A;
                });

                debtInp.addEventListener('input', () => {
                    const L = parseFloat(limitInp.value) || 0;
                    const D = parseFloat(debtInp.value) || 0;
                    const A = Math.max(0, L - D);
                    availInp.value = A.toFixed(2);
                    accBalanceInput.value = A;
                });

                availInp.addEventListener('input', () => {
                    const L = parseFloat(limitInp.value) || 0;
                    const A = parseFloat(availInp.value) || 0;
                    const D = Math.max(0, L - A);
                    debtInp.value = D.toFixed(2);
                    accBalanceInput.value = A;
                });

                form.addEventListener('submit', () => {
                    accBalanceInput.value = availInp.value;
                });
            } else {
                const L = parseFloat(document.getElementById('accCreditLimit').value) || 0;
                const A = parseFloat(document.getElementById('ccAvailable').value) || 0;
                const D = Math.max(0, L - A);
                document.getElementById('ccDebt').value = D.toFixed(2);
                document.getElementById('ccAvailable').value = A.toFixed(2);
                accBalanceInput.value = A;
            }
            ccUI.style.display = 'flex';
        }
    };
})();