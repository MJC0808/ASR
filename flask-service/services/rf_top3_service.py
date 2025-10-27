"""
RF Top 3 예측 서비스
Random Forest 모델을 사용한 주가 방향 및 가격 예측
"""
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split
import traceback


def predict_rf_top3(companies):
    """
    여러 종목의 RF 예측을 수행
    
    Args:
        companies: 종목 리스트 [{'symbol': '005930.KS', 'name': '삼성전자'}, ...]
    
    Returns:
        예측 결과 리스트
    """
    predictions = []
    
    for company in companies:
        try:
            symbol = company.get('symbol', '')
            name = company.get('name', symbol)
            
            # RF 예측 수행
            result = predict_stock_price(symbol)
            if result:
                result['name'] = name
                result['symbol'] = symbol
                predictions.append(result)
        except Exception as e:
            print(f"[RF 예측 오류] {symbol}: {e}")
            traceback.print_exc()
    
    # 모든 예측 결과 반환
    predictions.sort(key=lambda x: x.get('confidence', 0), reverse=True)
    
    print(f"[RF Top 3] {len(predictions)}개 종목 예측 완료")
    
    return predictions


def predict_stock_price(symbol: str):
    """
    개별 종목의 주가 방향 및 가격을 예측합니다.
    
    Args:
        symbol: 종목 심볼 (예: '005930.KS', 'AAPL')
    
    Returns:
        {
            'direction': 0 or 1,  # 0: 하락, 1: 상승
            'current_price': float,
            'predicted_price': float,
            'change_percent': float,
            'confidence': float,  # 0.0~1.0
            'prediction': str  # '상승' or '하락'
        }
    """
    try:
        # 1년 데이터 로드
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365)
        
        ticker = yf.Ticker(symbol)
        data = ticker.history(start=start_date, end=end_date)
        
        if data.empty or len(data) < 60:
            print(f"[{symbol}] 데이터 부족")
            return None
        
        # 데이터 전처리
        df = data.copy()
        df['Returns'] = df['Close'].pct_change()
        df['SMA_5'] = df['Close'].rolling(window=5).mean()
        df['SMA_20'] = df['Close'].rolling(window=20).mean()
        df['Volatility'] = df['Returns'].rolling(window=5).std()
        df['RSI'] = calculate_rsi(df['Close'], 14)
        
        df = df.dropna()
        
        if len(df) < 30:
            print(f"[{symbol}] 전처리 후 데이터 부족")
            return None
        
        # 타겟 설정
        df['Target_Direction'] = (df['Close'].shift(-1) > df['Close']).astype(int)
        df['Target_Price'] = df['Close'].shift(-1)
        df = df.dropna()
        
        # 피처 선택
        features = ['Close', 'SMA_5', 'SMA_20', 'Volatility', 'RSI', 'Volume']
        X = df[features].values
        y_direction = df['Target_Direction'].values
        y_price = df['Target_Price'].values
        
        if len(X) < 20:
            print(f"[{symbol}] 학습 데이터 부족")
            return None
        
        # 학습 데이터 분할
        train_size = max(20, int(len(X) * 0.8))
        X_train, X_test = X[:train_size], X[train_size:]
        y_dir_train, y_dir_test = y_direction[:train_size], y_direction[train_size:]
        y_price_train, y_price_test = y_price[:train_size], y_price[train_size:]
        
        # 방향 예측 (Classification)
        cls_model = RandomForestClassifier(n_estimators=50, random_state=42, max_depth=10)
        cls_model.fit(X_train, y_dir_train)
        
        # 현재 시점 예측
        latest_features = X[-1].reshape(1, -1)
        direction_pred = cls_model.predict(latest_features)[0]
        direction_proba = cls_model.predict_proba(latest_features)[0]
        confidence = max(direction_proba)
        
        # 가격 예측 (Regression)
        reg_model = RandomForestRegressor(n_estimators=50, random_state=42, max_depth=10)
        reg_model.fit(X_train, y_price_train)
        predicted_price = reg_model.predict(latest_features)[0]
        
        current_price = df['Close'].iloc[-1]
        
        # 비현실적 예측 방지
        price_range = current_price * 0.1  # ±10% 범위
        predicted_price = max(min(predicted_price, current_price + price_range), 
                              current_price - price_range)
        
        change_percent = ((predicted_price - current_price) / current_price) * 100
        
        result = {
            'direction': int(direction_pred),
            'current_price': float(current_price),
            'predicted_price': float(predicted_price),
            'change_percent': float(change_percent),
            'confidence': float(confidence),
            'prediction': '상승' if direction_pred == 1 else '하락'
        }
        
        print(f"[{symbol}] 예측 완료: {result['prediction']} ({result['change_percent']:.2f}%)")
        
        return result
        
    except Exception as e:
        print(f"[{symbol}] 예측 오류: {e}")
        traceback.print_exc()
        return None


def calculate_rsi(prices, period=14):
    """
    RSI (Relative Strength Index) 계산
    """
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    
    return rsi


# Flask 엔드포인트 함수
def analyze_rf_top3_endpoint(data):
    """
    Flask API 엔드포인트용 함수
    
    Args:
        data: {'companies': [...]}
    
    Returns:
        {'success': True, 'data': [...]}
    """
    try:
        companies = data.get('companies', [])
        
        if not companies:
            return {
                'success': False,
                'error': '종목 리스트가 비어있습니다.'
            }
        
        predictions = predict_rf_top3(companies)
        
        return {
            'success': True,
            'data': predictions
        }
        
    except Exception as e:
        print(f"[RF Top 3 오류]: {e}")
        traceback.print_exc()
        return {
            'success': False,
            'error': str(e)
        }

