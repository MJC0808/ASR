package chart.chart_spring;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableJpaRepositories
public class ChartSpringApplication {

	public static void main(String[] args) {
		SpringApplication.run(ChartSpringApplication.class, args);
	}

}
