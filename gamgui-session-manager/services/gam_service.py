"""GAM command execution service for GAM Session Worker"""
import asyncio
import json
import logging
import os
import subprocess
from datetime import datetime
from typing import Optional, Dict, Any, AsyncGenerator

from config import environment

logger = logging.getLogger(__name__)


class GamService:
    """Service for executing GAM commands"""
    
    def __init__(self):
        self.running_processes: Dict[str, subprocess.Popen] = {}
    
    def _validate_command(self, command: str) -> bool:
        """Validate that command is a GAM command"""
        command = command.strip()
        if not command:
            return False
        
        # Must start with 'gam'
        if not command.startswith('gam ') and command != 'gam':
            return False
        
        # Basic security checks - prevent command injection
        dangerous_chars = [';', '&&', '||', '|', '`', '$', '(', ')']
        if any(char in command for char in dangerous_chars):
            return False
        
        return True
    
    async def execute_command(
        self, 
        command: str, 
        command_id: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute GAM command and yield output messages"""
        
        # Generate command ID if not provided
        if not command_id:
            command_id = f"cmd_{datetime.utcnow().timestamp()}"
        
        # Validate command
        if not self._validate_command(command):
            yield {
                "type": "error",
                "message": "Invalid GAM command. Commands must start with 'gam' and contain no dangerous characters.",
                "timestamp": datetime.utcnow().isoformat()
            }
            return
        
        # Send command start notification
        yield {
            "type": "command_start",
            "command_id": command_id,
            "command": command,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        try:
            # Prepare environment for GAM
            gam_env = {
                **dict(os.environ),
                "GAMCFGDIR": environment.GAM_CONFIG_DIR,
                "PATH": f"{os.path.dirname(environment.GAM_PATH)}:{os.environ.get('PATH', '')}"
            }
            
            # Start the GAM process
            process = subprocess.Popen(
                command.split(),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True,
                env=gam_env,
                cwd=environment.GAM_CONFIG_DIR
            )
            
            # Store the process for potential cancellation
            self.running_processes[command_id] = process
            
            logger.info(f"Started GAM command: {command} (ID: {command_id})")
            
            try:
                # Stream output line by line
                while True:
                    output = process.stdout.readline()
                    if output == '' and process.poll() is not None:
                        break
                    
                    if output:
                        yield {
                            "type": "output",
                            "command_id": command_id,
                            "data": output.strip(),
                            "timestamp": datetime.utcnow().isoformat()
                        }
                
                # Get final return code
                return_code = process.poll()
                
                # Send command completion
                yield {
                    "type": "command_complete",
                    "command_id": command_id,
                    "command": command,
                    "return_code": return_code,
                    "success": return_code == 0,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                logger.info(f"GAM command completed: {command} (ID: {command_id}, RC: {return_code})")
                
            finally:
                # Clean up process reference
                if command_id in self.running_processes:
                    del self.running_processes[command_id]
                
                # Ensure process is terminated
                if process.poll() is None:
                    process.terminate()
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait()
                    
        except FileNotFoundError:
            yield {
                "type": "error",
                "command_id": command_id,
                "message": f"GAM executable not found at {environment.GAM_PATH}",
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error executing GAM command '{command}': {e}")
            yield {
                "type": "error",
                "command_id": command_id,
                "message": f"Command execution failed: {str(e)}",
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def cancel_command(self, command_id: str) -> bool:
        """Cancel a running command by ID"""
        if command_id in self.running_processes:
            try:
                process = self.running_processes[command_id]
                process.terminate()
                logger.info(f"Cancelled GAM command: {command_id}")
                return True
            except Exception as e:
                logger.error(f"Error cancelling command {command_id}: {e}")
                return False
        return False
    
    def cancel_all_commands(self) -> int:
        """Cancel all running commands"""
        cancelled_count = 0
        
        for command_id, process in self.running_processes.items():
            try:
                process.terminate()
                cancelled_count += 1
                logger.info(f"Cancelled GAM command: {command_id}")
            except Exception as e:
                logger.error(f"Error cancelling command {command_id}: {e}")
        
        self.running_processes.clear()
        return cancelled_count
    
    def get_running_commands(self) -> Dict[str, Dict[str, Any]]:
        """Get information about running commands"""
        running = {}
        for command_id, process in self.running_processes.items():
            running[command_id] = {
                "pid": process.pid,
                "running": process.poll() is None
            }
        return running
    
    def is_gam_available(self) -> bool:
        """Check if GAM is available and executable"""
        try:
            result = subprocess.run(
                [environment.GAM_PATH, "version"],
                capture_output=True,
                text=True,
                timeout=10
            )
            return result.returncode == 0
        except Exception as e:
            logger.error(f"GAM availability check failed: {e}")
            return False
