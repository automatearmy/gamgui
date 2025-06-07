"""Environment configuration for GAM Session Worker"""
import os
from typing import Optional
from dataclasses import dataclass


@dataclass
class Environment:
    """Environment configuration class"""
    
    # Session configuration
    session_id: str
    port: int
    
    # Authentication
    jwt_secret: str
    jwt_algorithm: str
    
    # Google Cloud
    project_id: Optional[str]
    
    # GAM configuration
    gam_path: str
    gam_config_dir: str
    
    # Logging
    log_level: str
    
    # Security
    allowed_origins: list[str]
    
    @classmethod
    def from_env(cls) -> "Environment":
        """Create Environment instance from environment variables"""
        return cls(
            # Session configuration
            session_id=os.getenv('SESSION_ID', 'unknown'),
            port=int(os.getenv('PORT', '8080')),
            
            # Authentication
            jwt_secret=os.getenv('JWT_SECRET', 'fallback-secret-key'),
            jwt_algorithm=os.getenv('JWT_ALGORITHM', 'HS256'),
            
            # Google Cloud
            project_id=os.getenv('PROJECT_ID'),
            
            # GAM configuration
            gam_path=os.getenv('GAM_PATH', '/usr/local/bin/gam'),
            gam_config_dir=os.getenv('GAM_CONFIG_DIR', '/gam-config'),
            
            # Logging
            log_level=os.getenv('LOG_LEVEL', 'INFO'),
            
            # Security
            allowed_origins=os.getenv('ALLOWED_ORIGINS', '*').split(','),
        )
    
    def validate(self) -> None:
        """Validate environment configuration"""
        if self.port < 1 or self.port > 65535:
            raise ValueError("PORT must be between 1 and 65535")


# Global environment instance
env = Environment.from_env()
