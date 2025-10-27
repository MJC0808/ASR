package chart.chart_spring.controller;

import chart.chart_spring.dto.ChartDataResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

/**
 * 차트 데이터 컨트롤러
 * Flask API를 프록시하여 차트 데이터를 제공합니다.
 */
@RestController
@RequestMapping("/api/chart")
public class ChartController {

    private static final Logger logger = LoggerFactory.getLogger(ChartController.class);

    private final RestTemplate restTemplate;

    @Value("${flask.service.url}")
    private String flaskServiceUrl;

    public ChartController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * 차트 데이터 조회
     * Flask API를 호출하여 Yahoo Finance 데이터를 가져옵니다.
     *
     * @param ticker 주식 심볼 (예: AAPL, 005930.KS)
     * @param interval 시간 간격 (1m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo)
     * @param ema EMA 기간
     * @param rsi RSI 기간
     * @return 차트 데이터 응답
     */
    @GetMapping("/data/{ticker}/{interval}/{ema}/{rsi}")
    public ResponseEntity<ChartDataResponse> getChartData(
            @PathVariable String ticker,
            @PathVariable String interval,
            @PathVariable int ema,
            @PathVariable int rsi) {
        
        try {
            logger.info("Fetching chart data - Ticker: {}, Interval: {}, EMA: {}, RSI: {}", 
                       ticker, interval, ema, rsi);

            // Flask API URL 생성
            String flaskApiUrl = String.format("%s/api/data/%s/%s/%d/%d", 
                                              flaskServiceUrl, ticker, interval, ema, rsi);

            logger.debug("Flask API URL: {}", flaskApiUrl);

            // Flask API 호출
            ChartDataResponse response = restTemplate.getForObject(flaskApiUrl, ChartDataResponse.class);

            if (response != null && response.isSuccess()) {
                logger.info("Successfully fetched chart data for {}", ticker);
                return ResponseEntity.ok(response);
            } else {
                logger.warn("Flask API returned error for {}: {}", ticker, 
                           response != null ? response.getError() : "Unknown error");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

        } catch (Exception e) {
            logger.error("Error fetching chart data for {}: {}", ticker, e.getMessage(), e);
            ChartDataResponse errorResponse = new ChartDataResponse(false, 
                "Failed to fetch data from Flask service: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * 차트 분석
     * Flask API를 호출하여 기술적 분석을 수행합니다.
     *
     * @param requestBody 분석 요청 (ticker, interval, start_time, end_time, analysis_type, params)
     * @return 분석 결과
     */
    @PostMapping("/analyze")
    public ResponseEntity<?> analyzeChart(@RequestBody java.util.Map<String, Object> requestBody) {
        try {
            logger.info("Analyzing chart - Ticker: {}, Type: {}", 
                       requestBody.get("ticker"), requestBody.get("analysis_type"));

            // Flask API URL
            String flaskAnalyzeUrl = flaskServiceUrl + "/api/analyze";

            // Flask API 호출
            Object response = restTemplate.postForObject(flaskAnalyzeUrl, requestBody, Object.class);

            logger.info("Analysis completed successfully");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error analyzing chart: {}", e.getMessage(), e);
            java.util.Map<String, Object> errorResponse = new java.util.HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Failed to analyze chart: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Flask API를 호출하여 주요 지수 데이터를 조회합니다.
     *
     * @return 지수 데이터 (환율, 코스피, 코스닥, S&P500, 나스닥, VIX)
     */
    @GetMapping("/index-data")
    public ResponseEntity<?> getIndexData() {
        try {
            logger.info("Fetching index data");

            // Flask API URL
            String flaskIndexUrl = flaskServiceUrl + "/api/index-data";

            // Flask API 호출
            Object response = restTemplate.getForObject(flaskIndexUrl, Object.class);

            logger.info("Index data fetched successfully");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error fetching index data: {}", e.getMessage(), e);
            java.util.Map<String, Object> errorResponse = new java.util.HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Failed to fetch index data: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * 뉴스 분석
     * Flask API를 호출하여 뉴스 감정 분석을 수행합니다.
     */
    @PostMapping("/news/analyze")
    public ResponseEntity<?> analyzeNews(@RequestBody java.util.Map<String, Object> requestBody) {
        try {
            logger.info("Analyzing news - Source: {}, Period: {} ~ {}", 
                       requestBody.get("newsSource"), requestBody.get("startPeriod"), requestBody.get("endPeriod"));

            // Flask API URL
            String flaskNewsUrl = flaskServiceUrl + "/api/news/analyze";

            // Flask API 호출
            Object response = restTemplate.postForObject(flaskNewsUrl, requestBody, Object.class);

            logger.info("News analysis completed successfully");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error analyzing news: {}", e.getMessage(), e);
            java.util.Map<String, Object> errorResponse = new java.util.HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Failed to analyze news: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * AI 분석
     * Flask API를 호출하여 AI 모델 분석을 수행합니다.
     */
    @PostMapping("/ai/analyze")
    public ResponseEntity<?> analyzeAI(@RequestBody java.util.Map<String, Object> requestBody) {
        try {
            logger.info("Analyzing AI - Companies: {}", requestBody.get("companies"));

            // Flask API URL
            String flaskAIUrl = flaskServiceUrl + "/api/ai/analyze";

            // Flask API 호출
            Object response = restTemplate.postForObject(flaskAIUrl, requestBody, Object.class);

            logger.info("AI analysis completed successfully");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error analyzing AI: {}", e.getMessage(), e);
            java.util.Map<String, Object> errorResponse = new java.util.HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Failed to analyze AI: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * 차트 패턴 분석
     * Flask API를 호출하여 차트 패턴 분석을 수행합니다.
     */
    @PostMapping("/chart/analyze-patterns")
    public ResponseEntity<?> analyzeChartPatterns(@RequestBody java.util.Map<String, Object> requestBody) {
        try {
            logger.info("Analyzing chart patterns - Companies: {}", requestBody.get("companies"));

            // Flask API URL
            String flaskPatternUrl = flaskServiceUrl + "/api/chart/analyze-patterns";

            // Flask API 호출
            Object response = restTemplate.postForObject(flaskPatternUrl, requestBody, Object.class);

            logger.info("Chart pattern analysis completed successfully");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error analyzing chart patterns: {}", e.getMessage(), e);
            java.util.Map<String, Object> errorResponse = new java.util.HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Failed to analyze chart patterns: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * RSS 뉴스 피드
     * Flask API를 호출하여 RSS 뉴스를 가져옵니다.
     */
    @GetMapping("/news/rss")
    public ResponseEntity<?> getNewsRss(@RequestParam(required = false) String feed) {
        try {
            logger.info("Fetching RSS news feed - Feed: {}", feed);

            // Flask API URL 구성
            String flaskRssUrl = flaskServiceUrl + "/api/news/rss";
            if (feed != null && !feed.isEmpty()) {
                flaskRssUrl += "?feed=" + feed;
            }

            // Flask API 호출
            Object response = restTemplate.getForObject(flaskRssUrl, Object.class);

            logger.info("RSS news feed fetched successfully");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error fetching RSS news feed: {}", e.getMessage(), e);
            java.util.Map<String, Object> errorResponse = new java.util.HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Failed to fetch RSS news feed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * 사용 가능한 종목 리스트
     */
    @GetMapping("/portfolio/available-stocks")
    public ResponseEntity<?> getPortfolioStocks() {
        try {
            logger.info("Fetching available stocks");
            String flaskUrl = flaskServiceUrl + "/api/portfolio/available-stocks";
            Object response = restTemplate.getForObject(flaskUrl, Object.class);
            logger.info("Available stocks fetched successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error fetching available stocks: {}", e.getMessage(), e);
            java.util.Map<String, Object> errorResponse = new java.util.HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Failed to fetch available stocks: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * 포트폴리오 최적화
     */
    @PostMapping("/portfolio/optimize")
    public ResponseEntity<?> optimizePortfolio(@RequestBody java.util.Map<String, Object> requestBody) {
        try {
            logger.info("Optimizing portfolio - Tickers: {}", requestBody.get("tickers"));
            String flaskUrl = flaskServiceUrl + "/api/portfolio/optimize";
            Object response = restTemplate.postForObject(flaskUrl, requestBody, Object.class);
            logger.info("Portfolio optimization completed successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error optimizing portfolio: {}", e.getMessage(), e);
            java.util.Map<String, Object> errorResponse = new java.util.HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Failed to optimize portfolio: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * AI 챗봇 엔드포인트
     */
    @PostMapping("/chatbot/chat")
    public ResponseEntity<?> chatbotChat(@RequestBody java.util.Map<String, Object> requestBody) {
        try {
            logger.info("Chatbot request received");
            String flaskUrl = flaskServiceUrl + "/api/chatbot/chat";
            Object response = restTemplate.postForObject(flaskUrl, requestBody, Object.class);
            logger.info("Chatbot response sent successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error in chatbot: {}", e.getMessage(), e);
            java.util.Map<String, Object> errorResponse = new java.util.HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Failed to get chatbot response: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * 헬스 체크
     * Spring Boot 및 Flask 서비스 상태를 확인합니다.
     */
    @GetMapping("/health")
    public ResponseEntity<HealthResponse> healthCheck() {
        HealthResponse health = new HealthResponse();
        health.setSpringBootStatus("healthy");
        
        try {
            // Flask 서비스 상태 확인
            String flaskHealthUrl = flaskServiceUrl + "/api/health";
            restTemplate.getForObject(flaskHealthUrl, String.class);
            health.setFlaskStatus("healthy");
        } catch (Exception e) {
            logger.warn("Flask service is not available: {}", e.getMessage());
            health.setFlaskStatus("unavailable");
        }
        
        return ResponseEntity.ok(health);
    }

    /**
     * 헬스 체크 응답 DTO
     */
    public static class HealthResponse {
        private String springBootStatus;
        private String flaskStatus;
        private String flaskUrl;

        public String getSpringBootStatus() {
            return springBootStatus;
        }

        public void setSpringBootStatus(String springBootStatus) {
            this.springBootStatus = springBootStatus;
        }

        public String getFlaskStatus() {
            return flaskStatus;
        }

        public void setFlaskStatus(String flaskStatus) {
            this.flaskStatus = flaskStatus;
        }

        public String getFlaskUrl() {
            return flaskUrl;
        }

        public void setFlaskUrl(String flaskUrl) {
            this.flaskUrl = flaskUrl;
        }
    }
}

