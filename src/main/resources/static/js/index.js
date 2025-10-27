/**
 * ASR - Advanced Stock Rader
 * Index 페이지 전용 JavaScript
 * 뉴스분석, AI분석, 차트분석 기능 구현
 */

// 전역 변수
let newsAnalysisData = [];
let aiAnalysisData = [];
let chartAnalysisData = [];
let selectedCompanies = [];

// localStorage 키
const STORAGE_KEYS = {
    NEWS_DATA: 'newsAnalysisData',
    AI_DATA: 'aiAnalysisData',
    CHART_DATA: 'chartAnalysisData',
    SELECTED_COMPANIES: 'selectedCompanies'
};

// 뉴스분석 관련 함수들
class NewsAnalysis {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // 뉴스분석 버튼 클릭 이벤트
        document.getElementById('news-analyze-btn').addEventListener('click', () => {
            this.performNewsAnalysis();
        });

        // Period와 News 소스 변경 시에는 자동 실행하지 않음 (버튼으로만 실행)
    }

    async performNewsAnalysis() {
        const startPeriod = document.getElementById('start-period').value;
        const endPeriod = document.getElementById('end-period').value;
        
        // 체크박스에서 선택된 모든 뉴스 소스 가져오기
        const selectedNewsSources = Array.from(document.querySelectorAll('input[name="news-source"]:checked'))
            .map(checkbox => checkbox.value);

        console.log('뉴스분석 시작:', { startPeriod, endPeriod, selectedNewsSources });

        // 최소 하나의 뉴스 소스가 선택되어 있는지 확인
        if (selectedNewsSources.length === 0) {
            alert('최소 하나의 뉴스 소스를 선택해주세요.');
            return;
        }

        try {
            // 로딩 표시
            const btn = document.getElementById('news-analyze-btn');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = '분석 중...';
            
            // 1단계: 선택된 각 뉴스 소스에서 뉴스 가져오기
            const allArticles = [];
            for (const source of selectedNewsSources) {
                try {
                    const rssResponse = await fetch(`/api/chart/news/rss?feed=${source}`);
                    const rssData = await rssResponse.json();
                    
                    if (rssData.success && rssData.articles) {
                        allArticles.push(...rssData.articles);
                        console.log(`${source}에서 ${rssData.articles.length}개 뉴스 수집`);
                    }
                } catch (error) {
                    console.error(`${source} 뉴스 수집 실패:`, error);
                }
            }
            
            console.log(`총 ${allArticles.length}개 뉴스 수집 완료`);
            
            // 본문 데이터 확인
            const articlesWithContent = allArticles.filter(a => a.content && a.content.length > 0);
            console.log(`🔍 본문이 있는 기사: ${articlesWithContent.length}/${allArticles.length}`);
            
            // 첫 번째 기사 본문 샘플 출력
            if (articlesWithContent.length > 0) {
                const firstArticle = articlesWithContent[0];
                console.log(`📰 첫 기사 제목: ${firstArticle.title}`);
                console.log(`📄 본문 샘플 (첫 200자): ${firstArticle.content.substring(0, 200)}`);
            }
            
            // 2단계: 뉴스에서 종목명 추출
            const companies = this.extractCompaniesFromArticles(allArticles);
            console.log(`✅ 추출된 종목 (${companies.length}개):`, companies);
            
            // 3단계: 뉴스 분석 API 호출
            const response = await fetch('/api/chart/news/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    startPeriod,
                    endPeriod,
                    newsSources: selectedNewsSources,
                    articles: allArticles  // 수집한 뉴스 데이터 전송
                })
            });

            const result = await response.json();
            
            if (result.success) {
                newsAnalysisData = result.data;
                this.displayNewsResults({ companies });
                
                // AI분석과 차트분석에도 동일한 Company 전달
                if (companies.length > 0) {
                    aiAnalysis.performAIAnalysis(companies);
                    chartAnalysis.performChartAnalysis(companies);
                }
            } else {
                // 직접 추출한 종목 사용
                this.displayNewsResults({ companies });
                
                if (companies.length > 0) {
                    aiAnalysis.performAIAnalysis(companies);
                    chartAnalysis.performChartAnalysis(companies);
                }
            }
            
            btn.disabled = false;
            btn.textContent = originalText;
            
        } catch (error) {
            console.error('뉴스분석 오류:', error);
            alert('뉴스 분석 중 오류가 발생했습니다.');
            
            const btn = document.getElementById('news-analyze-btn');
            btn.disabled = false;
            btn.textContent = '뉴스분석';
        }
    }
    
    extractCompaniesFromArticles(articles) {
        // 뉴스 제목에서 종목명 추출
        const companiesMap = new Map();
        
        // 한국 증권 티커 패턴 (4~6자리 숫자 + .KS)
        const koreanTickerPattern = /(\d{5,6})\.KS|KOSPI|KOSDAQ|코스피|코스닥/gi;
        
        // 미국 증권 티커 패턴 (대문자 1~5개)
        const usTickerPattern = /\b([A-Z]{1,5})\b/g;
        
        // 주요 종목명 패턴 (대폭 확장)
        const companyNamePatterns = [
            // 한국 주요 기업
            '삼성전자', '삼성중공업', '삼성SDI', '삼성물산', '삼성바이오로직스',
            'SK하이닉스', 'SK텔레콤', 'SK', 'SK이노베이션', 'SK하이닉스',
            'LG전자', 'LG생활건강', 'LG화학', 'LG유플러스',
            '현대차', '현대중공업', '기아차', 'HD현대', 'HD현대중공업',
            'NAVER', '카카오', '셀트리온', 'POSCO', 'KB금융', '신한지주',
            '한화오션', 'SK증권', '미래에셋증권', 'KB투자증권', 'BNK투자증권',
            
            // 미국 주요 기업
            'Apple', '테슬라', 'Tesla', '마이크로소프트', 'Microsoft',
            '구글', 'Google', '아마존', 'Amazon', 'Nvidia', 'Netflix',
            'Meta', 'AMD', '인텔', 'Intel', 'JPMorgan', 'Bank of America',
            'Visa', 'Johnson & Johnson', 'Walmart', 'Procter & Gamble'
        ];
        
        articles.forEach(article => {
            const title = article.title || '';
            const summary = article.summary || '';
            const content = article.content || '';  // 본문 추가
            const text = title + ' ' + summary + ' ' + content;  // 본문까지 포함
            
            // 디버깅: 첫 번째 기사만 로그 출력
            if (articles.indexOf(article) === 0) {
                console.log('첫 기사 데이터:', {
                    title: title.substring(0, 50),
                    contentLength: content.length,
                    textLength: text.length
                });
            }
            
            // 한국 티커 찾기
            const koreanMatches = text.match(koreanTickerPattern);
            if (koreanMatches) {
                koreanMatches.forEach(match => {
                    const ticker = match.replace(/\D/g, '');
                    const companyName = this.getCompanyName(ticker);
                    if (companyName) {
                        companiesMap.set(ticker + '.KS', {
                            symbol: ticker + '.KS',
                            name: companyName,
                            sentiment: 'neutral',
                            confidence: 0.5
                        });
                    }
                });
            }
            
            // 미국 티커 찾기
            const usMatches = text.match(usTickerPattern);
            if (usMatches) {
                usMatches.forEach(match => {
                    const ticker = match.toUpperCase();
                    if (this.isValidUSTicker(ticker)) {
                        const companyName = this.getCompanyName(ticker);
                        companiesMap.set(ticker, {
                            symbol: ticker,
                            name: companyName,
                            sentiment: 'neutral',
                            confidence: 0.5
                        });
                    }
                });
            }
            
            // 종목명 패턴 찾기
            companyNamePatterns.forEach(name => {
                if (text.includes(name)) {
                    const ticker = this.getNameToTicker(name);
                    if (ticker) {
                        companiesMap.set(ticker, {
                            symbol: ticker,
                            name: name,
                            sentiment: 'neutral',
                            confidence: 0.5
                        });
                        console.log(`종목 추출: ${name} → ${ticker}`);
                    }
                }
            });
        });
        
        return Array.from(companiesMap.values());
    }
    
    getCompanyName(ticker) {
        const stockMap = {
            // 한국 주요 종목
            '005930': '삼성전자', '000660': 'SK하이닉스', '066570': 'LG전자',
            '005380': '현대차', '035420': 'NAVER', '035720': '카카오',
            '010140': '삼성중공업', '009540': '삼성중공업', '097230': '한화오션',
            '042660': '한화오션', '028670': '한화오션', '259960': '한화오션',
            '012330': '현대중공업', '009830': '한화오션', '010950': '삼성중공업',
            '003670': 'SK하이닉스', '009150': '삼성전자', '068270': '셀트리온',
            '051900': 'LG생활건강', '001800': 'ORION', '017670': 'SK텔레콤',
            '034730': 'SK', '096770': 'SK이노베이션', '005490': 'POSCO',
            '105560': 'KB금융', '055550': '신한지주', '028260': '삼성물산',
            '006400': '삼성SDI', '207940': '삼성바이오로직스',
            '000270': '기아차', '096530': '씨젠', '027410': 'BGF리테일',
            
            // 미국 종목
            'AAPL': 'Apple', 'MSFT': 'Microsoft', 'GOOGL': 'Google',
            'AMZN': 'Amazon', 'TSLA': 'Tesla', 'NVDA': 'Nvidia',
            'META': 'Meta', 'NFLX': 'Netflix', 'AMD': 'AMD', 'INTC': 'Intel',
            'JPM': 'JPMorgan', 'BAC': 'Bank of America', 'V': 'Visa',
            'JNJ': 'Johnson & Johnson', 'WMT': 'Walmart', 'PG': 'Procter & Gamble'
        };
        return stockMap[ticker] || ticker;
    }
    
    getNameToTicker(name) {
        const nameMap = {
            // 한국 종목
            '삼성전자': '005930.KS',
            'SK하이닉스': '000660.KS',
            '삼성중공업': '010140.KS',
            'LG전자': '066570.KS',
            '현대차': '005380.KS',
            '현대중공업': '012330.KS',
            'HD현대': '012330.KS',
            'HD현대중공업': '012330.KS',
            '기아차': '000270.KS',
            'NAVER': '035420.KS',
            '카카오': '035720.KS',
            '한화오션': '097230.KS',
            'LG생활건강': '051900.KS',
            'SK텔레콤': '017670.KS',
            'SK': '034730.KS',
            'SK이노베이션': '096770.KS',
            'POSCO': '005490.KS',
            'KB금융': '105560.KS',
            '신한지주': '055550.KS',
            '삼성물산': '028260.KS',
            '삼성SDI': '006400.KS',
            '셀트리온': '068270.KS',
            
            // 미국 종목
            'Apple': 'AAPL',
            'Microsoft': 'MSFT',
            '마이크로소프트': 'MSFT',
            'Google': 'GOOGL',
            '구글': 'GOOGL',
            'Amazon': 'AMZN',
            '아마존': 'AMZN',
            'Tesla': 'TSLA',
            '테슬라': 'TSLA',
            'Nvidia': 'NVDA',
            'Netflix': 'NFLX',
            'Meta': 'META',
            'AMD': 'AMD',
            'Intel': 'INTC',
            '인텔': 'INTC',
            'JPMorgan': 'JPM',
            'Bank of America': 'BAC',
            'Visa': 'V',
            'Johnson & Johnson': 'JNJ',
            'Walmart': 'WMT',
            'Procter & Gamble': 'PG'
        };
        return nameMap[name];
    }
    
    isValidUSTicker(ticker) {
        // 유효한 미국 티커 패턴 (1~5자 대문자)
        const validTickers = [
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'AMD', 'INTC',
            'JPM', 'BAC', 'V', 'JNJ', 'WMT', 'PG', 'MA', 'DIS', 'COST', 'XOM'
        ];
        return validTickers.includes(ticker);
    }

    displayNewsResults(data) {
        const container = document.getElementById('news-companies');
        container.innerHTML = '';

        if (!data.companies || data.companies.length === 0) {
            container.innerHTML = '<div class="no-companies" style="color: #888; text-align: center; padding: 20px;">추출된 종목이 없습니다.</div>';
            return;
        }

        data.companies.forEach(company => {
            const companyItem = document.createElement('div');
            companyItem.className = 'company-item';
            companyItem.textContent = `${company.name} (${company.symbol})`;
            companyItem.dataset.symbol = company.symbol;
            companyItem.dataset.sentiment = company.sentiment || 'neutral';
            container.appendChild(companyItem);
        });

        // localStorage에 저장
        newsAnalysisData = data.companies;
        localStorage.setItem(STORAGE_KEYS.NEWS_DATA, JSON.stringify(newsAnalysisData));
        console.log('Saved news analysis data to localStorage');
    }

    getMockNewsData() {
        return {
            companies: [
                { symbol: 'AAPL', sentiment: 'positive', confidence: 0.85 },
                { symbol: 'TSLA', sentiment: 'positive', confidence: 0.78 },
                { symbol: 'NVDA', sentiment: 'negative', confidence: 0.65 },
                { symbol: 'MSFT', sentiment: 'positive', confidence: 0.82 },
                { symbol: 'GOOGL', sentiment: 'positive', confidence: 0.76 }
            ]
        };
    }
}

// AI분석 관련 함수들
class AIAnalysis {
    constructor() {
        this.modelAccuracies = {
            lstm: 64,
            randomForest: 78,
            combined: 57
        };
    }

    async performAIAnalysis(companies) {
        console.log('AI분석 시작:', companies);

        try {
            // AI 분석 API 호출
            const response = await fetch('/api/chart/ai/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ companies })
            });

            const result = await response.json();
            
            if (result.success) {
                aiAnalysisData = result.data;
                this.displayAIResults(result.data);
            } else {
                // 임시 데이터로 테스트
                this.displayAIResults(this.getMockAIData(companies));
            }
        } catch (error) {
            console.error('AI분석 오류:', error);
            // 임시 데이터로 테스트
            this.displayAIResults(this.getMockAIData(companies));
        }
    }

    // 티커를 종목명으로 변환
    getCompanyNameFromTicker(ticker) {
        const stockMap = {
            // 한국 주요 종목
            '005930.KS': '삼성전자', '000660.KS': 'SK하이닉스', '066570.KS': 'LG전자',
            '005380.KS': '현대차', '035420.KS': 'NAVER', '035720.KS': '카카오',
            '010140.KS': '삼성중공업', '009540.KS': '삼성중공업', '097230.KS': '한화오션',
            '042660.KS': '한화오션', '028670.KS': '한화오션', '259960.KS': '한화오션',
            '012330.KS': 'HD현대', '009830.KS': '한화오션', '010950.KS': '삼성중공업',
            '003670.KS': 'SK하이닉스', '009150.KS': '삼성전자', '068270.KS': '셀트리온',
            '051900.KS': 'LG생활건강', '001800.KS': 'ORION', '017670.KS': 'SK텔레콤',
            '034730.KS': 'SK', '096770.KS': 'SK이노베이션', '005490.KS': 'POSCO',
            '105560.KS': 'KB금융', '055550.KS': '신한지주', '028260.KS': '삼성물산',
            '006400.KS': '삼성SDI', '207940.KS': '삼성바이오로직스',
            '000270.KS': '기아차', '096530.KS': '씨젠', '027410.KS': 'BGF리테일',
            
            // 미국 종목
            'AAPL': 'Apple', 'MSFT': 'Microsoft', 'GOOGL': 'Google',
            'AMZN': 'Amazon', 'TSLA': 'Tesla', 'NVDA': 'Nvidia',
            'META': 'Meta', 'NFLX': 'Netflix', 'AMD': 'AMD', 'INTC': 'Intel',
            'JPM': 'JPMorgan', 'BAC': 'Bank of America', 'V': 'Visa',
            'JNJ': 'Johnson & Johnson', 'WMT': 'Walmart', 'PG': 'Procter & Gamble'
        };
        return stockMap[ticker] || ticker;
    }

    displayAIResults(data) {
        // Company 결과 표시
        const container = document.getElementById('ai-companies');
        container.innerHTML = '';

        data.predictions.forEach(prediction => {
            const companyItem = document.createElement('div');
            companyItem.className = 'company-item';
            
            // 티커를 종목명으로 변환하여 표시
            const companyName = this.getCompanyNameFromTicker(prediction.symbol);
            
            // LSTM과 Random Forest 확률의 평균 계산
            const lstmProb = prediction.lstm_prediction?.percentage || 0;
            const rfProb = prediction.rf_prediction?.percentage || 0;
            const avgProb = (lstmProb + rfProb) / 2;
            const avgProbStr = avgProb.toFixed(1);
            
            companyItem.innerHTML = `
                <span>${companyName} (${prediction.symbol}) ${avgProb >= 0 ? '+' : ''}${avgProbStr}%</span>
            `;
            companyItem.addEventListener('click', () => {
                this.showModelAccuracy(prediction);
            });
            container.appendChild(companyItem);
        });

        // localStorage에 저장
        aiAnalysisData = data;
        localStorage.setItem(STORAGE_KEYS.AI_DATA, JSON.stringify(aiAnalysisData));
        console.log('Saved AI analysis data to localStorage');
    }

    updateModelPerformance(performance) {
        // LSTM 예상 확률 업데이트
        const lstmArrows = document.querySelectorAll('.performance-item .prediction-arrow');
        const lstmPercents = document.querySelectorAll('.performance-item .prediction-percent');
        
        if (lstmArrows.length > 0 && lstmPercents.length > 0) {
            const lstmValue = parseFloat(performance.lstm).toFixed(1);
            const lstmIsPositive = performance.lstm > 0;
            
            lstmArrows[0].textContent = lstmIsPositive ? '↗' : '↘';
            lstmArrows[0].style.color = lstmIsPositive ? '#4ade80' : '#f87171';
            lstmPercents[0].textContent = `${lstmIsPositive ? '+' : ''}${lstmValue}%`;
            lstmPercents[0].className = `prediction-percent ${lstmIsPositive ? 'positive' : 'negative'}`;
        }

        // Random Forest 예상 확률 업데이트
        if (lstmArrows.length > 1 && lstmPercents.length > 1) {
            const rfValue = parseFloat(performance.randomForest).toFixed(1);
            const rfIsPositive = performance.randomForest > 0;
            
            lstmArrows[1].textContent = rfIsPositive ? '↗' : '↘';
            lstmArrows[1].style.color = rfIsPositive ? '#4ade80' : '#f87171';
            lstmPercents[1].textContent = `${rfIsPositive ? '+' : ''}${rfValue}%`;
            lstmPercents[1].className = `prediction-percent ${rfIsPositive ? 'positive' : 'negative'}`;
        }

        // Combined 예상 확률 업데이트
        if (lstmArrows.length > 2 && lstmPercents.length > 2) {
            const combinedValue = parseFloat(performance.combined).toFixed(1);
            const combinedIsPositive = performance.combined > 0;
            
            lstmArrows[2].textContent = combinedIsPositive ? '↗' : '↘';
            lstmArrows[2].style.color = combinedIsPositive ? '#4ade80' : '#f87171';
            lstmPercents[2].textContent = `${combinedIsPositive ? '+' : ''}${combinedValue}%`;
            lstmPercents[2].className = `prediction-percent ${combinedIsPositive ? 'positive' : 'negative'}`;
        }
    }

    showModelAccuracy(prediction) {
        // Model Performance 업데이트
        try {
            console.log('Prediction object:', prediction);
            
            // 서버에서 온 데이터 확인
            const lstmPrediction = prediction.lstm_prediction;
            const rfPrediction = prediction.rf_prediction;
            
            // 디버깅: 원본 데이터 확인
            console.log('Raw prediction data:', {
                prediction,
                lstmPrediction,
                rfPrediction
            });
            
            // LSTM 예상 확률 계산
            let lstmProb = 0;
            
            if (lstmPrediction && lstmPrediction.percentage !== undefined) {
                // lstm_prediction의 percentage를 직접 사용
                lstmProb = lstmPrediction.percentage;
            } else {
                // lstm_prediction이 없는 경우 전체 prediction 사용
                lstmProb = prediction.lstm_accuracy || 0;
            }
            
            // Random Forest 예상 확률 계산
            let rfProb = 0;
            
            if (rfPrediction && rfPrediction.percentage !== undefined) {
                // rf_prediction의 percentage를 직접 사용
                rfProb = rfPrediction.percentage;
            } else {
                // rf_prediction이 없는 경우 전체 prediction 사용
                rfProb = prediction.rf_accuracy || 0;
            }
            
            // Combined 확률 (두 모델의 평균)
            const combinedProb = (lstmProb + rfProb) / 2;
            
            // 디버깅 로그
            console.log('Calculated probabilities:', {
                lstm: lstmProb,
                rf: rfProb,
                combined: combinedProb
            });
            
            // Model Performance 업데이트
            this.updateModelPerformance({
                lstm: lstmProb,
                randomForest: rfProb,
                combined: combinedProb
            });
            
            // 성공 메시지
            console.log(`${prediction.symbol} 모델 예상 확률 업데이트 완료`);
        } catch (error) {
            console.error('모델 예상 확률 업데이트 오류:', error);
            console.error('Error details:', error);
            
            // 오류 시 기본값으로 업데이트
            this.updateModelPerformance({
                lstm: 0,
                randomForest: 0,
                combined: 0
            });
            
            alert('오류: 모델 예상 확률 데이터를 불러올 수 없습니다.');
        }
    }

    getMockAIData(companies) {
        return {
            modelPerformance: {
                lstm: 64,
                randomForest: 78,
                combined: 57
            },
            predictions: companies.map(company => ({
                symbol: company.symbol,
                direction: Math.random() > 0.5 ? 'up' : 'down',
                percentage: (Math.random() * 10).toFixed(1),
                lstmAccuracy: Math.round((64 + Math.random() * 20) * 10) / 10,
                rfAccuracy: Math.round((78 + Math.random() * 15) * 10) / 10,
                combinedAccuracy: Math.round((57 + Math.random() * 25) * 10) / 10
            }))
        };
    }
}

// 차트분석 관련 함수들
class ChartAnalysis {
    constructor() {
        this.patternPredictions = {
            goldenCross: 2.1,
            triangle: 3.4,
            double: 4.2,
            headShoulders: -1.6
        };
    }

    async performChartAnalysis(companies) {
        console.log('차트분석 시작:', companies);

        try {
            // 차트 분석 API 호출
            const response = await fetch('/api/chart/chart/analyze-patterns', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ companies })
            });

            const result = await response.json();
            
            if (result.success) {
                chartAnalysisData = result.data;
                this.displayChartResults(result.data);
            } else {
                // 임시 데이터로 테스트
                this.displayChartResults(this.getMockChartData(companies));
            }
        } catch (error) {
            console.error('차트분석 오류:', error);
            // 임시 데이터로 테스트
            this.displayChartResults(this.getMockChartData(companies));
        }
    }

    // 티커를 종목명으로 변환
    getCompanyNameFromTicker(ticker) {
        const stockMap = {
            // 한국 주요 종목
            '005930.KS': '삼성전자', '000660.KS': 'SK하이닉스', '066570.KS': 'LG전자',
            '005380.KS': '현대차', '035420.KS': 'NAVER', '035720.KS': '카카오',
            '010140.KS': '삼성중공업', '009540.KS': '삼성중공업', '097230.KS': '한화오션',
            '042660.KS': '한화오션', '028670.KS': '한화오션', '259960.KS': '한화오션',
            '012330.KS': 'HD현대', '009830.KS': '한화오션', '010950.KS': '삼성중공업',
            '003670.KS': 'SK하이닉스', '009150.KS': '삼성전자', '068270.KS': '셀트리온',
            '051900.KS': 'LG생활건강', '001800.KS': 'ORION', '017670.KS': 'SK텔레콤',
            '034730.KS': 'SK', '096770.KS': 'SK이노베이션', '005490.KS': 'POSCO',
            '105560.KS': 'KB금융', '055550.KS': '신한지주', '028260.KS': '삼성물산',
            '006400.KS': '삼성SDI', '207940.KS': '삼성바이오로직스',
            '000270.KS': '기아차', '096530.KS': '씨젠', '027410.KS': 'BGF리테일',
            
            // 미국 종목
            'AAPL': 'Apple', 'MSFT': 'Microsoft', 'GOOGL': 'Google',
            'AMZN': 'Amazon', 'TSLA': 'Tesla', 'NVDA': 'Nvidia',
            'META': 'Meta', 'NFLX': 'Netflix', 'AMD': 'AMD', 'INTC': 'Intel',
            'JPM': 'JPMorgan', 'BAC': 'Bank of America', 'V': 'Visa',
            'JNJ': 'Johnson & Johnson', 'WMT': 'Walmart', 'PG': 'Procter & Gamble'
        };
        return stockMap[ticker] || ticker;
    }

    displayChartResults(data) {
        // Chart Analysis 패턴 업데이트는 종목 클릭 시에만
        // 초기 로드는 하지 않음 (패턴값 0으로 시작)
        // this.updateChartPatterns(data.patterns);
        
        console.log('displayChartResults called with data:', data);
        
        if (!data || !data.predictions) {
            console.error('Invalid chart data:', data);
            return;
        }
        
        // Company 결과 표시
        const container = document.getElementById('chart-companies');
        if (!container) {
            console.error('chart-companies container not found!');
            return;
        }
        container.innerHTML = '';

        console.log(`Displaying ${data.predictions.length} companies`);
        data.predictions.forEach(prediction => {
            const companyItem = document.createElement('div');
            companyItem.className = 'company-item';
            
            // 퍼센트를 소수점 첫째 자리로 표시
            const percentage = parseFloat(prediction.percentage).toFixed(1);
            
            // 티커를 종목명으로 변환하여 표시
            const companyName = this.getCompanyNameFromTicker(prediction.symbol);
            
            // 4가지 패턴 평균 계산
            const patterns = prediction.patterns || {};
            const goldenCross = parseFloat(patterns.golden_cross?.percentage || 0);
            const triangle = parseFloat(patterns.triangle?.percentage || 0);
            const double = parseFloat(patterns.double?.percentage || 0);
            const headShoulders = parseFloat(patterns.head_shoulders?.percentage || 0);
            const avgPattern = (goldenCross + triangle + double + headShoulders) / 4;
            const avgPatternStr = avgPattern.toFixed(1);
            const avgDirection = avgPattern >= 0 ? 'up' : 'down';
            
            companyItem.innerHTML = `
                <span>${companyName} (${prediction.symbol}) ${avgPattern >= 0 ? '+' : ''}${avgPatternStr}%</span>
                <span class="prediction-arrow ${prediction.direction === 'up' ? 'up' : 'down'}">
                    ${prediction.direction === 'up' ? '↗' : '↘'}
                </span>
                <span class="prediction-percent ${prediction.direction === 'up' ? 'positive' : 'negative'}">
                    ${prediction.direction === 'up' ? '+' : ''}${percentage}%
                </span>
            `;
            companyItem.addEventListener('click', () => {
                this.showChartPatterns(prediction);
            });
            container.appendChild(companyItem);
        });

        // localStorage에 저장
        chartAnalysisData = data;
        localStorage.setItem(STORAGE_KEYS.CHART_DATA, JSON.stringify(chartAnalysisData));
        console.log('Saved chart analysis data to localStorage');
    }

    updateChartPatterns(patterns) {
        // 각 패턴의 예측값 업데이트
        console.log('updateChartPatterns called with:', patterns);
        
        Object.keys(patterns).forEach(patternKey => {
            const pattern = patterns[patternKey];
            console.log(`Processing pattern ${patternKey}:`, pattern);
            
            // CSS 셀렉터 찾기
            // goldenCross -> .golden-cross
            // triangle -> .triangle
            // double -> .double
            // headShoulders -> .head-shoulders
            let selector = patternKey;
            if (patternKey === 'goldenCross') selector = 'golden-cross';
            if (patternKey === 'headShoulders') selector = 'head-shoulders';
            
            console.log(`Looking for selector: .${selector}`);
            const patternElement = document.querySelector(`.pattern-item.${selector}`);
            console.log(`Found pattern element:`, patternElement);
            
            if (patternElement) {
                const predictionElement = patternElement.querySelector('.prediction-percent');
                const arrowElement = patternElement.querySelector('.prediction-arrow');
                
                console.log(`Found prediction elements:`, { predictionElement, arrowElement });
                
                if (predictionElement && arrowElement) {
                    const percentageValue = parseFloat(pattern.percentage);
                    const isPositive = percentageValue > 0;
                    const isZero = percentageValue === 0;
                    
                    // 퍼센트를 소수점 첫째 자리로 표시
                    const percentage = percentageValue.toFixed(1);
                    
                    console.log(`Updating ${patternKey} to ${isPositive ? '+' : ''}${percentage}% (isPositive: ${isPositive}, isZero: ${isZero})`);
                    
                    // 화면 업데이트
                    predictionElement.textContent = `${isPositive ? '+' : ''}${percentage}%`;
                    
                    if (!isZero) {
                        arrowElement.textContent = isPositive ? '↗' : '↘';
                        arrowElement.style.color = isPositive ? '#4ade80' : '#f87171';
                        predictionElement.className = `prediction-percent ${isPositive ? 'positive' : 'negative'}`;
                    } else {
                        arrowElement.textContent = '↘';
                        arrowElement.style.color = '#f87171';
                        predictionElement.className = 'prediction-percent negative';
                    }
                    
                    console.log(`Updated ${patternKey}: text="${predictionElement.textContent}", arrow="${arrowElement.textContent}"`);
                }
            } else {
                console.log(`Pattern element not found for ${selector}`);
            }
        });
    }

    showChartPatterns(prediction) {
        // Chart Analysis 업데이트
        try {
            console.log('Prediction object:', prediction);
            
            // prediction 객체에서 패턴 데이터 추출
            const patterns = prediction.patterns || {};
            
            // 서버에서 온 패턴 데이터 확인
            console.log('Patterns from server:', patterns);
            
            // 각 패턴 데이터 확인 및 업데이트
            // 서버에서는 goldenCross 대신 golden_cross로 반환
            // confidence를 제거하고 percentage만 추출
            const patternData = {
                goldenCross: {},
                triangle: {},
                double: {},
                headShoulders: {}
            };
            
            // golden_cross 처리
            const goldenCrossData = patterns.golden_cross || patterns.goldenCross || {};
            patternData.goldenCross = { percentage: goldenCrossData.percentage || 0 };
            
            // triangle 처리
            const triangleData = patterns.triangle || {};
            patternData.triangle = { percentage: triangleData.percentage || 0 };
            
            // double 처리
            const doubleData = patterns.double || {};
            patternData.double = { percentage: doubleData.percentage || 0 };
            
            // head_shoulders 처리
            const headShouldersData = patterns.head_shoulders || patterns.headShoulders || {};
            patternData.headShoulders = { percentage: headShouldersData.percentage || 0 };
            
            console.log('Extracted pattern data:', patternData);
            
            // 퍼센트 값이 유효한 숫자인지 확인
            Object.keys(patternData).forEach(key => {
                const value = parseFloat(patternData[key].percentage);
                patternData[key].percentage = isNaN(value) ? 0 : value;
            });
            
            console.log('Final pattern data to display:', patternData);
            
            // Chart Analysis 업데이트
            this.updateChartPatterns(patternData);
            
            // 성공 메시지
            console.log(`${prediction.symbol} 차트 패턴 분석 업데이트 완료`);
        } catch (error) {
            console.error('차트 패턴 분석 업데이트 오류:', error);
            console.error('Error details:', error);
            
            // 오류 시 기본값으로 업데이트
            this.updateChartPatterns({
                goldenCross: { percentage: 0 },
                triangle: { percentage: 0 },
                double: { percentage: 0 },
                headShoulders: { percentage: 0 }
            });
            
            alert('오류: 차트 패턴 분석 데이터를 불러올 수 없습니다.');
        }
    }

    getMockChartData(companies) {
        return {
            patterns: {
                goldenCross: { percentage: 2.1 },
                triangle: { percentage: 3.4 },
                double: { percentage: 4.2 },
                headShoulders: { percentage: -1.6 }
            },
            predictions: companies.map(company => ({
                symbol: company.symbol,
                direction: Math.random() > 0.5 ? 'up' : 'down',
                percentage: (Math.random() * 8 - 2).toFixed(1),
                patterns: {
                    goldenCross: { percentage: parseFloat((Math.random() * 4 - 1).toFixed(1)) },
                    triangle: { percentage: parseFloat((Math.random() * 4 - 1).toFixed(1)) },
                    double: { percentage: parseFloat((Math.random() * 4 - 1).toFixed(1)) },
                    headShoulders: { percentage: parseFloat((Math.random() * 4 - 1).toFixed(1)) }
                }
            }))
        };
    }
}

// 차트 패턴 분석 계산 함수들
class ChartPatternCalculator {
    static calculateGoldenCross(data) {
        // 골든크로스/데드크로스 계산
        // 50일 이동평균과 200일 이동평균의 교차점 분석
        const ma50 = this.calculateMA(data, 50);
        const ma200 = this.calculateMA(data, 200);
        
        if (ma50.length < 2 || ma200.length < 2) return 0;
        
        const currentMa50 = ma50[ma50.length - 1];
        const currentMa200 = ma200[ma200.length - 1];
        const prevMa50 = ma50[ma50.length - 2];
        const prevMa200 = ma200[ma200.length - 2];
        
        // 골든크로스: MA50이 MA200을 아래에서 위로 돌파
        if (prevMa50 < prevMa200 && currentMa50 > currentMa200) {
            return 2.1; // 상승 예측
        }
        // 데드크로스: MA50이 MA200을 위에서 아래로 이탈
        else if (prevMa50 > prevMa200 && currentMa50 < currentMa200) {
            return -2.1; // 하락 예측
        }
        
        return 0;
    }

    static calculateTrianglePattern(data) {
        // 삼각수렴 패턴 계산
        // 고점과 저점이 수렴하는 패턴 분석
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        
        if (highs.length < 20) return 0;
        
        const recentHighs = highs.slice(-20);
        const recentLows = lows.slice(-20);
        
        const maxHigh = Math.max(...recentHighs);
        const minLow = Math.min(...recentLows);
        const triangleHeight = maxHigh - minLow;
        
        // 삼각수렴 패턴 감지 (고점과 저점이 수렴)
        const highVariance = this.calculateVariance(recentHighs);
        const lowVariance = this.calculateVariance(recentLows);
        
        if (highVariance < 0.1 && lowVariance < 0.1) {
            return 3.4; // 돌파 시 상승 예측
        }
        
        return 0;
    }

    static calculateDoubleTopBottom(data) {
        // 더블탑/더블바텀 패턴 계산
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        
        if (highs.length < 20) return 0;
        
        const recentHighs = highs.slice(-20);
        const recentLows = lows.slice(-20);
        
        // 더블탑 패턴 감지
        const maxHigh = Math.max(...recentHighs);
        const secondMaxHigh = Math.max(...recentHighs.filter(h => h < maxHigh));
        
        if (Math.abs(maxHigh - secondMaxHigh) / maxHigh < 0.02) {
            return -4.2; // 더블탑 하락 예측
        }
        
        // 더블바텀 패턴 감지
        const minLow = Math.min(...recentLows);
        const secondMinLow = Math.min(...recentLows.filter(l => l > minLow));
        
        if (Math.abs(minLow - secondMinLow) / minLow < 0.02) {
            return 4.2; // 더블바텀 상승 예측
        }
        
        return 0;
    }

    static calculateHeadAndShoulders(data) {
        // 헤드앤숄더 패턴 계산
        const highs = data.map(d => d.high);
        
        if (highs.length < 30) return 0;
        
        const recentHighs = highs.slice(-30);
        const maxHigh = Math.max(...recentHighs);
        const maxIndex = recentHighs.indexOf(maxHigh);
        
        // 헤드앤숄더 패턴 감지 (좌우 어깨와 중앙 헤드)
        if (maxIndex > 10 && maxIndex < recentHighs.length - 10) {
            const leftShoulder = Math.max(...recentHighs.slice(0, maxIndex - 5));
            const rightShoulder = Math.max(...recentHighs.slice(maxIndex + 5));
            
            if (Math.abs(leftShoulder - rightShoulder) / leftShoulder < 0.05) {
                return -1.6; // 헤드앤숄더 하락 예측
            }
        }
        
        return 0;
    }

    static calculateMA(data, period) {
        if (data.length < period) return [];
        
        const ma = [];
        for (let i = period - 1; i < data.length; i++) {
            const sum = data.slice(i - period + 1, i + 1)
                .reduce((acc, d) => acc + d.close, 0);
            ma.push(sum / period);
        }
        return ma;
    }

    static calculateVariance(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance) / mean;
    }
}

// 전역 인스턴스 생성
const newsAnalysis = new NewsAnalysis();
const aiAnalysis = new AIAnalysis();
const chartAnalysis = new ChartAnalysis();

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('Index.js loaded');
    
    // localStorage에서 이전 분석 결과 복원
    loadSavedAnalysisData();
    
    // 초기 뉴스분석은 자동 실행하지 않음 (버튼으로만 실행)
});

// localStorage에서 저장된 분석 결과 복원
function loadSavedAnalysisData() {
    // 뉴스 분석 결과 복원
    try {
        const savedNewsData = localStorage.getItem(STORAGE_KEYS.NEWS_DATA);
        if (savedNewsData) {
            const newsData = JSON.parse(savedNewsData);
            if (newsData && newsData.length > 0) {
                console.log('Loading saved news analysis data:', newsData.length, 'companies');
                newsAnalysisData = newsData;
                newsAnalysis.displayNewsResults({ companies: newsData });
                
                // AI 분석 결과 복원
                const savedAIData = localStorage.getItem(STORAGE_KEYS.AI_DATA);
                if (savedAIData) {
                    const aiData = JSON.parse(savedAIData);
                    if (aiData && aiData.predictions) {
                        console.log('Loading saved AI analysis data');
                        aiAnalysisData = aiData;
                        aiAnalysis.displayAIResults(aiData);
                    }
                }
                
                // 차트 분석 결과 복원
                const savedChartData = localStorage.getItem(STORAGE_KEYS.CHART_DATA);
                if (savedChartData) {
                    const chartData = JSON.parse(savedChartData);
                    if (chartData && chartData.predictions) {
                        console.log('Loading saved chart analysis data');
                        chartAnalysisData = chartData;
                        chartAnalysis.displayChartResults(chartData);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error loading saved analysis data:', error);
    }
}

// 유틸리티 함수들
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR') + ' ' + date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function formatPercentage(value) {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function getSentimentColor(sentiment) {
    switch (sentiment) {
        case 'positive': return '#4ade80';
        case 'negative': return '#f87171';
        case 'neutral': return '#9ca3af';
        default: return '#ffffff';
    }
}

// 내보내기
window.NewsAnalysis = NewsAnalysis;
window.AIAnalysis = AIAnalysis;
window.ChartAnalysis = ChartAnalysis;
window.ChartPatternCalculator = ChartPatternCalculator;
