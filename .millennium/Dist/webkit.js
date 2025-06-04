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
let PluginEntryPointMain = function() { var millennium_main=function(e){"use strict";!function(){const e={};try{if(process)return process.env=Object.assign({},process.env),void Object.assign(process.env,e)}catch(e){}globalThis.process={env:e}}();const t=__wrapped_callable__("Backend.receive_frontend_message");return e.default=async function(){if(console.log("WebkitMain запущен"),!/^\/app\/\d+/.test(window.location.pathname))return void console.log("Не страница игры, пропускаем вставку цен");await new Promise((e=>setTimeout(e,500)));let e="RUB";function o(t,o){console.log("showCurrencyMenu вызвана для блока:",t,"Текущая валюта:",e);const c=document.querySelector(".currency-menu");c&&(console.log("Удаляем старое меню:",c),c.remove());const n=document.createElement("div");n.className="currency-menu",n.style.position="absolute",n.style.top=`${t.getBoundingClientRect().bottom+window.scrollY}px`,n.style.left=`${t.getBoundingClientRect().left+window.scrollX}px`,n.style.zIndex="10000",n.style.backgroundColor="#2a475e",n.style.border="1px solid #66ccff",n.style.borderRadius="4px",n.style.padding="5px",n.style.boxShadow="0 2px 8px rgba(0,0,0,0.5)",n.style.minWidth="100px";const r=document.createElement("select");r.style.backgroundColor="#2a475e",r.style.color="#66ccff",r.style.border="none",r.style.padding="2px",r.style.cursor="pointer",r.style.fontSize="12px",r.style.width="100%";["RUB","USD","EUR","KZT","GBP"].forEach((t=>{const o=document.createElement("option");o.value=t,o.textContent=t,t===e&&(o.selected=!0),r.appendChild(o)})),r.addEventListener("change",(async t=>{const c=t.target.value;console.log("Выбрана валюта:",c),e=c,await o(c),n.remove()}));document.addEventListener("click",(e=>{n.contains(e.target)||(console.log("Клик вне меню, удаляем:",n),n.remove())}),{once:!0}),n.appendChild(r),document.body.appendChild(n),console.log("Меню создано и добавлено в DOM:",n)}await async function c(n){console.log("updatePrices вызвана с валютой:",n),e=n;const r=[],l=document.querySelectorAll(".game_area_purchase_game");console.log("Найдено блоков game_area_purchase_game:",l.length);for(const e of l){const l=e.querySelector("h1"),s=e.querySelector(".discount_final_price, .game_purchase_price, .game_purchase_price.price"),i=l?.textContent?.trim()||"Unknown Edition",a=s?.textContent?.trim()||"Цена не указана";console.log("Обрабатываем издание:",i,"Цена:",a);const p=await t({message:a,status:!0,count:69,to_currency:n});console.log("Получена конвертированная цена:",p);const d=parseInt(a.replace(/[^\d]/g,""))||0;r.push({edition:i,price:a,numericPrice:d,convertedPrice:p});const u=e.querySelector(".discount_final_price, .game_purchase_price, .game_purchase_price.price");let m=e.querySelector(".custom-price-block");const y=e.querySelector(".discount_prices");let g=null;if(y?g=y:u&&(g=u),g&&!m){m=document.createElement("div"),m.className="custom-price-block",m.style.display="inline-block",m.style.marginRight="5px",m.style.marginLeft="5px",m.style.marginTop="4px",m.style.color="#66ccff",m.style.verticalAlign="top",m.style.backgroundColor="#1a252f",m.style.padding="4px 10px",m.style.borderRadius="2px",m.style.cursor="pointer",g.parentNode?.insertBefore(m,g);const e=document.createElement("span");e.className="price-text",m.appendChild(e),m.addEventListener("click",(e=>{console.log("Клик по custom-price-block:",m),e.stopPropagation(),o(m,c)}))}if(m){const e=m.querySelector("span.price-text");e&&(e.textContent=`~ ${p}${n}`)}}const s=document.querySelector(".game_area_purchase_game.bundle");if(s){const e=s.querySelector("h1")?.textContent?.trim()||"Bundle",l=s.querySelector(".discount_final_price, .game_purchase_price, .game_purchase_price.price")?.textContent?.trim()||"Цена не указана";console.log("Обрабатываем бандл:",e,"Цена:",l);const i=await t({message:l,status:!0,count:69,to_currency:n});console.log("Получена конвертированная цена для бандла:",i);const a=parseInt(l.replace(/[^\d]/g,""))||0;r.push({edition:e,price:l,numericPrice:a,convertedPrice:i});let p=s.querySelector(".custom-price-block");if(!p){const e=s.querySelector(".discount_final_price, .game_purchase_price, .game_purchase_price.price");if(e){p=document.createElement("div"),p.className="custom-price-block",p.style.display="inline-block",p.style.marginRight="5px",p.style.marginLeft="10px",p.style.color="#66ccff",p.style.verticalAlign="middle",p.style.backgroundColor="#1a252f",p.style.padding="5px 10px",p.style.borderRadius="4px",p.style.cursor="pointer",e.parentNode?.insertBefore(p,e);const t=document.createElement("span");t.className="price-text",p.appendChild(t),p.addEventListener("click",(e=>{console.log("Клик по bundle custom-price-block:",p),e.stopPropagation(),o(p,c)}))}}if(p){const e=p.querySelector("span.price-text");e&&(e.textContent=`~ ${i}${n}`)}}if(document.querySelector(".free_to_play")){const e=await t({message:"0",status:!0,count:69,to_currency:n});console.log("Получена конвертированная цена для бесплатной игры:",e),r.push({edition:"Free to Play",price:"Free",numericPrice:0,convertedPrice:e});const l=document.querySelector(".free_to_play");let s=l?.querySelector(".custom-price-block");if(!s&&l){s=document.createElement("div"),s.className="custom-price-block",s.style.display="inline-block",s.style.marginRight="5px",s.style.marginLeft="10px",s.style.color="#66ccff",s.style.verticalAlign="middle",s.style.backgroundColor="#1a252f",s.style.padding="5px 10px",s.style.borderRadius="4px",s.style.cursor="pointer",l.appendChild(s);const e=document.createElement("span");e.className="price-text",s.appendChild(e),s.addEventListener("click",(e=>{console.log("Клик по free-to-play custom-price-block:",s),e.stopPropagation(),o(s,c)}))}if(s){const t=s.querySelector("span.price-text");t&&(t.textContent=`~ ${e}${n}`)}}console.log("Цены обновлены для валюты:",n,"Всего обработано цен:",r.length)}("RUB")},Object.defineProperty(e,"__esModule",{value:!0}),e}({},window.MILLENNIUM_API);
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