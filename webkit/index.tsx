const CURRENCY_SYMBOLS: Record<string, string> = {
    '₸': 'KZT',
    '₽': 'RUB',
    '$': 'USD',
    'Br': 'BYN',
    '€': 'EUR',
    '£': 'GBP',
    '₴': 'UAH'
};

const FALLBACK_RATES: Record<string, number> = {
    'RUB': 1.0,
    'USD': 89.5,
    'EUR': 97.5,
    'KZT': 0.19,
    'GBP': 113.0,
    'BYN': 27.5,
    'UAH': 2.15
};

let ratesCache: Record<string, number> | null = null;
let ratesCacheTime = 0;
const CACHE_TTL = 3600000;

function detectCurrency(message: string): string {
    for (const [symbol, currency] of Object.entries(CURRENCY_SYMBOLS)) {
        if (message.includes(symbol)) return currency;
    }
    return 'KZT';
}

async function fetchRates(): Promise<Record<string, number>> {
    if (ratesCache && (Date.now() - ratesCacheTime) < CACHE_TTL) {
        return ratesCache;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch("https://www.cbr-xml-daily.ru/daily_json.js", {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error("HTTP " + response.status);

        const data = await response.json();
        const rates: Record<string, number> = { 'RUB': 1.0 };

        if (data && data.Valute) {
            for (const code of Object.keys(data.Valute)) {
                const v = data.Valute[code];
                if (v && v.Value && v.Nominal) {
                    rates[code] = v.Value / v.Nominal;
                }
            }
        }

        ratesCache = rates;
        ratesCacheTime = Date.now();
        return rates;

    } catch (e) {
        console.warn("[SCC] API недоступен, используем fallback:", e);
        if (ratesCache) return ratesCache;
        ratesCache = FALLBACK_RATES;
        ratesCacheTime = Date.now();
        return FALLBACK_RATES;
    }
}

async function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<string> {
    const rates = await fetchRates();
    const fromRate = rates[fromCurrency] || FALLBACK_RATES[fromCurrency] || 1;
    const toRate = rates[toCurrency] || FALLBACK_RATES[toCurrency] || 1;
    const result = Math.round(amount * fromRate / toRate);
    return result.toLocaleString('ru-RU');
}

async function convertPriceMessage(message: string, toCurrency: string): Promise<string> {
    const fromCurrency = detectCurrency(message);
    const amountStr = message.replace(/[^\d.]/g, '');
    const amount = parseFloat(amountStr) || 0;
    if (amount === 0) return "0";
    return await convertCurrency(amount, fromCurrency, toCurrency);
}

let currentSelectedCurrency = 'RUB';

function showCurrencyMenu(priceBlock: HTMLElement, updateCallback: (currency: string) => Promise<void>) {
    const existingMenu = document.querySelector('.currency-menu');
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement('div');
    menu.className = 'currency-menu';
    menu.style.cssText = `
        position: absolute;
        top: ${priceBlock.getBoundingClientRect().bottom + window.scrollY}px;
        left: ${priceBlock.getBoundingClientRect().left + window.scrollX}px;
        z-index: 10000;
        background: #2a475e;
        border: 1px solid #66ccff;
        border-radius: 4px;
        padding: 5px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        min-width: 100px;
    `;

    const select = document.createElement('select');
    select.style.cssText = `
        background: #2a475e;
        color: #66ccff;
        border: none;
        padding: 2px;
        cursor: pointer;
        font-size: 12px;
        width: 100%;
    `;

    ['RUB', 'USD', 'EUR', 'KZT', 'GBP', 'BYN', 'UAH'].forEach(currency => {
        const option = document.createElement('option');
        option.value = currency;
        option.textContent = currency;
        if (currency === currentSelectedCurrency) option.selected = true;
        select.appendChild(option);
    });

    select.addEventListener('change', async () => {
        currentSelectedCurrency = select.value;
        menu.remove();
        await updateCallback(currentSelectedCurrency);
    });

    document.addEventListener('click', (e: MouseEvent) => {
        if (!menu.contains(e.target as Node)) menu.remove();
    }, { once: true });

    menu.appendChild(select);
    document.body.appendChild(menu);
}

function createPriceBlock(container: HTMLElement, hasDiscount: boolean): HTMLElement {
    const block = document.createElement('div');
    block.className = 'custom-price-block';
    block.style.cssText = hasDiscount
        ? 'display:inline-block;margin:0 8px 0 10px;color:#66ccff;background:#1a252f;padding:4px 10px;border-radius:4px;cursor:pointer;vertical-align:middle;'
        : 'display:inline-block;margin:0 0 0 10px;color:#66ccff;background:#1a252f;padding:4px 10px;border-radius:4px;cursor:pointer;vertical-align:middle;';

    const priceSpan = document.createElement('span');
    priceSpan.className = 'price-text';
    block.appendChild(priceSpan);

    container.insertBefore(block, container.firstChild);

    block.addEventListener('click', (e) => {
        e.stopPropagation();
        showCurrencyMenu(block, updatePrices);
    });

    return block;
}

function isFreeToPlay(area: Element): boolean {
    if (area.querySelector('.btn_addtocart .btnv6_green_white_innerfade')) {
        const btnText = area.querySelector('.btn_addtocart .btnv6_green_white_innerfade')?.textContent?.trim().toLowerCase() || '';
        if (btnText.includes('free') || btnText.includes('бесплатно') || btnText.includes('играть')) return true;
    }

    const priceEl = area.querySelector('.discount_final_price, .game_purchase_price') as HTMLElement | null;
    if (priceEl) {
        const priceText = priceEl.textContent?.trim().toLowerCase() || '';
        if (priceText.includes('free') || priceText.includes('бесплатно')) return true;

        const amountStr = priceText.replace(/[^\d.]/g, '');
        const amount = parseFloat(amountStr) || 0;
        if (amount === 0) return true;
    }

    return false;
}

async function updatePrices(selectedCurrency: string) {
    console.log("[SCC] Обновление цен:", selectedCurrency);
    currentSelectedCurrency = selectedCurrency;

    // Обычные игры и бандлы
    const purchaseAreas = document.querySelectorAll('.game_area_purchase_game');
    for (const area of purchaseAreas) {
        if (isFreeToPlay(area)) continue;

        const priceEl = area.querySelector('.discount_final_price, .game_purchase_price') as HTMLElement | null;
        if (!priceEl) continue;

        const price = priceEl.textContent?.trim() || '';
        const converted = await convertPriceMessage(price, selectedCurrency);

        const actionBgs = area.querySelectorAll('.game_purchase_action_bg');
        if (actionBgs.length === 0) continue;
        const actionBg = actionBgs[actionBgs.length - 1] as HTMLElement;

        const hasDiscount = !!area.querySelector('.discount_block, .discount_pct, .discount_prices')
            && !area.querySelector('.bundle_base_discount');

        let block = actionBg.querySelector('.custom-price-block') as HTMLElement | null;
        if (!block) {
            block = createPriceBlock(actionBg, hasDiscount);
        } else {
            block.style.margin = hasDiscount ? '0 8px 0 10px' : '0 0 0 10px';
        }

        const txt = block.querySelector('.price-text') as HTMLElement | null;
        if (txt) txt.textContent = `~ ${converted} ${selectedCurrency}`;
    }

    // DLC строки
    const dlcRows = document.querySelectorAll('.game_area_dlc_row');
    for (const row of dlcRows) {
        const priceEl = row.querySelector('.discount_final_price, .game_area_dlc_price') as HTMLElement | null;
        if (!priceEl) continue;

        const priceText = priceEl.textContent?.trim().toLowerCase() || '';
        
        if (priceText.includes('free') || priceText.includes('бесплатно')) continue;
        const amountStr = priceText.replace(/[^\d.]/g, '');
        const amount = parseFloat(amountStr) || 0;
        if (amount === 0) continue;

        const converted = await convertPriceMessage(priceText, selectedCurrency);

        const dlcAction = row.querySelector('.dlc_purchase_action') as HTMLElement | null;
        if (!dlcAction) continue;

        const hasDiscount = !!row.querySelector('.discount_block, .discount_pct');

        let block = dlcAction.querySelector('.custom-price-block') as HTMLElement | null;
        if (!block) {
            block = createPriceBlock(dlcAction, hasDiscount);
        } else {
            block.style.margin = hasDiscount ? '0 8px 0 10px' : '0 0 0 10px';
        }

        const txt = block.querySelector('.price-text') as HTMLElement | null;
        if (txt) txt.textContent = `~ ${converted} ${selectedCurrency}`;
    }

    // DLC "Add all DLC to Cart" блок
    const dlcPurchaseAction = document.getElementById('dlc_purchase_action') as HTMLElement | null;
    if (dlcPurchaseAction) {
        const priceEl = dlcPurchaseAction.querySelector('.game_purchase_price') as HTMLElement | null;
        if (priceEl) {
            const priceText = priceEl.textContent?.trim() || '';
            const amountStr = priceText.replace(/[^\d.]/g, '');
            const amount = parseFloat(amountStr) || 0;

            if (amount > 0) {
                const converted = await convertPriceMessage(priceText, selectedCurrency);
                const hasDiscount = !!dlcPurchaseAction.querySelector('.discount_block, .discount_pct');

                let block = dlcPurchaseAction.querySelector('.custom-price-block') as HTMLElement | null;
                if (!block) {
                    block = createPriceBlock(dlcPurchaseAction, hasDiscount);
                } else {
                    block.style.margin = hasDiscount ? '0 8px 0 10px' : '0 0 0 10px';
                }

                const txt = block.querySelector('.price-text') as HTMLElement | null;
                if (txt) txt.textContent = `~ ${converted} ${selectedCurrency}`;
            }
        }
    }
}

export default async function WebkitMain() {
    console.log("[SCC] Start");

    if (!/^\/app\/\d+/.test(window.location.pathname)) return;

    await fetchRates();
    await new Promise(r => setTimeout(r, 800));
    await updatePrices('RUB');
}