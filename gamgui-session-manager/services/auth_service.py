"""Authentication service for GAM Session Worker"""
import logging
from typing import Optional, Dict, Any

from jose import jwt
from config.environment import env
from services.secret_service import SecretService

logger = logging.getLogger(__name__)


class AuthService:
    """Service for handling authentication"""
    
    def __init__(self, secret_service: SecretService):
        self.secret_service = secret_service
        self._jwt_secret: Optional[str] = None
    
    async def get_jwt_secret(self) -> str:
        """Get JWT secret from Google Secret Manager or environment"""
        if self._jwt_secret:
            return self._jwt_secret
        
        if env.project_id:
            try:
                secret = await self.secret_service.get_secret("jwt-secret")
                if secret:
                    self._jwt_secret = secret
                    return secret
            except Exception as e:
                logger.warning(f"Failed to get JWT secret from Secret Manager: {e}")
        
        # Fallback to environment variable
        self._jwt_secret = env.jwt_secret
        return self._jwt_secret
    
    async def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token and return payload"""
        try:
            secret = await self.get_jwt_secret()
            payload = jwt.decode(token, secret, algorithms=[env.jwt_algorithm])
            
            # Basic validation
            if not payload.get("sub"):
                logger.error("Token missing subject (sub) claim")
                return None
            
            logger.info(f"Token verified for user: {payload.get('sub')}")
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.error("Token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.error(f"Invalid token: {e}")
            return None
        except Exception as e:
            logger.error(f"Error verifying token: {e}")
            return None
    
    def extract_user_info(self, payload: Dict[str, Any]) -> Dict[str, str]:
        """Extract user information from JWT payload"""
        return {
            "user_id": payload.get("sub", "unknown"),
            "email": payload.get("email", "unknown"),
            "name": payload.get("name", "unknown"),
        }
