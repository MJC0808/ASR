/**
 * ASR - Advanced Stock Rader
 * Lightweight Charts를 사용한 주식 차트 렌더링
 * Spring Boot API 호출
 */

// 전역 변수
let mainChart = null;
let volumeChart = null;
let indicatorChart = null;
let candlestickSeries = null;
let emaSeries = null;
let volumeSeries = null;
let indicatorSeries = null;
let autoRefreshInterval = null;

// 차트 상태
let isAnalysisMode = false;
let currentAnalysisType = 'golden_dead_cross';
let currentIndicator = 'rsi';

// 활성화된 분석 패턴들 (최대 6개)
let activeAnalyses = new Set();

// 이동평균선 관련 변수
let ma200Series = null;
let ma50Series = null;
let isMaCrossMode = false;
let originalCandlestickData = null;

// 지지선과 저항선 관련 변수
let supportResistanceLines = [];
let isSupportResistanceMode = false;

// 추세선 분석 관련 변수
let trendLines = [];
let isTrendAnalysisMode = false;

// 삼각수렴 패턴 관련 변수
let trianglePatterns = [];
let isTrianglePatternMode = false;

// 헤드앤숄더 패턴 관련 변수
let headShoulderPatterns = [];
let isHeadShoulderMode = false;

// 더블탑/더블바텀 패턴 관련 변수
let doublePatterns = [];
let isDoublePatternMode = false;


// 다크 테마 설정
function getDarkTheme() {
    return {
        layout: {
            background: { color: '#0a0a0a' },
            textColor: '#ffffff',
        },
        grid: {
            vertLines: { color: '#2a2a2a' },
            horzLines: { color: '#2a2a2a' },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
        },
        rightPriceScale: {
            borderColor: '#2a2a2a',
        },
        timeScale: {
            borderColor: '#2a2a2a',
        },
    };
}

// 차트 초기화
function initCharts() {
    // 메인 차트
    const mainChartContainer = document.getElementById('main-chart');
    const volumeChartContainer = document.getElementById('volume-chart');
    const indicatorChartContainer = document.getElementById('indicator-chart');
    // index.html 같은 간단한 페이지에서는 차트 컨테이너가 없음 → 안전 가드
    if (!mainChartContainer || !volumeChartContainer || !indicatorChartContainer) {
        return false;
    }
    mainChart = LightweightCharts.createChart(mainChartContainer, {
        ...getDarkTheme(),
        width: mainChartContainer.clientWidth,
        height: 400,
        handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
        },
        handleScale: {
            axisPressedMouseMove: true,
            mouseWheel: true,
            pinch: true,
        },
    });

    // 캔들스틱 시리즈
    candlestickSeries = mainChart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
    });

    // EMA 라인 시리즈 (제거됨)
    // emaSeries = mainChart.addLineSeries({
    //     color: '#0ea5e9',
    //     lineWidth: 2,
    // });

    // 거래량 차트
    volumeChart = LightweightCharts.createChart(volumeChartContainer, {
        ...getDarkTheme(),
        width: volumeChartContainer.clientWidth,
        height: 150,
        handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
        },
        handleScale: {
            axisPressedMouseMove: true,
            mouseWheel: true,
            pinch: true,
        },
    });

    // 거래량 히스토그램 시리즈
    volumeSeries = volumeChart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
            type: 'volume',
        },
        priceScaleId: '',
    });

    // 보조지표 차트
    indicatorChart = LightweightCharts.createChart(indicatorChartContainer, {
        ...getDarkTheme(),
        width: indicatorChartContainer.clientWidth,
        height: 200,
        handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
        },
        handleScale: {
            axisPressedMouseMove: true,
            mouseWheel: true,
            pinch: true,
        },
    });

    // RSI 라인 시리즈 (기본)
    indicatorSeries = indicatorChart.addLineSeries({
        color: '#f59e0b',
        lineWidth: 2,
    });

    // 차트 동기화
    syncCharts();

    // 반응형 처리
    window.addEventListener('resize', () => {
        mainChart.applyOptions({ width: mainChartContainer.clientWidth });
        volumeChart.applyOptions({ width: volumeChartContainer.clientWidth });
        indicatorChart.applyOptions({ width: indicatorChartContainer.clientWidth });
    });
    return true;
}

// 차트 시간축 동기화
function syncCharts() {
    if (!mainChart || !volumeChart || !indicatorChart) return;

    let isSyncing = false;

    // 메인 차트 → 거래량 차트
    mainChart.timeScale().subscribeVisibleLogicalRangeChange((newLogicalRange) => {
        if (isSyncing || !newLogicalRange) return;
        isSyncing = true;
        try {
            volumeChart.timeScale().setVisibleLogicalRange(newLogicalRange);
            indicatorChart.timeScale().setVisibleLogicalRange(newLogicalRange);
        } catch (e) {
            // 범위 설정 오류 무시
        }
        setTimeout(() => { isSyncing = false; }, 0);
    });

    // 거래량 차트 → 메인 차트
    volumeChart.timeScale().subscribeVisibleLogicalRangeChange((newLogicalRange) => {
        if (isSyncing || !newLogicalRange) return;
        isSyncing = true;
        try {
            mainChart.timeScale().setVisibleLogicalRange(newLogicalRange);
            indicatorChart.timeScale().setVisibleLogicalRange(newLogicalRange);
        } catch (e) {
            // 범위 설정 오류 무시
        }
        setTimeout(() => { isSyncing = false; }, 0);
    });

    // 보조지표 차트 → 메인 차트
    indicatorChart.timeScale().subscribeVisibleLogicalRangeChange((newLogicalRange) => {
        if (isSyncing || !newLogicalRange) return;
        isSyncing = true;
        try {
            mainChart.timeScale().setVisibleLogicalRange(newLogicalRange);
            volumeChart.timeScale().setVisibleLogicalRange(newLogicalRange);
        } catch (e) {
            // 범위 설정 오류 무시
        }
        setTimeout(() => { isSyncing = false; }, 0);
    });
}

// 차트 데이터 가져오기
async function fetchChartData() {
    const ticker = document.getElementById('search-input').value.trim().toUpperCase();
    const interval = getSelectedInterval();
    const ema = 20;
    const rsi = 14;

    if (!ticker) {
        showError('주식 심볼을 입력해주세요.');
        return;
    }

    showLoading();

    try {
        // Spring Boot API 호출 (Flask API를 프록시)
        const response = await fetch(`/api/chart/data/${ticker}/${interval}/${ema}/${rsi}`);
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || '데이터를 가져오는데 실패했습니다.');
        }

        const data = result.data;

        // 캔들스틱 데이터 설정
        if (data.candlestick && data.candlestick.length > 0) {
            candlestickSeries.setData(data.candlestick);
            // 전역 변수에 저장 (분석에 사용)
            window.lastCandlestickData = data.candlestick;
            // 원본 데이터 백업
            originalCandlestickData = [...data.candlestick];
        }

        // EMA 데이터 설정 (제거됨)
        // if (data.ema && data.ema.length > 0) {
        //     emaSeries.setData(data.ema);
        // }

        // 거래량 데이터 설정
        if (data.volume && data.volume.length > 0) {
            volumeSeries.setData(data.volume);
            // 전역 변수에 거래량 데이터 저장 (OBV 계산에 사용)
            window.lastVolumeData = data.volume;
        } else if (data.candlestick && data.candlestick.length > 0) {
            const volumeData = data.candlestick.map(candle => ({
                time: candle.time,
                value: candle.volume || 0,
                color: candle.close >= candle.open ? '#26a69a80' : '#ef535080'
            }));
            volumeSeries.setData(volumeData);
            // 전역 변수에 거래량 데이터 저장 (OBV 계산에 사용)
            window.lastVolumeData = volumeData;
        }

        // 보조지표 데이터 설정 (RSI 기본)
        if (data.rsi && data.rsi.length > 0) {
            indicatorSeries.setData(data.rsi);
            // 전역 변수에 RSI 데이터 저장 (보조지표 변경에 사용)
            window.lastRsiData = data.rsi;
        }

        // 종목 정보 업데이트
        updateStockInfo(data.ticker_info);

        console.log('Chart data loaded successfully:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Error fetching chart data:', error);
        showError(error.message || '데이터를 가져오는데 실패했습니다.');
    } finally {
        hideLoading();
    }
}

// 선택된 시간 간격 가져오기
function getSelectedInterval() {
    const selectBox = document.getElementById('timeframe-select');
    if (selectBox) {
        return selectBox.value;
    }
    return '1d'; // 기본값
}

// 주식 정보 업데이트
function updateStockInfo(tickerInfo) {
    if (tickerInfo) {
        const stockName = document.querySelector('.stock-name');
        const stockExchange = document.querySelector('.stock-exchange');
        const stockSymbol = document.querySelector('.stock-symbol');
        const stockPrice = document.querySelector('.stock-price');
        const stockChange = document.querySelector('.stock-change');
        
        if (stockName) {
            stockName.textContent = tickerInfo.name || 'Apple Inc.';
        }
        
        if (stockExchange) {
            const exchange = tickerInfo.exchange || 'NASDAQ';
            stockExchange.textContent = exchange;
        }
        
        if (stockSymbol) {
            stockSymbol.textContent = `/ ${tickerInfo.symbol || 'AAPL'}`;
        }
        
        if (stockPrice) {
            // 모든 가능한 가격 필드 확인
            let price = tickerInfo.currentPrice || tickerInfo.price || tickerInfo.close || tickerInfo.raw_price;
            let currency = tickerInfo.currency || tickerInfo.raw_currency || 'USD';
            
            // ticker_info에 가격이 없으면 캔들스틱 데이터에서 마지막 가격 사용
            if (!price && window.lastCandlestickData && window.lastCandlestickData.length > 0) {
                const lastCandle = window.lastCandlestickData[window.lastCandlestickData.length - 1];
                price = lastCandle.close;
                
                // 심볼 기반으로 통화 추정
                const symbol = tickerInfo.symbol || '';
                if (symbol.includes('.KS') || symbol.includes('.KQ')) {
                    currency = 'KRW';
                } else {
                    currency = 'USD';
                }
            }
            
            console.log('Price update:', JSON.stringify({ price, currency, tickerInfo }, null, 2));
            
            // 가격이 유효한지 확인
            if (price && price !== 0 && !isNaN(price)) {
                // 통화에 따라 표시 형식 결정
                let priceText;
                if (currency === 'KRW') {
                    // 한국 원화는 천 단위 콤마 표시 (소수점 없음)
                    priceText = `₩ ${parseInt(price).toLocaleString()}`;
                } else if (currency === 'USD') {
                    // 미국 달러는 소수점 2자리
                    priceText = `$ ${parseFloat(price).toFixed(2)}`;
                } else if (currency === 'JPY') {
                    // 일본 엔은 소수점 없이
                    priceText = `¥ ${parseInt(price).toLocaleString()}`;
                } else {
                    // 기타 통화는 기본 형식
                    priceText = `${currency} ${parseFloat(price).toFixed(2)}`;
                }
                
                console.log('Setting price text:', priceText);
                stockPrice.textContent = priceText;
            } else {
                console.warn('Invalid price data:', JSON.stringify({ price, currency, tickerInfo }, null, 2));
                
                // 심볼 기반으로 기본값 설정
                const symbol = tickerInfo.symbol || '';
                if (symbol.includes('.KS') || symbol.includes('.KQ')) {
                    stockPrice.textContent = '₩ 97,000';
                } else {
                    stockPrice.textContent = '$ 258.60';
                }
            }
        }
        
        if (stockChange) {
            const change = tickerInfo.changePercent || tickerInfo.change || tickerInfo.percentage || '1.40%';
            const changeValue = parseFloat(change);
            const isPositive = changeValue > 0;
            const arrow = isPositive ? '▲' : '▼';
            stockChange.textContent = `${arrow} ${Math.abs(changeValue)}%`;
            stockChange.style.color = isPositive ? '#4ade80' : '#f87171';
        }
    }
}


// 차트 분석 실행
async function performChartAnalysis() {
    if (!window.lastCandlestickData || window.lastCandlestickData.length === 0) {
        showError('먼저 차트 데이터를 로드해주세요.');
        return;
    }

    const ticker = document.getElementById('search-input').value.trim();
    const interval = getSelectedInterval();
    
    // 차트의 현재 보이는 시간 범위 가져오기
    const timeScale = mainChart.timeScale();
    const visibleRange = timeScale.getVisibleRange();
    
    showLoading();

    try {
        // 분석 요청 데이터
        const requestData = {
            ticker: ticker,
            interval: interval,
            start_time: visibleRange ? visibleRange.from : null,
            end_time: visibleRange ? visibleRange.to : null,
            analysis_type: currentAnalysisType,
            params: getAnalysisParams(currentAnalysisType)
        };

        console.log('Analysis request:', requestData);

        // Spring Boot API 호출
        const response = await fetch('/api/chart/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || '분석에 실패했습니다.');
        }

        // 분석 결과 표시
        displayAnalysisResult(result.data);

        console.log('Analysis completed:', result);

    } catch (error) {
        console.error('Error analyzing chart:', error);
        showError(error.message || '분석 중 오류가 발생했습니다.');
    } finally {
        hideLoading();
    }
}

// 원본 차트 복원
function restoreOriginalChart() {
    if (window.lastCandlestickData) {
        candlestickSeries.setData(window.lastCandlestickData);
    }
}

// 이동평균선 골든크로스/데드크로스 토글
function toggleMaCrossAnalysis() {
    if (!window.lastCandlestickData || window.lastCandlestickData.length === 0) {
        showError('먼저 차트 데이터를 로드해주세요.');
        return;
    }
    
    if (!isMaCrossMode) {
        // 이동평균선 모드로 전환
        showMaCrossAnalysis();
    } else {
        // 기본 모드로 복원
        hideMaCrossAnalysis();
    }
}

// 이동평균선 골든크로스/데드크로스 표시
function showMaCrossAnalysis() {
    if (!window.lastCandlestickData || window.lastCandlestickData.length < 200) {
        showError('200일 이동평균선을 계산하기 위해 충분한 데이터가 필요합니다.');
        return;
    }
    
    console.log('Starting MA cross analysis with', window.lastCandlestickData.length, 'candles');
    
    isMaCrossMode = true;
    
    // 50일, 200일 이동평균선 계산
    const ma50Data = calculateMA(window.lastCandlestickData, 50);
    const ma200Data = calculateMA(window.lastCandlestickData, 200);
    
    console.log('MA50 data points:', ma50Data.length);
    console.log('MA200 data points:', ma200Data.length);
    
    // 이동평균선 시리즈 추가
    if (ma50Series) {
        mainChart.removeSeries(ma50Series);
    }
    if (ma200Series) {
        mainChart.removeSeries(ma200Series);
    }
    
    ma50Series = mainChart.addLineSeries({
        color: '#ff9800',
        lineWidth: 2,
        title: 'MA50'
    });
    
    ma200Series = mainChart.addLineSeries({
        color: '#2196f3',
        lineWidth: 2,
        title: 'MA200'
    });
    
    ma50Series.setData(ma50Data);
    ma200Series.setData(ma200Data);
    
    console.log('MA lines added to chart');
    
    // 골든크로스/데드크로스 신호 감지 및 표시 (개선된 버전 사용)
    const crossSignals = detectMaCrossSignalsImproved(ma50Data, ma200Data);
    displayMaCrossSignals(crossSignals);
}

// 이동평균선 골든크로스/데드크로스 숨기기
function hideMaCrossAnalysis() {
    isMaCrossMode = false;
    
    // 이동평균선 시리즈 제거
    if (ma50Series) {
        mainChart.removeSeries(ma50Series);
        ma50Series = null;
    }
    if (ma200Series) {
        mainChart.removeSeries(ma200Series);
        ma200Series = null;
    }
    
    // 마커 제거
    candlestickSeries.setMarkers([]);
    
    // 원본 차트 복원
    if (originalCandlestickData) {
        candlestickSeries.setData(originalCandlestickData);
    }
}

// 이동평균선 계산
function calculateMA(candlestickData, period) {
    if (candlestickData.length < period) return [];
    
    const maData = [];
    for (let i = period - 1; i < candlestickData.length; i++) {
        const sum = candlestickData.slice(i - period + 1, i + 1)
            .reduce((acc, candle) => acc + candle.close, 0);
        const ma = sum / period;
        
        maData.push({
            time: candlestickData[i].time,
            value: ma
        });
    }
    
    return maData;
}

// 이동평균선 크로스 신호 감지
function detectMaCrossSignals(ma50Data, ma200Data) {
    const signals = [];
    
    // 두 이동평균선의 길이가 다를 수 있으므로 짧은 것 기준으로 처리
    const minLength = Math.min(ma50Data.length, ma200Data.length);
    
    console.log('Detecting MA cross signals:', {
        ma50Length: ma50Data.length,
        ma200Length: ma200Data.length,
        minLength: minLength
    });
    
    // 최근 10개 데이터 포인트를 콘솔에 출력하여 디버깅
    console.log('Recent MA50 values:', ma50Data.slice(-10).map(d => ({ time: d.time, value: d.value.toFixed(2) })));
    console.log('Recent MA200 values:', ma200Data.slice(-10).map(d => ({ time: d.time, value: d.value.toFixed(2) })));
    
    for (let i = 1; i < minLength; i++) {
        const prevMa50 = ma50Data[i - 1].value;
        const currMa50 = ma50Data[i].value;
        const prevMa200 = ma200Data[i - 1].value;
        const currMa200 = ma200Data[i].value;
        
        // 골든크로스: MA50이 MA200을 아래에서 위로 돌파
        if (prevMa50 < prevMa200 && currMa50 > currMa200) {
            const signal = {
                time: ma50Data[i].time,
                type: 'golden_cross',
                ma50: currMa50,
                ma200: currMa200,
                prevMa50: prevMa50,
                prevMa200: prevMa200
            };
            signals.push(signal);
            console.log('Golden cross detected at index', i, ':', {
                time: signal.time,
                prevMa50: prevMa50.toFixed(2),
                prevMa200: prevMa200.toFixed(2),
                currMa50: currMa50.toFixed(2),
                currMa200: currMa200.toFixed(2)
            });
        }
        // 데드크로스: MA50이 MA200을 위에서 아래로 이탈
        else if (prevMa50 > prevMa200 && currMa50 < currMa200) {
            const signal = {
                time: ma50Data[i].time,
                type: 'dead_cross',
                ma50: currMa50,
                ma200: currMa200,
                prevMa50: prevMa50,
                prevMa200: prevMa200
            };
            signals.push(signal);
            console.log('Dead cross detected at index', i, ':', {
                time: signal.time,
                prevMa50: prevMa50.toFixed(2),
                prevMa200: prevMa200.toFixed(2),
                currMa50: currMa50.toFixed(2),
                currMa200: currMa200.toFixed(2)
            });
        }
    }
    
    console.log('Total signals detected:', signals.length);
    return signals;
}

// 더 정확한 크로스 감지를 위한 개선된 함수
function detectMaCrossSignalsImproved(ma50Data, ma200Data) {
    const signals = [];
    const candlestickData = window.lastCandlestickData;
    
    if (!candlestickData) {
        console.error('No candlestick data available');
        return signals;
    }
    
    // 이동평균선 데이터를 시간으로 정렬
    const sortedMa50 = [...ma50Data].sort((a, b) => a.time - b.time);
    const sortedMa200 = [...ma200Data].sort((a, b) => a.time - b.time);
    
    console.log('Detecting MA cross signals (improved):', {
        ma50Length: sortedMa50.length,
        ma200Length: sortedMa200.length,
        candlestickLength: candlestickData.length
    });
    
    // 이동평균선 데이터를 캔들스틱 데이터와 매칭
    for (let i = 0; i < candlestickData.length; i++) {
        const candle = candlestickData[i];
        const candleTime = candle.time;
        
        // 해당 시간의 이동평균선 값 찾기
        const ma50Point = sortedMa50.find(point => point.time === candleTime);
        const ma200Point = sortedMa200.find(point => point.time === candleTime);
        
        if (!ma50Point || !ma200Point) continue;
        
        // 이전 캔들의 이동평균선 값 찾기
        if (i === 0) continue;
        
        const prevCandle = candlestickData[i - 1];
        const prevMa50Point = sortedMa50.find(point => point.time === prevCandle.time);
        const prevMa200Point = sortedMa200.find(point => point.time === prevCandle.time);
        
        if (!prevMa50Point || !prevMa200Point) continue;
        
        const prevMa50 = prevMa50Point.value;
        const currMa50 = ma50Point.value;
        const prevMa200 = prevMa200Point.value;
        const currMa200 = ma200Point.value;
        
        // 골든크로스: MA50이 MA200을 아래에서 위로 돌파
        if (prevMa50 < prevMa200 && currMa50 > currMa200) {
            const signal = {
                time: candleTime,
                type: 'golden_cross',
                ma50: currMa50,
                ma200: currMa200,
                prevMa50: prevMa50,
                prevMa200: prevMa200
            };
            signals.push(signal);
            console.log('Golden cross detected at candle', i, ':', {
                time: signal.time,
                prevMa50: prevMa50.toFixed(2),
                prevMa200: prevMa200.toFixed(2),
                currMa50: currMa50.toFixed(2),
                currMa200: currMa200.toFixed(2)
            });
        }
        // 데드크로스: MA50이 MA200을 위에서 아래로 이탈
        else if (prevMa50 > prevMa200 && currMa50 < currMa200) {
            const signal = {
                time: candleTime,
                type: 'dead_cross',
                ma50: currMa50,
                ma200: currMa200,
                prevMa50: prevMa50,
                prevMa200: prevMa200
            };
            signals.push(signal);
            console.log('Dead cross detected at candle', i, ':', {
                time: signal.time,
                prevMa50: prevMa50.toFixed(2),
                prevMa200: prevMa200.toFixed(2),
                currMa50: currMa50.toFixed(2),
                currMa200: currMa200.toFixed(2)
            });
        }
    }
    
    console.log('Total signals detected (improved):', signals.length);
    return signals;
}

// 이동평균선 크로스 신호 표시
function displayMaCrossSignals(signals) {
    console.log('Displaying MA cross signals:', signals);
    
    // 캔들스틱 데이터에서 해당 시간의 캔들 찾기
    const candlestickData = window.lastCandlestickData;
    if (!candlestickData) {
        console.error('No candlestick data available for markers');
        return;
    }
    
    const markers = signals.map(signal => {
        // 해당 시간의 캔들 찾기
        const candleIndex = candlestickData.findIndex(candle => candle.time === signal.time);
        
        if (candleIndex === -1) {
            console.warn('Candle not found for time:', signal.time);
            return null;
        }
        
        const candle = candlestickData[candleIndex];
        
        if (signal.type === 'golden_cross') {
            return {
                time: signal.time,
                position: 'belowBar',
                color: '#4caf50',
                shape: 'arrowUp',
                text: `골든크로스\nMA50: ${signal.ma50.toFixed(2)}\nMA200: ${signal.ma200.toFixed(2)}`,
                size: 3
            };
        } else if (signal.type === 'dead_cross') {
            return {
                time: signal.time,
                position: 'aboveBar',
                color: '#f44336',
                shape: 'arrowDown',
                text: `데드크로스\nMA50: ${signal.ma50.toFixed(2)}\nMA200: ${signal.ma200.toFixed(2)}`,
                size: 3
            };
        }
    }).filter(marker => marker !== null);
    
    console.log('Markers to display:', markers);
    
    if (markers.length > 0) {
        try {
            candlestickSeries.setMarkers(markers);
            console.log('Markers set successfully');
        } catch (error) {
            console.error('Error setting markers:', error);
        }
    } else {
        console.log('No markers to display');
    }
}

// 분석 타입별 파라미터 가져오기
function getAnalysisParams(analysisType) {
    const params = {
        'golden_dead_cross': { short_period: 50, long_period: 200 },
        'support_resistance': { window: 20 },
        'trend_line': {},
        'triangle_pattern': {},
        'head_and_shoulders': {},
        'double_top_bottom': {},
        'box_range': {},
        'gap_analysis': {},
        'candlestick_patterns': {},
        'fibonacci': {}
    };
    return params[analysisType] || {};
}

// 분석 결과 표시
function displayAnalysisResult(analysisData) {
    // 분석 라인 추가
    if (analysisData.lines && analysisData.lines.length > 0) {
        analysisData.lines.forEach(line => {
            const lineSeries = mainChart.addLineSeries({
                color: line.color,
                lineWidth: 2,
                title: line.name,
                lineStyle: line.lineStyle || 0
            });
            lineSeries.setData(line.data);
        });
    }

    // 신호 마커 추가
    if (analysisData.signals && analysisData.signals.length > 0) {
        const markers = analysisData.signals.map(signal => {
            const signalConfig = {
                // 골든/데드크로스
                'golden_cross': { shape: 'arrowUp', color: '#26a69a', text: '매수 (골든크로스)', position: 'belowBar' },
                'dead_cross': { shape: 'arrowDown', color: '#ef5350', text: '매도 (데드크로스)', position: 'aboveBar' },
                
                // 지지/저항
                'support_touch': { shape: 'arrowUp', color: '#00E676', text: '매수 (지지선)', position: 'belowBar' },
                'resistance_touch': { shape: 'arrowDown', color: '#FF1744', text: '매도 (저항선)', position: 'aboveBar' },
                
                // 추세선
                'trend_breakout_up': { shape: 'arrowUp', color: '#2962FF', text: '매수 (추세 돌파)', position: 'belowBar' },
                'trend_breakout_down': { shape: 'arrowDown', color: '#FF6D00', text: '매도 (추세 이탈)', position: 'aboveBar' },
                
                // 삼각수렴
                'triangle_breakout_up': { shape: 'arrowUp', color: '#9C27B0', text: '매수 (삼각수렴 돌파)', position: 'belowBar' },
                'triangle_breakout_down': { shape: 'arrowDown', color: '#E91E63', text: '매도 (삼각수렴 이탈)', position: 'aboveBar' },
                
                // 헤드앤숄더
                'head_and_shoulders': { shape: 'arrowDown', color: '#FF1744', text: '매도 (헤드앤숄더)', position: 'aboveBar' },
                
                // 더블탑/바텀
                'double_top': { shape: 'arrowDown', color: '#FF5722', text: '매도 (더블탑)', position: 'aboveBar' },
                'double_bottom': { shape: 'arrowUp', color: '#4CAF50', text: '매수 (더블바텀)', position: 'belowBar' },
                
                // 박스권
                'box_upper': { shape: 'arrowDown', color: '#FF9800', text: '매도 (박스 상단)', position: 'aboveBar' },
                'box_lower': { shape: 'arrowUp', color: '#8BC34A', text: '매수 (박스 하단)', position: 'belowBar' },
                
                // 갭
                'gap_up': { shape: 'arrowUp', color: '#00BCD4', text: `갭 상승 (${signal.gap_size?.toFixed(1)}%)`, position: 'belowBar' },
                'gap_down': { shape: 'arrowDown', color: '#FF5252', text: `갭 하락 (${signal.gap_size?.toFixed(1)}%)`, position: 'aboveBar' },
                
                // 캔들 패턴
                'doji': { shape: 'circle', color: '#FFC107', text: 'Doji', position: 'aboveBar' },
                'hammer': { shape: 'arrowUp', color: '#4CAF50', text: 'Hammer (매수)', position: 'belowBar' },
                'shooting_star': { shape: 'arrowDown', color: '#FF1744', text: 'Shooting Star (매도)', position: 'aboveBar' },
                'engulfing_bullish': { shape: 'arrowUp', color: '#26a69a', text: 'Bullish Engulfing (매수)', position: 'belowBar' },
                'engulfing_bearish': { shape: 'arrowDown', color: '#ef5350', text: 'Bearish Engulfing (매도)', position: 'aboveBar' },
                
                // 피보나치
                'fib_support': { shape: 'arrowUp', color: '#00E676', text: `매수 (Fib ${signal.level})`, position: 'belowBar' }
            };

            const config = signalConfig[signal.type] || {
                shape: 'circle',
                color: '#9E9E9E',
                text: signal.text || signal.type,
                position: 'aboveBar'
            };

            return {
                time: signal.time,
                position: config.position,
                color: config.color,
                shape: config.shape,
                text: config.text
            };
        });

        // 캔들스틱 시리즈에 마커 추가
        candlestickSeries.setMarkers(markers);
    }
}

// 지지선과 저항선 분석 토글
function toggleSupportResistanceAnalysis() {
    if (!window.lastCandlestickData || window.lastCandlestickData.length === 0) {
        showError('먼저 차트 데이터를 로드해주세요.');
        return;
    }
    
    if (!isSupportResistanceMode) {
        // 지지선과 저항선 모드로 전환
        showSupportResistanceAnalysis();
    } else {
        // 기본 모드로 복원
        hideSupportResistanceAnalysis();
    }
}

// 지지선과 저항선 분석 표시
function showSupportResistanceAnalysis() {
    console.log('Starting support/resistance analysis');
    
    isSupportResistanceMode = true;
    
    // 최근 1년 데이터 필터링
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoTimestamp = Math.floor(oneYearAgo.getTime() / 1000);
    
    const recentData = window.lastCandlestickData.filter(candle => {
        return candle.time >= oneYearAgoTimestamp;
    });
    
    console.log(`Filtered data: ${recentData.length} candles from last 1 year (out of ${window.lastCandlestickData.length} total)`);
    
    if (recentData.length === 0) {
        showError('최근 1년 데이터가 없습니다.');
        return;
    }
    
    // Swing High/Low 감지 (최근 1년 데이터만)
    const swingPoints = detectSwingPoints(recentData);
    console.log('Swing points detected:', swingPoints.length);
    
    // 지지선과 저항선 계산
    const supportResistanceLevels = calculateSupportResistanceLevels(swingPoints);
    console.log('Support/Resistance levels:', supportResistanceLevels);
    
    // 수평선 표시
    displaySupportResistanceLines(supportResistanceLevels);
}

// 지지선과 저항선 분석 숨기기
function hideSupportResistanceAnalysis() {
    isSupportResistanceMode = false;
    
    // 기존 수평선 제거
    supportResistanceLines.forEach(line => {
        mainChart.removeSeries(line);
    });
    supportResistanceLines = [];
    
    console.log('Support/Resistance analysis hidden');
}

// Swing High/Low 감지
function detectSwingPoints(candlestickData, lookback = 5) {
    const swingPoints = [];
    
    for (let i = lookback; i < candlestickData.length - lookback; i++) {
        const current = candlestickData[i];
        let isSwingHigh = true;
        let isSwingLow = true;
        
        // Swing High 확인 (현재 고점이 좌우 lookback 기간의 모든 고점보다 높음)
        for (let j = i - lookback; j <= i + lookback; j++) {
            if (j !== i && candlestickData[j].high >= current.high) {
                isSwingHigh = false;
                break;
            }
        }
        
        // Swing Low 확인 (현재 저점이 좌우 lookback 기간의 모든 저점보다 낮음)
        for (let j = i - lookback; j <= i + lookback; j++) {
            if (j !== i && candlestickData[j].low <= current.low) {
                isSwingLow = false;
                break;
            }
        }
        
        if (isSwingHigh) {
            swingPoints.push({
                time: current.time,
                price: current.high,
                type: 'high',
                index: i
            });
        }
        
        if (isSwingLow) {
            swingPoints.push({
                time: current.time,
                price: current.low,
                type: 'low',
                index: i
            });
        }
    }
    
    return swingPoints;
}

// 지지선과 저항선 레벨 계산
function calculateSupportResistanceLevels(swingPoints, tolerance = 0.02) {
    const levels = [];
    const priceGroups = {};
    
    // 가격대별로 그룹화 (원래 tolerance 범위)
    swingPoints.forEach(point => {
        const price = point.price;
        let foundGroup = false;
        
        for (const groupPrice in priceGroups) {
            const groupPriceNum = parseFloat(groupPrice);
            if (Math.abs(price - groupPriceNum) / groupPriceNum <= tolerance) {
                priceGroups[groupPrice].push(point);
                foundGroup = true;
                break;
            }
        }
        
        if (!foundGroup) {
            priceGroups[price] = [point];
        }
    });
    
    // 2회 이상 반등/저항 확인된 구간만 필터링 (원래 기준)
    for (const price in priceGroups) {
        const points = priceGroups[price];
        if (points.length >= 2) {
            const avgPrice = points.reduce((sum, p) => sum + p.price, 0) / points.length;
            const highPoints = points.filter(p => p.type === 'high');
            const lowPoints = points.filter(p => p.type === 'low');
            
            if (highPoints.length >= 2) {
                levels.push({
                    price: avgPrice,
                    type: 'resistance',
                    touches: highPoints.length,
                    points: highPoints
                });
            }
            
            if (lowPoints.length >= 2) {
                levels.push({
                    price: avgPrice,
                    type: 'support',
                    touches: lowPoints.length,
                    points: lowPoints
                });
            }
        }
    }
    
    // 가격 순으로 정렬
    return levels.sort((a, b) => a.price - b.price);
}

// 지지선과 저항선 표시
function displaySupportResistanceLines(levels) {
    // 기존 라인 제거
    supportResistanceLines.forEach(line => {
        mainChart.removeSeries(line);
    });
    supportResistanceLines = [];
    
    levels.forEach(level => {
        const color = level.type === 'support' ? '#4caf50' : '#f44336';
        const lineStyle = level.type === 'support' ? 0 : 1; // 0: solid, 1: dashed
        
        const lineSeries = mainChart.addLineSeries({
            color: color,
            lineWidth: 2,
            lineStyle: lineStyle,
            title: `${level.type === 'support' ? '지지선' : '저항선'} (${level.touches}회)`
        });
        
        // 수평선 데이터 생성 (전체 시간 범위에 걸쳐)
        const candlestickData = window.lastCandlestickData;
        if (candlestickData && candlestickData.length > 0) {
            const lineData = [
                {
                    time: candlestickData[0].time,
                    value: level.price
                },
                {
                    time: candlestickData[candlestickData.length - 1].time,
                    value: level.price
                }
            ];
            
            lineSeries.setData(lineData);
            supportResistanceLines.push(lineSeries);
        }
    });
    
    console.log(`Displayed ${levels.length} support/resistance lines`);
}

// 추세선 분석 토글
function toggleTrendAnalysis() {
    if (!window.lastCandlestickData || window.lastCandlestickData.length === 0) {
        showError('먼저 차트 데이터를 로드해주세요.');
        return;
    }
    
    if (!isTrendAnalysisMode) {
        // 추세선 분석 모드로 전환
        showTrendAnalysis();
    } else {
        // 기본 모드로 복원
        hideTrendAnalysis();
    }
}

// 추세선 분석 표시
function showTrendAnalysis() {
    console.log('Starting trend line analysis');
    
    isTrendAnalysisMode = true;
    
    // 최근 3년 데이터 필터링
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const threeYearsAgoTimestamp = Math.floor(threeYearsAgo.getTime() / 1000);
    
    const recentData = window.lastCandlestickData.filter(candle => {
        return candle.time >= threeYearsAgoTimestamp;
    });
    
    console.log(`Filtered data: ${recentData.length} candles from last 3 years for trend analysis`);
    
    if (recentData.length === 0) {
        showError('최근 3년 데이터가 없습니다.');
        return;
    }
    
    // 추세선 감지
    const trendLinesData = detectTrendLines(recentData);
    console.log('Trend lines detected:', trendLinesData.length);
    
    // 추세선 표시
    displayTrendLines(trendLinesData);
}

// 추세선 분석 숨기기
function hideTrendAnalysis() {
    isTrendAnalysisMode = false;
    
    // 기존 추세선 제거
    trendLines.forEach(line => {
        mainChart.removeSeries(line);
    });
    trendLines = [];
    
    console.log('Trend analysis hidden');
}

// 추세선 감지
function detectTrendLines(candlestickData) {
    const trendLines = [];
    
    // 상승 추세선 감지 (저점 연결)
    const supportPoints = detectSupportPoints(candlestickData);
    const upwardTrends = detectUpwardTrends(supportPoints);
    trendLines.push(...upwardTrends);
    
    // 하락 추세선 감지 (고점 연결)
    const resistancePoints = detectResistancePoints(candlestickData);
    const downwardTrends = detectDownwardTrends(resistancePoints);
    trendLines.push(...downwardTrends);
    
    return trendLines;
}

// 저점 감지
function detectSupportPoints(candlestickData, lookback = 5) {
    const supportPoints = [];
    
    for (let i = lookback; i < candlestickData.length - lookback; i++) {
        const current = candlestickData[i];
        let isSupport = true;
        
        // 현재 저점이 좌우 lookback 기간의 모든 저점보다 낮은지 확인
        for (let j = i - lookback; j <= i + lookback; j++) {
            if (j !== i && candlestickData[j].low <= current.low) {
                isSupport = false;
                break;
            }
        }
        
        if (isSupport) {
            supportPoints.push({
                time: current.time,
                price: current.low,
                index: i
            });
        }
    }
    
    return supportPoints;
}

// 고점 감지
function detectResistancePoints(candlestickData, lookback = 5) {
    const resistancePoints = [];
    
    for (let i = lookback; i < candlestickData.length - lookback; i++) {
        const current = candlestickData[i];
        let isResistance = true;
        
        // 현재 고점이 좌우 lookback 기간의 모든 고점보다 높은지 확인
        for (let j = i - lookback; j <= i + lookback; j++) {
            if (j !== i && candlestickData[j].high >= current.high) {
                isResistance = false;
                break;
            }
        }
        
        if (isResistance) {
            resistancePoints.push({
                time: current.time,
                price: current.high,
                index: i
            });
        }
    }
    
    return resistancePoints;
}

// 상승 추세선 감지
function detectUpwardTrends(supportPoints) {
    const trends = [];
    
    if (supportPoints.length < 2) return trends;
    
    // 모든 저점 조합으로 상승 추세선 생성
    for (let i = 0; i < supportPoints.length - 1; i++) {
        for (let j = i + 1; j < supportPoints.length; j++) {
            const point1 = supportPoints[i];
            const point2 = supportPoints[j];
            
            // 기울기 계산
            const slope = (point2.price - point1.price) / (point2.time - point1.time);
            
            // 상승 추세선인지 확인 (기울기가 양수)
            if (slope > 0) {
                // 다른 저점들이 이 추세선 근처에 있는지 확인
                let touchCount = 2; // 기본적으로 2개 점
                const tolerance = Math.max(point1.price, point2.price) * 0.06; // 6% 허용 오차 (더 엄격)
                
                for (let k = 0; k < supportPoints.length; k++) {
                    if (k !== i && k !== j) {
                        const testPoint = supportPoints[k];
                        const expectedPrice = point1.price + slope * (testPoint.time - point1.time);
                        
                        if (Math.abs(testPoint.price - expectedPrice) <= tolerance) {
                            touchCount++;
                        }
                    }
                }
                
                // 3개 이상의 점이 추세선 근처에 있어야 유효한 추세선 (더 엄격한 기준)
                if (touchCount >= 3) {
                    // 신뢰도 점수 계산
                    const timeSpan = point2.time - point1.time;
                    const priceSpan = point2.price - point1.price;
                    const reliability = touchCount * (timeSpan / (365 * 24 * 60 * 60)) * (priceSpan / point1.price);
                    
                    trends.push({
                        type: 'upward',
                        point1: point1,
                        point2: point2,
                        slope: slope,
                        startTime: point1.time,
                        endTime: point2.time,
                        touchCount: touchCount,
                        reliability: reliability
                    });
                }
            }
        }
    }
    
    // 중복 제거 및 정렬 (신뢰도 높은 순)
    const uniqueTrends = removeDuplicateTrends(trends);
    const sortedTrends = uniqueTrends.sort((a, b) => b.reliability - a.reliability);
    
    // 상위 25%만 반환 (추가로 50% 더 줄임)
    return sortedTrends.slice(0, Math.ceil(sortedTrends.length * 0.25));
}

// 하락 추세선 감지
function detectDownwardTrends(resistancePoints) {
    const trends = [];
    
    if (resistancePoints.length < 2) return trends;
    
    // 모든 고점 조합으로 하락 추세선 생성
    for (let i = 0; i < resistancePoints.length - 1; i++) {
        for (let j = i + 1; j < resistancePoints.length; j++) {
            const point1 = resistancePoints[i];
            const point2 = resistancePoints[j];
            
            // 기울기 계산
            const slope = (point2.price - point1.price) / (point2.time - point1.time);
            
            // 하락 추세선인지 확인 (기울기가 음수)
            if (slope < 0) {
                // 다른 고점들이 이 추세선 근처에 있는지 확인
                let touchCount = 2; // 기본적으로 2개 점
                const tolerance = Math.max(point1.price, point2.price) * 0.06; // 6% 허용 오차 (더 엄격)
                
                for (let k = 0; k < resistancePoints.length; k++) {
                    if (k !== i && k !== j) {
                        const testPoint = resistancePoints[k];
                        const expectedPrice = point1.price + slope * (testPoint.time - point1.time);
                        
                        if (Math.abs(testPoint.price - expectedPrice) <= tolerance) {
                            touchCount++;
                        }
                    }
                }
                
                // 3개 이상의 점이 추세선 근처에 있어야 유효한 추세선 (더 엄격한 기준)
                if (touchCount >= 3) {
                    // 신뢰도 점수 계산
                    const timeSpan = point2.time - point1.time;
                    const priceSpan = Math.abs(point2.price - point1.price);
                    const reliability = touchCount * (timeSpan / (365 * 24 * 60 * 60)) * (priceSpan / point1.price);
                    
                    trends.push({
                        type: 'downward',
                        point1: point1,
                        point2: point2,
                        slope: slope,
                        startTime: point1.time,
                        endTime: point2.time,
                        touchCount: touchCount,
                        reliability: reliability
                    });
                }
            }
        }
    }
    
    // 중복 제거 및 정렬 (신뢰도 높은 순)
    const uniqueTrends = removeDuplicateTrends(trends);
    const sortedTrends = uniqueTrends.sort((a, b) => b.reliability - a.reliability);
    
    // 상위 25%만 반환 (추가로 50% 더 줄임)
    return sortedTrends.slice(0, Math.ceil(sortedTrends.length * 0.25));
}

// 추세선 표시
function displayTrendLines(trendLinesData) {
    // 기존 추세선 제거
    trendLines.forEach(line => {
        mainChart.removeSeries(line);
    });
    trendLines = [];
    
    trendLinesData.forEach(trend => {
        const color = trend.type === 'upward' ? '#4caf50' : '#f44336';
        const lineStyle = trend.type === 'upward' ? 0 : 1; // 상승: 실선, 하락: 점선
        
        const lineSeries = mainChart.addLineSeries({
            color: color,
            lineWidth: 2,
            lineStyle: lineStyle,
            title: `${trend.type === 'upward' ? '상승추세선' : '하락추세선'}`
        });
        
        // 추세선 데이터 생성
        const lineData = [
            {
                time: trend.startTime,
                value: trend.point1.price
            },
            {
                time: trend.endTime,
                value: trend.point2.price
            }
        ];
        
        lineSeries.setData(lineData);
        trendLines.push(lineSeries);
    });
    
    console.log(`Displayed ${trendLinesData.length} trend lines`);
}

// 중복 추세선 제거
function removeDuplicateTrends(trends) {
    const uniqueTrends = [];
    
    for (let i = 0; i < trends.length; i++) {
        let isDuplicate = false;
        let duplicateIndex = -1;
        
        for (let j = 0; j < uniqueTrends.length; j++) {
            const trend1 = trends[i];
            const trend2 = uniqueTrends[j];
            
            // 같은 타입이고 기울기가 비슷한지 확인
            if (trend1.type === trend2.type) {
                const slopeDiff = Math.abs(trend1.slope - trend2.slope);
                const avgSlope = (Math.abs(trend1.slope) + Math.abs(trend2.slope)) / 2;
                
                if (slopeDiff / avgSlope < 0.1) { // 10% 이내 기울기 차이
                    isDuplicate = true;
                    duplicateIndex = j;
                    break;
                }
            }
        }
        
        if (isDuplicate) {
            // 중복된 경우 신뢰도가 높은 것을 유지
            if (trends[i].reliability > uniqueTrends[duplicateIndex].reliability) {
                uniqueTrends[duplicateIndex] = trends[i];
            }
        } else {
            uniqueTrends.push(trends[i]);
        }
    }
    
    return uniqueTrends;
}

// 삼각수렴 패턴 분석 토글
function toggleTrianglePatternAnalysis() {
    if (!window.lastCandlestickData || window.lastCandlestickData.length === 0) {
        showError('먼저 차트 데이터를 로드해주세요.');
        return;
    }
    
    if (!isTrianglePatternMode) {
        // 삼각수렴 패턴 모드로 전환
        showTrianglePatternAnalysis();
    } else {
        // 기본 모드로 복원
        hideTrianglePatternAnalysis();
    }
}

// 삼각수렴 패턴 분석 표시
function showTrianglePatternAnalysis() {
    console.log('Starting triangle pattern analysis');
    
    isTrianglePatternMode = true;
    
    // 최근 2년 데이터 필터링
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const twoYearsAgoTimestamp = Math.floor(twoYearsAgo.getTime() / 1000);
    
    const recentData = window.lastCandlestickData.filter(candle => {
        return candle.time >= twoYearsAgoTimestamp;
    });
    
    console.log(`Filtered data: ${recentData.length} candles from last 2 years for triangle analysis`);
    
    if (recentData.length === 0) {
        showError('최근 2년 데이터가 없습니다.');
        return;
    }
    
    // 삼각수렴 패턴 감지
    const trianglePatternsData = detectTrianglePatterns(recentData);
    console.log('Triangle patterns detected:', trianglePatternsData.length);
    
    // 디버깅을 위한 상세 로그
    if (trianglePatternsData.length === 0) {
        console.log('No triangle patterns found. Checking data...');
        console.log('Sample data points:', recentData.slice(0, 5).map(c => ({
            time: new Date(c.time * 1000).toISOString(),
            high: c.high,
            low: c.low,
            close: c.close
        })));
    }
    
    // 삼각수렴 패턴 표시
    displayTrianglePatterns(trianglePatternsData);
}

// 삼각수렴 패턴 분석 숨기기
function hideTrianglePatternAnalysis() {
    isTrianglePatternMode = false;
    
    // 기존 삼각수렴 패턴 제거
    trianglePatterns.forEach(pattern => {
        if (pattern.upperLine) mainChart.removeSeries(pattern.upperLine);
        if (pattern.lowerLine) mainChart.removeSeries(pattern.lowerLine);
        if (pattern.breakoutMarker) candlestickSeries.setMarkers([]);
    });
    trianglePatterns = [];
    
    console.log('Triangle pattern analysis hidden');
}

// 삼각수렴 패턴 감지
function detectTrianglePatterns(candlestickData) {
    const patterns = [];
    
    // 최소 15개 캔들이 필요
    if (candlestickData.length < 15) return patterns;
    
    console.log('Starting triangle pattern detection with', candlestickData.length, 'candles');
    
    // 더 간단한 삼각수렴 패턴 감지
    for (let i = 15; i < candlestickData.length - 5; i++) {
        const windowData = candlestickData.slice(i - 15, i + 5);
        const triangle = detectBasicTriangle(windowData, i - 15);
        
        if (triangle) {
            patterns.push(triangle);
            console.log('Triangle pattern found at index', i - 15);
        }
    }
    
    console.log('Total triangle patterns found:', patterns.length);
    return patterns;
}

// 간단한 삼각수렴 패턴 감지
function detectSimpleTriangle(windowData, startIndex) {
    if (windowData.length < 10) return null;
    
    console.log('Checking window with', windowData.length, 'candles');
    
    // 고점과 저점 추출
    const highs = windowData.map(candle => ({ time: candle.time, price: candle.high }));
    const lows = windowData.map(candle => ({ time: candle.time, price: candle.low }));
    
    // 상단 저항선 찾기 (고점이 점차 낮아지는 선)
    const upperTrend = findUpperTrend(highs);
    if (!upperTrend) {
        console.log('No upper trend found');
        return null;
    }
    
    // 하단 지지선 찾기 (저점이 점차 높아지는 선)
    const lowerTrend = findLowerTrend(lows);
    if (!lowerTrend) {
        console.log('No lower trend found');
        return null;
    }
    
    // 수렴점 계산
    const convergencePoint = calculateConvergencePoint(upperTrend, lowerTrend);
    if (!convergencePoint) {
        console.log('No convergence point found');
        return null;
    }
    
    // 수렴점이 윈도우 내에 있는지 확인 (더 유연하게)
    const windowEndTime = windowData[windowData.length - 1].time;
    const windowStartTime = windowData[0].time;
    const timeSpan = windowEndTime - windowStartTime;
    
    if (convergencePoint.time > windowEndTime + timeSpan * 0.5) {
        console.log('Convergence point too far in future');
        return null;
    }
    
    console.log('Triangle found:', {
        upperTrend: upperTrend,
        lowerTrend: lowerTrend,
        convergencePoint: convergencePoint
    });
    
    return {
        upperTrend: upperTrend,
        lowerTrend: lowerTrend,
        convergencePoint: convergencePoint,
        startTime: windowData[0].time,
        endTime: windowData[windowData.length - 1].time,
        startIndex: startIndex
    };
}

// 상단 저항선 찾기
function findUpperTrend(highs) {
    if (highs.length < 3) return null;
    
    // 최근 3-5개 고점으로 기울기 계산
    const recentHighs = highs.slice(-Math.min(5, highs.length));
    const slope = calculateSimpleSlope(recentHighs);
    
    // 기울기가 음수여야 함 (고점이 낮아짐) - 매우 유연한 기준
    if (slope >= -0.0000001) return null;
    
    console.log('Upper trend found:', { slope, points: recentHighs.length });
    
    return {
        startTime: recentHighs[0].time,
        startPrice: recentHighs[0].price,
        slope: slope
    };
}

// 하단 지지선 찾기
function findLowerTrend(lows) {
    if (lows.length < 3) return null;
    
    // 최근 3-5개 저점으로 기울기 계산
    const recentLows = lows.slice(-Math.min(5, lows.length));
    const slope = calculateSimpleSlope(recentLows);
    
    // 기울기가 양수여야 함 (저점이 높아짐) - 매우 유연한 기준
    if (slope <= 0.0000001) return null;
    
    console.log('Lower trend found:', { slope, points: recentLows.length });
    
    return {
        startTime: recentLows[0].time,
        startPrice: recentLows[0].price,
        slope: slope
    };
}

// 간단한 기울기 계산
function calculateSimpleSlope(points) {
    if (points.length < 2) return 0;
    
    const first = points[0];
    const last = points[points.length - 1];
    
    return (last.price - first.price) / (last.time - first.time);
}

// 기본 삼각수렴 패턴 감지 (매우 간단한 버전)
function detectBasicTriangle(windowData, startIndex) {
    if (windowData.length < 10) return null;
    
    console.log('Checking basic triangle with', windowData.length, 'candles');
    
    // 고점과 저점 추출
    const highs = windowData.map(candle => ({ time: candle.time, price: candle.high }));
    const lows = windowData.map(candle => ({ time: candle.time, price: candle.low }));
    
    // 첫 번째와 마지막 고점 비교
    const firstHigh = highs[0];
    const lastHigh = highs[highs.length - 1];
    const highSlope = (lastHigh.price - firstHigh.price) / (lastHigh.time - firstHigh.time);
    
    // 첫 번째와 마지막 저점 비교
    const firstLow = lows[0];
    const lastLow = lows[lows.length - 1];
    const lowSlope = (lastLow.price - firstLow.price) / (lastLow.time - firstLow.time);
    
    console.log('High slope:', highSlope, 'Low slope:', lowSlope);
    
    // 고점이 낮아지고 저점이 높아지는지 확인 (매우 유연한 기준)
    if (highSlope >= -0.00000001 || lowSlope <= 0.00000001) {
        console.log('Triangle conditions not met');
        return null;
    }
    
    // 수렴점 계산 (간단한 선형 교차)
    const convergenceTime = firstHigh.time + (firstLow.price - firstHigh.price) / (highSlope - lowSlope);
    const convergencePrice = firstHigh.price + highSlope * (convergenceTime - firstHigh.time);
    
    console.log('Basic triangle found:', {
        highSlope,
        lowSlope,
        convergenceTime,
        convergencePrice
    });
    
    return {
        upperTrend: {
            startTime: firstHigh.time,
            startPrice: firstHigh.price,
            slope: highSlope
        },
        lowerTrend: {
            startTime: firstLow.time,
            startPrice: firstLow.price,
            slope: lowSlope
        },
        convergencePoint: {
            time: convergenceTime,
            price: convergencePrice
        },
        startTime: windowData[0].time,
        endTime: windowData[windowData.length - 1].time,
        startIndex: startIndex
    };
}

// 윈도우 내에서 삼각수렴 패턴 감지
function detectTriangleInWindow(windowData, startIndex) {
    if (windowData.length < 15) return null;
    
    // 고점과 저점 추출
    const highs = windowData.map(candle => ({ time: candle.time, price: candle.high }));
    const lows = windowData.map(candle => ({ time: candle.time, price: candle.low }));
    
    // 상단 저항선 (고점이 점차 낮아지는 선)
    const upperTrend = calculateUpperTrend(highs);
    if (!upperTrend) return null;
    
    // 하단 지지선 (저점이 점차 높아지는 선)
    const lowerTrend = calculateLowerTrend(lows);
    if (!lowerTrend) return null;
    
    // 수렴 확인 (두 선이 만나는 지점이 미래에 있는지)
    const convergencePoint = calculateConvergencePoint(upperTrend, lowerTrend);
    if (!convergencePoint) return null;
    
    // 수렴 지점이 윈도우 내에 있는지 확인 (더 유연하게)
    const windowEndTime = windowData[windowData.length - 1].time;
    const windowStartTime = windowData[0].time;
    const timeSpan = windowEndTime - windowStartTime;
    
    // 수렴점이 윈도우 끝에서 20% 이내에 있으면 허용
    if (convergencePoint.time > windowEndTime + timeSpan * 0.2) return null;
    
    // 돌파 감지 (더 유연한 기준)
    const breakoutPoint = detectBreakout(windowData, upperTrend, lowerTrend, convergencePoint);
    
    return {
        upperTrend: upperTrend,
        lowerTrend: lowerTrend,
        convergencePoint: convergencePoint,
        breakoutPoint: breakoutPoint,
        startTime: windowData[0].time,
        endTime: windowData[windowData.length - 1].time,
        startIndex: startIndex
    };
}

// 상단 저항선 계산 (고점이 점차 낮아지는 선)
function calculateUpperTrend(highs) {
    if (highs.length < 3) return null;
    
    // 최근 3-5개 고점으로 추세선 계산 (더 유연하게)
    const recentHighs = highs.slice(-Math.min(5, highs.length));
    const slope = calculateTrendSlope(recentHighs);
    
    // 기울기가 음수여야 함 (고점이 낮아짐) - 더 유연한 기준
    if (slope >= -0.000001) return null; // 거의 평행선도 허용
    
    const startPoint = recentHighs[0];
    return {
        startTime: startPoint.time,
        startPrice: startPoint.price,
        slope: slope
    };
}

// 하단 지지선 계산 (저점이 점차 높아지는 선)
function calculateLowerTrend(lows) {
    if (lows.length < 3) return null;
    
    // 최근 3-5개 저점으로 추세선 계산 (더 유연하게)
    const recentLows = lows.slice(-Math.min(5, lows.length));
    const slope = calculateTrendSlope(recentLows);
    
    // 기울기가 양수여야 함 (저점이 높아짐) - 더 유연한 기준
    if (slope <= 0.000001) return null; // 거의 평행선도 허용
    
    const startPoint = recentLows[0];
    return {
        startTime: startPoint.time,
        startPrice: startPoint.price,
        slope: slope
    };
}

// 추세선 기울기 계산
function calculateTrendSlope(points) {
    if (points.length < 2) return 0;
    
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.time, 0);
    const sumY = points.reduce((sum, p) => sum + p.price, 0);
    const sumXY = points.reduce((sum, p) => sum + p.time * p.price, 0);
    const sumXX = points.reduce((sum, p) => sum + p.time * p.time, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
}

// 수렴점 계산
function calculateConvergencePoint(upperTrend, lowerTrend) {
    const timeDiff = lowerTrend.startTime - upperTrend.startTime;
    const priceDiff = lowerTrend.startPrice - upperTrend.startPrice;
    
    const slopeDiff = upperTrend.slope - lowerTrend.slope;
    
    if (Math.abs(slopeDiff) < 1e-10) return null; // 평행선
    
    const convergenceTime = upperTrend.startTime + (priceDiff - upperTrend.slope * timeDiff) / slopeDiff;
    const convergencePrice = upperTrend.startPrice + upperTrend.slope * (convergenceTime - upperTrend.startTime);
    
    return {
        time: convergenceTime,
        price: convergencePrice
    };
}

// 돌파 감지
function detectBreakout(windowData, upperTrend, lowerTrend, convergencePoint) {
    const convergenceProgress = (windowData[windowData.length - 1].time - windowData[0].time) / 
                               (convergencePoint.time - windowData[0].time);
    
    // 50-80% 지점에서 돌파 확인 (더 유연한 기준)
    if (convergenceProgress < 0.5 || convergenceProgress > 0.8) return null;
    
    const lastCandle = windowData[windowData.length - 1];
    const upperPrice = upperTrend.startPrice + upperTrend.slope * (lastCandle.time - upperTrend.startTime);
    const lowerPrice = lowerTrend.startPrice + lowerTrend.slope * (lastCandle.time - lowerTrend.startTime);
    
    // 상향 돌파 또는 하향 돌파 확인 (더 유연한 기준)
    let breakoutType = null;
    const tolerance = Math.max(upperPrice, lowerPrice) * 0.02; // 2% 허용 오차
    
    if (lastCandle.close > upperPrice + tolerance) {
        breakoutType = 'upward';
    } else if (lastCandle.close < lowerPrice - tolerance) {
        breakoutType = 'downward';
    }
    
    if (!breakoutType) return null;
    
    // 거래량 급등 확인
    const volumeSpike = checkVolumeSpike(windowData);
    
    return {
        time: lastCandle.time,
        price: lastCandle.close,
        type: breakoutType,
        volumeSpike: volumeSpike
    };
}

// 거래량 급등 확인
function checkVolumeSpike(windowData) {
    if (windowData.length < 10) return false;
    
    const recentVolumes = windowData.slice(-3).map(candle => candle.volume || 0);
    const avgVolume = windowData.slice(-10, -3).reduce((sum, candle) => sum + (candle.volume || 0), 0) / 7;
    
    const currentVolume = recentVolumes[recentVolumes.length - 1];
    
    // 거래량이 평균의 1.5배 이상이면 급등으로 간주
    return currentVolume > avgVolume * 1.5;
}

// 삼각수렴 패턴 표시
function displayTrianglePatterns(patterns) {
    // 기존 패턴 제거
    trianglePatterns.forEach(pattern => {
        if (pattern.upperLine) mainChart.removeSeries(pattern.upperLine);
        if (pattern.lowerLine) mainChart.removeSeries(pattern.lowerLine);
    });
    trianglePatterns = [];
    
    patterns.forEach(pattern => {
        // 상단 저항선 (빨간색)
        const upperLine = mainChart.addLineSeries({
            color: '#f44336',
            lineWidth: 2,
            lineStyle: 1, // 점선
            title: '삼각수렴 상단선'
        });
        
        // 하단 지지선 (녹색)
        const lowerLine = mainChart.addLineSeries({
            color: '#4caf50',
            lineWidth: 2,
            lineStyle: 1, // 점선
            title: '삼각수렴 하단선'
        });
        
        // 상단선 데이터
        const upperData = [
            {
                time: pattern.upperTrend.startTime,
                value: pattern.upperTrend.startPrice
            },
            {
                time: pattern.convergencePoint.time,
                value: pattern.convergencePoint.price
            }
        ];
        
        // 하단선 데이터
        const lowerData = [
            {
                time: pattern.lowerTrend.startTime,
                value: pattern.lowerTrend.startPrice
            },
            {
                time: pattern.convergencePoint.time,
                value: pattern.convergencePoint.price
            }
        ];
        
        upperLine.setData(upperData);
        lowerLine.setData(lowerData);
        
        trianglePatterns.push({
            upperLine: upperLine,
            lowerLine: lowerLine,
            pattern: pattern
        });
        
        // 돌파 마커 표시
        if (pattern.breakoutPoint) {
            const marker = {
                time: pattern.breakoutPoint.time,
                position: pattern.breakoutPoint.type === 'upward' ? 'aboveBar' : 'belowBar',
                color: pattern.breakoutPoint.type === 'upward' ? '#4caf50' : '#f44336',
                shape: pattern.breakoutPoint.type === 'upward' ? 'arrowUp' : 'arrowDown',
                text: `삼각수렴 돌파${pattern.breakoutPoint.volumeSpike ? ' (거래량 급등)' : ''}`,
                size: 2
            };
            
            candlestickSeries.setMarkers([marker]);
        }
    });
    
    console.log(`Displayed ${patterns.length} triangle patterns`);
}

// 헤드앤숄더 패턴 분석 토글
function toggleHeadShoulderAnalysis() {
    if (!window.lastCandlestickData || window.lastCandlestickData.length === 0) {
        showError('먼저 차트 데이터를 로드해주세요.');
        return;
    }
    
    if (!isHeadShoulderMode) {
        // 헤드앤숄더 패턴 모드로 전환
        showHeadShoulderAnalysis();
    } else {
        // 기본 모드로 복원
        hideHeadShoulderAnalysis();
    }
}

// 헤드앤숄더 패턴 분석 표시
function showHeadShoulderAnalysis() {
    console.log('Starting head and shoulders pattern analysis');
    
    isHeadShoulderMode = true;
    
    // 최근 1년 데이터 필터링
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoTimestamp = Math.floor(oneYearAgo.getTime() / 1000);
    
    const recentData = window.lastCandlestickData.filter(candle => {
        return candle.time >= oneYearAgoTimestamp;
    });
    
    console.log(`Filtered data: ${recentData.length} candles from last 1 year for head and shoulders analysis`);
    
    if (recentData.length === 0) {
        showError('최근 1년 데이터가 없습니다.');
        return;
    }
    
    // 헤드앤숄더 패턴 감지
    const headShoulderPatternsData = detectHeadShoulderPatterns(recentData);
    console.log('Head and shoulders patterns detected:', headShoulderPatternsData.length);
    
    // 헤드앤숄더 패턴 표시
    displayHeadShoulderPatterns(headShoulderPatternsData);
}

// 헤드앤숄더 패턴 분석 숨기기
function hideHeadShoulderAnalysis() {
    isHeadShoulderMode = false;
    
    // 기존 헤드앤숄더 패턴 제거
    headShoulderPatterns.forEach(pattern => {
        if (pattern.neckline) mainChart.removeSeries(pattern.neckline);
    });
    headShoulderPatterns = [];
    
    // 모든 마커 제거
    candlestickSeries.setMarkers([]);
    
    console.log('Head and shoulders pattern analysis hidden');
}

// 헤드앤숄더 패턴 감지
function detectHeadShoulderPatterns(candlestickData) {
    const patterns = [];
    
    // 최소 15개 캔들이 필요 (20에서 15로 감소)
    if (candlestickData.length < 15) return patterns;
    
    console.log('Starting head and shoulders pattern detection with', candlestickData.length, 'candles');
    
    // 슬라이딩 윈도우로 헤드앤숄더 패턴 감지 (더 유연한 윈도우)
    for (let i = 15; i < candlestickData.length - 3; i++) {
        // 윈도우 크기를 15-25개 캔들로 동적 조정
        const windowSize = Math.min(25, Math.max(15, candlestickData.length - i));
        const windowData = candlestickData.slice(i - windowSize, i + 3);
        const pattern = detectHeadShoulderInWindow(windowData, i - windowSize);
        
        if (pattern) {
            patterns.push(pattern);
            console.log('Head and shoulders pattern found at index', i - windowSize);
        }
    }
    
    console.log('Total head and shoulders patterns found:', patterns.length);
    return patterns;
}

// 윈도우 내에서 헤드앤숄더 패턴 감지
function detectHeadShoulderInWindow(windowData, startIndex) {
    if (windowData.length < 15) return null;
    
    console.log('Checking head and shoulders with', windowData.length, 'candles');
    
    // 고점과 저점 추출
    const highs = windowData.map(candle => ({ time: candle.time, price: candle.high }));
    const lows = windowData.map(candle => ({ time: candle.time, price: candle.low }));
    
    // 좌·중·우 고점 찾기
    const peaks = findThreePeaks(highs);
    if (!peaks) {
        console.log('No three peaks found');
        return null;
    }
    
    // 넥라인 계산 (좌어깨와 우어깨의 저점을 연결)
    const neckline = calculateNeckline(peaks, lows);
    if (!neckline) {
        console.log('No neckline found');
        return null;
    }
    
    // 넥라인 돌파 감지
    const breakout = detectNecklineBreakout(windowData, neckline, peaks);
    
    console.log('Head and shoulders pattern found:', {
        peaks: peaks,
        neckline: neckline,
        breakout: breakout
    });
    
    return {
        peaks: peaks,
        neckline: neckline,
        breakout: breakout,
        startTime: windowData[0].time,
        endTime: windowData[windowData.length - 1].time,
        startIndex: startIndex
    };
}

// 세 개의 고점 찾기 (좌어깨, 머리, 우어깨)
function findThreePeaks(highs) {
    if (highs.length < 8) return null;
    
    // 고점들을 찾기 위해 슬라이딩 윈도우 사용 (더 유연한 기준)
    const peaks = [];
    const lookback = 1; // 2에서 1로 줄여서 더 많은 고점 감지
    
    for (let i = lookback; i < highs.length - lookback; i++) {
        const current = highs[i];
        let isPeak = true;
        
        // 좌우로 lookback만큼 확인하여 고점인지 판단
        for (let j = i - lookback; j <= i + lookback; j++) {
            if (j !== i && highs[j].price >= current.price) {
                isPeak = false;
                break;
            }
        }
        
        if (isPeak) {
            peaks.push({ index: i, time: current.time, price: current.price });
        }
    }
    
    if (peaks.length < 3) return null;
    
    // 최근 3개 고점 선택
    const recentPeaks = peaks.slice(-3);
    
    // 헤드앤숄더 패턴 조건 확인 (더 유연한 기준)
    const leftShoulder = recentPeaks[0];
    const head = recentPeaks[1];
    const rightShoulder = recentPeaks[2];
    
    // 머리가 가장 높아야 함 (더 유연한 기준)
    if (head.price <= leftShoulder.price * 0.95 || head.price <= rightShoulder.price * 0.95) {
        console.log('Head is not significantly higher than shoulders');
        return null;
    }
    
    // 좌어깨와 우어깨가 비슷한 높이여야 함 (30% 이내로 확대)
    const shoulderHeightDiff = Math.abs(leftShoulder.price - rightShoulder.price);
    const avgShoulderHeight = (leftShoulder.price + rightShoulder.price) / 2;
    
    if (shoulderHeightDiff / avgShoulderHeight > 0.3) {
        console.log('Shoulders are not similar height');
        return null;
    }
    
    return {
        leftShoulder: leftShoulder,
        head: head,
        rightShoulder: rightShoulder
    };
}

// 넥라인 계산 (좌어깨와 우어깨의 저점을 연결)
function calculateNeckline(peaks, lows) {
    const leftShoulder = peaks.leftShoulder;
    const rightShoulder = peaks.rightShoulder;
    
    // 좌어깨와 우어깨 사이의 저점들 찾기
    const necklineLows = [];
    
    for (let i = 0; i < lows.length; i++) {
        const low = lows[i];
        if (low.time >= leftShoulder.time && low.time <= rightShoulder.time) {
            necklineLows.push(low);
        }
    }
    
    if (necklineLows.length < 1) return null;
    
    // 가장 낮은 두 점을 찾아 넥라인 계산
    necklineLows.sort((a, b) => a.price - b.price);
    const lowest1 = necklineLows[0];
    const lowest2 = necklineLows.length > 1 ? necklineLows[1] : lowest1;
    
    // 넥라인 기울기 계산
    const slope = (lowest2.price - lowest1.price) / (lowest2.time - lowest1.time);
    
    return {
        startTime: lowest1.time,
        startPrice: lowest1.price,
        slope: slope
    };
}

// 넥라인 돌파 감지
function detectNecklineBreakout(windowData, neckline, peaks) {
    const rightShoulder = peaks.rightShoulder;
    
    // 우어깨 이후의 데이터에서 넥라인 돌파 확인
    const afterRightShoulder = windowData.filter(candle => candle.time > rightShoulder.time);
    
    if (afterRightShoulder.length === 0) return null;
    
    // 거래량 급증 확인을 위한 평균 거래량 계산
    const avgVolume = calculateAverageVolume(windowData.slice(0, -afterRightShoulder.length));
    
    // 더 유연한 돌파 감지 (5% 허용 오차)
    const tolerance = neckline.startPrice * 0.05;
    
    for (let i = 0; i < afterRightShoulder.length; i++) {
        const candle = afterRightShoulder[i];
        const expectedPrice = neckline.startPrice + neckline.slope * (candle.time - neckline.startTime);
        
        // 종가 기준 하향 돌파 (헤드앤숄더) - 더 유연한 기준
        if (candle.close < expectedPrice - tolerance) {
            // 거래량 급증 확인 (더 유연한 기준)
            const volumeSpike = candle.volume > avgVolume * 1.2;
            
            return {
                time: candle.time,
                price: candle.close,
                type: 'downward',
                pattern: 'head_and_shoulders',
                volumeSpike: volumeSpike
            };
        }
        
        // 종가 기준 상향 돌파 (역헤드앤숄더) - 더 유연한 기준
        if (candle.close > expectedPrice + tolerance) {
            // 거래량 급증 확인 (더 유연한 기준)
            const volumeSpike = candle.volume > avgVolume * 1.2;
            
            return {
                time: candle.time,
                price: candle.close,
                type: 'upward',
                pattern: 'inverse_head_and_shoulders',
                volumeSpike: volumeSpike
            };
        }
    }
    
    return null;
}

// 평균 거래량 계산
function calculateAverageVolume(candles) {
    if (candles.length === 0) return 0;
    
    const totalVolume = candles.reduce((sum, candle) => sum + (candle.volume || 0), 0);
    return totalVolume / candles.length;
}

// 헤드앤숄더 패턴 표시
function displayHeadShoulderPatterns(patterns) {
    // 기존 패턴 제거
    headShoulderPatterns.forEach(pattern => {
        if (pattern.neckline) mainChart.removeSeries(pattern.neckline);
    });
    headShoulderPatterns = [];
    
    const allMarkers = [];
    const markerTimes = new Set(); // 중복 시간 체크용
    
    patterns.forEach(pattern => {
        // 넥라인은 표시하지 않음
        
        headShoulderPatterns.push({
            neckline: null,
            pattern: pattern
        });
        
        // 돌파 마커만 표시 (중복 제거)
        if (pattern.breakout) {
            const markerTime = pattern.breakout.time;
            
            // 같은 시간에 마커가 이미 있는지 확인
            if (!markerTimes.has(markerTime)) {
                markerTimes.add(markerTime);
                
                const marker = {
                    time: markerTime,
                    position: pattern.breakout.type === 'upward' ? 'aboveBar' : 'belowBar',
                    color: pattern.breakout.type === 'upward' ? '#4caf50' : '#f44336',
                    shape: pattern.breakout.type === 'upward' ? 'arrowUp' : 'arrowDown',
                    text: pattern.breakout.pattern === 'head_and_shoulders' ? 
                        (pattern.breakout.volumeSpike ? '헤드앤숄더 하락전환 (거래량 급증)' : '헤드앤숄더 하락전환') :
                        (pattern.breakout.volumeSpike ? '역헤드앤숄더 상승전환 (거래량 급증)' : '역헤드앤숄더 상승전환'),
                    size: 2
                };
                
                allMarkers.push(marker);
            }
        }
    });
    
    // 모든 마커를 한 번에 설정
    if (allMarkers.length > 0) {
        candlestickSeries.setMarkers(allMarkers);
    }
    
    console.log(`Displayed ${patterns.length} head and shoulders patterns with ${allMarkers.length} unique breakout markers`);
}

// 더블탑/더블바텀 패턴 분석 토글
function toggleDoublePatternAnalysis() {
    if (!window.lastCandlestickData || window.lastCandlestickData.length === 0) {
        showError('먼저 차트 데이터를 로드해주세요.');
        return;
    }
    
    if (!isDoublePatternMode) {
        // 더블탑/더블바텀 패턴 모드로 전환
        showDoublePatternAnalysis();
    } else {
        // 기본 모드로 복원
        hideDoublePatternAnalysis();
    }
}

// 더블탑/더블바텀 패턴 분석 표시
function showDoublePatternAnalysis() {
    console.log('Starting double top/bottom pattern analysis');
    
    isDoublePatternMode = true;
    
    // 최근 1년 데이터 필터링
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoTimestamp = Math.floor(oneYearAgo.getTime() / 1000);
    
    const recentData = window.lastCandlestickData.filter(candle => {
        return candle.time >= oneYearAgoTimestamp;
    });
    
    console.log(`Filtered data: ${recentData.length} candles from last 1 year for double pattern analysis`);
    
    if (recentData.length === 0) {
        showError('최근 1년 데이터가 없습니다.');
        return;
    }
    
    // 더블탑/더블바텀 패턴 감지
    const doublePatternsData = detectDoublePatterns(recentData);
    console.log('Double patterns detected:', doublePatternsData.length);
    
    // 더블탑/더블바텀 패턴 표시
    displayDoublePatterns(doublePatternsData);
}

// 더블탑/더블바텀 패턴 분석 숨기기
function hideDoublePatternAnalysis() {
    isDoublePatternMode = false;
    
    // 기존 더블탑/더블바텀 패턴 제거
    doublePatterns.forEach(pattern => {
        if (pattern.neckline) mainChart.removeSeries(pattern.neckline);
    });
    doublePatterns = [];
    
    // 모든 마커 제거
    candlestickSeries.setMarkers([]);
    
    console.log('Double pattern analysis hidden');
}

// 더블탑/더블바텀 패턴 감지
function detectDoublePatterns(candlestickData) {
    const patterns = [];
    
    // 최소 20개 캔들이 필요
    if (candlestickData.length < 20) return patterns;
    
    console.log('Starting double pattern detection with', candlestickData.length, 'candles');
    
    // 슬라이딩 윈도우로 더블탑/더블바텀 패턴 감지
    for (let i = 20; i < candlestickData.length - 5; i++) {
        const windowData = candlestickData.slice(i - 20, i + 5);
        const pattern = detectDoublePatternInWindow(windowData, i - 20);
        
        if (pattern) {
            patterns.push(pattern);
            console.log('Double pattern found at index', i - 20);
        }
    }
    
    console.log('Total double patterns found:', patterns.length);
    return patterns;
}

// 윈도우 내에서 더블탑/더블바텀 패턴 감지
function detectDoublePatternInWindow(windowData, startIndex) {
    if (windowData.length < 20) return null;
    
    console.log('Checking double pattern with', windowData.length, 'candles');
    
    // 고점과 저점 추출
    const highs = windowData.map(candle => ({ time: candle.time, price: candle.high }));
    const lows = windowData.map(candle => ({ time: candle.time, price: candle.low }));
    
    // 더블탑 패턴 감지
    const doubleTop = detectDoubleTop(highs);
    if (doubleTop) {
        const neckline = calculateDoubleTopNeckline(doubleTop, lows);
        if (neckline) {
            const breakout = detectDoubleTopBreakout(windowData, neckline, doubleTop);
            return {
                type: 'double_top',
                peaks: doubleTop,
                neckline: neckline,
                breakout: breakout,
                startTime: windowData[0].time,
                endTime: windowData[windowData.length - 1].time,
                startIndex: startIndex
            };
        }
    }
    
    // 더블바텀 패턴 감지
    const doubleBottom = detectDoubleBottom(lows);
    if (doubleBottom) {
        const neckline = calculateDoubleBottomNeckline(doubleBottom, highs);
        if (neckline) {
            const breakout = detectDoubleBottomBreakout(windowData, neckline, doubleBottom);
            return {
                type: 'double_bottom',
                valleys: doubleBottom,
                neckline: neckline,
                breakout: breakout,
                startTime: windowData[0].time,
                endTime: windowData[windowData.length - 1].time,
                startIndex: startIndex
            };
        }
    }
    
    return null;
}

// 더블탑 패턴 감지
function detectDoubleTop(highs) {
    if (highs.length < 10) return null;
    
    // 고점들을 찾기 위해 슬라이딩 윈도우 사용
    const peaks = [];
    const lookback = 2;
    
    for (let i = lookback; i < highs.length - lookback; i++) {
        const current = highs[i];
        let isPeak = true;
        
        for (let j = i - lookback; j <= i + lookback; j++) {
            if (j !== i && highs[j].price >= current.price) {
                isPeak = false;
                break;
            }
        }
        
        if (isPeak) {
            peaks.push({ index: i, time: current.time, price: current.price });
        }
    }
    
    if (peaks.length < 2) return null;
    
    // 최근 2개 고점 선택
    const recentPeaks = peaks.slice(-2);
    const peak1 = recentPeaks[0];
    const peak2 = recentPeaks[1];
    
    // 두 고점이 거의 동일한 가격대인지 확인 (5% 이내)
    const priceDiff = Math.abs(peak1.price - peak2.price);
    const avgPrice = (peak1.price + peak2.price) / 2;
    
    if (priceDiff / avgPrice > 0.05) {
        console.log('Double top peaks are not similar in price');
        return null;
    }
    
    return {
        peak1: peak1,
        peak2: peak2
    };
}

// 더블바텀 패턴 감지
function detectDoubleBottom(lows) {
    if (lows.length < 10) return null;
    
    // 저점들을 찾기 위해 슬라이딩 윈도우 사용
    const valleys = [];
    const lookback = 2;
    
    for (let i = lookback; i < lows.length - lookback; i++) {
        const current = lows[i];
        let isValley = true;
        
        for (let j = i - lookback; j <= i + lookback; j++) {
            if (j !== i && lows[j].price <= current.price) {
                isValley = false;
                break;
            }
        }
        
        if (isValley) {
            valleys.push({ index: i, time: current.time, price: current.price });
        }
    }
    
    if (valleys.length < 2) return null;
    
    // 최근 2개 저점 선택
    const recentValleys = valleys.slice(-2);
    const valley1 = recentValleys[0];
    const valley2 = recentValleys[1];
    
    // 두 저점이 거의 동일한 가격대인지 확인 (5% 이내)
    const priceDiff = Math.abs(valley1.price - valley2.price);
    const avgPrice = (valley1.price + valley2.price) / 2;
    
    if (priceDiff / avgPrice > 0.05) {
        console.log('Double bottom valleys are not similar in price');
        return null;
    }
    
    return {
        valley1: valley1,
        valley2: valley2
    };
}

// 더블탑 넥라인 계산
function calculateDoubleTopNeckline(doubleTop, lows) {
    const peak1 = doubleTop.peak1;
    const peak2 = doubleTop.peak2;
    
    // 두 고점 사이의 저점들 찾기
    const necklineLows = [];
    
    for (let i = 0; i < lows.length; i++) {
        const low = lows[i];
        if (low.time >= peak1.time && low.time <= peak2.time) {
            necklineLows.push(low);
        }
    }
    
    if (necklineLows.length < 1) return null;
    
    // 가장 낮은 점을 찾아 넥라인 계산
    necklineLows.sort((a, b) => a.price - b.price);
    const lowest = necklineLows[0];
    
    // 수평 넥라인으로 가정
    return {
        startTime: lowest.time,
        startPrice: lowest.price,
        slope: 0
    };
}

// 더블바텀 넥라인 계산
function calculateDoubleBottomNeckline(doubleBottom, highs) {
    const valley1 = doubleBottom.valley1;
    const valley2 = doubleBottom.valley2;
    
    // 두 저점 사이의 고점들 찾기
    const necklineHighs = [];
    
    for (let i = 0; i < highs.length; i++) {
        const high = highs[i];
        if (high.time >= valley1.time && high.time <= valley2.time) {
            necklineHighs.push(high);
        }
    }
    
    if (necklineHighs.length < 1) return null;
    
    // 가장 높은 점을 찾아 넥라인 계산
    necklineHighs.sort((a, b) => b.price - a.price);
    const highest = necklineHighs[0];
    
    // 수평 넥라인으로 가정
    return {
        startTime: highest.time,
        startPrice: highest.price,
        slope: 0
    };
}

// 더블탑 넥라인 돌파 감지
function detectDoubleTopBreakout(windowData, neckline, doubleTop) {
    const peak2 = doubleTop.peak2;
    
    // 두 번째 고점 이후의 데이터에서 넥라인 돌파 확인
    const afterPeak2 = windowData.filter(candle => candle.time > peak2.time);
    
    if (afterPeak2.length === 0) return null;
    
    for (let i = 0; i < afterPeak2.length; i++) {
        const candle = afterPeak2[i];
        const expectedPrice = neckline.startPrice + neckline.slope * (candle.time - neckline.startTime);
        
        // 하향 돌파 (더블탑)
        if (candle.close < expectedPrice) {
            return {
                time: candle.time,
                price: candle.close,
                type: 'downward',
                pattern: 'double_top'
            };
        }
    }
    
    return null;
}

// 더블바텀 넥라인 돌파 감지
function detectDoubleBottomBreakout(windowData, neckline, doubleBottom) {
    const valley2 = doubleBottom.valley2;
    
    // 두 번째 저점 이후의 데이터에서 넥라인 돌파 확인
    const afterValley2 = windowData.filter(candle => candle.time > valley2.time);
    
    if (afterValley2.length === 0) return null;
    
    for (let i = 0; i < afterValley2.length; i++) {
        const candle = afterValley2[i];
        const expectedPrice = neckline.startPrice + neckline.slope * (candle.time - neckline.startTime);
        
        // 상향 돌파 (더블바텀)
        if (candle.close > expectedPrice) {
            return {
                time: candle.time,
                price: candle.close,
                type: 'upward',
                pattern: 'double_bottom'
            };
        }
    }
    
    return null;
}

// 더블탑/더블바텀 패턴 표시
function displayDoublePatterns(patterns) {
    // 기존 패턴 제거
    doublePatterns.forEach(pattern => {
        if (pattern.neckline) mainChart.removeSeries(pattern.neckline);
    });
    doublePatterns = [];
    
    const allMarkers = [];
    const markerTimes = new Set(); // 중복 시간 체크용
    
    patterns.forEach(pattern => {
        // 넥라인은 표시하지 않음
        
        doublePatterns.push({
            neckline: null,
            pattern: pattern
        });
        
        // 패턴 위치 마커 표시
        if (pattern.type === 'double_top') {
            // 더블탑 고점들 표시
            const peak1Marker = {
                time: pattern.peaks.peak1.time,
                position: 'aboveBar',
                color: '#ff9800',
                shape: 'circle',
                text: '더블탑 1',
                size: 1
            };
            const peak2Marker = {
                time: pattern.peaks.peak2.time,
                position: 'aboveBar',
                color: '#ff9800',
                shape: 'circle',
                text: '더블탑 2',
                size: 1
            };
            
            if (!markerTimes.has(pattern.peaks.peak1.time)) {
                markerTimes.add(pattern.peaks.peak1.time);
                allMarkers.push(peak1Marker);
            }
            if (!markerTimes.has(pattern.peaks.peak2.time)) {
                markerTimes.add(pattern.peaks.peak2.time);
                allMarkers.push(peak2Marker);
            }
        } else if (pattern.type === 'double_bottom') {
            // 더블바텀 저점들 표시
            const valley1Marker = {
                time: pattern.valleys.valley1.time,
                position: 'belowBar',
                color: '#2196f3',
                shape: 'circle',
                text: '더블바텀 1',
                size: 1
            };
            const valley2Marker = {
                time: pattern.valleys.valley2.time,
                position: 'belowBar',
                color: '#2196f3',
                shape: 'circle',
                text: '더블바텀 2',
                size: 1
            };
            
            if (!markerTimes.has(pattern.valleys.valley1.time)) {
                markerTimes.add(pattern.valleys.valley1.time);
                allMarkers.push(valley1Marker);
            }
            if (!markerTimes.has(pattern.valleys.valley2.time)) {
                markerTimes.add(pattern.valleys.valley2.time);
                allMarkers.push(valley2Marker);
            }
        }
        
        // 돌파 마커 표시 (중복 제거)
        if (pattern.breakout) {
            const markerTime = pattern.breakout.time;
            
            // 같은 시간에 마커가 이미 있는지 확인
            if (!markerTimes.has(markerTime)) {
                markerTimes.add(markerTime);
                
                const marker = {
                    time: markerTime,
                    position: pattern.breakout.type === 'upward' ? 'aboveBar' : 'belowBar',
                    color: pattern.breakout.type === 'upward' ? '#4caf50' : '#f44336',
                    shape: pattern.breakout.type === 'upward' ? 'arrowUp' : 'arrowDown',
                    text: pattern.breakout.pattern === 'double_top' ? '더블탑 하락전환' : '더블바텀 상승전환',
                    size: 2
                };
                
                allMarkers.push(marker);
            }
        }
    });
    
    // 모든 마커를 한 번에 설정
    if (allMarkers.length > 0) {
        candlestickSeries.setMarkers(allMarkers);
    }
    
    console.log(`Displayed ${patterns.length} double patterns with ${allMarkers.length} unique markers`);
}

// 분석 패턴 표시
function showAnalysis(analysisType) {
    switch(analysisType) {
        case 'golden_dead_cross':
            if (!isMaCrossMode) {
                showMaCrossAnalysis();
                isMaCrossMode = true;
            }
            break;
        case 'support_resistance':
            if (!isSupportResistanceMode) {
                showSupportResistanceAnalysis();
                isSupportResistanceMode = true;
            }
            break;
        case 'trend_line':
            if (!isTrendAnalysisMode) {
                showTrendAnalysis();
                isTrendAnalysisMode = true;
            }
            break;
        case 'triangle_pattern':
            if (!isTrianglePatternMode) {
                showTrianglePatternAnalysis();
                isTrianglePatternMode = true;
            }
            break;
        case 'head_and_shoulders':
            if (!isHeadShoulderMode) {
                showHeadShoulderAnalysis();
                isHeadShoulderMode = true;
            }
            break;
        case 'double_top_bottom':
            if (!isDoublePatternMode) {
                showDoublePatternAnalysis();
                isDoublePatternMode = true;
            }
            break;
    }
}

// 분석 패턴 숨기기
function hideAnalysis(analysisType) {
    switch(analysisType) {
        case 'golden_dead_cross':
            if (isMaCrossMode) {
                hideMaCrossAnalysis();
                isMaCrossMode = false;
            }
            break;
        case 'support_resistance':
            if (isSupportResistanceMode) {
                hideSupportResistanceAnalysis();
                isSupportResistanceMode = false;
            }
            break;
        case 'trend_line':
            if (isTrendAnalysisMode) {
                hideTrendAnalysis();
                isTrendAnalysisMode = false;
            }
            break;
        case 'triangle_pattern':
            if (isTrianglePatternMode) {
                hideTrianglePatternAnalysis();
                isTrianglePatternMode = false;
            }
            break;
        case 'head_and_shoulders':
            if (isHeadShoulderMode) {
                hideHeadShoulderAnalysis();
                isHeadShoulderMode = false;
            }
            break;
        case 'double_top_bottom':
            if (isDoublePatternMode) {
                hideDoublePatternAnalysis();
                isDoublePatternMode = false;
            }
            break;
    }
}


// 보조지표 변경
function changeIndicator(indicatorType) {
    currentIndicator = indicatorType;
    
    // 기존 시리즈 제거
    if (indicatorSeries) {
        indicatorChart.removeSeries(indicatorSeries);
    }
    
    // 캔들스틱 데이터에서 필요한 데이터 추출
    const candlestickData = window.lastCandlestickData;
    if (!candlestickData || candlestickData.length === 0) {
        console.log('No candlestick data available');
        return;
    }
    
    const closes = candlestickData.map(candle => candle.close);
    const highs = candlestickData.map(candle => candle.high);
    const lows = candlestickData.map(candle => candle.low);
    // 거래량 데이터 가져오기 (전용 데이터가 있으면 사용, 없으면 캔들스틱에서 추출)
    let volumes;
    if (window.lastVolumeData && window.lastVolumeData.length > 0) {
        volumes = window.lastVolumeData.map(vol => vol.value || 0);
    } else {
        volumes = candlestickData.map(candle => candle.volume || 0);
    }
    
    let indicatorData = [];
    
    // 새로운 지표 시리즈 생성 및 데이터 계산
    switch (indicatorType) {
        case 'rsi':
            indicatorSeries = indicatorChart.addLineSeries({
                color: '#f59e0b',
                lineWidth: 2,
            });
            indicatorData = calculateRSI(closes);
            break;
        case 'macd':
            indicatorSeries = indicatorChart.addLineSeries({
                color: '#2962FF',
                lineWidth: 2,
            });
            indicatorData = calculateMACD(closes);
            break;
        case 'stochastic':
            indicatorSeries = indicatorChart.addLineSeries({
                color: '#8B5CF6',
                lineWidth: 2,
            });
            indicatorData = calculateStochastic(highs, lows, closes);
            break;
        case 'bollinger':
            indicatorSeries = indicatorChart.addLineSeries({
                color: '#10B981',
                lineWidth: 2,
            });
            indicatorData = calculateBollingerBands(closes);
            break;
        case 'obv':
            indicatorSeries = indicatorChart.addLineSeries({
                color: '#F59E0B',
                lineWidth: 2,
            });
            indicatorData = calculateOBV(closes, volumes);
            break;
        case 'cci':
            indicatorSeries = indicatorChart.addLineSeries({
                color: '#EF4444',
                lineWidth: 2,
            });
            indicatorData = calculateCCI(highs, lows, closes);
            break;
        case 'adx':
            indicatorSeries = indicatorChart.addLineSeries({
                color: '#06B6D4',
                lineWidth: 2,
            });
            indicatorData = calculateADX(highs, lows, closes);
            break;
        case 'roc':
            indicatorSeries = indicatorChart.addLineSeries({
                color: '#84CC16',
                lineWidth: 2,
            });
            indicatorData = calculateROC(closes);
            break;
        default:
            indicatorSeries = indicatorChart.addLineSeries({
                color: '#f59e0b',
                lineWidth: 2,
            });
            indicatorData = calculateRSI(closes);
            break;
    }
    
    // 계산된 데이터 설정
    if (indicatorData && indicatorData.length > 0) {
        indicatorSeries.setData(indicatorData);
        console.log(`${indicatorType.toUpperCase()} data calculated:`, indicatorData.length, 'points');
    } else {
        console.log(`No data calculated for ${indicatorType}`);
    }
}

// 기술적 지표 계산 함수들
function calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return [];
    
    const gains = [];
    const losses = [];
    
    for (let i = 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? -change : 0);
    }
    
    const rsiData = [];
    for (let i = period - 1; i < gains.length; i++) {
        const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
        const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
        
        if (avgLoss === 0) {
            rsiData.push({ time: window.lastCandlestickData[i + 1].time, value: 100 });
        } else {
            const rs = avgGain / avgLoss;
            const rsi = 100 - (100 / (1 + rs));
            rsiData.push({ time: window.lastCandlestickData[i + 1].time, value: rsi });
        }
    }
    
    return rsiData;
}

function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (prices.length < slowPeriod) return [];
    
    const emaFast = calculateEMA(prices, fastPeriod);
    const emaSlow = calculateEMA(prices, slowPeriod);
    
    const macdLine = [];
    for (let i = 0; i < emaFast.length; i++) {
        if (emaFast[i] && emaSlow[i]) {
            macdLine.push(emaFast[i] - emaSlow[i]);
        } else {
            macdLine.push(null);
        }
    }
    
    const signalLine = calculateEMA(macdLine.filter(v => v !== null), signalPeriod);
    
    const macdData = [];
    let signalIndex = 0;
    for (let i = 0; i < macdLine.length; i++) {
        if (macdLine[i] !== null) {
            macdData.push({
                time: window.lastCandlestickData[i].time,
                value: macdLine[i]
            });
        }
    }
    
    return macdData;
}

function calculateEMA(prices, period) {
    if (prices.length < period) return [];
    
    const ema = [];
    const multiplier = 2 / (period + 1);
    
    // 첫 번째 EMA는 SMA로 계산
    const sma = prices.slice(0, period).reduce((a, b) => a + b) / period;
    ema.push(sma);
    
    for (let i = period; i < prices.length; i++) {
        const currentEma = (prices[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
        ema.push(currentEma);
    }
    
    return ema;
}

function calculateStochastic(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
    if (highs.length < kPeriod) return [];
    
    const stochData = [];
    
    for (let i = kPeriod - 1; i < highs.length; i++) {
        const recentHighs = highs.slice(i - kPeriod + 1, i + 1);
        const recentLows = lows.slice(i - kPeriod + 1, i + 1);
        const currentClose = closes[i];
        
        const highestHigh = Math.max(...recentHighs);
        const lowestLow = Math.min(...recentLows);
        
        const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
        stochData.push({
            time: window.lastCandlestickData[i].time,
            value: k
        });
    }
    
    return stochData;
}

function calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) return [];
    
    const bbData = [];
    
    for (let i = period - 1; i < prices.length; i++) {
        const recentPrices = prices.slice(i - period + 1, i + 1);
        const sma = recentPrices.reduce((a, b) => a + b) / period;
        
        const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
        const std = Math.sqrt(variance);
        
        const upper = sma + (stdDev * std);
        const lower = sma - (stdDev * std);
        
        bbData.push({
            time: window.lastCandlestickData[i].time,
            value: upper
        });
    }
    
    return bbData;
}

function calculateOBV(closes, volumes) {
    if (closes.length !== volumes.length) return [];
    
    const obvData = [];
    let obv = 0;
    
    for (let i = 0; i < closes.length; i++) {
        if (i === 0) {
            obv = volumes[i];
        } else {
            if (closes[i] > closes[i - 1]) {
                obv += volumes[i];
            } else if (closes[i] < closes[i - 1]) {
                obv -= volumes[i];
            }
        }
        
        obvData.push({
            time: window.lastCandlestickData[i].time,
            value: obv
        });
    }
    
    return obvData;
}

function calculateCCI(highs, lows, closes, period = 20) {
    if (highs.length < period) return [];
    
    const cciData = [];
    
    for (let i = period - 1; i < highs.length; i++) {
        const recentHighs = highs.slice(i - period + 1, i + 1);
        const recentLows = lows.slice(i - period + 1, i + 1);
        const recentCloses = closes.slice(i - period + 1, i + 1);
        
        const typicalPrices = recentHighs.map((high, idx) => 
            (high + recentLows[idx] + recentCloses[idx]) / 3
        );
        
        const sma = typicalPrices.reduce((a, b) => a + b) / period;
        const meanDeviation = typicalPrices.reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / period;
        
        const currentTP = (highs[i] + lows[i] + closes[i]) / 3;
        const cci = (currentTP - sma) / (0.015 * meanDeviation);
        
        cciData.push({
            time: window.lastCandlestickData[i].time,
            value: cci
        });
    }
    
    return cciData;
}

function calculateADX(highs, lows, closes, period = 14) {
    if (highs.length < period + 1) return [];
    
    const adxData = [];
    
    // 간단한 ADX 계산 (실제로는 더 복잡함)
    for (let i = period; i < highs.length; i++) {
        const recentHighs = highs.slice(i - period, i + 1);
        const recentLows = lows.slice(i - period, i + 1);
        
        const avgHigh = recentHighs.reduce((a, b) => a + b) / (period + 1);
        const avgLow = recentLows.reduce((a, b) => a + b) / (period + 1);
        
        const adx = ((avgHigh - avgLow) / avgLow) * 100;
        
        adxData.push({
            time: window.lastCandlestickData[i].time,
            value: adx
        });
    }
    
    return adxData;
}

function calculateROC(prices, period = 12) {
    if (prices.length < period + 1) return [];
    
    const rocData = [];
    
    for (let i = period; i < prices.length; i++) {
        const roc = ((prices[i] - prices[i - period]) / prices[i - period]) * 100;
        rocData.push({
            time: window.lastCandlestickData[i].time,
            value: roc
        });
    }
    
    return rocData;
}

// 보조지표 데이터 가져오기
async function fetchIndicatorData() {
    // 현재는 RSI만 구현, 추후 다른 지표들 추가
    // 실제 구현에서는 별도 API 엔드포인트 호출
}

// 로딩 표시
function showLoading() {
    document.getElementById('main-loading').classList.remove('hidden');
    document.getElementById('volume-loading').classList.remove('hidden');
    document.getElementById('indicator-loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('main-loading').classList.add('hidden');
    document.getElementById('volume-loading').classList.add('hidden');
    document.getElementById('indicator-loading').classList.add('hidden');
}

// 에러 표시
function showError(message) {
    // 간단한 알림으로 표시 (추후 모달로 개선 가능)
    alert('오류: ' + message);
}

// 자동 새로고침 토글
function toggleAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    } else {
        autoRefreshInterval = setInterval(() => {
            console.log('Auto refresh triggered');
            fetchChartData();
        }, 5000);
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 검색 버튼
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', fetchChartData);
    }
    
    // 새로고침 버튼
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', fetchChartData);
    }
    
    
    // Enter 키로 검색
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                fetchChartData();
            }
        });
    }
    
    // 시간 간격 select box
    const timeframeSelect = document.getElementById('timeframe-select');
    if (timeframeSelect) {
        timeframeSelect.addEventListener('change', () => {
            // select box 값이 변경되면 자동으로 차트 데이터 새로고침
            fetchChartData();
        });
    }
    
    // 분석 항목 클릭
    document.querySelectorAll('.analysis-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            const analysisType = item.getAttribute('data-analysis');
            
            // 최대 6개 제한 체크
            if (!activeAnalyses.has(analysisType) && activeAnalyses.size >= 6) {
                showError('최대 6개의 분석 패턴만 동시에 표시할 수 있습니다.');
                return;
            }
            
            // 토글 처리
            if (activeAnalyses.has(analysisType)) {
                // 비활성화
                activeAnalyses.delete(analysisType);
                item.classList.remove('active');
                hideAnalysis(analysisType);
            } else {
                // 활성화
                activeAnalyses.add(analysisType);
                item.classList.add('active');
                showAnalysis(analysisType);
            }
        });
    });
    
    // 보조지표 항목 클릭
    document.querySelectorAll('.indicator-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // 모든 항목에서 selected 클래스 제거
            document.querySelectorAll('.indicator-item').forEach(i => i.classList.remove('selected'));
            // 클릭된 항목에 selected 클래스 추가
            e.target.classList.add('selected');
            // 지표 변경
            changeIndicator(e.target.dataset.indicator);
        });
    });
    
    // 기간 링크들 (일/주/월/년)
    document.querySelectorAll('.period-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // 기간별 차트 로드 (추후 구현)
            console.log('Period selected:', e.target.textContent);
        });
    });
    
    // 차트 타입 링크들 (캔들/선/바)
    document.querySelectorAll('.chart-type .period-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // 차트 타입 변경 (추후 구현)
            console.log('Chart type selected:', e.target.textContent);
        });
    });
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    const chartsReady = initCharts();
    // chartsReady가 false면 차트 관련 초기화는 건너뜀
    setupEventListeners();
    
    // 기본 분석 항목 선택 제거 - 사용자가 직접 선택하도록 함
    
    // 기본 보조지표 선택 (RSI)
    const defaultIndicator = document.querySelector('.indicator-item[data-indicator="rsi"]');
    if (defaultIndicator) {
        defaultIndicator.classList.add('selected');
    }
    
    // 지수 데이터 로드
    fetchIndexData();
    
    // 초기 데이터 로드
    if (chartsReady) {
        fetchChartData();
    }
});

// 지수 데이터 가져오기
async function fetchIndexData() {
    try {
        // 실제 API 호출
        const response = await fetch('/api/chart/index-data');
        const result = await response.json();
        
        if (result.success) {
            displayIndexData(result.data);
        } else {
            throw new Error(result.error || 'Failed to fetch index data');
        }
        
    } catch (error) {
        console.error('Error fetching index data:', error);
        // 에러 시 기본 데이터 표시
        const defaultData = [
            { name: '달러환율', symbol: 'USD/KRW', value: '1,419.8', change: 0.53 },
            { name: '달러인덱스', symbol: 'DXY', value: '103.25', change: -0.15 },
            { name: '코스피', symbol: '^KS11', value: '3,748.8', change: -0.53 },
            { name: '코스닥', symbol: '^KQ11', value: '862.8', change: -0.53 },
            { name: 'S&P500', symbol: '^GSPC', value: '6,629.1', change: 0.53 },
            { name: '나스닥', symbol: '^IXIC', value: '22,562.5', change: 0.53 },
            { name: 'VIX', symbol: '^VIX', value: '25.3', change: -0.53 },
            { name: '금', symbol: 'GC=F', value: '2,650.5', change: 0.25 },
            { name: '은', symbol: 'SI=F', value: '32.45', change: -0.15 },
            { name: '구리', symbol: 'HG=F', value: '4.850', change: 0.85 }
        ];
        displayIndexData(defaultData);
    }
}

// 지수 데이터 표시
function displayIndexData(indexData) {
    const container = document.getElementById('index-container');
    if (!container) return;
    
    // 기존 데이터 제거
    container.innerHTML = '';
    
    // 데이터를 두 번 복사하여 무한 스크롤 효과 생성
    const doubledData = [...indexData, ...indexData];
    
    doubledData.forEach(item => {
        const indexItem = document.createElement('div');
        indexItem.className = 'index-item';
        
        const isPositive = item.change > 0;
        const isNegative = item.change < 0;
        const changeColor = isPositive ? '#4ade80' : (isNegative ? '#f87171' : '#ffffff');
        const changeSymbol = isPositive ? '+' : (isNegative ? '' : '');
        
        indexItem.innerHTML = `
            <span>${item.name} ${item.value} <span style="color: ${changeColor};">${changeSymbol}${item.change}%</span></span>
        `;
        
        container.appendChild(indexItem);
    });
}

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
});