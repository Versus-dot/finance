// ==========================================
// МОДУЛЬ ЛОГОТИПОВ И ВОДЯНЫХ ЗНАКОВ - mod-bank-logos.js
// ==========================================
(function() {
    console.log("✅ Модуль логотипов банков (mod-bank-logos.js) загружен (v139)");

    // Словарь известных банков (упрощенные SVG силуэты)
    const KNOWN_LOGOS = {
        'сбер': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.5 14.5L7 13l1.5-1.5 2 2 5-5L17 10l-6.5 6.5z"/></svg>',
        'тинькофф': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
        'т-банк': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
        'альфа': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2zm0 5.5l6 12H6l6-12z"/></svg>',
        'втб': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>',
        'яндекс': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.5 15h-2v-4.5h-1V17h-2v-8c0-1.66 1.34-3 3-3s3 1.34 3 3v8z"/></svg>',
        'озон': '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3"/></svg>',
        'райф': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2z"/></svg>',
        'финуслуги': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>'
    };

    // Функция получения SVG логотипа
    function getBankLogo(bankName, bankColor) {
        const lowerName = bankName.toLowerCase();
        
        // Ищем совпадение в словаре
        for (const key in KNOWN_LOGOS) {
            if (lowerName.includes(key)) {
                return KNOWN_LOGOS[key];
            }
        }

        // Если банк неизвестен, генерируем монограмму
        let cleanName = bankName.replace(/^(АО|ПАО|ООО|Банк)\s+/i, '').trim();
        let firstLetter = cleanName.charAt(0).toUpperCase();
        
        // Если первая буква не буква (например, эмодзи), берем дефолт
        if (!/[А-ЯA-Z]/.test(firstLetter)) firstLetter = 'Б';

        return `<svg viewBox="0 0 100 100" fill="currentColor">
            <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="90" font-weight="900" font-family="system-ui, sans-serif">${firstLetter}</text>
        </svg>`;
    }

    // Перехват отрисовки главной страницы
    const prevRenderDashboard = window.renderDashboard;
    window.renderDashboard = function() {
        if (prevRenderDashboard) prevRenderDashboard();

        document.querySelectorAll('.bank-chip').forEach(chip => {
            const bId = chip.dataset.bankId;
            
            // Удаляем старый водяной знак, если он есть (чтобы не дублировался)
            const oldMark = chip.querySelector('.bank-watermark');
            if (oldMark) oldMark.remove();

            let svgContent = '';
            let color = 'var(--text)';

            // Для карточки "Все банки"
            if (!bId && chip.textContent.includes('Все банки')) {
                svgContent = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 10h16v10H4zM4 6h16v2H4z"/></svg>`;
                color = 'var(--accent)';
            } 
            // Для конкретного банка
            else if (bId) {
                const bank = S.banks.find(b => b.id === bId);
                if (bank) {
                    svgContent = getBankLogo(bank.name, bank.color);
                    color = bank.color || 'var(--text)';
                }
            }

            if (svgContent) {
                const watermark = document.createElement('div');
                watermark.className = 'bank-watermark';
                watermark.innerHTML = svgContent;
                watermark.style.color = color;
                chip.appendChild(watermark);
            }
        });
    };
})();
