"""
Yahoo Finance 데이터 조회 서비스
한국 및 미국 주식 데이터를 Yahoo Finance에서 가져옵니다.
"""
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class YahooFinanceService:
    """Yahoo Finance API를 사용한 주식 데이터 조회 서비스"""
    
    # 시간 간격별 데이터 기간 설정
    INTERVAL_PERIODS = {
        '1m': '7d',      # 1분봉: 최근 7일 (Yahoo API 제한)
        '2m': '60d',     # 2분봉: 최근 60일
        '5m': '60d',     # 5분봉: 최근 60일
        '15m': '60d',    # 15분봉: 최근 60일
        '30m': '60d',    # 30분봉: 최근 60일
        '60m': '730d',   # 1시간봉: 최근 2년
        '90m': '60d',    # 90분봉: 최근 60일
        '1h': '730d',    # 1시간봉: 최근 2년
        '1d': 'max',     # 일봉: 전체 데이터 (상장일부터)
        '5d': 'max',     # 5일봉: 전체 데이터
        '1wk': 'max',    # 주봉: 전체 데이터
        '1mo': 'max',    # 월봉: 전체 데이터
        '3mo': 'max'     # 분기봉: 전체 데이터
    }
    
    @staticmethod
    def normalize_ticker(ticker: str) -> str:
        """
        티커 심볼을 정규화합니다.
        한국 주식의 경우 .KS 또는 .KQ 접미사를 추가합니다.
        
        Args:
            ticker: 주식 심볼 (예: AAPL, 005930, 삼성전자)
        
        Returns:
            정규화된 티커 심볼
        """
        ticker = ticker.strip().upper()
        
        # 이미 접미사가 있는 경우 그대로 반환
        if '.KS' in ticker or '.KQ' in ticker or '.KL' in ticker:
            return ticker
        
        # 숫자로만 구성된 경우 (한국 주식 코드)
        if ticker.isdigit():
            # 기본적으로 KOSPI (.KS) 추가
            # KOSDAQ 종목인 경우 사용자가 직접 .KQ를 붙여야 함
            return f"{ticker}.KS"
        
        # 미국 주식 또는 이미 올바른 형식
        return ticker
    
    @staticmethod
    def fetch_yahoo_data(ticker: str, interval: str = '1d', ema_period: int = 20, rsi_period: int = 14):
        """
        Yahoo Finance에서 주식 데이터를 가져옵니다.
        
        Args:
            ticker: 주식 심볼 (예: AAPL, 005930.KS)
            interval: 시간 간격 (1m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo)
            ema_period: EMA 기간
            rsi_period: RSI 기간
        
        Returns:
            dict: {
                'candlestick': 캔들스틱 데이터,
                'ema': EMA 데이터,
                'rsi': RSI 데이터,
                'ticker_info': 종목 정보
            }
        """
        try:
            # 티커 정규화
            normalized_ticker = YahooFinanceService.normalize_ticker(ticker)
            logger.info(f"Fetching data for {normalized_ticker} with interval {interval}")
            
            # 기간 설정
            period = YahooFinanceService.INTERVAL_PERIODS.get(interval, '1y')
            
            # Yahoo Finance에서 데이터 가져오기
            stock = yf.Ticker(normalized_ticker)
            df = stock.history(period=period, interval=interval)
            
            if df.empty:
                logger.warning(f"No data found for {normalized_ticker}")
                return {
                    'error': f'No data found for ticker: {ticker}',
                    'candlestick': [],
                    'ema': [],
                    'rsi': []
                }
            
            # 인덱스를 datetime으로 변환
            df.index = pd.to_datetime(df.index)
            
            # 캔들스틱 데이터 생성
            candlestick_data = []
            for index, row in df.iterrows():
                candlestick_data.append({
                    'time': int(index.timestamp()),
                    'open': float(row['Open']),
                    'high': float(row['High']),
                    'low': float(row['Low']),
                    'close': float(row['Close']),
                    'volume': int(row['Volume']) if pd.notna(row['Volume']) else 0
                })
            
            # EMA 계산
            from utils.indicators import calculate_ema
            ema_values = calculate_ema(df['Close'], ema_period)
            ema_data = []
            for i, (index, value) in enumerate(ema_values.items()):
                if pd.notna(value):
                    ema_data.append({
                        'time': int(index.timestamp()),
                        'value': float(value)
                    })
            
            # RSI 계산
            from utils.indicators import calculate_rsi
            rsi_values = calculate_rsi(df['Close'], rsi_period)
            rsi_data = []
            for i, (index, value) in enumerate(rsi_values.items()):
                if pd.notna(value):
                    rsi_data.append({
                        'time': int(index.timestamp()),
                        'value': float(value)
                    })
            
            # 종목 정보
            info = stock.info
            
            # 현재가 및 변화율 계산
            latest_price = df['Close'].iloc[-1] if len(df) > 0 else 0
            prev_price = df['Close'].iloc[-2] if len(df) > 1 else latest_price
            price_change = latest_price - prev_price
            price_change_percent = (price_change / prev_price) * 100 if prev_price > 0 else 0
            
            # 통화 정보 가져오기
            currency = info.get('currency', 'USD')
            if currency is None or currency == 'USD':
                # 심볼을 기반으로 통화 추정
                if normalized_ticker.endswith('.KS') or normalized_ticker.endswith('.KQ'):
                    currency = 'KRW'
            
            # 거래소 정보 가져오기
            exchange = info.get('exchange', 'Unknown')
            if exchange == 'NMS':
                exchange = 'NASDAQ'
            elif exchange == 'NYQ':
                exchange = 'NYSE'
            elif exchange == 'KSC':
                exchange = 'KOSPI'
            elif exchange == 'KSQ':
                exchange = 'KOSDAQ'
            
            # 한국 주식의 경우 추가 정보 확인
            if normalized_ticker.endswith('.KS') or normalized_ticker.endswith('.KQ'):
                # 한국 주식은 원화로 설정
                currency = 'KRW'
                # 한국 주식의 경우 실제 이름이 영어로 나올 수 있으므로 처리
                long_name = info.get('longName', ticker)
                if not long_name or long_name == ticker:
                    long_name = info.get('shortName', ticker)
            
            # 종목명 결정
            name = info.get('longName', info.get('shortName', ticker))
            
            ticker_info = {
                'symbol': normalized_ticker,
                'name': name,
                'currency': currency,
                'exchange': exchange,
                'currentPrice': latest_price,
                'price': latest_price,
                'close': latest_price,
                'change': price_change,
                'changePercent': price_change_percent,
                'percentage': price_change_percent,
                'raw_price': latest_price,
                'raw_currency': currency
            }
            
            # 디버깅을 위한 로그
            logger.info(f"Ticker info for {normalized_ticker}: {ticker_info}")
            
            logger.info(f"Successfully fetched {len(candlestick_data)} data points for {normalized_ticker}")
            
            return {
                'candlestick': candlestick_data,
                'ema': ema_data,
                'rsi': rsi_data,
                'ticker_info': ticker_info
            }
            
        except Exception as e:
            logger.error(f"Error fetching data for {ticker}: {str(e)}")
            return {
                'error': str(e),
                'candlestick': [],
                'ema': [],
                'rsi': [],
                'volume': [],
                'ticker_info': {
                    'symbol': ticker,
                    'name': ticker,
                    'currency': 'USD',
                    'exchange': 'Unknown',
                    'currentPrice': 0,
                    'price': 0,
                    'close': 0,
                    'change': 0,
                    'changePercent': 0,
                    'percentage': 0
                }
            }

