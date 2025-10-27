package chart.chart_spring.repository;

import chart.chart_spring.entity.DiscussionPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DiscussionPostRepository extends JpaRepository<DiscussionPost, Integer> {
    
    // 모든 토론 게시글을 최신순으로 조회
    @Query("SELECT dp FROM DiscussionPost dp ORDER BY dp.createdAt DESC")
    List<DiscussionPost> findAllOrderByCreatedAtDesc();
    
    // 특정 사용자의 토론 게시글 조회
    List<DiscussionPost> findByUserIdOrderByCreatedAtDesc(Integer userId);
    
    // 제목으로 검색
    @Query("SELECT dp FROM DiscussionPost dp WHERE dp.title LIKE %:keyword% ORDER BY dp.createdAt DESC")
    List<DiscussionPost> findByTitleContainingOrderByCreatedAtDesc(@Param("keyword") String keyword);
    
    // 내용으로 검색
    @Query("SELECT dp FROM DiscussionPost dp WHERE dp.content LIKE %:keyword% ORDER BY dp.createdAt DESC")
    List<DiscussionPost> findByContentContainingOrderByCreatedAtDesc(@Param("keyword") String keyword);
}


