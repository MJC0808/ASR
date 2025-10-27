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

// 이동평균선 관련 변수
let ma200Series = null;
let ma50Series = null;
let isMaCrossMode = false;
let originalCandlestickData = null;

// 지지선과 저항선 관련 변수
let supportResistanceLines = [];
let isSupportResistanceMode = false;

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

// 차트 분석 토글
function toggleChartAnalysis() {
    const toggleBtn = document.getElementById('chart-toggle-btn');
    
    if (!isAnalysisMode) {
        // 분석 모드로 전환
        isAnalysisMode = true;
        toggleBtn.textContent = '기본차트';
        performChartAnalysis();
    } else {
        // 기본 모드로 전환
        isAnalysisMode = false;
        toggleBtn.textContent = '차트분석';
        restoreOriginalChart();
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
    
    // Swing High/Low 감지
    const swingPoints = detectSwingPoints(window.lastCandlestickData);
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
    
    // 가격대별로 그룹화 (tolerance 범위 내)
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
    
    // 2회 이상 반등/저항 확인된 구간만 필터링
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
    
    // 차트 분석 토글 버튼
    const chartToggleBtn = document.getElementById('chart-toggle-btn');
    if (chartToggleBtn) {
        chartToggleBtn.addEventListener('click', toggleChartAnalysis);
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
            // 모든 항목에서 selected 클래스 제거
            document.querySelectorAll('.analysis-item').forEach(i => i.classList.remove('selected'));
            // 클릭된 항목에 selected 클래스 추가
            e.target.classList.add('selected');
            // 분석 타입 업데이트
            currentAnalysisType = e.target.dataset.analysis;
            
            // 이동평균선 골든크로스/데드크로스 특별 처리
            if (currentAnalysisType === 'golden_dead_cross') {
                toggleMaCrossAnalysis();
            }
            // 지지선과 저항선 분석 특별 처리
            else if (currentAnalysisType === 'support_resistance') {
                toggleSupportResistanceAnalysis();
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
    
    // 기본 분석 항목 선택
    const defaultAnalysis = document.querySelector('.analysis-item[data-analysis="golden_dead_cross"]');
    if (defaultAnalysis) {
        defaultAnalysis.classList.add('selected');
    }
    
    // 기본 보조지표 선택
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
});}