import { callable } from "@steambrew/webkit";

const receiveFrontendMethod = callable<[{ message: string, status: boolean, count: number, to_currency: string }], string>(
    "Backend.receive_frontend_message"
);

interface EditionPrice {
    edition: string;
    price: string;
    numericPrice: number;
    convertedPrice: string;
}

export default async function WebkitMain() {
    console.log("WebkitMain запущен");

    // Проверка: страница игры
    if (!/^\/app\/\d+/.test(window.location.pathname)) {
        console.log("Не страница игры, пропускаем вставку цен");
        return;
    }

    // Немного подождем DOM
    await new Promise(resolve => setTimeout(resolve, 500));

    // Переменная для хранения текущей валюты
    let currentSelectedCurrency = 'RUB';

    // Функция для создания и показа выпадающего меню
    function showCurrencyMenu(priceBlock: HTMLElement, updateCallback: (currency: string) => Promise<void>) {
        console.log("showCurrencyMenu вызвана для блока:", priceBlock, "Текущая валюта:", currentSelectedCurrency);

        // Удаляем старое меню, если есть
        const existingMenu = document.querySelector('.currency-menu') as HTMLElement | null;
        if (existingMenu) {
            console.log("Удаляем старое меню:", existingMenu);
            existingMenu.remove();
        }

        // Создаем контейнер для меню
        const menu = document.createElement('div');
        menu.className = 'currency-menu';
        menu.style.position = 'absolute';
        menu.style.top = `${priceBlock.getBoundingClientRect().bottom + window.scrollY}px`;
        menu.style.left = `${priceBlock.getBoundingClientRect().left + window.scrollX}px`;
        menu.style.zIndex = '10000';
        menu.style.backgroundColor = '#2a475e';
        menu.style.border = '1px solid #66ccff';
        menu.style.borderRadius = '4px';
        menu.style.padding = '5px';
        menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
        menu.style.minWidth = '100px';

        // Создаем select
        const select = document.createElement('select');
        select.style.backgroundColor = '#2a475e';
        select.style.color = '#66ccff';
        select.style.border = 'none';
        select.style.padding = '2px';
        select.style.cursor = 'pointer';
        select.style.fontSize = '12px';
        select.style.width = '100%';

        // Список валют
        const currencies = ['RUB', 'USD', 'EUR', 'KZT', 'GBP', 'BYN', 'UAH'];
        currencies.forEach(currency => {
            const option = document.createElement('option');
            option.value = currency;
            option.textContent = currency;
            // Используем currentSelectedCurrency вместо параметра
            if (currency === currentSelectedCurrency) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        // Обработчик выбора валюты
        select.addEventListener('change', async (event) => {
            const newCurrency = (event.target as HTMLSelectElement).value;
            console.log("Выбрана валюта:", newCurrency);
            // Обновляем глобальную переменную
            currentSelectedCurrency = newCurrency;
            await updateCallback(newCurrency);
            menu.remove(); // Удаляем меню после выбора
        });

        // Удаляем меню при клике вне его
        const closeMenu = (event: MouseEvent) => {
            if (!menu.contains(event.target as Node)) {
                console.log("Клик вне меню, удаляем:", menu);
                menu.remove();
            }
        };
        document.addEventListener('click', closeMenu, { once: true });

        menu.appendChild(select);
        document.body.appendChild(menu);
        console.log("Меню создано и добавлено в DOM:", menu);
    }

    // Функция для обновления цен
    async function updatePrices(selectedCurrency: string) {
        console.log("updatePrices вызвана с валютой:", selectedCurrency);
        // Обновляем глобальную переменную
        currentSelectedCurrency = selectedCurrency;
        
        const prices: EditionPrice[] = [];

        // Обработка обычных изданий
        const purchaseAreas = document.querySelectorAll('.game_area_purchase_game');
        console.log("Найдено блоков game_area_purchase_game:", purchaseAreas.length);
        for (const area of purchaseAreas) {
            const editionElement = area.querySelector('h1') as HTMLElement | null;
            const priceElement = area.querySelector('.discount_final_price, .game_purchase_price, .game_purchase_price.price') as HTMLElement | null;

            const edition = editionElement?.textContent?.trim() || 'Unknown Edition';
            const price = priceElement?.textContent?.trim() || 'Цена не указана';

            console.log("Обрабатываем издание:", edition, "Цена:", price);

            const convertedPrice = await receiveFrontendMethod({
                message: price,
                status: true,
                count: 69,
                to_currency: selectedCurrency
            });
            console.log("Получена конвертированная цена:", convertedPrice);

            const numericPrice = parseInt(price.replace(/[^\d]/g, '')) || 0;
            prices.push({ edition, price, numericPrice, convertedPrice });

            // Обновляем или создаем блок с ценой
            const priceContainer = area.querySelector('.discount_final_price, .game_purchase_price, .game_purchase_price.price') as HTMLElement | null;
            let customPriceBlock = area.querySelector('.custom-price-block') as HTMLElement | null;
            if (!customPriceBlock && priceContainer) {
                customPriceBlock = document.createElement('div');
                customPriceBlock.className = 'custom-price-block';
                customPriceBlock.style.display = 'inline-block';
                customPriceBlock.style.marginRight = '5px';
                customPriceBlock.style.marginLeft = '10px';
                customPriceBlock.style.color = '#66ccff';
                customPriceBlock.style.verticalAlign = 'middle';
                customPriceBlock.style.backgroundColor = '#1a252f';
                customPriceBlock.style.padding = '4px 10px';
                customPriceBlock.style.borderRadius = '4px';
                customPriceBlock.style.cursor = 'pointer';
                priceContainer.parentNode?.insertBefore(customPriceBlock, priceContainer);

                // Добавляем текст цены
                const priceSpan = document.createElement('span');
                priceSpan.className = 'price-text';
                customPriceBlock.appendChild(priceSpan);

                // Обработчик клика для показа меню (убрали параметр selectedCurrency)
                customPriceBlock.addEventListener('click', (event) => {
                    console.log("Клик по custom-price-block:", customPriceBlock);
                    event.stopPropagation();
                    showCurrencyMenu(customPriceBlock!, updatePrices);
                });
            }
            if (customPriceBlock) {
                const priceText = customPriceBlock.querySelector('span.price-text') as HTMLElement | null;
                if (priceText) {
                    priceText.textContent = `~ ${convertedPrice}${selectedCurrency}`;
                }
            }
        }

        // Обработка бандла
        const bundleArea = document.querySelector('.game_area_purchase_game.bundle') as HTMLElement | null;
        if (bundleArea) {
            const bundleEdition = bundleArea.querySelector('h1')?.textContent?.trim() || 'Bundle';
            const bundlePrice = bundleArea.querySelector('.discount_final_price, .game_purchase_price, .game_purchase_price.price')?.textContent?.trim() || 'Цена не указана';

            console.log("Обрабатываем бандл:", bundleEdition, "Цена:", bundlePrice);

            const convertedPrice = await receiveFrontendMethod({
                message: bundlePrice,
                status: true,
                count: 69,
                to_currency: selectedCurrency
            });
            console.log("Получена конвертированная цена для бандла:", convertedPrice);

            const bundleNumericPrice = parseInt(bundlePrice.replace(/[^\d]/g, '')) || 0;
            prices.push({ edition: bundleEdition, price: bundlePrice, numericPrice: bundleNumericPrice, convertedPrice });

            let bundlePriceBlock = bundleArea.querySelector('.custom-price-block') as HTMLElement | null;
            if (!bundlePriceBlock) {
                const priceContainer = bundleArea.querySelector('.discount_final_price, .game_purchase_price, .game_purchase_price.price') as HTMLElement | null;
                if (priceContainer) {
                    bundlePriceBlock = document.createElement('div');
                    bundlePriceBlock.className = 'custom-price-block';
                    bundlePriceBlock.style.display = 'inline-block';
                    bundlePriceBlock.style.marginRight = '5px';
                    bundlePriceBlock.style.marginLeft = '10px';
                    bundlePriceBlock.style.color = '#66ccff';
                    bundlePriceBlock.style.verticalAlign = 'middle';
                    bundlePriceBlock.style.backgroundColor = '#1a252f';
                    bundlePriceBlock.style.padding = '5px 10px';
                    bundlePriceBlock.style.borderRadius = '4px';
                    bundlePriceBlock.style.cursor = 'pointer';
                    priceContainer.parentNode?.insertBefore(bundlePriceBlock, priceContainer);

                    // Добавляем текст цены
                    const priceSpan = document.createElement('span');
                    priceSpan.className = 'price-text';
                    bundlePriceBlock.appendChild(priceSpan);

                    // Обработчик клика для показа меню
                    bundlePriceBlock.addEventListener('click', (event) => {
                        console.log("Клик по bundle custom-price-block:", bundlePriceBlock);
                        event.stopPropagation();
                        showCurrencyMenu(bundlePriceBlock!, updatePrices);
                    });
                }
            }
            if (bundlePriceBlock) {
                const priceText = bundlePriceBlock.querySelector('span.price-text') as HTMLElement | null;
                if (priceText) {
                    priceText.textContent = `~ ${convertedPrice}${selectedCurrency}`;
                }
            }
        }

        // Бесплатная игра
        if (document.querySelector('.free_to_play')) {
            const convertedPrice = await receiveFrontendMethod({
                message: "0",
                status: true,
                count: 69,
                to_currency: selectedCurrency
            });
            console.log("Получена конвертированная цена для бесплатной игры:", convertedPrice);

            prices.push({ edition: 'Free to Play', price: 'Free', numericPrice: 0, convertedPrice });

            const freeArea = document.querySelector('.free_to_play') as HTMLElement | null;
            let freePriceBlock = freeArea?.querySelector('.custom-price-block') as HTMLElement | null;
            if (!freePriceBlock && freeArea) {
                freePriceBlock = document.createElement('div');
                freePriceBlock.className = 'custom-price-block';
                freePriceBlock.style.display = 'inline-block';
                freePriceBlock.style.marginRight = '5px';
                freePriceBlock.style.marginLeft = '10px';
                freePriceBlock.style.color = '#66ccff';
                freePriceBlock.style.verticalAlign = 'middle';
                freePriceBlock.style.backgroundColor = '#1a252f';
                freePriceBlock.style.padding = '5px 10px';
                freePriceBlock.style.borderRadius = '4px';
                freePriceBlock.style.cursor = 'pointer';
                freeArea.appendChild(freePriceBlock);

                // Добавляем текст цены
                const priceSpan = document.createElement('span');
                priceSpan.className = 'price-text';
                freePriceBlock.appendChild(priceSpan);

                // Обработчик клика для показа меню
                freePriceBlock.addEventListener('click', (event) => {
                    console.log("Клик по free-to-play custom-price-block:", freePriceBlock);
                    event.stopPropagation();
                    showCurrencyMenu(freePriceBlock!, updatePrices);
                });
            }
            if (freePriceBlock) {
                const priceText = freePriceBlock.querySelector('span.price-text') as HTMLElement | null;
                if (priceText) {
                    priceText.textContent = `~ ${convertedPrice}${selectedCurrency}`;
                }
            }
        }

        console.log("Цены обновлены для валюты:", selectedCurrency, "Всего обработано цен:", prices.length);
    }

    // Инициализируем с RUB по умолчанию
    await updatePrices('RUB');
}
