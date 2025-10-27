import feedparser
import logging
import requests
import urllib.request
from bs4 import BeautifulSoup
from urllib.parse import urljoin, quote
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

# RSS 피드 URL 매핑
RSS_FEEDS = {
    'hankyung': 'https://www.hankyung.com/feed/finance',
    'mk': 'https://www.mk.co.kr/rss/50200011/',
    'nasdaq': 'https://www.nasdaq.com/feed/rssoutbound?category=US',
    'marketbeat': 'https://www.marketbeat.com/feed/'
}

# 공통 헤더
COMMON_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

# KST 시간대
KST = timezone(timedelta(hours=9))

def _crawl_article_content(url):
    """
    뉴스 기사 본문을 크롤링합니다.
    
    Args:
        url: 뉴스 기사 URL
    
    Returns:
        str: 기사 본문 텍스트
    """
    if not url or url == '#':
        return ''
    
    try:
        # 타임아웃 5초로 제한
        response = requests.get(url, headers=COMMON_HEADERS, timeout=5)
        response.raise_for_status()
        
        # 인코딩 설정
        if 'naver.com' in url:
            response.encoding = 'EUC-KR'
        elif 'mk.co.kr' in url or 'hankyung.com' in url:
            response.encoding = 'UTF-8'
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        # 본문 선택자 (웹사이트별)
        content_selectors = [
            '#articleBodyContents',  # 네이버
            '#viewContent',  # 네이버
            '.article_body',  # 한국경제
            '#newsEndContents',  # 네이버
            'article.article',
            'div.article-body',
            '.article-content',
            'p'  # 모든 p 태그
        ]
        
        content = ''
        for selector in content_selectors:
            elements = soup.select(selector)
            if elements:
                # 첫 번째 요소의 텍스트 추출
                content = elements[0].get_text(strip=True)
                if len(content) > 100:  # 충분한 길이의 본문
                    break
        
        # 스크립트, 스타일 태그 제거
        for script in soup(["script", "style", "meta", "link"]):
            script.decompose()
        
        # 본문이 없으면 전체 텍스트 추출
        if not content or len(content) < 100:
            content = soup.get_text(strip=True)
        
        # 본문 길이 제한 (10000자)
        return content[:10000] if content else ''
        
    except Exception as e:
        logger.warning(f"본문 크롤링 실패 ({url[:80]}): {str(e)[:100]}")
        return ''

def _crawl_naver_news(limit=20):
    """
    네이버 금융 '실시간 속보' 뉴스를 크롤링
    여러 URL에서 뉴스를 수집하고 필터링하여 실제 뉴스만 추출
    """
    news_items = []
    base_url = "https://finance.naver.com"
    
    # 여러 네이버 금융 뉴스 URL 시도
    urls_to_try = [
        "https://finance.naver.com/news/news_list.naver?mode=LSS2D&section_id=101&section_id2=258",  # 실시간 속보
        "https://finance.naver.com/news/news_list.naver?mode=LSS2D&section_id=101",  # 기업/시장
        "https://finance.naver.com/news/news_list.naver?mode=LSS2D&section_id=102",  # 경제 일반
    ]

    logger.info(f"네이버 금융 뉴스 크롤링 시작...")

    for url in urls_to_try:
        try:
            logger.info(f"  시도 중: {url}")
            response = requests.get(url, headers=COMMON_HEADERS, timeout=10)
            response.raise_for_status()
            response.encoding = 'EUC-KR'
            html_content = response.text
            soup = BeautifulSoup(html_content, 'lxml')

            # 네이버 금융 페이지에서 직접 뉴스 링크 찾기
            # 모든 a 태그를 찾되, 실제 뉴스 기사 링크만 필터링
            all_links = soup.select('a[href]')
            logger.info(f"  -> 전체 링크 수: {len(all_links)}")
            
            for link in all_links:
                href = link.get('href', '')
                title = link.get('title', '').strip()
                if not title:
                    title = link.get_text(strip=True).strip()
                
                # 필터링 조건
                if not href or not title or len(title) < 10:
                    continue
                
                # 무의미한 링크 제외
                skip_keywords = ['javascript:', '#', 'mailto:', 'void(0)', 'location=']
                if any(skip in href.lower() for skip in skip_keywords):
                    continue
                
                # 실제 뉴스 기사 링크인지 확인
                # 네이버 금융 뉴스 링크 패턴: /news/, /article/, articleRead 등
                is_news_link = any(keyword in href for keyword in [
                    '/news/', 
                    '/article/', 
                    'articleRead',
                    'news_read',
                    'fnews'
                ])
                
                # 또는 제목에 뉴스 관련 키워드가 있는 경우
                news_keywords = ['뉴스', '기업', '시장', '경제', '증권', '주식', '실적', '매출', '공시', '투자']
                has_news_keyword = any(keyword in title for keyword in news_keywords)
                
                if is_news_link or has_news_keyword:
                    # 상대 경로를 절대 경로로 변환
                    if not href.startswith('http'):
                        if href.startswith('/'):
                            href = f"https://finance.naver.com{href}"
                        else:
                            href = urljoin(base_url, href)
                    
                    # 중복 제거
                    if not any(existing['link'] == href or existing['headline'] == title for existing in news_items):
                        news_items.append({
                            "headline": title[:200],
                            "link": href,
                            "source": "Naver Finance",
                            "image_url": "",
                            "pub_date": datetime.now(timezone.utc),
                            "content": ""  # 본문 필드 추가
                        })
                        
                        logger.info(f"    추가: {title[:50]}... (링크: {href[:80]})")
                        
                        if len(news_items) >= limit:
                            break
            
            logger.info(f"  -> 현재까지 {len(news_items)}개 뉴스 수집")
            
            # 충분한 뉴스를 수집했으면 중단
            if len(news_items) >= limit:
                break
                
        except Exception as e:
            logger.warning(f"  URL {url} 크롤링 중 오류: {e}")
            continue

    logger.info(f"네이버 금융 크롤링 완료. 총 {len(news_items)}개 수집.")
    return news_items[:limit] if news_items else []

def _parse_google_item(item):
    """Google RSS item을 파싱하여 딕셔너리로 반환"""
    title = item.title.get_text(strip=True) if item.title else "제목 없음"
    link = item.link.get_text(strip=True) if item.link else ""
    
    # Google News RSS는 source 태그를 사용하지 않을 수 있음
    source_tag = item.find('source')
    source = source_tag.get_text(strip=True) if source_tag else "Google News"
    
    # 날짜 파싱
    pub_date_str = ""
    pub_date_tag = item.find('pubDate')
    if pub_date_tag:
        date_str = pub_date_tag.get_text(strip=True)
        try:
            # Google RSS는 RFC 822 형식 (예: "Mon, 27 Oct 2025 13:00:00 GMT")
            pub_date_utc = datetime.strptime(date_str, '%a, %d %b %Y %H:%M:%S %Z')
            # GMT는 UTC와 동일하므로 timezone.utc로 설정
            pub_date_utc = pub_date_utc.replace(tzinfo=timezone.utc)
            pub_date_str = pub_date_utc.isoformat()
        except ValueError:
            logger.warning(f"구글 시간 파싱 오류: {date_str}")
            pub_date_str = datetime.now(timezone.utc).isoformat()
    else:
        pub_date_str = datetime.now(timezone.utc).isoformat()
    
    return {
        "title": title,
        "link": link,
        "summary": title,  # 제목을 요약으로 사용
        "source": source,
        "published": pub_date_str
    }

def _crawl_google_news(limit=20):
    """
    Google News RSS를 크롤링
    """
    news_items = []
    url = "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=ko&gl=KR&ceid=KR:ko"
    
    logger.info(f"구글 뉴스 크롤링 시작 (URL: {url})...")
    
    try:
        response = requests.get(url, headers=COMMON_HEADERS, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'xml')
        items = soup.find_all('item')
        
        logger.info(f"  -> {len(items)}개의 뉴스 아이템 후보 찾음.")
        
        for item in items[:limit]:
            news_items.append(_parse_google_item(item))
            
    except Exception as e:
        logger.error(f"구글 뉴스 크롤링 중 오류 발생: {e}")
    
    logger.info(f"구글 뉴스 크롤링 완료. 총 {len(news_items)}개 수집.")
    return news_items

def _crawl_yahoo_news(limit=20):
    """
    Yahoo Finance RSS를 크롤링
    """
    news_items = []
    # 대체 RSS URL 시도
    urls = [
        "https://feeds.finance.yahoo.com/rss/2.0/headline",
        "https://finance.yahoo.com/rss/",
        "https://finance.yahoo.com/rss/headline"
    ]
    
    url = urls[0]
    logger.info(f"Yahoo Finance 크롤링 시작 (URL: {url})...")
    
    try:
        response = requests.get(url, headers=COMMON_HEADERS, timeout=10)
        
        # 400 에러인 경우 대체 URL 시도
        if response.status_code == 400:
            logger.warning(f"Yahoo Finance 첫 번째 URL 실패 (400), 대체 URL 시도...")
            for alt_url in urls[1:]:
                try:
                    logger.info(f"Yahoo Finance 대체 URL 시도: {alt_url}")
                    response = requests.get(alt_url, headers=COMMON_HEADERS, timeout=10)
                    if response.status_code == 200:
                        url = alt_url
                        break
                except Exception:
                    continue
        
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'xml')
        items = soup.find_all('item')
        
        logger.info(f"  -> {len(items)}개의 뉴스 아이템 후보 찾음.")
        
        for item in items[:limit]:
            # Yahoo RSS 파싱
            title_tag = item.find('title')
            title = title_tag.get_text(strip=True) if title_tag else "제목 없음"
            
            link_tag = item.find('link')
            link = link_tag.get_text(strip=True) if link_tag else "#"
            
            description_tag = item.find('description')
            summary = description_tag.get_text(strip=True) if description_tag else title
            
            # 날짜 파싱
            pub_date_tag = item.find('pubDate')
            pub_date_str = ""
            if pub_date_tag:
                date_str = pub_date_tag.get_text(strip=True)
                try:
                    # ISO 8601 형식 시도 (예: "2025-10-27T14:10:25Z")
                    if 'T' in date_str and 'Z' in date_str:
                        # ISO 8601 형식 제거 (Z를 +00:00로 변환)
                        date_str_clean = date_str.replace('Z', '+00:00')
                        pub_date_utc = datetime.fromisoformat(date_str_clean)
                        pub_date_str = pub_date_utc.astimezone(timezone.utc).isoformat()
                    else:
                        # RFC 822 형식 시도 (예: "Mon, 27 Oct 2025 13:00:00 -0000")
                        pub_date_utc = datetime.strptime(date_str, '%a, %d %b %Y %H:%M:%S %z')
                        pub_date_str = pub_date_utc.astimezone(timezone.utc).isoformat()
                except ValueError:
                    # 파싱 실패 시 현재 시간 사용
                    logger.debug(f"Yahoo 시간 파싱 실패 (무시): {date_str}")
                    pub_date_str = datetime.now(timezone.utc).isoformat()
            else:
                pub_date_str = datetime.now(timezone.utc).isoformat()
            
            news_items.append({
                'title': title,
                'link': link,
                'summary': summary[:200],  # 요약을 200자로 제한
                'source': 'Yahoo Finance',
                'published': pub_date_str
            })
            
    except Exception as e:
        logger.error(f"Yahoo Finance 크롤링 중 오류 발생: {e}")
        # 에러 발생 시 빈 리스트 반환 (더미 데이터 대신)
    
    logger.info(f"Yahoo Finance 크롤링 완료. 총 {len(news_items)}개 수집.")
    return news_items

def get_news_rss_endpoint(feed_key=None):
    """
    RSS 피드를 가져와서 파싱합니다.
    
    Args:
        feed_key: 뉴스 소스 키 ('hankyung', 'mk', 'naver', 'nasdaq', 'marketbeat')
    
    Returns:
        dict: 성공 여부와 뉴스 기사 목록을 포함한 딕셔너리
    """
    try:
        # 피드 키가 제공되지 않은 경우 모든 피드를 가져옴
        if feed_key is None:
            feed_key = 'hankyung'  # 기본값
        
        # 네이버는 크롤링 방식으로 처리
        if feed_key == 'naver':
            raw_articles = _crawl_naver_news(limit=20)
            
            # 새로운 형식을 기존 형식으로 변환
            articles = []
            for item in raw_articles:
                articles.append({
                    'title': item.get('headline', ''),
                    'link': item.get('link', ''),
                    'summary': item.get('headline', ''),  # headline을 summary로 사용
                    'source': item.get('source', '네이버 금융'),
                    'published': item.get('pub_date', datetime.now(timezone.utc)).isoformat() if item.get('pub_date') else datetime.now(timezone.utc).isoformat()
                })
            
            logger.info(f"Successfully fetched {len(articles)} articles from naver")
            
            return {
                'success': True,
                'articles': articles,
                'feed': 'naver'
            }
        
        # Google News는 크롤링 방식으로 처리
        if feed_key == 'google':
            articles = _crawl_google_news(limit=20)
            
            logger.info(f"Successfully fetched {len(articles)} articles from google")
            
            return {
                'success': True,
                'articles': articles,
                'feed': 'google'
            }
        
        # Yahoo Finance는 크롤링 방식으로 처리
        if feed_key == 'yahoo':
            articles = _crawl_yahoo_news(limit=20)
            
            if len(articles) == 0:
                # Yahoo RSS가 실패할 경우 빈 결과 반환
                logger.warning("Yahoo Finance 크롤링 실패 - 빈 결과 반환")
            
            logger.info(f"Successfully fetched {len(articles)} articles from yahoo")
            
            return {
                'success': len(articles) > 0,
                'articles': articles,
                'feed': 'yahoo'
            }
        
        # RSS URL 가져오기
        feed_url = RSS_FEEDS.get(feed_key)
        if not feed_url:
            return {
                'success': False,
                'error': f'Unknown feed key: {feed_key}'
            }
        
        logger.info(f"Fetching RSS feed: {feed_key} from {feed_url}")
        
        # RSS 피드 파싱 (예외 처리 및 타임아웃 추가)
        try:
            # Nasdaq 등 느린 RSS의 경우 더 긴 타임아웃 적용
            if feed_key in ['nasdaq', 'marketbeat']:
                logger.info(f"타임아웃 25초로 Nasdaq RSS 피드 다운로드 시작...")
                
                try:
                    # requests를 먼저 시도 (더 빠름, stream으로 부분 다운로드)
                    response = requests.get(feed_url, headers=COMMON_HEADERS, timeout=20, stream=True)
                    response.raise_for_status()
                    
                    # Content-Type 확인
                    content_type = response.headers.get('Content-Type', '').lower()
                    
                    if 'rss' in content_type or 'xml' in content_type or 'text/xml' in content_type:
                        # RSS/XML이면 파싱
                        feed = feedparser.parse(response.content)
                        logger.info(f"Nasdaq RSS 다운로드 완료 (크기: {len(response.content)} bytes)")
                    else:
                        # HTML이거나 다른 형식이면 빈 결과 반환
                        logger.warning(f"Nasdaq에서 예상치 못한 Content-Type: {content_type}")
                        return {
                            'success': False,
                            'articles': [],
                            'feed': feed_key,
                            'error': 'Nasdaq returned unexpected content type'
                        }
                        
                except Exception as timeout_error:
                    logger.error(f"Nasdaq RSS 다운로드 실패: {timeout_error}")
                    # 실패 시 빈 리스트 반환
                    return {
                        'success': False,
                        'articles': [],
                        'feed': feed_key,
                        'error': 'Nasdaq RSS server is slow or unavailable. Please try again later.'
                    }
            else:
                feed = feedparser.parse(feed_url)
        except Exception as parse_error:
            logger.error(f"RSS 피드 파싱 실패 ({feed_key}): {parse_error}")
            # 실패 시 빈 리스트 반환 (404 에러 방지)
            return {
                'success': False,
                'articles': [],
                'feed': feed_key,
                'error': f'Failed to parse RSS feed: {str(parse_error)}'
            }
        
        # 피드 파싱 실패 확인
        if feed.bozo:
            logger.warning(f"Feed parsing error: {feed.bozo_exception}")
        
        # 기사 추출 (entries가 없을 경우 대비)
        articles = []
        if hasattr(feed, 'entries') and feed.entries:
            for entry in feed.entries[:20]:  # 최대 20개 기사
                article = {
                    'title': entry.get('title', 'No title'),
                    'link': entry.get('link', '#'),
                    'summary': entry.get('summary', entry.get('description', '')),
                    'source': feed.feed.get('title', feed_key) if hasattr(feed, 'feed') else feed_key,
                    'published': entry.get('published', entry.get('updated', '')),
                    'content': ''  # 본문 크롤링 추가
                }
                
                # 뉴스 본문 크롤링 시도
                if feed_key in ['hankyung', 'mk', 'nasdaq', 'marketbeat']:
                    article_url = entry.get('link', '')
                    if article_url and article_url != '#':
                        logger.info(f"본문 크롤링 시도: {article_url[:80]}")
                        article['content'] = _crawl_article_content(article_url)
                        if article['content']:
                            logger.info(f"본문 크롤링 성공: {len(article['content'])}자")
                        else:
                            logger.info(f"본문 크롤링 실패: 비어있는 내용")
                
                articles.append(article)
        else:
            logger.warning(f"No entries found in RSS feed: {feed_key}")
        
        logger.info(f"Successfully fetched {len(articles)} articles from {feed_key}")
        
        return {
            'success': True,
            'articles': articles,
            'feed': feed_key
        }
        
    except Exception as e:
        logger.error(f"Error fetching RSS feed: {str(e)}")
        return {
            'success': False,
            'error': f'Failed to fetch RSS feed: {str(e)}'
        }

