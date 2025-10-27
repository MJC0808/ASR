"""
AI 챗봇 서비스
OpenAI API를 사용하여 금융 전문 챗봇 응답을 생성합니다.
"""
import logging
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# OpenAI 클라이언트 초기화
openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))


def get_chatbot_response(messages, username="guest"):
    """
    OpenAI API를 사용하여 챗봇 응답을 생성합니다.
    
    Args:
        messages: 전체 대화 기록
        username: 사용자명 (기본값: "guest")
    
    Returns:
        str: AI 응답
    """
    try:
        if not os.getenv('OPENAI_API_KEY'):
            logger.error("OpenAI API key is not set")
            return "죄송합니다. OpenAI API 키가 설정되지 않았습니다."
        
        # 시스템 프롬프트 추가
        system_message = {
            "role": "system",
            "content": """당신은 금융 전문가 AI 챗봇입니다. 
주식, 채권, 파생상품, 경제, 시장 분석 등 금융 전반에 대한 전문적인 조언을 제공합니다.
항상 정확하고 신중한 답변을 제공하며, 투자 결정은 사용자의 판단에 맡긴다는 점을 명확히 합니다.
한국어로 답변하며, 쉽고 이해하기 쉬운 용어를 사용합니다."""
        }
        
        # 메시지 목록 생성
        api_messages = [system_message] + messages
        
        # OpenAI API 호출 (새 버전)
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=api_messages,
            temperature=0.7,
            max_tokens=1000
        )
        
        ai_response = response.choices[0].message.content.strip()
        
        logger.info(f"Chatbot response generated for user: {username}")
        return ai_response
        
    except Exception as e:
        logger.error(f"Error generating chatbot response: {str(e)}")
        return f"죄송합니다. AI 응답 생성 중 오류가 발생했습니다: {str(e)}"


def chat_endpoint(request_data):
    """
    챗봇 엔드포인트
    
    Args:
        request_data: {
            'messages': [{'role': 'user', 'content': '...'}],
            'username': 'username'
        }
    
    Returns:
        dict: {
            'success': True/False,
            'response': 'AI 응답'
        }
    """
    try:
        messages = request_data.get('messages', [])
        username = request_data.get('username', 'guest')
        
        if not messages:
            return {
                'success': False,
                'error': '메시지가 없습니다.'
            }
        
        # 마지막 사용자 메시지 가져오기
        last_message = messages[-1] if messages else None
        
        if not last_message or last_message.get('role') != 'user':
            return {
                'success': False,
                'error': '사용자 메시지가 필요합니다.'
            }
        
        # AI 응답 생성
        ai_response = get_chatbot_response(messages, username)
        
        return {
            'success': True,
            'response': ai_response
        }
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

