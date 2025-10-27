"""
기술적 분석 유틸리티
골든크로스, 데드크로스, 이평선 돌파 등을 감지합니다.
"""
import pandas as pd
import numpy as np
from datetime import datetime


def calculate_moving_average_cross(data: pd.Series, short_period: int = 50, long_period: int = 200):
    """
    이동평균 크로스 감지 (골든크로스, 데드크로스)
    
    Args:
        data: 가격 데이터 (Close)
        short_period: 단기 이평 기간 (기본: 50일)
        long_period: 장기 이평 기간 (기본: 200일)
    
    Returns:
        dict: {
            'golden_cross': 골든크로스 발생 지점,
            'dead_cross': 데드크로스 발생 지점,
            'short_ma': 단기 이평,
            'long_ma': 장기 이평
        }
    """
    # 이동평균 계산
    short_ma = data.rolling(window=short_period).mean()
    long_ma = data.rolling(window=long_period).mean()
    
    # 크로스 감지
    golden_cross = []
    dead_cross = []
    
    for i in range(1, len(data)):
        if pd.notna(short_ma.iloc[i]) and pd.notna(long_ma.iloc[i]):
            # 골든크로스: 단기선이 장기선을 상향 돌파
            if short_ma.iloc[i-1] <= long_ma.iloc[i-1] and short_ma.iloc[i] > long_ma.iloc[i]:
                golden_cross.append({
                    'time': int(data.index[i].timestamp()),
                    'price': float(data.iloc[i]),
                    'type': 'golden_cross'
                })
            
            # 데드크로스: 단기선이 장기선을 하향 돌파
            elif short_ma.iloc[i-1] >= long_ma.iloc[i-1] and short_ma.iloc[i] < long_ma.iloc[i]:
                dead_cross.append({
                    'time': int(data.index[i].timestamp()),
                    'price': float(data.iloc[i]),
                    'type': 'dead_cross'
                })
    
    return {
        'golden_cross': golden_cross,
        'dead_cross': dead_cross,
        'short_ma': short_ma,
        'long_ma': long_ma,
        'short_period': short_period,
        'long_period': long_period
    }


def calculate_ma_breakthrough(data: pd.Series, ma_period: int = 200):
    """
    이동평균선 돌파 감지
    
    Args:
        data: 가격 데이터 (Close)
        ma_period: 이평 기간 (기본: 200일)
    
    Returns:
        dict: {
            'breakthrough_up': 상향 돌파 지점,
            'breakthrough_down': 하향 돌파 지점,
            'ma': 이동평균선
        }
    """
    # 이동평균 계산
    ma = data.rolling(window=ma_period).mean()
    
    breakthrough_up = []
    breakthrough_down = []
    
    for i in range(1, len(data)):
        if pd.notna(ma.iloc[i]):
            # 상향 돌파: 주가가 이평선을 상향 돌파
            if data.iloc[i-1] <= ma.iloc[i-1] and data.iloc[i] > ma.iloc[i]:
                breakthrough_up.append({
                    'time': int(data.index[i].timestamp()),
                    'price': float(data.iloc[i]),
                    'type': 'breakthrough_up',
                    'ma_value': float(ma.iloc[i])
                })
            
            # 하향 돌파: 주가가 이평선을 하향 돌파
            elif data.iloc[i-1] >= ma.iloc[i-1] and data.iloc[i] < ma.iloc[i]:
                breakthrough_down.append({
                    'time': int(data.index[i].timestamp()),
                    'price': float(data.iloc[i]),
                    'type': 'breakthrough_down',
                    'ma_value': float(ma.iloc[i])
                })
    
    return {
        'breakthrough_up': breakthrough_up,
        'breakthrough_down': breakthrough_down,
        'ma': ma,
        'ma_period': ma_period
    }


def calculate_support_resistance(data: pd.DataFrame, window: int = 20):
    """
    지지선/저항선 계산
    
    Args:
        data: OHLC 데이터
        window: 윈도우 기간
    
    Returns:
        dict: 지지선/저항선 정보
    """
    support_levels = []
    resistance_levels = []
    
    # 최근 N일간의 저점과 고점 찾기
    for i in range(window, len(data)):
        window_data = data.iloc[i-window:i]
        
        # 지지선: 최근 저점
        support = window_data['Low'].min()
        # 저항선: 최근 고점
        resistance = window_data['High'].max()
        
        support_levels.append({
            'time': int(data.index[i].timestamp()),
            'value': float(support)
        })
        
        resistance_levels.append({
            'time': int(data.index[i].timestamp()),
            'value': float(resistance)
        })
    
    return {
        'support': support_levels,
        'resistance': resistance_levels
    }


def analyze_chart(df: pd.DataFrame, analysis_type: str, params: dict = None):
    """
    차트 분석 메인 함수
    
    Args:
        df: OHLC 데이터프레임
        analysis_type: 분석 타입 ('golden_dead_cross', 'ma_breakthrough', 'support_resistance')
        params: 추가 파라미터
    
    Returns:
        dict: 분석 결과
    """
    if params is None:
        params = {}
    
    result = {
        'analysis_type': analysis_type,
        'signals': [],
        'lines': []
    }
    
    if analysis_type == 'golden_dead_cross':
        short_period = params.get('short_period', 50)
        long_period = params.get('long_period', 200)
        
        cross_result = calculate_moving_average_cross(
            df['Close'], 
            short_period=short_period, 
            long_period=long_period
        )
        
        # 신호 추가
        result['signals'] = cross_result['golden_cross'] + cross_result['dead_cross']
        
        # 이평선 추가
        result['lines'] = [
            {
                'name': f'{short_period}MA',
                'data': [
                    {'time': int(idx.timestamp()), 'value': float(val)}
                    for idx, val in cross_result['short_ma'].items()
                    if pd.notna(val)
                ],
                'color': '#2962FF'
            },
            {
                'name': f'{long_period}MA',
                'data': [
                    {'time': int(idx.timestamp()), 'value': float(val)}
                    for idx, val in cross_result['long_ma'].items()
                    if pd.notna(val)
                ],
                'color': '#FF6D00'
            }
        ]
        
        result['description'] = f'골든크로스: {len(cross_result["golden_cross"])}회, 데드크로스: {len(cross_result["dead_cross"])}회'
    
    elif analysis_type == 'ma_breakthrough':
        ma_period = params.get('ma_period', 200)
        
        breakthrough_result = calculate_ma_breakthrough(df['Close'], ma_period=ma_period)
        
        # 신호 추가
        result['signals'] = breakthrough_result['breakthrough_up'] + breakthrough_result['breakthrough_down']
        
        # 이평선 추가
        result['lines'] = [
            {
                'name': f'{ma_period}MA',
                'data': [
                    {'time': int(idx.timestamp()), 'value': float(val)}
                    for idx, val in breakthrough_result['ma'].items()
                    if pd.notna(val)
                ],
                'color': '#9C27B0'
            }
        ]
        
        result['description'] = f'{ma_period}일선 상향돌파: {len(breakthrough_result["breakthrough_up"])}회, 하향돌파: {len(breakthrough_result["breakthrough_down"])}회'
    
    elif analysis_type == 'support_resistance':
        window = params.get('window', 20)
        
        sr_result = calculate_support_resistance(df, window=window)
        
        result['lines'] = [
            {
                'name': '지지선',
                'data': sr_result['support'],
                'color': '#00E676',
                'lineStyle': 2  # dashed
            },
            {
                'name': '저항선',
                'data': sr_result['resistance'],
                'color': '#FF1744',
                'lineStyle': 2  # dashed
            }
        ]
        
        result['description'] = f'최근 {window}일 기준 지지/저항선'
    
    elif analysis_type == 'macd':
        from utils.indicators import calculate_macd
        
        macd_result = calculate_macd(df['Close'])
        
        # MACD 크로스 신호
        for i in range(1, len(df)):
            if pd.notna(macd_result['macd'].iloc[i]) and pd.notna(macd_result['signal'].iloc[i]):
                # MACD가 시그널선을 상향 돌파 (매수)
                if (macd_result['macd'].iloc[i-1] <= macd_result['signal'].iloc[i-1] and 
                    macd_result['macd'].iloc[i] > macd_result['signal'].iloc[i]):
                    result['signals'].append({
                        'time': int(df.index[i].timestamp()),
                        'price': float(df['Close'].iloc[i]),
                        'type': 'macd_cross_up'
                    })
                # MACD가 시그널선을 하향 돌파 (매도)
                elif (macd_result['macd'].iloc[i-1] >= macd_result['signal'].iloc[i-1] and 
                      macd_result['macd'].iloc[i] < macd_result['signal'].iloc[i]):
                    result['signals'].append({
                        'time': int(df.index[i].timestamp()),
                        'price': float(df['Close'].iloc[i]),
                        'type': 'macd_cross_down'
                    })
        
        result['lines'] = [
            {
                'name': 'MACD',
                'data': [
                    {'time': int(idx.timestamp()), 'value': float(val)}
                    for idx, val in macd_result['macd'].items()
                    if pd.notna(val)
                ],
                'color': '#2962FF'
            },
            {
                'name': 'Signal',
                'data': [
                    {'time': int(idx.timestamp()), 'value': float(val)}
                    for idx, val in macd_result['signal'].items()
                    if pd.notna(val)
                ],
                'color': '#FF6D00'
            }
        ]
        
        result['description'] = f'MACD 신호: 매수 {len([s for s in result["signals"] if s["type"] == "macd_cross_up"])}회, 매도 {len([s for s in result["signals"] if s["type"] == "macd_cross_down"])}회'
    
    elif analysis_type == 'bollinger_bands':
        from utils.indicators import calculate_bollinger_bands
        
        period = params.get('period', 20)
        std_dev = params.get('std_dev', 2)
        
        bb_result = calculate_bollinger_bands(df['Close'], period=period, std_dev=std_dev)
        
        # 볼린저 밴드 돌파 신호
        for i in range(1, len(df)):
            if pd.notna(bb_result['upper'].iloc[i]) and pd.notna(bb_result['lower'].iloc[i]):
                # 하단 밴드 터치 (매수)
                if df['Low'].iloc[i] <= bb_result['lower'].iloc[i]:
                    result['signals'].append({
                        'time': int(df.index[i].timestamp()),
                        'price': float(df['Close'].iloc[i]),
                        'type': 'bb_lower_touch'
                    })
                # 상단 밴드 터치 (매도)
                elif df['High'].iloc[i] >= bb_result['upper'].iloc[i]:
                    result['signals'].append({
                        'time': int(df.index[i].timestamp()),
                        'price': float(df['Close'].iloc[i]),
                        'type': 'bb_upper_touch'
                    })
        
        result['lines'] = [
            {
                'name': '상단 밴드',
                'data': [
                    {'time': int(idx.timestamp()), 'value': float(val)}
                    for idx, val in bb_result['upper'].items()
                    if pd.notna(val)
                ],
                'color': '#FF1744'
            },
            {
                'name': '중간 밴드',
                'data': [
                    {'time': int(idx.timestamp()), 'value': float(val)}
                    for idx, val in bb_result['middle'].items()
                    if pd.notna(val)
                ],
                'color': '#FFC107'
            },
            {
                'name': '하단 밴드',
                'data': [
                    {'time': int(idx.timestamp()), 'value': float(val)}
                    for idx, val in bb_result['lower'].items()
                    if pd.notna(val)
                ],
                'color': '#4CAF50'
            }
        ]
        
        result['description'] = f'볼린저 밴드 ({period}일, {std_dev}σ)'
    
    elif analysis_type == 'multiple_ma':
        # 다중 이동평균선
        from utils.indicators import calculate_sma, calculate_ema
        
        periods = params.get('periods', [5, 10, 20, 60, 120])
        colors = ['#E91E63', '#9C27B0', '#2196F3', '#FF9800', '#4CAF50']
        
        for idx, period in enumerate(periods):
            ma = calculate_sma(df['Close'], period)
            result['lines'].append({
                'name': f'{period}MA',
                'data': [
                    {'time': int(idx.timestamp()), 'value': float(val)}
                    for idx, val in ma.items()
                    if pd.notna(val)
                ],
                'color': colors[idx % len(colors)]
            })
        
        result['description'] = f'다중 이동평균선: {", ".join(map(str, periods))}일'
    
    elif analysis_type == 'candlestick_patterns':
        from utils.indicators import detect_candlestick_patterns
        
        patterns = detect_candlestick_patterns(df['Open'], df['High'], df['Low'], df['Close'])
        
        # 패턴을 신호로 변환
        pattern_signals = {
            'doji': ('doji', 'Doji'),
            'hammer': ('hammer', 'Hammer (매수)'),
            'shooting_star': ('shooting_star', 'Shooting Star (매도)'),
            'engulfing_bullish': ('engulfing_bullish', 'Bullish Engulfing (매수)'),
            'engulfing_bearish': ('engulfing_bearish', 'Bearish Engulfing (매도)')
        }
        
        for pattern_name, indices in patterns.items():
            for idx in indices:
                if idx < len(df):
                    result['signals'].append({
                        'time': int(df.index[idx].timestamp()),
                        'price': float(df['Close'].iloc[idx]),
                        'type': pattern_signals[pattern_name][0],
                        'text': pattern_signals[pattern_name][1]
                    })
        
        total_patterns = sum(len(v) for v in patterns.values())
        result['description'] = f'캔들스틱 패턴 감지: {total_patterns}개'
    
    elif analysis_type == 'rsi_analysis':
        from utils.indicators import calculate_rsi
        
        period = params.get('period', 14)
        rsi = calculate_rsi(df['Close'], period)
        
        # RSI 신호
        for i in range(1, len(df)):
            if pd.notna(rsi.iloc[i]):
                # 과매도 (RSI < 30)
                if rsi.iloc[i] < 30 and rsi.iloc[i-1] >= 30:
                    result['signals'].append({
                        'time': int(df.index[i].timestamp()),
                        'price': float(df['Close'].iloc[i]),
                        'type': 'rsi_oversold'
                    })
                # 과매수 (RSI > 70)
                elif rsi.iloc[i] > 70 and rsi.iloc[i-1] <= 70:
                    result['signals'].append({
                        'time': int(df.index[i].timestamp()),
                        'price': float(df['Close'].iloc[i]),
                        'type': 'rsi_overbought'
                    })
        
        result['lines'] = [{
            'name': f'RSI({period})',
            'data': [
                {'time': int(idx.timestamp()), 'value': float(val)}
                for idx, val in rsi.items()
                if pd.notna(val)
            ],
            'color': '#FF9800'
        }]
        
        oversold = len([s for s in result['signals'] if s['type'] == 'rsi_oversold'])
        overbought = len([s for s in result['signals'] if s['type'] == 'rsi_overbought'])
        result['description'] = f'RSI: 과매도 {oversold}회, 과매수 {overbought}회'
    
    return result

