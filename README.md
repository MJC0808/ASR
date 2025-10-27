# 📊 TradingView Chart Spring

Yahoo Finance 데이터를 활용한 실시간 주식 차트 분석 애플리케이션

## 🚀 실행 방법

### 1. Flask 실행 (터미널 1)
```bash
cd flask-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### 2. Spring Boot 실행 (터미널 2)
```bash
gradlew bootRun
```

### 3. 브라우저 접속
```
http://localhost:8080
```

## 📊 주요 기능

- ✅ 한국/미국 주식 실시간 차트 조회
- ✅ 기술 지표 (EMA, RSI)
- ✅ 차트 분석 (골든크로스, 데드크로스, 200일선 돌파)
- ✅ 다크/라이트 테마
- ✅ 자동 새로고침

## 🛠️ 기술 스택

- **Backend**: Spring Boot 3.5 + Flask 3.0
- **Frontend**: JavaScript + TradingView Lightweight Charts
- **Data**: Yahoo Finance API
- **UI**: Tailwind CSS + DaisyUI

## 📖 사용 예시

1. 심볼 입력: `AAPL` (미국) 또는 `005930.KS` (한국)
2. "데이터 가져오기" 클릭
3. 분석 기법 선택 후 "분석하기" 클릭

---

**Made with ❤️ Spring Boot + Flask**

