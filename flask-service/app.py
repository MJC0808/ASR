"""
TradingView Flask 애플리케이션
Yahoo Finance 데이터를 조회하고 TradingView 차트로 표시합니다.
"""
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
import pandas as pd
import logging
import yfinance as yf
from datetime import datetime
from services.yahoo_finance_service import YahooFinanceService
from utils.technical_analysis import analyze_chart as analyze
from services.news_analysis_service import analyze_news_endpoint
from services.ai_analysis_service import analyze_ai_endpoint
from services.chart_pattern_service import analyze_chart_patterns_endpoint
from services.news_rss_service import get_news_rss_endpoint
from services.portfolio_optimizer_service import optimize_portfolio_endpoint, get_available_stocks
from services.chatbot_service import chat_endpoint

# 환경 변수 로드
load_dotenv()

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Flask 앱 초기화
app = Flask(__name__)
CORS(app, origins=["http://localhost:8080", "http://127.0.0.1:8080"])  # CORS 활성화

# 설정
app.config['PORT'] = int(os.getenv('FLASK_PORT', 5000))
app.config['DEBUG'] = os.getenv('FLASK_DEBUG', 'False') == 'True'
app.config['SPRING_BOOT_URL'] = os.getenv('SPRING_BOOT_URL', 'http://localhost:8080')


@app.route('/')
def index():
    """메인 페이지 렌더링"""
    return render_template('index.html')


@app.route('/api/data/<ticker>/<interval>/<int:ema>/<int:rsi>', methods=['GET'])
def get_chart_data(ticker, interval, ema, rsi):
    """
    Yahoo Finance에서 차트 데이터를 가져옵니다.
    
    Args:
        ticker: 주식 심볼 (예: AAPL, 005930.KS)
        interval: 시간 간격 (1m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo)
        ema: EMA 기간
        rsi: RSI 기간
    
    Returns:
        JSON 응답: {
            'candlestick': 캔들스틱 데이터,
            'ema': EMA 데이터,
            'rsi': RSI 데이터,
            'ticker_info': 종목 정보
        }
    """
    try:
        logger.info(f"API Request - Ticker: {ticker}, Interval: {interval}, EMA: {ema}, RSI: {rsi}")
        
        # Yahoo Finance 데이터 조회
        data = YahooFinanceService.fetch_yahoo_data(
            ticker=ticker,
            interval=interval,
            ema_period=ema,
            rsi_period=rsi
        )
        
        # 에러가 있는 경우
        if 'error' in data and data['candlestick'] == []:
            return jsonify({
                'success': False,
                'error': data['error']
            }), 400
        
        # 정상 응답
        return jsonify({
            'success': True,
            'data': {
                'candlestick': data['candlestick'],
                'ema': data['ema'],
                'rsi': data['rsi'],
                'volume': data.get('volume', []),
                'ticker_info': data.get('ticker_info', {})
            }
        })
        
    except Exception as e:
        logger.error(f"Error in get_chart_data: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/search/<query>', methods=['GET'])
def search_ticker(query):
    """
    주식 심볼 검색 (추후 구현)
    
    Args:
        query: 검색어
    
    Returns:
        JSON 응답: 검색 결과 목록
    """
    # TODO: 주식 검색 기능 구현
    return jsonify({
        'success': True,
        'results': []
    })


@app.route('/api/analyze', methods=['POST'])
def analyze_chart():
    """
    차트 분석 엔드포인트
    
    Request Body:
        {
            'ticker': 'AAPL',
            'interval': '1d',
            'start_time': 1234567890,  # Unix timestamp
            'end_time': 1234567890,    # Unix timestamp
            'analysis_type': 'golden_dead_cross',  # or 'ma_breakthrough', 'support_resistance'
            'params': {
                'short_period': 50,
                'long_period': 200
            }
        }
    """
    try:
        data = request.get_json()
        
        ticker = data.get('ticker')
        interval = data.get('interval', '1d')
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        analysis_type = data.get('analysis_type', 'golden_dead_cross')
        params = data.get('params', {})
        
        logger.info(f"Analysis Request - Ticker: {ticker}, Type: {analysis_type}, Period: {start_time} ~ {end_time}")
        
        # 티커 정규화
        normalized_ticker = YahooFinanceService.normalize_ticker(ticker)
        
        # 데이터 조회
        stock = yf.Ticker(normalized_ticker)
        
        # 시작/종료 날짜 변환
        start_date = datetime.fromtimestamp(start_time) if start_time else None
        end_date = datetime.fromtimestamp(end_time) if end_time else None
        
        # 데이터 가져오기
        if start_date and end_date:
            df = stock.history(start=start_date, end=end_date, interval=interval)
        else:
            # 기간이 없으면 전체 데이터
            period = YahooFinanceService.INTERVAL_PERIODS.get(interval, '1y')
            df = stock.history(period=period, interval=interval)
        
        if df.empty:
            return jsonify({
                'success': False,
                'error': 'No data available for analysis'
            }), 400
        
        # 인덱스를 datetime으로 변환
        df.index = pd.to_datetime(df.index)
        
        # 분석 실행
        analysis_result = analyze(df, analysis_type, params)
        
        logger.info(f"Analysis completed - Signals: {len(analysis_result['signals'])}")
        
        return jsonify({
            'success': True,
            'data': analysis_result,
            'ticker': normalized_ticker,
            'period': {
                'start': int(df.index[0].timestamp()),
                'end': int(df.index[-1].timestamp())
            }
        })
        
    except Exception as e:
        logger.error(f"Error in analyze_chart: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """헬스 체크 엔드포인트"""
    return jsonify({
        'success': True,
        'status': 'healthy',
        'service': 'Flask TradingView Service',
        'spring_boot_url': app.config['SPRING_BOOT_URL']
    })


@app.errorhandler(404)
def not_found(error):
    """404 에러 핸들러"""
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """500 에러 핸들러"""
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500


if __name__ == '__main__':
    port = app.config['PORT']
    debug = app.config['DEBUG']
    
@app.route('/api/index-data', methods=['GET'])
def get_index_data():
    """주요 지수 데이터 조회 엔드포인트"""
    try:
        # 실제 지수 데이터 가져오기
        index_data = []
        
        # 달러환율 (USD/KRW)
        try:
            usd_krw = yf.Ticker('USDKRW=X')
            usd_krw_info = usd_krw.history(period='2d')
            if not usd_krw_info.empty:
                current_price = usd_krw_info['Close'].iloc[-1]
                prev_price = usd_krw_info['Close'].iloc[-2] if len(usd_krw_info) > 1 else current_price
                change = ((current_price - prev_price) / prev_price) * 100
                index_data.append({
                    'name': '달러환율',
                    'symbol': 'USD/KRW',
                    'value': f'{current_price:,.1f}',
                    'change': round(change, 2)
                })
        except Exception as e:
            logger.warning(f"Failed to fetch USD/KRW data: {e}")
            index_data.append({'name': '달러환율', 'symbol': 'USD/KRW', 'value': '1,419.8', 'change': 0.53})
        
        # 달러인덱스 (DXY)
        try:
            dxy = yf.Ticker('DX-Y.NYB')
            dxy_info = dxy.history(period='2d')
            if not dxy_info.empty:
                current_price = dxy_info['Close'].iloc[-1]
                prev_price = dxy_info['Close'].iloc[-2] if len(dxy_info) > 1 else current_price
                change = ((current_price - prev_price) / prev_price) * 100
                index_data.append({
                    'name': '달러인덱스',
                    'symbol': 'DXY',
                    'value': f'{current_price:.2f}',
                    'change': round(change, 2)
                })
        except Exception as e:
            logger.warning(f"Failed to fetch DXY data: {e}")
            index_data.append({'name': '달러인덱스', 'symbol': 'DXY', 'value': '103.25', 'change': -0.15})
        
        # 코스피
        try:
            kospi = yf.Ticker('^KS11')
            kospi_info = kospi.history(period='2d')
            if not kospi_info.empty:
                current_price = kospi_info['Close'].iloc[-1]
                prev_price = kospi_info['Close'].iloc[-2] if len(kospi_info) > 1 else current_price
                change = ((current_price - prev_price) / prev_price) * 100
                index_data.append({
                    'name': '코스피',
                    'symbol': '^KS11',
                    'value': f'{current_price:,.1f}',
                    'change': round(change, 2)
                })
        except Exception as e:
            logger.warning(f"Failed to fetch KOSPI data: {e}")
            index_data.append({'name': '코스피', 'symbol': '^KS11', 'value': '3,748.8', 'change': -0.53})
        
        # 코스닥
        try:
            kosdaq = yf.Ticker('^KQ11')
            kosdaq_info = kosdaq.history(period='2d')
            if not kosdaq_info.empty:
                current_price = kosdaq_info['Close'].iloc[-1]
                prev_price = kosdaq_info['Close'].iloc[-2] if len(kosdaq_info) > 1 else current_price
                change = ((current_price - prev_price) / prev_price) * 100
                index_data.append({
                    'name': '코스닥',
                    'symbol': '^KQ11',
                    'value': f'{current_price:,.1f}',
                    'change': round(change, 2)
                })
        except Exception as e:
            logger.warning(f"Failed to fetch KOSDAQ data: {e}")
            index_data.append({'name': '코스닥', 'symbol': '^KQ11', 'value': '862.8', 'change': -0.53})
        
        # S&P 500
        try:
            sp500 = yf.Ticker('^GSPC')
            sp500_info = sp500.history(period='2d')
            if not sp500_info.empty:
                current_price = sp500_info['Close'].iloc[-1]
                prev_price = sp500_info['Close'].iloc[-2] if len(sp500_info) > 1 else current_price
                change = ((current_price - prev_price) / prev_price) * 100
                index_data.append({
                    'name': 'S&P500',
                    'symbol': '^GSPC',
                    'value': f'{current_price:,.1f}',
                    'change': round(change, 2)
                })
        except Exception as e:
            logger.warning(f"Failed to fetch S&P500 data: {e}")
            index_data.append({'name': 'S&P500', 'symbol': '^GSPC', 'value': '6,629.1', 'change': 0.53})
        
        # 나스닥
        try:
            nasdaq = yf.Ticker('^IXIC')
            nasdaq_info = nasdaq.history(period='2d')
            if not nasdaq_info.empty:
                current_price = nasdaq_info['Close'].iloc[-1]
                prev_price = nasdaq_info['Close'].iloc[-2] if len(nasdaq_info) > 1 else current_price
                change = ((current_price - prev_price) / prev_price) * 100
                index_data.append({
                    'name': '나스닥',
                    'symbol': '^IXIC',
                    'value': f'{current_price:,.1f}',
                    'change': round(change, 2)
                })
        except Exception as e:
            logger.warning(f"Failed to fetch NASDAQ data: {e}")
            index_data.append({'name': '나스닥', 'symbol': '^IXIC', 'value': '22,562.5', 'change': 0.53})
        
        # VIX
        try:
            vix = yf.Ticker('^VIX')
            vix_info = vix.history(period='2d')
            if not vix_info.empty:
                current_price = vix_info['Close'].iloc[-1]
                prev_price = vix_info['Close'].iloc[-2] if len(vix_info) > 1 else current_price
                change = ((current_price - prev_price) / prev_price) * 100
                index_data.append({
                    'name': 'VIX',
                    'symbol': '^VIX',
                    'value': f'{current_price:.1f}',
                    'change': round(change, 2)
                })
        except Exception as e:
            logger.warning(f"Failed to fetch VIX data: {e}")
            index_data.append({'name': 'VIX', 'symbol': '^VIX', 'value': '25.3', 'change': -0.53})
        
        # 금 (Gold)
        try:
            gold = yf.Ticker('GC=F')
            gold_info = gold.history(period='2d')
            if not gold_info.empty:
                current_price = gold_info['Close'].iloc[-1]
                prev_price = gold_info['Close'].iloc[-2] if len(gold_info) > 1 else current_price
                change = ((current_price - prev_price) / prev_price) * 100
                index_data.append({
                    'name': '금',
                    'symbol': 'GC=F',
                    'value': f'{current_price:.1f}',
                    'change': round(change, 2)
                })
        except Exception as e:
            logger.warning(f"Failed to fetch Gold data: {e}")
            index_data.append({'name': '금', 'symbol': 'GC=F', 'value': '2,650.5', 'change': 0.25})
        
        # 은 (Silver)
        try:
            silver = yf.Ticker('SI=F')
            silver_info = silver.history(period='2d')
            if not silver_info.empty:
                current_price = silver_info['Close'].iloc[-1]
                prev_price = silver_info['Close'].iloc[-2] if len(silver_info) > 1 else current_price
                change = ((current_price - prev_price) / prev_price) * 100
                index_data.append({
                    'name': '은',
                    'symbol': 'SI=F',
                    'value': f'{current_price:.2f}',
                    'change': round(change, 2)
                })
        except Exception as e:
            logger.warning(f"Failed to fetch Silver data: {e}")
            index_data.append({'name': '은', 'symbol': 'SI=F', 'value': '32.45', 'change': -0.15})
        
        # 구리 (Copper)
        try:
            copper = yf.Ticker('HG=F')
            copper_info = copper.history(period='2d')
            if not copper_info.empty:
                current_price = copper_info['Close'].iloc[-1]
                prev_price = copper_info['Close'].iloc[-2] if len(copper_info) > 1 else current_price
                change = ((current_price - prev_price) / prev_price) * 100
                index_data.append({
                    'name': '구리',
                    'symbol': 'HG=F',
                    'value': f'{current_price:.3f}',
                    'change': round(change, 2)
                })
        except Exception as e:
            logger.warning(f"Failed to fetch Copper data: {e}")
            index_data.append({'name': '구리', 'symbol': 'HG=F', 'value': '4.850', 'change': 0.85})
        
        return jsonify({
            'success': True,
            'data': index_data
        })
        
    except Exception as e:
        logger.error(f"Error fetching index data: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/news/analyze', methods=['POST'])
def analyze_news():
    """뉴스 분석 엔드포인트"""
    try:
        data = request.get_json()
        result = analyze_news_endpoint(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in analyze_news: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ai/analyze', methods=['POST'])
def analyze_ai():
    """AI 분석 엔드포인트"""
    try:
        data = request.get_json()
        result = analyze_ai_endpoint(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in analyze_ai: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/chart/analyze-patterns', methods=['POST'])
def analyze_chart_patterns():
    """차트 패턴 분석 엔드포인트"""
    try:
        data = request.get_json()
        result = analyze_chart_patterns_endpoint(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in analyze_chart_patterns: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/news/rss', methods=['GET'])
def get_news_rss():
    """RSS 뉴스 피드 엔드포인트"""
    try:
        feed_key = request.args.get('feed', None)
        result = get_news_rss_endpoint(feed_key)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in get_news_rss: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/portfolio/available-stocks', methods=['GET'])
def get_portfolio_stocks():
    """사용 가능한 종목 리스트 반환"""
    try:
        stocks = get_available_stocks()
        return jsonify({
            'success': True,
            'stocks': stocks
        })
    except Exception as e:
        logger.error(f"Error in get_portfolio_stocks: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/portfolio/optimize', methods=['POST'])
def optimize_portfolio():
    """포트폴리오 최적화 엔드포인트"""
    try:
        data = request.get_json()
        result = optimize_portfolio_endpoint(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in optimize_portfolio: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/chatbot/chat', methods=['POST'])
def chatbot_chat():
    """AI 챗봇 엔드포인트"""
    try:
        data = request.get_json()
        result = chat_endpoint(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in chatbot_chat: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    port = app.config['PORT']
    debug = app.config['DEBUG']
    
    logger.info(f"Starting Flask TradingView Service on port {port}")
    logger.info(f"Spring Boot URL: {app.config['SPRING_BOOT_URL']}")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )

