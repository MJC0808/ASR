# 📊 ASR (Advanced Stock Radar) 프로젝트 발표자료

## 1. 프로젝트 소개

**ASR (Advanced Stock Radar)**는 AI 기반의 종합 주식 분석 플랫폼입니다.

## 2. 프로젝트의 모든 기능

### 2.1 핵심 기능

#### 📈 차트 분석 (Chart Analysis)
- **실시간 주식 차트**: Yahoo Finance API를 통한 실시간 주가 데이터 시각화
- **기술적 지표**: EMA (지수이동평균), RSI (상대강도지수) 계산 및 표시
- **차트 패턴 분석**: 
  - 골든크로스 / 데드크로스 감지
  - 이동평균선 돌파 분석
  - 지지선/저항선 분석
- **다중 시간대 분석**: 1분, 5분, 15분, 30분, 1시간, 1일, 1주, 1개월
- **Lightweight Charts**: TradingView 기반 고성능 차트 라이브러리

#### 📰 뉴스 분석 (News Analysis)
- **다양한 뉴스 소스**:
  - 한국: 한국경제, 매일경제, 네이버 금융
  - 해외: Google News, Yahoo Finance, Nasdaq, MarketBeat
- **실시간 뉴스 크롤링**: RSS 및 웹 크롤링 방식
- **뉴스 감성 분석**: AI 기반 긍정/부정/중립 분석
- **기간별 분석**: 사용자 지정 기간의 뉴스 수집 및 분석
- **종목별 뉴스 필터링**: 특정 종목 관련 뉴스만 표시

#### 🤖 AI 분석 (AI Analysis)
- **Random Forest 모델**: 주가 방향성 예측 (상승/하락/중립)
- **예측 신뢰도**: 모델이 예측 결과의 신뢰도를 수치로 제공
- **가격 예측**: 다음 날 예상 주가 범위 예측
- **다중 종목 분석**: 여러 종목 동시 분석 및 비교
- **AI 감성 분석**: 뉴스 기반 주가 영향도 평가

#### 💼 포트폴리오 최적화 (Portfolio Optimization)
- **종목 선택**: 한국/미국 주요 종목 선택 (20개 종목 지원)
- **마코위츠 포트폴리오**: 효율적 경계 기반 최적 비중 제안
- **AI 동적 조정**: 
  - 뉴스 감성 분석 기반 비중 조정
  - 모델 예측 기반 비중 조정
  - 전문가 규칙 적용
- **수익률/변동성 분석**: 과거 1년 데이터 기반 통계 분석
- **최종 포트폴리오 추천**: AI가 종합 판단하여 최적 비중 제안

#### 💬 AI 챗봇 (AI Chatbot)
- **금융 전문 AI**: OpenAI GPT-3.5 Turbo 기반
- **주식 상담**: 실시간 주식 관련 질문에 답변
- **시장 분석**: 경제 지표, 시장 동향 설명
- **포트폴리오 조언**: 투자 전략 제안
- **대화 기록 관리**: 채팅 내역 저장 및 삭제

#### 👥 사용자 관리 (User Management)
- **회원가입**: JPA 기반 사용자 등록
- **로그인/로그아웃**: 세션 기반 인증
- **개인정보 관리**: 마이페이지 기능

#### 💬 게시판 (Board)
- **자유 게시판**: 사용자 간 정보 공유
- **종목 토론**: 주식 관련 의견 교환
- **댓글 시스템**: 게시글에 대한 댓글 작성

#### 📊 주요 지수 (Market Index)
- **실시간 지수**: 코스피, 코스닥, S&P500, 나스닥, VIX
- **원자재**: 금, 은, 구리 가격
- **환율**: 달러/원 환율, 달러 인덱스
- **자동 스크롤**: 애니메이션을 통한 실시간 업데이트

### 2.2 부가 기능

- **텔레그램 연동**: 텔레그램 봇 연동 준비
- **반응형 디자인**: 모바일/태블릿/데스크톱 지원
- **다크 테마**: 다크 모드 지원
- **자동 새로고침**: 실시간 데이터 업데이트

## 3. 프로젝트 아키텍처

### 3.1 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (HTML/CSS/JS)               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────────────┐ │
│  │index    │  │chart    │  │news     │  │portfolio      │ │
│  │.html    │  │.html    │  │.html    │  │.html          │ │
│  └─────────┘  └─────────┘  └─────────┘  └───────────────┘ │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────────────┐ │
│  │login    │  │chatbot  │  │board    │  │myinfo.html    │ │
│  │.html    │  │.html    │  │.html    │  │               │ │
│  └─────────┘  └─────────┘  └─────────┘  └───────────────┘ │
└───────────────────┬─────────────────────────────────────────┘
                    │ HTTP/REST API
┌───────────────────┴─────────────────────────────────────────┐
│              Spring Boot (Port: 8080)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Controllers:                                        │  │
│  │  - ChartController (차트 데이터 프록시)               │  │
│  │  - UserController (로그인/로그아웃)                  │  │
│  │  - BoardController (게시판)                          │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Services & Repositories:                           │  │
│  │  - UserService / UserRepository (JPA)                │  │
│  │  - BoardService (게시판 관리)                        │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────┬─────────────────────────────────────────┘
                    │ HTTP/REST API
┌───────────────────┴─────────────────────────────────────────┐
│              Flask Service (Port: 5000)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Services (Python):                                 │  │
│  │  - yahoo_finance_service (Yahoo Finance API)        │  │
│  │  - news_rss_service (뉴스 크롤링 & RSS)              │  │
│  │  - ai_analysis_service (AI 예측)                    │  │
│  │  - chart_pattern_service (차트 패턴 분석)            │  │
│  │  - news_analysis_service (뉴스 감성 분석)            │  │
│  │  - portfolio_optimizer_service (포트폴리오 최적화)   │  │
│  │  - chatbot_service (OpenAI 챗봇)                   │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Utils:                                              │  │
│  │  - indicators (기술적 지표 계산)                      │  │
│  │  - technical_analysis (차트 분석)                    │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────┬─────────────────────────────────────────┘
                    │ API Calls
┌───────────────────┴─────────────────────────────────────────┐
│           External Services                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Yahoo Finance  │  │OpenAI API    │  │News RSS      │      │
│  │(주식 데이터)   │  │(AI 챗봇)     │  │(뉴스 피드)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Naver Finance │  │Google News   │  │Nasdaq/...    │      │
│  │(크롤링)      │  │(RSS)         │  │(뉴스 피드)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 기술 스택

#### Backend
- **Spring Boot 3.x**: Java 기반 RESTful API 서버
- **JPA/Hibernate**: 데이터베이스 ORM
- **Flask 3.x**: Python 기반 비즈니스 로직 서버
- **Yahoo Finance API**: 주식 데이터 소스
- **OpenAI GPT-3.5**: AI 챗봇

#### Frontend
- **HTML5/CSS3**: 웹 표준 마크업
- **JavaScript (ES6+)**: 클라이언트 로직
- **TradingView Lightweight Charts**: 고성능 차트 라이브러리
- **Tailwind CSS**: 유틸리티 기반 CSS 프레임워크
- **DaisyUI**: Tailwind 기반 컴포넌트
- **Font Awesome**: 아이콘 라이브러리

#### Data Science & AI
- **Pandas**: 데이터 분석 및 처리
- **NumPy**: 수치 계산
- **Scikit-learn**: 머신러닝 (Random Forest)
- **BeautifulSoup4**: 웹 크롤링
- **feedparser**: RSS 파싱
- **yfinance**: Yahoo Finance API 래퍼

#### Database
- **JPA Repository**: 사용자, 게시판 데이터
- **In-Memory**: 실시간 데이터는 캐싱

### 3.3 데이터 플로우

#### 차트 분석 플로우
```
사용자 입력 (종목, 시간대)
    ↓
index.js → /api/chart/data/{ticker}/{interval}/{ema}/{rsi}
    ↓
ChartController → Flask /api/data/{ticker}/{interval}/{ema}/{rsi}
    ↓
YahooFinanceService → yfinance 모듈
    ↓
Yahoo Finance API
    ↓
캔들 데이터 + EMA + RSI 계산
    ↓
ChartController ← JSON Response
    ↓
index.js → 차트 렌더링 (Lightweight Charts)
```

#### 뉴스 분석 플로우
```
사용자 입력 (종목, 기간, 뉴스 소스)
    ↓
index.js → /api/chart/news/analyze
    ↓
ChartController → Flask /api/news/analyze
    ↓
news_analysis_service.py
    ↓
news_rss_service.py → RSS 크롤링
    ↓
여러 뉴스 소스 병렬 수집
    ↓
감성 분석 (TextBlob)
    ↓
결과 반환
```

#### AI 분석 플로우
```
사용자 입력 (종목 리스트)
    ↓
index.js → /api/chart/ai/analyze
    ↓
ChartController → Flask /api/ai/analyze
    ↓
ai_analysis_service.py
    ↓
Random Forest 모델 예측
    ↓
방향성 + 가격 예측
    ↓
결과 반환
```

#### 포트폴리오 최적화 플로우
```
사용자 선택 (종목 리스트)
    ↓
portfolio.js → /api/chart/portfolio/optimize
    ↓
ChartController → Flask /api/portfolio/optimize
    ↓
portfolio_optimizer_service.py
    ├─→ Yahoo Finance 데이터 수집
    ├─→ 마코위츠 포트폴리오 계산
    ├─→ AI 예측 반영
    └─→ 최종 비중 제안
    ↓
결과 반환 (파이 차트)
```

#### AI 챗봇 플로우
```
사용자 메시지 입력
    ↓
chatbot.js → /api/chart/chatbot/chat
    ↓
ChartController → Flask /api/chatbot/chat
    ↓
chatbot_service.py
    ↓
OpenAI GPT-3.5 API 호출
    ↓
금융 전문 프롬프트 + 대화 기록
    ↓
AI 응답 생성
    ↓
결과 반환
```

### 3.4 디렉토리 구조

```
chart-spring/
├── src/main/
│   ├── java/chart/chart_spring/
│   │   ├── controller/          # REST API 엔드포인트
│   │   │   ├── ChartController.java
│   │   │   ├── UserController.java
│   │   │   └── BoardController.java
│   │   ├── service/             # 비즈니스 로직
│   │   ├── repository/          # JPA Repository
│   │   ├── entity/              # 엔티티
│   │   └── dto/                 # 데이터 전송 객체
│   └── resources/static/
│       ├── *.html               # 10개 페이지
│       └── js/                  # 6개 JS 파일
│
└── flask-service/
    ├── app.py                    # Flask 메인 서버
    ├── services/                 # 비즈니스 로직
    │   ├── yahoo_finance_service.py
    │   ├── news_rss_service.py
    │   ├── ai_analysis_service.py
    │   ├── chart_pattern_service.py
    │   ├── news_analysis_service.py
    │   ├── portfolio_optimizer_service.py
    │   └── chatbot_service.py
    ├── utils/                    # 유틸리티
    │   ├── indicators.py
    │   └── technical_analysis.py
    └── requirements.txt
```

## 4. 주요 기술적 특징

### 4.1 마이크로서비스 아키텍처
- **Spring Boot**: 메인 API 게이트웨이 역할
- **Flask**: 파이썬 기반 데이터 분석 및 AI 서비스
- **논리적 분리**: 프론트엔드 ↔ 백엔드 ↔ 데이터 분석

### 4.2 실시간 데이터 처리
- **Yahoo Finance**: 실시간 주가 데이터
- **RSS Feed**: 실시간 뉴스 피드
- **크롤링**: 네이버, 매일경제 등 웹 크롤링

### 4.3 AI/ML 통합
- **Random Forest**: 주가 방향성 예측
- **감성 분석**: 텍스트 마이닝 기반 뉴스 감성 분석
- **GPT-3.5**: 자연어 처리 챗봇

### 4.4 사용자 경험 (UX)
- **즉시 반응**: 비동기 AJAX 통신
- **다크 테마**: 눈의 피로 감소
- **반응형 디자인**: 모바일 최적화
- **실시간 업데이트**: 자동 새로고침

## 5. 실행 방법

### 5.1 개발 환경 설정
```bash
# 1. Flask 서비스 실행
cd flask-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py

# 2. Spring Boot 실행
cd ..
gradlew bootRun
```

### 5.2 브라우저 접속
```
http://localhost:8080
```

## 6. 향후 발전 방향

- [ ] 실시간 차트 웹소켓 통신
- [ ] 고급 기술적 지표 추가 (볼린저 밴드, MACD 등)
- [ ] 백테스팅 기능
- [ ] 자동 매매 시스템 (텔레그램 연동)
- [ ] 모바일 앱 개발
- [ ] 소셜 트레이딩 기능

---

**Created with ❤️ by ASR Team**

