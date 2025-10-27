"""
차트 패턴 분석 서비스
골든크로스, 삼각수렴, 더블탑/바텀, 헤드앤숄더 패턴 분석
"""

import numpy as np
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
from scipy import stats
from sklearn.preprocessing import StandardScaler

class ChartPatternService:
    def __init__(self):
        self.pattern_weights = {
            'golden_cross': 0.25,
            'triangle': 0.25,
            'double': 0.25,
            'head_shoulders': 0.25
        }
    
    def analyze_chart_patterns(self, companies: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        차트 패턴 분석 메인 함수
        """
        try:
            predictions = []
            
            for company in companies:
                symbol = company['symbol']
                
                # 주식 데이터 가져오기
                stock_data = self.get_stock_data(symbol)
                
                if stock_data is not None:
                    # 각 패턴 분석
                    patterns = self.analyze_all_patterns(stock_data)
                    
                    # 종합 예측 계산
                    combined_prediction = self.calculate_combined_prediction(patterns)
                    
                    predictions.append({
                        'symbol': symbol,
                        'direction': 'up' if combined_prediction['percentage'] > 0 else 'down',
                        'percentage': combined_prediction['percentage'],
                        'patterns': patterns,
                        'confidence': combined_prediction['confidence']
                    })
            
            return {
                'success': True,
                'data': {
                    'patterns': self.get_overall_pattern_analysis(),
                    'predictions': predictions
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'data': self.get_mock_chart_data(companies)
            }
    
    def get_stock_data(self, symbol: str, period: str = '2y') -> pd.DataFrame:
        """
        주식 데이터 가져오기 (2년치, 3개월 후 주가 예측)
        """
        try:
            ticker = yf.Ticker(symbol)
            data = ticker.history(period=period)
            
            if data.empty:
                return None
            
            # 기술적 지표 추가
            data = self.add_technical_indicators(data)
            
            # 3개월 후 가격 타겟 생성 (약 90일)
            data['Target_3m'] = data['Close'].shift(-90)
            
            return data
            
        except Exception as e:
            print(f"Error fetching data for {symbol}: {e}")
            return None
    
    def add_technical_indicators(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        기술적 지표 추가
        """
        # 이동평균선
        data['MA5'] = data['Close'].rolling(window=5).mean()
        data['MA10'] = data['Close'].rolling(window=10).mean()
        data['MA20'] = data['Close'].rolling(window=20).mean()
        data['MA50'] = data['Close'].rolling(window=50).mean()
        data['MA200'] = data['Close'].rolling(window=200).mean()
        
        # 고점과 저점
        data['High_20'] = data['High'].rolling(window=20).max()
        data['Low_20'] = data['Low'].rolling(window=20).min()
        
        return data
    
    def analyze_all_patterns(self, data: pd.DataFrame) -> Dict[str, Dict[str, float]]:
        """
        모든 차트 패턴 분석
        """
        patterns = {}
        
        # 골든크로스/데드크로스 분석
        patterns['golden_cross'] = self.analyze_golden_cross(data)
        
        # 삼각수렴 패턴 분석
        patterns['triangle'] = self.analyze_triangle_pattern(data)
        
        # 더블탑/더블바텀 분석
        patterns['double'] = self.analyze_double_pattern(data)
        
        # 헤드앤숄더 분석
        patterns['head_shoulders'] = self.analyze_head_shoulders(data)
        
        return patterns
    
    def analyze_golden_cross(self, data: pd.DataFrame) -> Dict[str, float]:
        """
        골든크로스/데드크로스 패턴 분석
        논문 근거: SMA(50, 200) 교차 후 20일 내 수익률 예측
        """
        try:
            if len(data) < 250:  # 200일 SMA + 20일 예측용 여유
                return {'percentage': 0.0, 'confidence': 0.5}
            
            # SMA50과 SMA200 계산
            data['SMA50'] = data['Close'].rolling(window=50).mean()
            data['SMA200'] = data['Close'].rolling(window=200).mean()
            
            # 교차 신호 생성
            signal = (data['SMA50'] > data['SMA200']).astype(int)
            data['Cross'] = signal.diff().fillna(0)
            
            # 최근 60일에서 골든크로스/데드크로스 찾기
            recent_data = data.tail(60)
            
            for idx in recent_data.index:
                if data.loc[idx, 'Cross'] == 1:  # 골든크로스
                    # 90일 후 수익률 예측 (3개월)
                    future_return = self.predict_return(data, idx, days=90)
                    if not np.isnan(future_return):
                        return {'percentage': future_return * 100, 'confidence': 0.7}
                elif data.loc[idx, 'Cross'] == -1:  # 데드크로스
                    # 90일 후 수익률 예측 (3개월)
                    future_return = self.predict_return(data, idx, days=90)
                    if not np.isnan(future_return):
                        return {'percentage': future_return * 100, 'confidence': 0.7}
            
            # 교차 없음 - 현재 위치 기반 예측
            current_sma50 = data['SMA50'].iloc[-1]
            current_sma200 = data['SMA200'].iloc[-1]
            
            distance = (current_sma50 - current_sma200) / current_sma200
            if distance > 0.05:  # 골든크로스 구간
                return {'percentage': 1.0, 'confidence': 0.5}
            elif distance < -0.05:  # 데드크로스 구간
                return {'percentage': -1.0, 'confidence': 0.5}
            else:
                return {'percentage': 0.0, 'confidence': 0.5}
                    
        except Exception as e:
            print(f"Golden cross analysis error: {e}")
            return {'percentage': 0.0, 'confidence': 0.5}
    
    def predict_return(self, df, date, days=90):
        """교차일 기준 N일 후 수익률 예측 (기본값 90일 = 3개월)"""
        try:
            price_at_cross = df.loc[date, 'Close']
            date_idx = df.index.get_loc(date)
            if date_idx + days >= len(df):
                # Target_3m 컬럼이 있으면 사용
                if 'Target_3m' in df.columns:
                    target_price = df.loc[date, 'Target_3m']
                    if not np.isnan(target_price):
                        return (target_price - price_at_cross) / price_at_cross
                return np.nan
            future_date = df.index[date_idx + days]
            future_price = df.loc[future_date, 'Close']
            return (future_price - price_at_cross) / price_at_cross
        except Exception:
            return np.nan
    
    def analyze_triangle_pattern(self, data: pd.DataFrame) -> Dict[str, float]:
        """
        삼각수렴 패턴 분석
        최근 90일 데이터를 사용하여 변동성 축소 패턴 감지
        """
        try:
            if len(data) < 90:  # 최소 90일 데이터 필요
                return {'percentage': 0.0, 'confidence': 0.5}
            
            # 최근 90일 데이터 사용
            recent_data = data.tail(90)
            prices = recent_data['Close'].values
            highs = recent_data['High'].values
            lows = recent_data['Low'].values
            
            # 변동성 계산 (표준편차)
            volatility = np.std(prices)
            price_mean = np.mean(prices)
            
            # 변동성 상대값 (변동성 대비 평균가격 비율)
            relative_volatility = volatility / price_mean if price_mean > 0 else 0
            
            # 최근 30일과 그 이전 30일의 변동성 비교
            early_volatility = np.std(prices[:30])
            recent_volatility = np.std(prices[-30:])
            
            # 변동성 축소 감지 (수렴 패턴)
            volatility_ratio = early_volatility / recent_volatility if recent_volatility > 0 else 1
            
            # 트렌드 방향 결정 (단순 이동평균 기반)
            ma30 = np.mean(prices[-30:])
            ma60 = np.mean(prices[-60:-30])
            
            # 상승 트렌드면 긍정적 예측
            trend = (ma30 - ma60) / ma60 * 100 if ma60 > 0 else 0
            
            # 변동성 축소가 감지되고 트렌드가 있으면 예측 생성
            if volatility_ratio > 1.2:  # 변동성 축소
                # 트렌드 방향을 기반으로 예측 (3개월 후)
                prediction = trend * 0.5 if abs(trend) > 1 else 0
                
                # 최소/최대 제한
                prediction = max(-5.0, min(5.0, prediction))
                
                print(f"Triangle pattern: vol_ratio={volatility_ratio:.2f}, trend={trend:.2f}%, prediction={prediction:.2f}%")
                
                return {'percentage': round(prediction, 2), 'confidence': 0.6}
            
            # 기본 예측 (약한 트렌드)
            default_prediction = trend * 0.3 if abs(trend) > 2 else 0
            return {'percentage': round(default_prediction, 2), 'confidence': 0.4}
                
        except Exception as e:
            print(f"Triangle pattern analysis error: {e}")
            import traceback
            traceback.print_exc()
            return {'percentage': 0.0, 'confidence': 0.5}
    
    def analyze_double_pattern(self, data: pd.DataFrame) -> Dict[str, float]:
        """
        더블탑/더블바텀 패턴 분석
        논문 근거: 넥라인 돌파 후 패턴 높이만큼 목표가 설정
        """
        try:
            if len(data) < 60:
                return {'percentage': 0.0, 'confidence': 0.5}
            
            window = 20
            threshold = 0.01  # 1%
            prices = data['Close'].values
            
            # 더블탑 감지
            for i in range(window, len(prices) - window):
                # 두 고점이 비슷한 가격(1% 이내)
                if abs(prices[i] - prices[i-window]) < threshold * prices[i]:
                    if prices[i] > prices[i-window//2]:  # 중간 지점보다 높음
                        neckline = min(prices[i-window:i+window])
                        expected_fall = prices[i] - neckline
                        if neckline > 0:
                            return {'percentage': -(expected_fall / neckline) * 100, 'confidence': 0.75}
            
            # 더블바텀 감지
            for i in range(window, len(prices) - window):
                # 두 저점이 비슷한 가격(1% 이내)
                if abs(prices[i] - prices[i-window]) < threshold * prices[i]:
                    if prices[i] < prices[i-window//2]:  # 중간 지점보다 낮음
                        neckline = max(prices[i-window:i+window])
                        expected_rise = neckline - prices[i]
                        if neckline > 0:
                            return {'percentage': (expected_rise / neckline) * 100, 'confidence': 0.75}
            
            return {'percentage': 0.0, 'confidence': 0.5}
            
        except Exception as e:
            print(f"Double pattern analysis error: {e}")
            return {'percentage': 0.0, 'confidence': 0.5}
    
    def analyze_head_shoulders(self, data: pd.DataFrame) -> Dict[str, float]:
        """
        헤드앤숄더 패턴 분석
        논문 근거: 넥라인 돌파 후 헤드~넥라인 간 거리만큼 이동 목표
        """
        try:
            if len(data) < 30:
                return {'percentage': 0.0, 'confidence': 0.5}
            
            prices = data['Close'].values
            
            # 5개 변곡점 기준 (어깨-머리-어깨) 검출 rule
            for i in range(4, len(prices) - 4):
                l_shoulder = prices[i-4]
                head = prices[i-2]
                r_shoulder = prices[i]
                
                # 패턴 필터: 양어깨 위치가 head 아래, 대칭성 확인
                if head > l_shoulder and head > r_shoulder:
                    if abs(l_shoulder - r_shoulder) / head < 0.1:
                        # 대칭성 비율 체크 (2.5 이내)
                        if abs((i-2)-(i)) / abs((i-2)-(i-4)) < 2.5:
                            neckline = min([prices[i-3], prices[i-1]])
                            expected_drop = head - neckline
                            
                            if neckline > 0:
                                drop_pct = (expected_drop / neckline) * 100
                                print(f"H&S pattern detected: expected drop = -{drop_pct:.2f}%")
                                # 최대 -5% 제한
                                return {'percentage': -min(abs(drop_pct), 5.0), 'confidence': 0.8}
            
            return {'percentage': 0.0, 'confidence': 0.5}
            
        except Exception as e:
            print(f"Head and shoulders analysis error: {e}")
            return {'percentage': 0.0, 'confidence': 0.5}
    
    def detect_double_top(self, highs: np.ndarray) -> bool:
        """
        더블탑 패턴 감지
        """
        if len(highs) < 20:
            return False
        
        # 최고점 찾기
        max_idx = np.argmax(highs)
        max_value = highs[max_idx]
        
        # 최고점 이전과 이후에서 비슷한 높이의 고점 찾기
        before_peaks = highs[:max_idx]
        after_peaks = highs[max_idx+1:]
        
        # 이전 고점들 중 최고점과 2% 이내인 것
        before_similar = before_peaks[before_peaks >= max_value * 0.98]
        after_similar = after_peaks[after_peaks >= max_value * 0.98]
        
        return len(before_similar) > 0 and len(after_similar) > 0
    
    def detect_double_bottom(self, lows: np.ndarray) -> bool:
        """
        더블바텀 패턴 감지
        """
        if len(lows) < 20:
            return False
        
        # 최저점 찾기
        min_idx = np.argmin(lows)
        min_value = lows[min_idx]
        
        # 최저점 이전과 이후에서 비슷한 높이의 저점 찾기
        before_bottoms = lows[:min_idx]
        after_bottoms = lows[min_idx+1:]
        
        # 이전 저점들 중 최저점과 2% 이내인 것
        before_similar = before_bottoms[before_bottoms <= min_value * 1.02]
        after_similar = after_bottoms[after_bottoms <= min_value * 1.02]
        
        return len(before_similar) > 0 and len(after_similar) > 0
    
    def detect_head_shoulders(self, highs: np.ndarray) -> bool:
        """
        헤드앤숄더 패턴 감지
        """
        if len(highs) < 30:
            return False
        
        # 최고점 찾기 (헤드)
        head_idx = np.argmax(highs)
        head_value = highs[head_idx]
        
        # 헤드 이전과 이후에서 어깨 찾기
        left_shoulder = np.max(highs[:head_idx-5]) if head_idx > 10 else 0
        right_shoulder = np.max(highs[head_idx+5:]) if head_idx < len(highs)-10 else 0
        
        # 어깨들이 비슷한 높이이고 헤드보다 낮은지 확인
        if left_shoulder > 0 and right_shoulder > 0:
            shoulder_avg = (left_shoulder + right_shoulder) / 2
            return (abs(left_shoulder - right_shoulder) / shoulder_avg < 0.05 and 
                    head_value > shoulder_avg * 1.05)
        
        return False
    
    def calculate_trend(self, values: np.ndarray) -> float:
        """
        트렌드 계산 (선형 회귀 기울기)
        """
        if len(values) < 2:
            return 0.0
        
        x = np.arange(len(values))
        slope, _, _, _, _ = stats.linregress(x, values)
        return slope
    
    def calculate_combined_prediction(self, patterns: Dict[str, Dict[str, float]]) -> Dict[str, float]:
        """
        모든 패턴의 예측을 결합하여 최종 예측 계산
        """
        total_percentage = 0.0
        total_weight = 0.0
        total_confidence = 0.0
        
        for pattern_name, pattern_data in patterns.items():
            weight = self.pattern_weights.get(pattern_name, 0.25)
            percentage = pattern_data['percentage']
            confidence = pattern_data['confidence']
            
            total_percentage += percentage * weight
            total_weight += weight
            total_confidence += confidence * weight
        
        if total_weight > 0:
            final_percentage = total_percentage / total_weight
            final_confidence = total_confidence / total_weight
        else:
            final_percentage = 0.0
            final_confidence = 0.5
        
        return {
            'percentage': round(final_percentage, 1),
            'confidence': round(final_confidence, 2)
        }
    
    def get_overall_pattern_analysis(self) -> Dict[str, Dict[str, float]]:
        """
        전체 패턴 분석 결과 반환 (고정값 제거 - 종목별로 계산)
        """
        return {
            'goldenCross': {'percentage': 0},
            'triangle': {'percentage': 0},
            'double': {'percentage': 0},
            'headShoulders': {'percentage': 0}
        }
    
    def get_mock_chart_data(self, companies: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        모의 차트 분석 데이터 생성
        """
        patterns = {
            'goldenCross': {'percentage': 2.1},
            'triangle': {'percentage': 3.4},
            'double': {'percentage': 4.2},
            'headShoulders': {'percentage': -1.6}
        }
        
        predictions = []
        for company in companies:
            symbol = company['symbol']
            
            # 랜덤 예측 생성
            direction = np.random.choice(['up', 'down'])
            percentage = np.random.uniform(1.0, 6.0) if direction == 'up' else np.random.uniform(-6.0, -1.0)
            
            predictions.append({
                'symbol': symbol,
                'direction': direction,
                'percentage': round(percentage, 1),
                'patterns': {
                    'goldenCross': round(np.random.uniform(-2, 4), 1),
                    'triangle': round(np.random.uniform(-2, 4), 1),
                    'double': round(np.random.uniform(-2, 4), 1),
                    'headShoulders': round(np.random.uniform(-2, 4), 1)
                }
            })
        
        return {
            'patterns': patterns,
            'predictions': predictions
        }

# Flask API 엔드포인트용 함수
def analyze_chart_patterns_endpoint(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Flask API 엔드포인트용 차트 패턴 분석 함수
    """
    service = ChartPatternService()
    companies = request_data.get('companies', [])
    
    return service.analyze_chart_patterns(companies)

