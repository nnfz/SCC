const MILLENNIUM_IS_CLIENT_MODULE = false;
const pluginName = "scc-main";
function InitializePlugins() {
    var _a, _b;
    /**
     * This function is called n times depending on n plugin count,
     * Create the plugin list if it wasn't already created
     */
    (_a = (window.PLUGIN_LIST || (window.PLUGIN_LIST = {})))[pluginName] || (_a[pluginName] = {});
    (_b = (window.MILLENNIUM_PLUGIN_SETTINGS_STORE || (window.MILLENNIUM_PLUGIN_SETTINGS_STORE = {})))[pluginName] || (_b[pluginName] = {});
    /**
     * Accepted IPC message types from Millennium backend.
     */
    let IPCType;
    (function (IPCType) {
        IPCType[IPCType["CallServerMethod"] = 0] = "CallServerMethod";
    })(IPCType || (IPCType = {}));
    let MillenniumStore = window.MILLENNIUM_PLUGIN_SETTINGS_STORE[pluginName];
    let IPCMessageId = `Millennium.Internal.IPC.[${pluginName}]`;
    let isClientModule = MILLENNIUM_IS_CLIENT_MODULE;
    const ComponentTypeMap = {
        DropDown: ['string', 'number', 'boolean'],
        NumberTextInput: ['number'],
        StringTextInput: ['string'],
        FloatTextInput: ['number'],
        CheckBox: ['boolean'],
        NumberSlider: ['number'],
        FloatSlider: ['number'],
    };
    MillenniumStore.ignoreProxyFlag = false;
    function DelegateToBackend(pluginName, name, value) {
        console.log(`Delegating ${name} to backend`, value);
        // print stack trace
        const stack = new Error().stack?.split('\n').slice(2).join('\n');
        console.log(stack);
        return MILLENNIUM_BACKEND_IPC.postMessage(IPCType.CallServerMethod, {
            pluginName,
            methodName: '__builtins__.__update_settings_value__',
            argumentList: { name, value },
        });
    }
    async function ClientInitializeIPC() {
        /** Wait for the MainWindowBrowser to not be undefined */
        while (typeof MainWindowBrowserManager === 'undefined') {
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
        MainWindowBrowserManager.m_browser.on('message', (messageId, data) => {
            if (messageId !== IPCMessageId) {
                return;
            }
            const { name, value } = JSON.parse(data);
            MillenniumStore.ignoreProxyFlag = true;
            MillenniumStore.settingsStore[name] = value;
            DelegateToBackend(pluginName, name, value);
            MillenniumStore.ignoreProxyFlag = false;
        });
    }
    function WebkitInitializeIPC() {
        SteamClient.BrowserView.RegisterForMessageFromParent((messageId, data) => {
            if (messageId !== IPCMessageId) {
                return;
            }
            const payload = JSON.parse(data);
            MillenniumStore.ignoreProxyFlag = true;
            MillenniumStore.settingsStore[payload.name] = payload.value;
            MillenniumStore.ignoreProxyFlag = false;
        });
    }
    isClientModule ? ClientInitializeIPC() : WebkitInitializeIPC();
    const StartSettingPropagation = (name, value) => {
        if (MillenniumStore.ignoreProxyFlag) {
            return;
        }
        if (isClientModule) {
            DelegateToBackend(pluginName, name, value);
            /** If the browser doesn't exist yet, no use sending anything to it. */
            if (typeof MainWindowBrowserManager !== 'undefined') {
                MainWindowBrowserManager?.m_browser?.PostMessage(IPCMessageId, JSON.stringify({ name, value }));
            }
        }
        else {
            /** Send the message to the SharedJSContext */
            SteamClient.BrowserView.PostMessageToParent(IPCMessageId, JSON.stringify({ name, value }));
        }
    };
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    const DefinePluginSetting = (obj) => {
        return new Proxy(obj, {
            set(target, property, value) {
                if (!(property in target)) {
                    throw new TypeError(`Property ${String(property)} does not exist on plugin settings`);
                }
                const settingType = ComponentTypeMap[target[property].type];
                const range = target[property]?.range;
                /** Clamp the value between the given range */
                if (settingType.includes('number') && typeof value === 'number') {
                    if (range) {
                        value = clamp(value, range[0], range[1]);
                    }
                    value || (value = 0); // Fallback to 0 if the value is undefined or null
                }
                /** Check if the value is of the proper type */
                if (!settingType.includes(typeof value)) {
                    throw new TypeError(`Expected ${settingType.join(' or ')}, got ${typeof value}`);
                }
                target[property].value = value;
                StartSettingPropagation(String(property), value);
                return true;
            },
            get(target, property) {
                if (property === '__raw_get_internals__') {
                    return target;
                }
                if (property in target) {
                    return target[property].value;
                }
                return undefined;
            },
        });
    };
    MillenniumStore.DefinePluginSetting = DefinePluginSetting;
    MillenniumStore.settingsStore = DefinePluginSetting({});
}
InitializePlugins()
const __call_server_method__ = (methodName, kwargs) => Millennium.callServerMethod(pluginName, methodName, kwargs)
const __wrapped_callable__ = (route) => MILLENNIUM_API.callable(__call_server_method__, route)
let PluginEntryPointMain = function() { var millennium_main = (function (exports, webkit) {
    'use strict';

    (function() {
        const env = {};
        try {
            if (process) {
                process.env = Object.assign({}, process.env);
                Object.assign(process.env, env);
                return;
            }
        } catch (e) {} // avoid ReferenceError: process is not defined
        globalThis.process = { env:env };
    })();

    const receiveFrontendMethod = __wrapped_callable__("Backend.receive_frontend_message");
    async function WebkitMain() {
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
        function showCurrencyMenu(priceBlock, updateCallback) {
            console.log("showCurrencyMenu вызвана для блока:", priceBlock, "Текущая валюта:", currentSelectedCurrency);
            // Удаляем старое меню, если есть
            const existingMenu = document.querySelector('.currency-menu');
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
            const currencies = ['RUB', 'USD', 'EUR', 'KZT', 'GBP'];
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
                const newCurrency = event.target.value;
                console.log("Выбрана валюта:", newCurrency);
                // Обновляем глобальную переменную
                currentSelectedCurrency = newCurrency;
                await updateCallback(newCurrency);
                menu.remove(); // Удаляем меню после выбора
            });
            // Удаляем меню при клике вне его
            const closeMenu = (event) => {
                if (!menu.contains(event.target)) {
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
        async function updatePrices(selectedCurrency) {
            console.log("updatePrices вызвана с валютой:", selectedCurrency);
            // Обновляем глобальную переменную
            currentSelectedCurrency = selectedCurrency;
            const prices = [];
            // Обработка обычных изданий
            const purchaseAreas = document.querySelectorAll('.game_area_purchase_game');
            console.log("Найдено блоков game_area_purchase_game:", purchaseAreas.length);
            for (const area of purchaseAreas) {
                const editionElement = area.querySelector('h1');
                const priceElement = area.querySelector('.discount_final_price, .game_purchase_price, .game_purchase_price.price');
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
                const priceContainer = area.querySelector('.discount_final_price, .game_purchase_price, .game_purchase_price.price');
                let customPriceBlock = area.querySelector('.custom-price-block');
                if (!customPriceBlock && priceContainer) {
                    customPriceBlock = document.createElement('div');
                    customPriceBlock.className = 'custom-price-block';
                    customPriceBlock.style.display = 'inline-block';
                    customPriceBlock.style.marginRight = '5px';
                    customPriceBlock.style.marginLeft = '10px';
                    customPriceBlock.style.color = '#66ccff';
                    customPriceBlock.style.verticalAlign = 'middle';
                    customPriceBlock.style.backgroundColor = '#1a252f';
                    customPriceBlock.style.padding = '5px 10px';
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
                        showCurrencyMenu(customPriceBlock, updatePrices);
                    });
                }
                if (customPriceBlock) {
                    const priceText = customPriceBlock.querySelector('span.price-text');
                    if (priceText) {
                        priceText.textContent = `~ ${convertedPrice}${selectedCurrency}`;
                    }
                }
            }
            // Обработка бандла
            const bundleArea = document.querySelector('.game_area_purchase_game.bundle');
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
                let bundlePriceBlock = bundleArea.querySelector('.custom-price-block');
                if (!bundlePriceBlock) {
                    const priceContainer = bundleArea.querySelector('.discount_final_price, .game_purchase_price, .game_purchase_price.price');
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
                            showCurrencyMenu(bundlePriceBlock, updatePrices);
                        });
                    }
                }
                if (bundlePriceBlock) {
                    const priceText = bundlePriceBlock.querySelector('span.price-text');
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
                const freeArea = document.querySelector('.free_to_play');
                let freePriceBlock = freeArea?.querySelector('.custom-price-block');
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
                        showCurrencyMenu(freePriceBlock, updatePrices);
                    });
                }
                if (freePriceBlock) {
                    const priceText = freePriceBlock.querySelector('span.price-text');
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

    exports.default = WebkitMain;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({}, window.MILLENNIUM_API);
 return millennium_main; };
function ExecutePluginModule() {
    let MillenniumStore = window.MILLENNIUM_PLUGIN_SETTINGS_STORE[pluginName];
    function OnPluginConfigChange(key, __, value) {
        if (key in MillenniumStore.settingsStore) {
            MillenniumStore.ignoreProxyFlag = true;
            MillenniumStore.settingsStore[key] = value;
            MillenniumStore.ignoreProxyFlag = false;
        }
    }
    /** Expose the OnPluginConfigChange so it can be called externally */
    MillenniumStore.OnPluginConfigChange = OnPluginConfigChange;
    MILLENNIUM_BACKEND_IPC.postMessage(0, { pluginName: pluginName, methodName: '__builtins__.__millennium_plugin_settings_parser__' }).then((response) => {
        /**
         * __millennium_plugin_settings_parser__ will return false if the plugin has no settings.
         * If the plugin has settings, it will return a base64 encoded string.
         * The string is then decoded and parsed into an object.
         */
        if (typeof response.returnValue === 'string') {
            MillenniumStore.ignoreProxyFlag = true;
            /** Initialize the settings store from the settings returned from the backend. */
            MillenniumStore.settingsStore = MillenniumStore.DefinePluginSetting(Object.fromEntries(JSON.parse(atob(response.returnValue)).map((item) => [item.functionName, item])));
            MillenniumStore.ignoreProxyFlag = false;
        }
        /** @ts-ignore: call the plugin main after the settings have been parsed. This prevent plugin settings from being undefined at top level. */
        let PluginModule = PluginEntryPointMain();
        /** Assign the plugin on plugin list. */
        Object.assign(window.PLUGIN_LIST[pluginName], {
            ...PluginModule,
            __millennium_internal_plugin_name_do_not_use_or_change__: pluginName,
        });
        /** Run the rolled up plugins default exported function */
        PluginModule.default();
        /** If the current module is a client module, post message id=1 which calls the front_end_loaded method on the backend. */
        if (MILLENNIUM_IS_CLIENT_MODULE) {
            MILLENNIUM_BACKEND_IPC.postMessage(1, { pluginName: pluginName });
        }
    });
}
ExecutePluginModule()