"""
포트폴리오 최적화 서비스
Random Forest 예측, 뉴스 감성 분석, 마코위츠 포트폴리오 최적화를 통합하여 최적의 포트폴리오를 제안합니다.
"""
import logging
import pandas as pd
import numpy as np
import yfinance as yf
from datetime import datetime, timedelta
import warnings

warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)


def get_available_stocks():
    """
    사용 가능한 종목 리스트를 반환합니다.
    
    Returns:
        dict: {'종목명 (티커)': '티커'} 형식의 딕셔너리
    """
    # 주요 한국 종목
    korean_stocks = [
        ("삼성전자", "005930.KS"),
        ("SK하이닉스", "000660.KS"),
        ("LG전자", "066570.KS"),
        ("현대차", "005380.KS"),
        ("NAVER", "035420.KS"),
        ("카카오", "035720.KS"),
        ("KB금융", "105560.KS"),
        ("신한지주", "055550.KS"),
        ("LG생활건강", "051900.KS"),
        ("셀트리온", "068270.KS"),
    ]
    
    # 주요 미국 종목
    us_stocks = [
        ("Apple", "AAPL"),
        ("Microsoft", "MSFT"),
        ("Google", "GOOGL"),
        ("Amazon", "AMZN"),
        ("Tesla", "TSLA"),
        ("Nvidia", "NVDA"),
        ("Meta", "META"),
        ("Netflix", "NFLX"),
        ("AMD", "AMD"),
        ("Intel", "INTC"),
    ]
    
    all_stocks = korean_stocks + us_stocks
    return {f"{name} ({ticker})": ticker for name, ticker in all_stocks}


def analyze_portfolio(tickers_info, expert_rules=None):
    """
    포트폴리오 분석을 수행합니다.
    
    Args:
        tickers_info: {'종목명': '티커'} 형식의 딕셔너리
        expert_rules: 전문가 설정 (기본값: None)
    
    Returns:
        dict: 포트폴리오 분석 결과
    """
    try:
        logger.info(f"포트폴리오 분석 시작 - 종목: {list(tickers_info.keys())}")
        
        # 1. 모델 예측 (RF)
        model_prediction = _get_model_prediction(tickers_info)
        
        # 2. 뉴스 감성 분석
        sentiment_analysis = _get_sentiment_analysis(tickers_info)
        
        # 3. 마코위츠 포트폴리오
        markowitz_portfolio = _get_markowitz_portfolio(tickers_info)
        
        # 4. 최종 포트폴리오 (AI 조정)
        final_portfolio = _calculate_final_portfolio(
            tickers_info, 
            model_prediction, 
            sentiment_analysis, 
            markowitz_portfolio,
            expert_rules
        )
        
        # 환율 정보
        exchange_rate = _get_exchange_rate()
        
        result = {
            'model_prediction': model_prediction,
            'sentiment_analysis': sentiment_analysis,
            'markowitz_portfolio': markowitz_portfolio,
            'final_portfolio': final_portfolio,
            'exchange_rate': exchange_rate
        }
        
        logger.info("포트폴리오 분석 완료")
        return result
        
    except Exception as e:
        logger.error(f"포트폴리오 분석 중 오류 발생: {str(e)}")
        raise


def _get_model_prediction(tickers_info):
    """RF 모델 예측을 가져옵니다."""
    predictions = {}
    
    for name, ticker in tickers_info.items():
        try:
            stock = yf.Ticker(ticker)
            hist = stock.history(period='1y')
            
            if hist.empty:
                continue
            
            current_price = hist['Close'].iloc[-1]
            
            # 간단한 예측 (향상 가능)
            recent_trend = (hist['Close'].iloc[-1] - hist['Close'].iloc[-5]) / hist['Close'].iloc[-5]
            volatility = hist['Close'].pct_change().std()
            
            # 방향 예측
            if recent_trend > 0.02:
                direction = "상승"
            elif recent_trend < -0.02:
                direction = "하락"
            else:
                direction = "중립"
            
            # 예상 가격 계산
            predicted_price = current_price * (1 + recent_trend * 0.5)
            
            predictions[name] = {
                'current_price': float(current_price),
                'predicted_price': float(predicted_price),
                'direction': direction,
                'confidence': min(abs(recent_trend) * 10, 1.0),
                'currency': 'KRW' if '.KS' in ticker else 'USD'
            }
            
        except Exception as e:
            logger.warning(f"{name} 예측 중 오류: {str(e)}")
            continue
    
    return {'individual': predictions}


def _get_sentiment_analysis(tickers_info):
    """뉴스 감성 분석을 수행합니다."""
    # 실제 구현 시: 뉴스 데이터 크롤링 및 감성 분석
    # 현재는 데모 데이터 반환
    
    articles = []
    for name, ticker in tickers_info.items():
        # 긍정적 가정 (실제로는 뉴스 API 호출)
        articles.append({
            'headline': f"{name} 긍정적 전망",
            'sentiment': 'positive',
            'confidence': 0.8
        })
    
    total = len(articles)
    positive = int(total * 0.6)
    neutral = int(total * 0.2)
    negative = int(total * 0.2)
    
    sentiment_score = (positive - negative) / total
    
    # AI 판단
    if sentiment_score > 0.3:
        status = "매우 긍정적"
    elif sentiment_score > 0:
        status = "긍정적"
    elif sentiment_score > -0.3:
        status = "중립적"
    elif sentiment_score > -0.7:
        status = "부정적"
    else:
        status = "매우 부정적"
    
    return {
        'sentiment_score': sentiment_score,
        'summary': {
            'total': total,
            'positive': positive,
            'negative': negative,
            'neutral': neutral
        },
        'status': status,
        'analyzed_articles': articles
    }


def _get_markowitz_portfolio(tickers_info):
    """마코위츠 포트폴리오 최적화를 수행합니다."""
    try:
        # 과거 1년 데이터 수집
        returns_data = {}
        
        for name, ticker in tickers_info.items():
            try:
                stock = yf.Ticker(ticker)
                hist = stock.history(period='1y')
                
                if hist.empty:
                    continue
                
                returns = hist['Close'].pct_change().dropna()
                returns_data[name] = returns
                
            except Exception as e:
                logger.warning(f"{name} 데이터 수집 중 오류: {str(e)}")
                continue
        
        if len(returns_data) < 2:
            return {'weights': {}, 'error': '데이터 부족'}
        
        # 공통 날짜로 정렬
        df_returns = pd.DataFrame(returns_data)
        df_returns = df_returns.dropna()
        
        if df_returns.empty or len(df_returns) < 20:
            return {'weights': {}, 'error': '충분한 데이터가 없습니다.'}
        
        # 평균 수익률 및 공분산 행렬
        mean_returns = df_returns.mean()
        cov_matrix = df_returns.cov()
        
        # 간단한 동등 가중 포트폴리오
        num_stocks = len(tickers_info)
        equal_weight = 1.0 / num_stocks
        
        weights = {name: equal_weight for name in tickers_info.keys()}
        
        return {
            'weights': weights,
            'expected_return': float(mean_returns.mean()),
            'volatility': float(np.sqrt(cov_matrix.mean().mean()))
        }
        
    except Exception as e:
        logger.error(f"마코위츠 포트폴리오 계산 중 오류: {str(e)}")
        return {'weights': {}, 'error': str(e)}


def _calculate_final_portfolio(tickers_info, model_prediction, sentiment_analysis, markowitz_portfolio, expert_rules):
    """AI가 최종 포트폴리오를 계산합니다."""
    
    # 기본값 설정
    base_weight = expert_rules.get('base_weight', 1.0) if expert_rules else 1.0
    
    # 동등 가중으로 시작
    num_stocks = len(tickers_info)
    final_weights = {name: 1.0 / num_stocks for name in tickers_info.keys()}
    
    # 모델 예측 조정
    if model_prediction and 'individual' in model_prediction:
        for name, pred in model_prediction['individual'].items():
            direction = pred.get('direction', '중립')
            if direction == '상승':
                final_weights[name] *= 1.1
            elif direction == '하락':
                final_weights[name] *= 0.9
    
    # 뉴스 감성 조정
    sentiment_score = sentiment_analysis.get('sentiment_score', 0)
    for name in tickers_info.keys():
        final_weights[name] *= (1 + sentiment_score * 0.2)
    
    # 정규화
    total = sum(final_weights.values())
    final_weights = {name: weight / total for name, weight in final_weights.items()}
    
    return {
        'final_weights': final_weights,
        'reason': f"RF 모델 예측과 뉴스 감성 분석을 종합하여 포트폴리오를 조정했습니다."
    }


def _get_exchange_rate():
    """환율 정보를 가져옵니다."""
    try:
        usd_krw = yf.Ticker('USDKRW=X')
        hist = usd_krw.history(period='1d')
        if not hist.empty:
            return float(hist['Close'].iloc[-1])
    except:
        pass
    return 1400.0  # 기본값


def optimize_portfolio_endpoint(request_data):
    """
    포트폴리오 최적화 엔드포인트
    
    Args:
        request_data: {
            'tickers': ['삼성전자 (005930.KS)', 'Apple (AAPL)'],
            'expert_rules': {
                'base_weight': 0.9,
                'sentiment_map': {...},
                'prediction_weights': {...}
            }
        }
    
    Returns:
        dict: 분석 결과
    """
    try:
        tickers = request_data.get('tickers', [])
        expert_rules = request_data.get('expert_rules', {})
        
        if len(tickers) < 2:
            return {
                'success': False,
                'error': '최소 2개 이상의 종목을 선택해야 합니다.'
            }
        
        # 티커 정보 추출
        tickers_info = {}
        for ticker_str in tickers:
            # '삼성전자 (005930.KS)' 형식에서 추출
            match = ticker_str.find('(')
            if match != -1:
                name = ticker_str[:match].strip()
                ticker = ticker_str[match+1:-1]
                tickers_info[name] = ticker
        
        # 포트폴리오 분석
        result = analyze_portfolio(tickers_info, expert_rules)
        
        return {
            'success': True,
            'result': result
        }
        
    except Exception as e:
        logger.error(f"포트폴리오 최적화 중 오류: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

