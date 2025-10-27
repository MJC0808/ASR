package chart.chart_spring.repository;

import chart.chart_spring.entity.MemoPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MemoPostRepository extends JpaRepository<MemoPost, Integer> {
    
    // 특정 사용자의 메모를 최신순으로 조회 (메모장은 본인 것만 볼 수 있음)
    List<MemoPost> findByUserIdOrderByCreatedAtDesc(Integer userId);
    
    // 특정 사용자의 메모를 제목으로 검색
    @Query("SELECT mp FROM MemoPost mp WHERE mp.userId = :userId AND mp.title LIKE %:keyword% ORDER BY mp.createdAt DESC")
    List<MemoPost> findByUserIdAndTitleContainingOrderByCreatedAtDesc(@Param("userId") Integer userId, @Param("keyword") String keyword);
    
    // 특정 사용자의 메모를 내용으로 검색
    @Query("SELECT mp FROM MemoPost mp WHERE mp.userId = :userId AND mp.content LIKE %:keyword% ORDER BY mp.createdAt DESC")
    List<MemoPost> findByUserIdAndContentContainingOrderByCreatedAtDesc(@Param("userId") Integer userId, @Param("keyword") String keyword);
}


