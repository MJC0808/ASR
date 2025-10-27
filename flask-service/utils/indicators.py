"""
기술적 지표 계산 유틸리티
EMA (지수 이동 평균), RSI (상대 강도 지수) 등을 계산합니다.
"""
import pandas as pd
import numpy as np


def calculate_ema(data: pd.Series, period: int) -> pd.Series:
    """
    EMA (Exponential Moving Average) 계산
    
    Args:
        data: 가격 데이터 (pandas Series)
        period: EMA 기간
    
    Returns:
        EMA 값 (pandas Series)
    """
    try:
        return data.ewm(span=period, adjust=False).mean()
    except Exception as e:
        print(f"Error calculating EMA: {e}")
        return pd.Series()


def calculate_rsi(data: pd.Series, period: int = 14) -> pd.Series:
    """
    RSI (Relative Strength Index) 계산
    
    Args:
        data: 가격 데이터 (pandas Series)
        period: RSI 기간 (기본값: 14)
    
    Returns:
        RSI 값 (pandas Series, 0-100 범위)
    """
    try:
        # 가격 변화 계산
        delta = data.diff()
        
        # 상승분과 하락분 분리
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        # RS (Relative Strength) 계산
        rs = gain / loss
        
        # RSI 계산
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    except Exception as e:
        print(f"Error calculating RSI: {e}")
        return pd.Series()


def calculate_sma(data: pd.Series, period: int) -> pd.Series:
    """
    SMA (Simple Moving Average) 계산
    
    Args:
        data: 가격 데이터 (pandas Series)
        period: SMA 기간
    
    Returns:
        SMA 값 (pandas Series)
    """
    try:
        return data.rolling(window=period).mean()
    except Exception as e:
        print(f"Error calculating SMA: {e}")
        return pd.Series()


def calculate_bollinger_bands(data: pd.Series, period: int = 20, std_dev: int = 2):
    """
    볼린저 밴드 계산
    
    Args:
        data: 가격 데이터 (pandas Series)
        period: 이동평균 기간 (기본값: 20)
        std_dev: 표준편차 배수 (기본값: 2)
    
    Returns:
        dict: {'upper': 상단 밴드, 'middle': 중간 밴드, 'lower': 하단 밴드}
    """
    try:
        middle = data.rolling(window=period).mean()
        std = data.rolling(window=period).std()
        upper = middle + (std * std_dev)
        lower = middle - (std * std_dev)
        
        return {
            'upper': upper,
            'middle': middle,
            'lower': lower
        }
    except Exception as e:
        print(f"Error calculating Bollinger Bands: {e}")
        return {'upper': pd.Series(), 'middle': pd.Series(), 'lower': pd.Series()}


def calculate_macd(data: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    """
    MACD (Moving Average Convergence Divergence) 계산
    
    Args:
        data: 가격 데이터 (pandas Series)
        fast: 빠른 EMA 기간 (기본값: 12)
        slow: 느린 EMA 기간 (기본값: 26)
        signal: 시그널 라인 기간 (기본값: 9)
    
    Returns:
        dict: {'macd': MACD 라인, 'signal': 시그널 라인, 'histogram': 히스토그램}
    """
    try:
        fast_ema = data.ewm(span=fast, adjust=False).mean()
        slow_ema = data.ewm(span=slow, adjust=False).mean()
        macd_line = fast_ema - slow_ema
        signal_line = macd_line.ewm(span=signal, adjust=False).mean()
        histogram = macd_line - signal_line
        
        return {
            'macd': macd_line,
            'signal': signal_line,
            'histogram': histogram
        }
    except Exception as e:
        print(f"Error calculating MACD: {e}")
        return {'macd': pd.Series(), 'signal': pd.Series(), 'histogram': pd.Series()}


def calculate_obv(close: pd.Series, volume: pd.Series):
    """
    OBV (On-Balance Volume) 계산
    
    Args:
        close: 종가 데이터
        volume: 거래량 데이터
    
    Returns:
        OBV 값 (pandas Series)
    """
    try:
        obv = pd.Series(index=close.index, dtype='float64')
        obv.iloc[0] = volume.iloc[0]
        
        for i in range(1, len(close)):
            if close.iloc[i] > close.iloc[i-1]:
                obv.iloc[i] = obv.iloc[i-1] + volume.iloc[i]
            elif close.iloc[i] < close.iloc[i-1]:
                obv.iloc[i] = obv.iloc[i-1] - volume.iloc[i]
            else:
                obv.iloc[i] = obv.iloc[i-1]
        
        return obv
    except Exception as e:
        print(f"Error calculating OBV: {e}")
        return pd.Series()


def calculate_cci(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 20):
    """
    CCI (Commodity Channel Index) 계산
    
    Args:
        high: 고가 데이터
        low: 저가 데이터
        close: 종가 데이터
        period: 기간 (기본값: 20)
    
    Returns:
        CCI 값 (pandas Series)
    """
    try:
        typical_price = (high + low + close) / 3
        sma = typical_price.rolling(window=period).mean()
        mean_deviation = typical_price.rolling(window=period).apply(
            lambda x: np.abs(x - x.mean()).mean()
        )
        cci = (typical_price - sma) / (0.015 * mean_deviation)
        
        return cci
    except Exception as e:
        print(f"Error calculating CCI: {e}")
        return pd.Series()


def calculate_atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14):
    """
    ATR (Average True Range) 계산
    
    Args:
        high: 고가 데이터
        low: 저가 데이터
        close: 종가 데이터
        period: 기간 (기본값: 14)
    
    Returns:
        ATR 값 (pandas Series)
    """
    try:
        high_low = high - low
        high_close = np.abs(high - close.shift())
        low_close = np.abs(low - close.shift())
        
        true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        atr = true_range.rolling(window=period).mean()
        
        return atr
    except Exception as e:
        print(f"Error calculating ATR: {e}")
        return pd.Series()


def calculate_adx(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14):
    """
    ADX (Average Directional Index) 계산
    
    Args:
        high: 고가 데이터
        low: 저가 데이터
        close: 종가 데이터
        period: 기간 (기본값: 14)
    
    Returns:
        dict: {'adx': ADX, 'plus_di': +DI, 'minus_di': -DI}
    """
    try:
        # True Range
        high_low = high - low
        high_close = np.abs(high - close.shift())
        low_close = np.abs(low - close.shift())
        true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        
        # Directional Movement
        plus_dm = high.diff()
        minus_dm = -low.diff()
        plus_dm[plus_dm < 0] = 0
        minus_dm[minus_dm < 0] = 0
        
        # Smoothed indicators
        tr_smooth = true_range.rolling(window=period).sum()
        plus_dm_smooth = plus_dm.rolling(window=period).sum()
        minus_dm_smooth = minus_dm.rolling(window=period).sum()
        
        # Directional Indicators
        plus_di = 100 * plus_dm_smooth / tr_smooth
        minus_di = 100 * minus_dm_smooth / tr_smooth
        
        # DX and ADX
        dx = 100 * np.abs(plus_di - minus_di) / (plus_di + minus_di)
        adx = dx.rolling(window=period).mean()
        
        return {
            'adx': adx,
            'plus_di': plus_di,
            'minus_di': minus_di
        }
    except Exception as e:
        print(f"Error calculating ADX: {e}")
        return {'adx': pd.Series(), 'plus_di': pd.Series(), 'minus_di': pd.Series()}


def detect_candlestick_patterns(open_price: pd.Series, high: pd.Series, low: pd.Series, close: pd.Series):
    """
    캔들스틱 패턴 감지
    
    Args:
        open_price: 시가
        high: 고가
        low: 저가
        close: 종가
    
    Returns:
        dict: 감지된 패턴들
    """
    try:
        patterns = {
            'doji': [],
            'hammer': [],
            'shooting_star': [],
            'engulfing_bullish': [],
            'engulfing_bearish': []
        }
        
        for i in range(1, len(close)):
            body = abs(close.iloc[i] - open_price.iloc[i])
            total_range = high.iloc[i] - low.iloc[i]
            
            if total_range == 0:
                continue
            
            # Doji (몸통이 매우 작음)
            if body / total_range < 0.1:
                patterns['doji'].append(i)
            
            # Hammer (아래 그림자가 긴 양봉)
            lower_shadow = min(open_price.iloc[i], close.iloc[i]) - low.iloc[i]
            upper_shadow = high.iloc[i] - max(open_price.iloc[i], close.iloc[i])
            if close.iloc[i] > open_price.iloc[i] and lower_shadow > 2 * body and upper_shadow < body:
                patterns['hammer'].append(i)
            
            # Shooting Star (위 그림자가 긴 음봉)
            if close.iloc[i] < open_price.iloc[i] and upper_shadow > 2 * body and lower_shadow < body:
                patterns['shooting_star'].append(i)
            
            # Engulfing patterns
            if i > 0:
                prev_body = abs(close.iloc[i-1] - open_price.iloc[i-1])
                # Bullish Engulfing
                if (close.iloc[i] > open_price.iloc[i] and 
                    close.iloc[i-1] < open_price.iloc[i-1] and
                    body > prev_body * 1.5):
                    patterns['engulfing_bullish'].append(i)
                
                # Bearish Engulfing
                if (close.iloc[i] < open_price.iloc[i] and 
                    close.iloc[i-1] > open_price.iloc[i-1] and
                    body > prev_body * 1.5):
                    patterns['engulfing_bearish'].append(i)
        
        return patterns
    except Exception as e:
        print(f"Error detecting candlestick patterns: {e}")
        return {}

