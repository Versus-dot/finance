// ==========================================
// МОДУЛЬ КРЕДИТНЫХ КАРТ (mod-credit-cards.js)
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

        // Перехватываем переключение типа
        const originalOnchange = typeSel.onchange;
        typeSel.onchange = function(e) {
            if (originalOnchange) originalOnchange.call(this, e);
            toggleUI();
        };

        function toggleUI() {
            if (typeSel.value === 'credit') {
                if (accBalanceGroup) accBalanceGroup.style.display = 'none'; // Прячем старое поле
                creditFields.style.display = 'block';
                buildUI();
            } else {
                if (accBalanceGroup) accBalanceGroup.style.display = 'block';
                const ccUI = document.getElementById('ccCustomUI');
                if (ccUI) ccUI.style.display = 'none';
            }
        }

        function buildUI() {
            let ccUI = document.getElementById('ccCustomUI');
            const limit = acc ? (acc.creditLimit || 0) : 0;
            const avail = acc ? accValue(acc) : 0;
            const debt = Math.max(0, limit - avail);

            if (!ccUI) {
                ccUI = document.createElement('div');
                ccUI.id = 'ccCustomUI';
                ccUI.className = 'form-row';
                ccUI.style.marginTop = '12px';
                ccUI.innerHTML = `
                    <div class="form-group">
                        <label>Текущая задолженность (₽)</label>
                        <input type="number" step="0.01" id="ccDebt" value="${debt.toFixed(2)}">
                    </div>
                    <div class="form-group">
                        <label>Доступный остаток (₽)</label>
                        <input type="number" step="0.01" id="ccAvailable" value="${avail.toFixed(2)}">
                    </div>
                `;
                
                // Вставляем после полей лимита и льготного периода
                const limitRow = creditFields.querySelector('.form-row');
                if (limitRow) limitRow.after(ccUI); else creditFields.appendChild(ccUI);

                const limitInp = document.getElementById('accCreditLimit');
                const debtInp = document.getElementById('ccDebt');
                const availInp = document.getElementById('ccAvailable');

                // Синхронизируем скрытое поле баланса сразу
                accBalanceInput.value = avail.toFixed(2);

                // Логика: Меняем лимит -> пересчитываем остаток (долг неизменен)
                limitInp.addEventListener('input', () => {
                    const L = parseFloat(limitInp.value) || 0;
                    const D = parseFloat(debtInp.value) || 0;
                    const A = Math.max(0, L - D);
                    availInp.value = A.toFixed(2);
                    accBalanceInput.value = A;
                });

                // Логика: Меняем долг -> пересчитываем остаток
                debtInp.addEventListener('input', () => {
                    const L = parseFloat(limitInp.value) || 0;
                    const D = parseFloat(debtInp.value) || 0;
                    const A = Math.max(0, L - D);
                    availInp.value = A.toFixed(2);
                    accBalanceInput.value = A;
                });

                // Логика: Меняем остаток -> пересчитываем долг
                availInp.addEventListener('input', () => {
                    const L = parseFloat(limitInp.value) || 0;
                    const A = parseFloat(availInp.value) || 0;
                    const D = Math.max(0, L - A);
                    debtInp.value = D.toFixed(2);
                    accBalanceInput.value = A;
                });

                // Подстраховка: перед отправкой формы обновляем скрытое поле
                form.addEventListener('submit', () => {
                    accBalanceInput.value = availInp.value;
                });
            } else {
                // Если окно уже открывалось, обновляем значения
                const L = parseFloat(document.getElementById('accCreditLimit').value) || 0;
                const A = parseFloat(document.getElementById('ccAvailable').value) || 0;
                const D = Math.max(0, L - A);
                document.getElementById('ccDebt').value = D.toFixed(2);
                document.getElementById('ccAvailable').value = A.toFixed(2);
                accBalanceInput.value = A;
            }
            ccUI.style.display = 'flex';
        }

        setTimeout(() => {
            if (typeSel.value === 'credit') toggleUI();
        }, 50);
    };
})();
