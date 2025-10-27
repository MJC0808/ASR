package chart.chart_spring.service;

import chart.chart_spring.entity.DiscussionPost;
import chart.chart_spring.entity.MemoPost;
import chart.chart_spring.repository.DiscussionPostRepository;
import chart.chart_spring.repository.MemoPostRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class BoardService {
    
    @Autowired
    private DiscussionPostRepository discussionPostRepository;
    
    @Autowired
    private MemoPostRepository memoPostRepository;
    
    // ========== 토론 게시판 관련 메서드 ==========
    
    /**
     * 모든 토론 게시글 조회 (최신순)
     */
    public List<DiscussionPost> getAllDiscussionPosts() {
        return discussionPostRepository.findAllOrderByCreatedAtDesc();
    }
    
    /**
     * 토론 게시글 작성
     */
    public DiscussionPost createDiscussionPost(Integer userId, String title, String content) {
        DiscussionPost post = new DiscussionPost();
        post.setUserId(userId);
        post.setTitle(title);
        post.setContent(content);
        return discussionPostRepository.save(post);
    }
    
    /**
     * 토론 게시글 상세 조회
     */
    public Optional<DiscussionPost> getDiscussionPostById(Integer postId) {
        return discussionPostRepository.findById(postId);
    }
    
    /**
     * 토론 게시글 수정
     */
    public DiscussionPost updateDiscussionPost(Integer postId, String title, String content) {
        Optional<DiscussionPost> optionalPost = discussionPostRepository.findById(postId);
        if (optionalPost.isPresent()) {
            DiscussionPost post = optionalPost.get();
            post.setTitle(title);
            post.setContent(content);
            return discussionPostRepository.save(post);
        }
        throw new RuntimeException("게시글을 찾을 수 없습니다.");
    }
    
    /**
     * 토론 게시글 삭제
     */
    public void deleteDiscussionPost(Integer postId) {
        discussionPostRepository.deleteById(postId);
    }
    
    /**
     * 토론 게시글 검색 (제목)
     */
    public List<DiscussionPost> searchDiscussionPostsByTitle(String keyword) {
        return discussionPostRepository.findByTitleContainingOrderByCreatedAtDesc(keyword);
    }
    
    /**
     * 토론 게시글 검색 (내용)
     */
    public List<DiscussionPost> searchDiscussionPostsByContent(String keyword) {
        return discussionPostRepository.findByContentContainingOrderByCreatedAtDesc(keyword);
    }
    
    // ========== 메모장 관련 메서드 ==========
    
    /**
     * 특정 사용자의 메모 조회 (최신순)
     */
    public List<MemoPost> getMemoPostsByUserId(Integer userId) {
        return memoPostRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
    
    /**
     * 메모 작성
     */
    public MemoPost createMemoPost(Integer userId, String title, String content) {
        MemoPost memo = new MemoPost();
        memo.setUserId(userId);
        memo.setTitle(title);
        memo.setContent(content);
        return memoPostRepository.save(memo);
    }
    
    /**
     * 메모 상세 조회
     */
    public Optional<MemoPost> getMemoPostById(Integer memoId) {
        return memoPostRepository.findById(memoId);
    }
    
    /**
     * 메모 수정 (본인 것만 수정 가능)
     */
    public MemoPost updateMemoPost(Integer memoId, Integer userId, String title, String content) {
        Optional<MemoPost> optionalMemo = memoPostRepository.findById(memoId);
        if (optionalMemo.isPresent()) {
            MemoPost memo = optionalMemo.get();
            // 본인의 메모인지 확인
            if (!memo.getUserId().equals(userId)) {
                throw new RuntimeException("본인의 메모만 수정할 수 있습니다.");
            }
            memo.setTitle(title);
            memo.setContent(content);
            return memoPostRepository.save(memo);
        }
        throw new RuntimeException("메모를 찾을 수 없습니다.");
    }
    
    /**
     * 메모 삭제 (본인 것만 삭제 가능)
     */
    public void deleteMemoPost(Integer memoId, Integer userId) {
        Optional<MemoPost> optionalMemo = memoPostRepository.findById(memoId);
        if (optionalMemo.isPresent()) {
            MemoPost memo = optionalMemo.get();
            // 본인의 메모인지 확인
            if (!memo.getUserId().equals(userId)) {
                throw new RuntimeException("본인의 메모만 삭제할 수 있습니다.");
            }
            memoPostRepository.deleteById(memoId);
        } else {
            throw new RuntimeException("메모를 찾을 수 없습니다.");
        }
    }
    
    /**
     * 메모 검색 (제목)
     */
    public List<MemoPost> searchMemoPostsByTitle(Integer userId, String keyword) {
        return memoPostRepository.findByUserIdAndTitleContainingOrderByCreatedAtDesc(userId, keyword);
    }
    
    /**
     * 메모 검색 (내용)
     */
    public List<MemoPost> searchMemoPostsByContent(Integer userId, String keyword) {
        return memoPostRepository.findByUserIdAndContentContainingOrderByCreatedAtDesc(userId, keyword);
    }
}


