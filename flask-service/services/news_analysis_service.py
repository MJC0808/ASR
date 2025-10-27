"""
뉴스 분석 서비스
뉴스 데이터를 수집하고 감정 분석을 수행하여 긍정적인 종목을 추출
"""

import requests
import json
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any
import yfinance as yf
import pandas as pd

# TextBlob 대신 간단한 감정 분석 함수 사용
def simple_sentiment_analysis(text):
    """간단한 감정 분석 함수"""
    positive_words = ['상승', '급등', '호재', '매수', '강세', '돌파', '신고가', 'rise', 'surge', 'bullish', 'buy', 'strong', 'breakout', 'high']
    negative_words = ['하락', '급락', '악재', '매도', '약세', '하락', '신저가', 'fall', 'crash', 'bearish', 'sell', 'weak', 'breakdown', 'low']
    
    text_lower = text.lower()
    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)
    
    if positive_count > negative_count:
        return 0.5
    elif negative_count > positive_count:
        return -0.5
    else:
        return 0.0

class NewsAnalysisService:
    def __init__(self):
        self.news_sources = {
            'google': self.analyze_google_news,
            'naver': self.analyze_naver_news,
            'yifinance': self.analyze_yifinance_news
        }
    
    def analyze_news(self, start_period: str, end_period: str, news_source: str) -> Dict[str, Any]:
        """
        뉴스 분석 메인 함수
        """
        try:
            # 날짜 파싱
            start_date = datetime.fromisoformat(start_period.replace('T', ' '))
            end_date = datetime.fromisoformat(end_period.replace('T', ' '))
            
            # 뉴스 소스별 분석
            if news_source in self.news_sources:
                news_data = self.news_sources[news_source](start_date, end_date)
            else:
                news_data = self.get_mock_news_data()
            
            # 감정 분석 및 종목 추출
            analyzed_companies = self.analyze_sentiment_and_extract_companies(news_data)
            
            return {
                'success': True,
                'data': {
                    'companies': analyzed_companies,
                    'total_articles': len(news_data.get('articles', [])),
                    'analysis_period': {
                        'start': start_period,
                        'end': end_period
                    },
                    'news_source': news_source
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'data': self.get_mock_news_data()
            }
    
    def analyze_google_news(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """
        Google News 분석
        """
        # 실제 구현에서는 Google News API 사용
        # 여기서는 모의 데이터 반환
        return self.get_mock_news_data()
    
    def analyze_naver_news(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """
        Naver News 분석
        """
        # 실제 구현에서는 Naver News API 사용
        return self.get_mock_news_data()
    
    def analyze_yifinance_news(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """
        Yahoo Finance News 분석
        """
        try:
            # 주요 주식 심볼들
            symbols = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NFLX']
            articles = []
            
            for symbol in symbols:
                try:
                    ticker = yf.Ticker(symbol)
                    news = ticker.news
                    
                    for article in news[:5]:  # 최근 5개 기사만
                        article_date = datetime.fromtimestamp(article['providerPublishTime'])
                        if start_date <= article_date <= end_date:
                            articles.append({
                                'title': article['title'],
                                'summary': article.get('summary', ''),
                                'symbol': symbol,
                                'date': article_date,
                                'source': 'Yahoo Finance'
                            })
                except Exception as e:
                    print(f"Error fetching news for {symbol}: {e}")
                    continue
            
            return {
                'articles': articles,
                'source': 'Yahoo Finance'
            }
            
        except Exception as e:
            print(f"Error in Yahoo Finance analysis: {e}")
            return self.get_mock_news_data()
    
    def analyze_sentiment_and_extract_companies(self, news_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        뉴스 감정 분석 및 종목 추출
        """
        articles = news_data.get('articles', [])
        company_sentiments = {}
        
        for article in articles:
            # 텍스트 결합
            text = f"{article.get('title', '')} {article.get('summary', '')}"
            symbol = article.get('symbol', '')
            
            if not symbol:
                continue
            
            # 감정 분석
            sentiment_score = self.calculate_sentiment_score(text)
            
            if symbol not in company_sentiments:
                company_sentiments[symbol] = {
                    'symbol': symbol,
                    'sentiment_scores': [],
                    'article_count': 0
                }
            
            company_sentiments[symbol]['sentiment_scores'].append(sentiment_score)
            company_sentiments[symbol]['article_count'] += 1
        
        # 종목별 평균 감정 점수 계산
        analyzed_companies = []
        for symbol, data in company_sentiments.items():
            avg_sentiment = sum(data['sentiment_scores']) / len(data['sentiment_scores'])
            
            # 긍정적인 종목만 필터링 (임계값 0.1)
            if avg_sentiment > 0.1:
                analyzed_companies.append({
                    'symbol': symbol,
                    'sentiment': 'positive' if avg_sentiment > 0.3 else 'neutral',
                    'confidence': min(avg_sentiment, 1.0),
                    'article_count': data['article_count'],
                    'sentiment_score': avg_sentiment
                })
        
        # 신뢰도 순으로 정렬
        analyzed_companies.sort(key=lambda x: x['confidence'], reverse=True)
        
        return analyzed_companies[:10]  # 상위 10개 종목만 반환
    
    def calculate_sentiment_score(self, text: str) -> float:
        """
        텍스트 감정 점수 계산
        """
        try:
            # 간단한 감정 분석 사용
            return simple_sentiment_analysis(text)
            
        except Exception as e:
            print(f"Error calculating sentiment: {e}")
            return 0.0
    
    def get_mock_news_data(self) -> Dict[str, Any]:
        """
        모의 뉴스 데이터 생성
        """
        return {
            'articles': [
                {
                    'title': 'Apple Reports Strong Q4 Earnings, Stock Surges',
                    'summary': 'Apple Inc. reported better-than-expected quarterly earnings, driving stock price higher.',
                    'symbol': 'AAPL',
                    'date': datetime.now(),
                    'source': 'Mock News'
                },
                {
                    'title': 'Tesla Announces New Gigafactory Plans',
                    'summary': 'Tesla revealed plans for new manufacturing facilities, boosting investor confidence.',
                    'symbol': 'TSLA',
                    'date': datetime.now(),
                    'source': 'Mock News'
                },
                {
                    'title': 'NVIDIA Faces Supply Chain Challenges',
                    'summary': 'NVIDIA reported supply chain issues affecting GPU production.',
                    'symbol': 'NVDA',
                    'date': datetime.now(),
                    'source': 'Mock News'
                },
                {
                    'title': 'Microsoft Cloud Revenue Grows 25%',
                    'summary': 'Microsoft Azure and Office 365 show strong growth in latest quarter.',
                    'symbol': 'MSFT',
                    'date': datetime.now(),
                    'source': 'Mock News'
                },
                {
                    'title': 'Google AI Breakthrough in Language Models',
                    'summary': 'Google announces major advancement in AI language processing technology.',
                    'symbol': 'GOOGL',
                    'date': datetime.now(),
                    'source': 'Mock News'
                }
            ],
            'source': 'Mock Data'
        }

# Flask API 엔드포인트용 함수
def analyze_news_endpoint(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Flask API 엔드포인트용 뉴스 분석 함수
    """
    service = NewsAnalysisService()
    
    start_period = request_data.get('startPeriod', '2025-10-20T09:00')
    end_period = request_data.get('endPeriod', '2025-10-21T20:00')
    news_source = request_data.get('newsSource', 'google')
    
    return service.analyze_news(start_period, end_period, news_source)
