package chart.chart_spring.controller;

import chart.chart_spring.entity.DiscussionPost;
import chart.chart_spring.entity.MemoPost;
import chart.chart_spring.service.BoardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/board")
public class BoardController {
    
    @Autowired
    private BoardService boardService;
    
    // ========== 토론 게시판 API ==========
    
    /**
     * 토론 게시판 목록 조회
     */
    @GetMapping("/discussion")
    public ResponseEntity<Map<String, Object>> getDiscussionPosts() {
        try {
            List<DiscussionPost> posts = boardService.getAllDiscussionPosts();
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("posts", posts);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "게시글 목록을 불러오는데 실패했습니다.");
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 토론 게시글 작성
     */
    @PostMapping("/discussion")
    public ResponseEntity<Map<String, Object>> createDiscussionPost(
            @RequestBody Map<String, String> request,
            HttpSession session) {
        try {
            System.out.println("Session ID: " + session.getId());
            System.out.println("Session attributes: " + session.getAttributeNames());
            System.out.println("User ID from session: " + session.getAttribute("userId"));
            
            Integer userId = (Integer) session.getAttribute("userId");
            if (userId == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "로그인이 필요합니다.");
                return ResponseEntity.badRequest().body(response);
            }
            
            String title = request.get("title");
            String content = request.get("content");
            
            if (title == null || title.trim().isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "제목을 입력해주세요.");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (content == null || content.trim().isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "내용을 입력해주세요.");
                return ResponseEntity.badRequest().body(response);
            }
            
            DiscussionPost post = boardService.createDiscussionPost(userId, title, content);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "게시글이 작성되었습니다.");
            response.put("post", post);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "게시글 작성에 실패했습니다.");
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 토론 게시글 상세 조회
     */
    @GetMapping("/discussion/{id}")
    public ResponseEntity<Map<String, Object>> getDiscussionPost(@PathVariable Integer id) {
        try {
            Optional<DiscussionPost> post = boardService.getDiscussionPostById(id);
            Map<String, Object> response = new HashMap<>();
            if (post.isPresent()) {
                response.put("success", true);
                response.put("post", post.get());
            } else {
                response.put("success", false);
                response.put("message", "게시글을 찾을 수 없습니다.");
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "게시글을 불러오는데 실패했습니다.");
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 토론 게시글 수정
     */
    @PutMapping("/discussion/{id}")
    public ResponseEntity<Map<String, Object>> updateDiscussionPost(
            @PathVariable Integer id,
            @RequestBody Map<String, String> request,
            HttpSession session) {
        try {
            Integer userId = (Integer) session.getAttribute("userId");
            if (userId == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "로그인이 필요합니다.");
                return ResponseEntity.badRequest().body(response);
            }
            
            String title = request.get("title");
            String content = request.get("content");
            
            DiscussionPost post = boardService.updateDiscussionPost(id, title, content);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "게시글이 수정되었습니다.");
            response.put("post", post);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 토론 게시글 삭제
     */
    @DeleteMapping("/discussion/{id}")
    public ResponseEntity<Map<String, Object>> deleteDiscussionPost(
            @PathVariable Integer id,
            HttpSession session) {
        try {
            Integer userId = (Integer) session.getAttribute("userId");
            if (userId == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "로그인이 필요합니다.");
                return ResponseEntity.badRequest().body(response);
            }
            
            boardService.deleteDiscussionPost(id);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "게시글이 삭제되었습니다.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    // ========== 메모장 API ==========
    
    /**
     * 메모장 목록 조회 (본인 것만)
     */
    @GetMapping("/memo")
    public ResponseEntity<Map<String, Object>> getMemoPosts(HttpSession session) {
        try {
            // 임시로 빈 목록 반환 (테스트용)
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("memos", new java.util.ArrayList<>());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "메모 목록을 불러오는데 실패했습니다: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 메모 작성
     */
    @PostMapping("/memo")
    public ResponseEntity<Map<String, Object>> createMemoPost(
            @RequestBody Map<String, String> request,
            HttpSession session) {
        try {
            Integer userId = (Integer) session.getAttribute("userId");
            if (userId == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "로그인이 필요합니다.");
                return ResponseEntity.badRequest().body(response);
            }
            
            String title = request.get("title");
            String content = request.get("content");
            
            if (title == null || title.trim().isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "제목을 입력해주세요.");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (content == null || content.trim().isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "내용을 입력해주세요.");
                return ResponseEntity.badRequest().body(response);
            }
            
            MemoPost memo = boardService.createMemoPost(userId, title, content);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "메모가 작성되었습니다.");
            response.put("memo", memo);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "메모 작성에 실패했습니다.");
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 메모 상세 조회
     */
    @GetMapping("/memo/{id}")
    public ResponseEntity<Map<String, Object>> getMemoPost(@PathVariable Integer id, HttpSession session) {
        try {
            Integer userId = (Integer) session.getAttribute("userId");
            if (userId == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "로그인이 필요합니다.");
                return ResponseEntity.badRequest().body(response);
            }
            
            Optional<MemoPost> memo = boardService.getMemoPostById(id);
            Map<String, Object> response = new HashMap<>();
            if (memo.isPresent()) {
                // 본인의 메모인지 확인
                if (!memo.get().getUserId().equals(userId)) {
                    response.put("success", false);
                    response.put("message", "본인의 메모만 조회할 수 있습니다.");
                } else {
                    response.put("success", true);
                    response.put("memo", memo.get());
                }
            } else {
                response.put("success", false);
                response.put("message", "메모를 찾을 수 없습니다.");
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "메모를 불러오는데 실패했습니다.");
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 메모 수정
     */
    @PutMapping("/memo/{id}")
    public ResponseEntity<Map<String, Object>> updateMemoPost(
            @PathVariable Integer id,
            @RequestBody Map<String, String> request,
            HttpSession session) {
        try {
            Integer userId = (Integer) session.getAttribute("userId");
            if (userId == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "로그인이 필요합니다.");
                return ResponseEntity.badRequest().body(response);
            }
            
            String title = request.get("title");
            String content = request.get("content");
            
            MemoPost memo = boardService.updateMemoPost(id, userId, title, content);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "메모가 수정되었습니다.");
            response.put("memo", memo);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 메모 삭제
     */
    @DeleteMapping("/memo/{id}")
    public ResponseEntity<Map<String, Object>> deleteMemoPost(
            @PathVariable Integer id,
            HttpSession session) {
        try {
            Integer userId = (Integer) session.getAttribute("userId");
            if (userId == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "로그인이 필요합니다.");
                return ResponseEntity.badRequest().body(response);
            }
            
            boardService.deleteMemoPost(id, userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "메모가 삭제되었습니다.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}
