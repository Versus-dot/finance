// ==========================================
// МОДУЛЬ ТЕКСТОВЫХ ВОДЯНЫХ ЗНАКОВ - mod-bank-logos.js
// ==========================================
(function() {
    console.log("✅ Модуль текстовых логотипов (mod-bank-logos.js) загружен (v140)");

    // Функция получения короткого названия банка для водяного знака
    function getBankWatermarkText(bankName) {
        const lowerName = bankName.toLowerCase();
        
        // Известные банки
        if (lowerName.includes('сбер')) return 'СБЕР';
        if (lowerName.includes('т-банк') || lowerName.includes('тинькофф')) return 'Т-БАНК';
        if (lowerName.includes('альфа')) return 'АЛЬФА';
        if (lowerName.includes('втб')) return 'ВТБ';
        if (lowerName.includes('яндекс')) return 'ЯНДЕКС';
        if (lowerName.includes('озон')) return 'ОЗОН';
        if (lowerName.includes('райф')) return 'РАЙФ';
        if (lowerName.includes('финуслуги')) return 'ФИНУСЛУГИ';
        
        // Для остальных берем первое слово названия, убирая организационные приставки
        let cleanName = bankName.replace(/^(АО|ПАО|ООО|Банк|Банк "|Банк «)\s*/i, '').trim();
        let words = cleanName.split(/[\s"]+/);
        let firstWord = words[0] || 'БАНК';
        
        return firstWord.toUpperCase();
    }

    // Перехват отрисовки главной страницы
    const prevRenderDashboard = window.renderDashboard;
    window.renderDashboard = function() {
        if (prevRenderDashboard) prevRenderDashboard();

        document.querySelectorAll('.bank-chip').forEach(chip => {
            const bId = chip.dataset.bankId;
            
            // Удаляем старый водяной знак
            const oldMark = chip.querySelector('.bank-watermark');
            if (oldMark) oldMark.remove();

            let textContent = '';
            let color = 'var(--text)';

            // Для карточки "Все банки"
            if (!bId && chip.textContent.includes('Все банки')) {
                textContent = 'ВСЕ';
                color = 'var(--accent)';
            } 
            // Для конкретного банка
            else if (bId) {
                const bank = S.banks.find(b => b.id === bId);
                if (bank) {
                    textContent = getBankWatermarkText(bank.name);
                    color = bank.color || 'var(--text)';
                }
            }

            if (textContent) {
                const watermark = document.createElement('div');
                watermark.className = 'bank-watermark';
                watermark.textContent = textContent;
                watermark.style.color = color;
                chip.appendChild(watermark);
            }
        });
    };
})();
