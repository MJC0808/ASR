package chart.chart_spring.repository;

import chart.chart_spring.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {
    
    /**
     * 사용자명으로 사용자 찾기
     * @param username 사용자명
     * @return 사용자 정보 (Optional)
     */
    Optional<User> findByUsername(String username);
    
    /**
     * 사용자명이 존재하는지 확인
     * @param username 사용자명
     * @return 존재 여부
     */
    boolean existsByUsername(String username);
}
