"""
감정 분석 서비스
OpenAI API와 FinBERT 모델을 사용하여 뉴스 감정 분석을 수행
"""

import os
import json
import re
import math
import copy
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
import requests

# OpenAI 클라이언트 초기화
try:
    from openai import OpenAI
    if os.environ.get("OPENAI_API_KEY"):
        sentiment_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        print("OpenAI 클라이언트 (번역용) 설정 완료.")
    else:
        sentiment_client = None
        print("OpenAI API 키가 설정되지 않았습니다.")
except Exception as e:
    print(f"오류: OpenAI 클라이언트 초기화 실패: {e}")
    sentiment_client = None

# FinBERT 모델 로드
FINBERT_AVAILABLE = False
F = None
try:
    import torch
    import torch.nn.functional as F
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    FINBERT_AVAILABLE = True
    
    _finbert_tokenizer = None
    _finbert_model = None
    
    def load_en_finbert_model():
        global _finbert_tokenizer, _finbert_model
        if _finbert_tokenizer and _finbert_model:
            return _finbert_tokenizer, _finbert_model
            
        try:
            model_name = "ProsusAI/finbert"
            _finbert_tokenizer = AutoTokenizer.from_pretrained(model_name)
            _finbert_model = AutoModelForSequenceClassification.from_pretrained(model_name)
            print("EN-FinBERT 모델 로드 완료.")
            return _finbert_tokenizer, _finbert_model
        except Exception as e:
            print(f"오류: EN-FinBERT 모델 로딩 실패: {e}")
            return None, None
except Exception as e:
    print(f"경고: Transformers 라이브러리를 사용할 수 없습니다: {e}")
    print("OpenAI만 사용하여 감정 분석을 수행합니다.")
    
    def load_en_finbert_model():
        return None, None

class SentimentAnalysisService:
    def __init__(self):
        self.load_en_finbert_model = load_en_finbert_model
    
    def analyze_stock_sentiment(self, symbol: str, articles: List[Dict] = None) -> Dict[str, Any]:
        """
        종목별 뉴스 감정 분석
        
        Args:
            symbol: 종목 심볼
            articles: 뉴스 기사 리스트 (None이면 자동으로 뉴스 수집)
        """
        # 뉴스를 자동으로 수집
        if articles is None:
            articles = self.fetch_stock_news(symbol, max_articles=20)
        
        if not articles:
            return {
                'symbol': symbol,
                'sentiment': 'neutral',
                'sentiment_score': 0.0,
                'summary': {'total': 0, 'positive': 0, 'negative': 0, 'neutral': 0},
                'analyzed_articles': []
            }
        
        # 헤드라인 추출
        news_items = []
        print(f"[DEBUG] 수집된 뉴스: {len(articles)}개")
        
        # 첫 번째 뉴스 데이터 구조 확인
        if articles:
            print(f"[DEBUG] 첫 번째 뉴스 데이터 키: {list(articles[0].keys())}")
            print(f"[DEBUG] 첫 번째 뉴스 샘플: {articles[0]}")
        
        for i, article in enumerate(articles):
            # 여러 가능한 키 이름 시도
            headline = (article.get('headline', '') or 
                       article.get('title', '') or 
                       article.get('headline', article.get('title', '')))
            
            if not headline and i < 3:  # 처음 3개만 디버깅
                print(f"[DEBUG] article {i} 모든 키: {list(article.keys())}")
                print(f"[DEBUG] article {i} 내용: {article}")
            
            if headline:
                news_items.append({
                    'headline': headline,
                    'title': headline,
                    'summary': article.get('summary', ''),
                    'source': article.get('source', 'Unknown')
                })
        
        print(f"[DEBUG] 헤드라인 추출: {len(news_items)}개")
        
        if not news_items:
            return {
                'symbol': symbol,
                'sentiment': 'neutral',
                'sentiment_score': 0.0,
                'summary': {'total': 0, 'positive': 0, 'negative': 0, 'neutral': 0},
                'analyzed_articles': []
            }
        
        # 제공된 코드의 _analyze_sentiments_auto_detect 로직 사용
        print(f"총 {len(news_items)}개 뉴스 언어 감지 및 분리 시작 ({symbol})...")
        
        korean_indices = []
        english_indices = []
        items_for_analysis = []
        original_indices_map = {}
        
        # 언어 감지 및 분리
        for idx, item in enumerate(news_items):
            lang = self._get_headline_language(item['headline'])
            if lang == 'ko':
                korean_indices.append(idx)
            else:
                english_indices.append(idx)
                items_for_analysis.append(item)
                original_indices_map[len(items_for_analysis) - 1] = idx
        
        print(f"  -> 한국어 {len(korean_indices)}개 / 영어 {len(english_indices)}개 분리 완료.")
        
        # 한국어 뉴스 번역
        if korean_indices:
            print(f"한국어 뉴스 {len(korean_indices)}개 배치 번역 시작...")
            korean_headlines = [news_items[idx]['headline'] for idx in korean_indices]
            batch_translations = self._translate_headlines_batch_openai(korean_headlines)
            
            for j, translation in enumerate(batch_translations):
                original_idx = korean_indices[j]
                if translation:
                    analysis_item = copy.deepcopy(news_items[original_idx])
                    analysis_item['headline'] = translation
                    items_for_analysis.append(analysis_item)
                    original_indices_map[len(items_for_analysis) - 1] = original_idx
        
        print(f"[DEBUG] items_for_analysis: {len(items_for_analysis)}개")
        
        # 모든 뉴스 감정 분석
        if items_for_analysis:
            headlines = [item['headline'] for item in items_for_analysis]
            print(f"[DEBUG] 분석할 헤드라인: {len(headlines)}개")
            print(f"  -> 분석할 헤드라인 샘플 (최대 5개):")
            for i, h in enumerate(headlines[:5]):
                print(f"     {i+1}. {h[:100]}")
            analysis_results_list = self._predict_sentiment_en_finbert(headlines)
            print(f"  -> 분석 결과 샘플: {analysis_results_list[:3] if analysis_results_list else '없음'}")
        else:
            analysis_results_list = []
            print(f"[DEBUG] 분석할 뉴스가 없습니다! news_items={len(news_items)}, korean_indices={len(korean_indices) if 'korean_indices' in locals() else 'N/A'}, english_indices={len(english_indices) if 'english_indices' in locals() else 'N/A'}")
        
        # 분석 결과를 원래 인덱스에 매핑하여 종합 계산
        final_summary = {"total": len(news_items), "positive": 0, "negative": 0, "neutral": 0}
        all_gamma_scores = []
        analyzed_articles = []
        
        # 분석 결과를 원래 뉴스 아이템에 매핑
        sentiment_map = {}
        for i, result in enumerate(analysis_results_list):
            if i in original_indices_map:
                original_idx = original_indices_map[i]
                sentiment_map[original_idx] = result
        
        # 각 뉴스 아이템에 감정 분석 결과 적용
        for i in range(len(news_items)):
            res = sentiment_map.get(i, {'sentiment': 'neutral', 'confidence': 0.5})
            senti = res.get('sentiment', 'neutral').lower()
            
            analysis_item = {
                **news_items[i],
                'sentiment': senti,
                'confidence': res.get('confidence', 0.5)
            }
            analyzed_articles.append(analysis_item)
            
            if senti == 'positive': 
                all_gamma_scores.append(1)
                final_summary['positive'] += 1
            elif senti == 'negative': 
                all_gamma_scores.append(-1)
                final_summary['negative'] += 1
            else: 
                all_gamma_scores.append(0)
                final_summary['neutral'] += 1
        
        gamma_scores = all_gamma_scores
        counts = final_summary
        
        # 최종 감성 점수 계산 (평균 감성)
        score = sum(gamma_scores) / len(gamma_scores) if gamma_scores else 0
        
        return {
            'symbol': symbol,
            'sentiment': self._determine_sentiment(score),
            'sentiment_score': score,
            'summary': {'total': len(articles), **counts},
            'analyzed_articles': analyzed_articles
        }
    
    def _determine_sentiment(self, score: float) -> str:
        """감정 점수에 따라 감정 결정"""
        if score > 0.1:
            return 'positive'
        elif score < -0.1:
            return 'negative'
        else:
            return 'neutral'
    
    def _predict_sentiment_en_finbert(self, headlines: List[str]) -> List[Dict]:
        """FinBERT 모델을 사용한 감정 예측"""
        tokenizer, model = self.load_en_finbert_model()
        
        if not tokenizer or not model:
            print("경고: EN-FinBERT 모델 없음, 간단한 키워드 분석 사용")
            return self._predict_sentiment_openai(headlines)
        
        id2label = {0: "positive", 1: "negative", 2: "neutral"}
        results = []
        
        try:
            import torch
            inputs = tokenizer(headlines, padding=True, truncation=True, return_tensors="pt", max_length=512)
            with torch.no_grad(): 
                outputs = model(**inputs)
            probs = F.softmax(outputs.logits, dim=1)
            preds = torch.argmax(probs, dim=1)
            
            for i in range(len(headlines)):
                pred_id = preds[i].item()
                results.append({
                    'sentiment': id2label[pred_id], 
                    'confidence': probs[i][pred_id].item()
                })
            print(f"EN-FinBERT 예측 완료 ({len(headlines)}개)")
        except Exception as e:
            print(f"오류: EN-FinBERT 예측 오류: {e}")
            results = self._predict_sentiment_openai(headlines)
        
        return results
    
    def _predict_sentiment_openai(self, headlines: List[str]) -> List[Dict]:
        """OpenAI를 사용한 간단한 감정 분석"""
        if not sentiment_client:
            print("OpenAI 클라이언트 없음, 중립 반환")
            return [{'sentiment': 'neutral', 'confidence': 0.5}] * len(headlines)
        
        results = []
        try:
            # 간단한 감정 키워드 기반 분석
            positive_words = ['rise', 'surge', 'gain', 'bullish', 'strong', 'growth', 'up', 'profit', 'beat', 'exceed', 'record', 'high', 'positive', 'earnings', 'revenue']
            negative_words = ['fall', 'drop', 'decline', 'bearish', 'weak', 'loss', 'miss', 'down', 'concern', 'risk', 'worry', 'crash', 'low', 'negative', 'decrease']
            
            pos_count = 0
            neg_count = 0
            neut_count = 0
            
            for headline in headlines:
                text_lower = headline.lower()
                positive_count = sum(1 for word in positive_words if word in text_lower)
                negative_count = sum(1 for word in negative_words if word in text_lower)
                
                if positive_count > negative_count:
                    results.append({'sentiment': 'positive', 'confidence': 0.7})
                    pos_count += 1
                elif negative_count > positive_count:
                    results.append({'sentiment': 'negative', 'confidence': 0.7})
                    neg_count += 1
                else:
                    results.append({'sentiment': 'neutral', 'confidence': 0.5})
                    neut_count += 1
            
            print(f"키워드 분석 완료: 긍정 {pos_count}개, 부정 {neg_count}개, 중립 {neut_count}개")
        except Exception as e:
            print(f"OpenAI 감정 분석 오류: {e}")
            results = [{'sentiment': 'neutral', 'confidence': 0.5}] * len(headlines)
        
        return results
    
    def _translate_headlines_batch_openai(self, headlines_ko: List[str]) -> List[str]:
        """OpenAI를 사용하여 한국어 헤드라인을 영어로 번역"""
        if not sentiment_client:
            print("OpenAI 클라이언트 없음. 번역 생략.")
            return headlines_ko
        
        numbered_headlines = "\n".join([f"{i+1}. {h}" for i, h in enumerate(headlines_ko)])
        system_prompt = "You are a helpful assistant who translates Korean news headlines into English."
        user_prompt = f"""Translate the following numbered Korean headlines into English.
Return the results ONLY as a JSON object containing a single key "translations" which holds a list of strings. Each string in the list must be the English translation corresponding to the numbered headline.
Example JSON structure: {{"translations": ["translation 1", "translation 2", ...]}}

Korean Headlines:
{numbered_headlines}

JSON Result:"""
        
        try:
            response = sentiment_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt}, 
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=len(headlines_ko) * 70,
                temperature=0.0,
                response_format={"type": "json_object"}
            )
            
            result_text = response.choices[0].message.content.strip()
            result_json = json.loads(result_text)
            translations = result_json.get("translations", [])
            
            if isinstance(translations, list) and len(translations) == len(headlines_ko):
                cleaned = [t.strip().strip('"').strip("'") if isinstance(t, str) else h for t, h in zip(translations, headlines_ko)]
                print(f"배치 번역 성공 ({len(headlines_ko)}개)")
                return cleaned
            else:
                print(f"배치 번역 결과 형식/개수 오류...")
                return headlines_ko
        except Exception as e:
            print(f"OpenAI 배치 번역 오류: {e}")
            return headlines_ko
    
    def _get_headline_language(self, headline: str) -> str:
        """헤드라인 언어 감지"""
        if not headline:
            return 'en'
        if re.search("[ㄱ-ㅎㅏ-ㅣ가-힣]", headline):
            return 'ko'
        return 'en'
    
    def fetch_stock_news(self, symbol: str, max_articles: int = 20) -> List[Dict]:
        """
        종목별 최신 뉴스 수집 (Naver, Yahoo)
        각각 10개씩 수집
        """
        all_articles = []
        
        # Yahoo Finance 뉴스 (10개)
        yahoo_articles = self._fetch_yahoo_news(symbol, max_articles=10)
        all_articles.extend(yahoo_articles)
        
        # Naver 뉴스 (10개) - 현재는 빈 리스트 반환
        naver_articles = self._fetch_naver_news(symbol, max_articles=10)
        all_articles.extend(naver_articles)
        
        print(f"{symbol} 뉴스 수집: Yahoo {len(yahoo_articles)}개, Naver {len(naver_articles)}개")
        
        return all_articles[:max_articles]
    
    def _fetch_yahoo_news(self, symbol: str, max_articles: int = 10) -> List[Dict]:
        """Yahoo Finance 뉴스 수집"""
        articles = []
        try:
            import yfinance as yf
            ticker = yf.Ticker(symbol)
            news = ticker.news
            
            if news and len(news) > 0:
                # 첫 번째 뉴스의 실제 구조 확인
                print(f"[DEBUG] {symbol} 첫 번째 뉴스 원본 키: {list(news[0].keys())}")
                print(f"[DEBUG] {symbol} 첫 번째 뉴스 원본: {news[0]}")
            
            for article in news[:max_articles]:
                # content 키에서 데이터 추출
                content = article.get('content', {})
                title = content.get('title', '')
                summary = content.get('summary', '')
                pub_date = content.get('pubDate', 0) or article.get('providerPublishTime', 0)
                
                if title:  # 제목이 있을 때만 추가
                    articles.append({
                        'headline': title,
                        'title': title,
                        'summary': summary,
                        'source': 'Yahoo Finance',
                        'published_date': pub_date
                    })
        except Exception as e:
            print(f"Yahoo 뉴스 수집 오류 ({symbol}): {e}")
        
        return articles
    
    def _fetch_naver_news(self, symbol: str, max_articles: int = 10) -> List[Dict]:
        """Naver 뉴스 수집 (모의 데이터)"""
        articles = []
        try:
            # 실제 구현 시 Naver Search API를 사용해야 함
            # 현재는 Yahoo 뉴스로 대체
            search_query = self._get_korean_company_name(symbol)
            print(f"Naver 뉴스 검색: {search_query} (실제 구현 필요)")
            
            # 임시로 Yahoo와 비슷한 형태의 빈 데이터 반환
            # 실제로는 Naver News API를 통해 한국어 뉴스를 가져와야 함
        except Exception as e:
            print(f"Naver 뉴스 수집 오류 ({symbol}): {e}")
        
        return articles
    
    def _get_korean_company_name(self, symbol: str) -> str:
        """티커를 한국어 종목명으로 변환"""
        company_map = {
            'AAPL': 'Apple', 'MSFT': '마이크로소프트', 'GOOGL': '구글',
            'TSLA': '테슬라', 'NVDA': '엔비디아', 'AMZN': '아마존'
        }
        return company_map.get(symbol, symbol)

# Flask API 엔드포인트용 함수
def analyze_stock_sentiments_endpoint(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Flask API 엔드포인트용 감정 분석 함수
    """
    service = SentimentAnalysisService()
    
    companies = request_data.get('companies', [])
    results = []
    
    print(f"감정 분석 시작: {len(companies)}개 종목")
    
    for i, company in enumerate(companies):
        symbol = company.get('symbol', '')
        if not symbol:
            continue
        
        print(f"[{i+1}/{len(companies)}] {symbol} 감정 분석 중...")
        
        try:
            # 감정 분석 (자동으로 뉴스 수집 + 분석)
            sentiment_result = service.analyze_stock_sentiment(symbol)
            results.append(sentiment_result)
            print(f"  -> {symbol} 완료: {sentiment_result['sentiment']} ({sentiment_result['sentiment_score']:.2f})")
        except Exception as e:
            print(f"  -> {symbol} 오류: {e}")
            results.append({
                'symbol': symbol,
                'sentiment': 'neutral',
                'sentiment_score': 0.0,
                'summary': {'total': 0, 'positive': 0, 'negative': 0, 'neutral': 0},
                'analyzed_articles': []
            })
    
    print(f"감정 분석 완료: {len(results)}개 결과")
    
    return {
        'success': True,
        'data': results
    }

