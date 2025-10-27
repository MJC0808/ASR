// 공통 로그인 상태 관리 JavaScript
class AuthManager {
    constructor() {
        this.isLoggedIn = false;
        this.username = null;
        this.init();
    }

    async init() {
        await this.checkLoginStatus();
        this.updateHeaderButtons();
    }

    async checkLoginStatus() {
        try {
            const response = await fetch('/api/user/status');
            const result = await response.json();
            
            this.isLoggedIn = result.isLoggedIn;
            this.username = result.username;
        } catch (error) {
            console.error('로그인 상태 확인 오류:', error);
            this.isLoggedIn = false;
            this.username = null;
        }
    }

    updateHeaderButtons() {
        const loginBtn = document.querySelector('.login-btn');
        if (!loginBtn) return;

        if (this.isLoggedIn) {
            // 로그인된 상태: 내정보 + 로그아웃 버튼
            const navLinks = document.querySelector('.nav-links');
            const loginSection = loginBtn.parentElement;
            
            // 기존 로그인 버튼 제거
            loginBtn.remove();
            
            // 내정보 버튼 추가
            const myInfoBtn = document.createElement('a');
            myInfoBtn.href = '/myinfo.html';
            myInfoBtn.className = 'login-btn';
            myInfoBtn.textContent = '내정보';
            myInfoBtn.style.marginRight = '10px';
            
            // 로그아웃 버튼 추가
            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'login-btn';
            logoutBtn.textContent = '로그아웃';
            logoutBtn.style.cursor = 'pointer';
            logoutBtn.addEventListener('click', () => this.logout());
            
            // 버튼들을 컨테이너에 추가
            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.gap = '10px';
            buttonContainer.appendChild(myInfoBtn);
            buttonContainer.appendChild(logoutBtn);
            
            loginSection.appendChild(buttonContainer);
        } else {
            // 로그인되지 않은 상태: 로그인 버튼만
            loginBtn.textContent = '로그인';
            loginBtn.href = '/login.html';
        }
    }

    async logout() {
        try {
            const response = await fetch('/api/user/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert(result.message);
                this.isLoggedIn = false;
                this.username = null;
                
                // 페이지 새로고침하여 헤더 업데이트
                window.location.reload();
            } else {
                alert(result.message);
            }
            
        } catch (error) {
            console.error('로그아웃 오류:', error);
            alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
        }
    }
}

// 페이지 로드 시 AuthManager 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});

