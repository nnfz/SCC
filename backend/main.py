import Millennium, PluginUtils # type: ignore
logger = PluginUtils.Logger()

import time
import requests
import xml.etree.ElementTree as ET

def detect_currency(message: str) -> str:
    """Определяет валюту по значку в строке цены"""
    currency_symbols = {
        '₸': 'KZT',
        '₽': 'RUB',
        '$': 'USD',
        '€': 'EUR',
        '£': 'GBP',
        '₴': 'UAH'
    }
    
    for symbol, currency in currency_symbols.items():
        if symbol in message:
            logger.log(f"Обнаружен значок {symbol}, валюта: {currency}")
            return currency
    
    logger.log("Значок валюты не найден, fallback на KZT")
    return 'KZT'  # Fallback на KZT, если значок не найден

def convert_currency(amount: float, from_currency: str, to_currency: str) -> str:
    """Конвертирует сумму из from_currency в to_currency через API ЦБ РФ"""
    try:
        # Получаем курсы с ЦБ РФ
        response = requests.get("https://www.cbr.ru/scripts/XML_daily.asp", timeout=10)
        root = ET.fromstring(response.content)
        
        # Курсы валют относительно RUB
        currency_rates = {}
        for valute in root.findall('Valute'):
            char_code = valute.find('CharCode').text
            nominal = int(valute.find('Nominal').text)
            value = float(valute.find('Value').text.replace(',', '.'))
            currency_rates[char_code] = value / nominal
        
        # Добавляем RUB как 1:1
        currency_rates['RUB'] = 1.0
        
        # Проверяем, есть ли валюты
        if from_currency not in currency_rates:
            logger.error(f"Курс для {from_currency} не найден")
            return f"Курс для {from_currency} не найден"
        if to_currency not in currency_rates:
            logger.error(f"Курс для {to_currency} не найден")
            return f"Курс для {to_currency} не найден"
        
        # Конвертация: From -> RUB -> To
        from_to_rub = currency_rates[from_currency]
        rub_to_target = 1 / currency_rates[to_currency]
        rate = from_to_rub * rub_to_target
        result = round(amount * rate, 2)
        logger.log(f"Конвертация: {amount} {from_currency} -> {result} {to_currency}")
        return str(result)
    
    except Exception as e:
        logger.error(f"Ошибка получения курса: {str(e)}")
        return f"Ошибка получения курса: {str(e)}"

class Backend:
    def receive_frontend_message(message: str, status: bool, count: int, to_currency: str = "RUB") -> str:
        logger.log(f"received: {[message, status, count, to_currency]}")
        
        try:
            # Определяем исходную валюту по значку
            from_currency = detect_currency(message)
            
            # Извлекаем числовую часть цены
            amount_str = ''.join(filter(lambda x: x.isdigit() or x == '.', message))
            amount = float(amount_str) if amount_str else 0.0
            
            # Конвертируем
            result = convert_currency(amount, from_currency, to_currency)
            
            # accepted return types [str, int, bool]
            if count == 69:
                logger.log(f"CHETKO")
                return result
            else:
                logger.log(f"NECHETKO")
                return result
        except Exception as e:
            logger.error(f"Ошибка конвертации: {str(e)}")
            return "Ошибка"
    
def get_steam_path():
    logger.log("getting steam path")
    return Millennium.steam_path()

class Plugin:
    def _front_end_loaded(self):
        logger.log("The front end has loaded!")
        start_time = time.time()
        value = Millennium.call_frontend_method("classname.method", params=[18, "USA", False])
        end_time = time.time()
        logger.log(f"classname.method says -> {value} [{round((end_time - start_time) * 1000, 3)}ms]")

    def _load(self):     
        logger.log(f"bootstrapping example plugin, millennium {Millennium.version()}")
        try:
            value = Millennium.call_frontend_method("classname.method", params=[18, "USA", False])
            logger.log(f"ponged message -> {value}")
        except ConnectionError as error:
            logger.log(f"Failed to ping frontend, {error}")
        Millennium.ready()

    def _unload(self):
        logger.log("unloading")