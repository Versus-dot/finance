// ==========================================
// МОДУЛЬ КРЕДИТНЫХ КАРТ (mod-credit-cards.js) v9
// ==========================================
(function() {
    console.log("✅ Модуль кредитных карт (mod-credit-cards.js) v9 загружен");
    
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
        
        // Скрываем блок корректировки сверху (он больше не нужен для кредиток)
        const reconcileBtn = modalContent.querySelector('button[onclick^="openReconcileModal"]');
        if (reconcileBtn) {
            const topBalanceBlock = reconcileBtn.closest('div[style*="background:var(--card2)"]');
            if (topBalanceBlock) topBalanceBlock.style.display = 'none';
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
                creditFields.style.display = 'block';
                buildUI();
            } else {
                if (accBalanceGroup) accBalanceGroup.style.display = 'block';
                if (currencyGroup) currencyGroup.style.display = 'block';
                
                const ccUI = document.getElementById('ccCustomUI');
                if (ccUI) ccUI.style.display = 'none';
            }
        }
        
        setTimeout(toggleUI, 50);

        function buildUI() {
            let ccUI = document.getElementById('ccCustomUI');
            
            // Считаем текущий баланс и лимит
            const limit = acc ? (acc.creditLimit || 0) : 0;
            const currentBalance = acc ? accValue(acc) : 0;
            
            if (!ccUI) {
                ccUI = document.createElement('div');
                ccUI.id = 'ccCustomUI';
                ccUI.className = 'form-row';
                ccUI.style.marginTop = '0'; 
                ccUI.style.marginBottom = '16px';
                ccUI.style.gap = '8px';
                ccUI.style.gridTemplateColumns = '1fr 1fr'; // 2 колонки
                
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
                
                // Вставляем перед формой отправки
                const limitRow = creditFields.querySelector('.form-row');
                if (limitRow) limitRow.after(ccUI); else creditFields.appendChild(ccUI);

                // Скрываем оригинальные поля кредитного лимита, чтобы не было дублей
                const origLimitGroup = document.getElementById('accCreditLimit').closest('.form-group');
                if (origLimitGroup) origLimitGroup.style.display = 'none';

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
                updateDebtUI(); // Первичный расчет

                // МАГИЯ СОХРАНЕНИЯ БАЛАНСА
                form.addEventListener('submit', () => {
                    const L = parseFloat(limitInp.value) || 0;
                    const B = parseFloat(balInp.value) || 0;

                    // Передаем лимит в оригинальное (скрытое) поле
                    document.getElementById('accCreditLimit').value = L;

                    if (acc) {
                        // Если это редактирование, считаем чистый поток операций
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
                        // Новый начальный баланс = Желаемый баланс минус все операции
                        accBalanceInput.value = B - netFlow;
                    } else {
                        // Если создаем новый счет, операций нет
                        accBalanceInput.value = B;
                    }
                });
            }
            ccUI.style.display = 'flex';
        }
    };
})();
