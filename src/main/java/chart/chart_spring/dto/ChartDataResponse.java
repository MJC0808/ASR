package chart.chart_spring.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

/**
 * 차트 데이터 응답 DTO
 */
public class ChartDataResponse {
    
    private boolean success;
    private ChartData data;
    private String error;

    public ChartDataResponse() {
    }

    public ChartDataResponse(boolean success, ChartData data) {
        this.success = success;
        this.data = data;
    }

    public ChartDataResponse(boolean success, String error) {
        this.success = success;
        this.error = error;
    }

    // Getters and Setters
    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public ChartData getData() {
        return data;
    }

    public void setData(ChartData data) {
        this.data = data;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    /**
     * 차트 데이터 내부 클래스
     */
    public static class ChartData {
        private List<Map<String, Object>> candlestick;
        private List<Map<String, Object>> ema;
        private List<Map<String, Object>> rsi;
        
        @JsonProperty("ticker_info")
        private TickerInfo tickerInfo;

        public ChartData() {
        }

        // Getters and Setters
        public List<Map<String, Object>> getCandlestick() {
            return candlestick;
        }

        public void setCandlestick(List<Map<String, Object>> candlestick) {
            this.candlestick = candlestick;
        }

        public List<Map<String, Object>> getEma() {
            return ema;
        }

        public void setEma(List<Map<String, Object>> ema) {
            this.ema = ema;
        }

        public List<Map<String, Object>> getRsi() {
            return rsi;
        }

        public void setRsi(List<Map<String, Object>> rsi) {
            this.rsi = rsi;
        }

        public TickerInfo getTickerInfo() {
            return tickerInfo;
        }

        public void setTickerInfo(TickerInfo tickerInfo) {
            this.tickerInfo = tickerInfo;
        }
    }

    /**
     * 종목 정보 내부 클래스
     */
    public static class TickerInfo {
        private String symbol;
        private String name;
        private String currency;
        private String exchange;

        public TickerInfo() {
        }

        // Getters and Setters
        public String getSymbol() {
            return symbol;
        }

        public void setSymbol(String symbol) {
            this.symbol = symbol;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getCurrency() {
            return currency;
        }

        public void setCurrency(String currency) {
            this.currency = currency;
        }

        public String getExchange() {
            return exchange;
        }

        public void setExchange(String exchange) {
            this.exchange = exchange;
        }
    }
}

