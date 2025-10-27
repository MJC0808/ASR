package chart.chart_spring.service;

import chart.chart_spring.entity.User;
import chart.chart_spring.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class UserService {
    
    private final UserRepository userRepository;
    
    /**
     * 회원가입 처리
     * @param username 사용자명
     * @param password 비밀번호
     * @return 회원가입 성공 여부
     * @throws IllegalArgumentException 중복된 사용자명인 경우
     */
    public boolean registerUser(String username, String password) {
        log.info("회원가입 시도: username={}", username);
        
        // 사용자명 중복 확인
        if (userRepository.existsByUsername(username)) {
            log.warn("중복된 사용자명: {}", username);
            throw new IllegalArgumentException("같은 아이디가 존재합니다.");
        }
        
        // 새 사용자 생성 및 저장
        User newUser = new User();
        newUser.setUsername(username);
        newUser.setPassword(password); // 실제로는 암호화해야 함
        
        User savedUser = userRepository.save(newUser);
        log.info("회원가입 성공: userId={}, username={}", savedUser.getUserId(), savedUser.getUsername());
        
        return true;
    }
    
    /**
     * 사용자명으로 사용자 찾기
     * @param username 사용자명
     * @return 사용자 정보
     */
    @Transactional(readOnly = true)
    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElse(null);
    }
}

