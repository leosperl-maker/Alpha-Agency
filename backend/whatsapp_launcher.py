"""
WhatsApp Service Launcher
Starts the WhatsApp Node.js service as a subprocess when the backend starts
"""
import subprocess
import os
import logging
import asyncio
import signal
import sys

logger = logging.getLogger(__name__)

# Global process reference
whatsapp_process = None

def start_whatsapp_service():
    """Start the WhatsApp Node.js service as a subprocess"""
    global whatsapp_process
    
    whatsapp_dir = "/app/whatsapp-service"
    node_script = os.path.join(whatsapp_dir, "index.js")
    
    # Check if the service directory and script exist
    if not os.path.isdir(whatsapp_dir):
        logger.warning(f"WhatsApp service directory not found: {whatsapp_dir}")
        return False
    
    if not os.path.isfile(node_script):
        logger.warning(f"WhatsApp service script not found: {node_script}")
        return False
    
    # Check if node is available
    node_path = "/usr/bin/node"
    if not os.path.isfile(node_path):
        node_path = "node"  # Try from PATH
    
    try:
        # Check if already running by trying to connect
        import httpx
        try:
            response = httpx.get("http://localhost:3001/status", timeout=2.0)
            if response.status_code == 200:
                logger.info("WhatsApp service is already running")
                return True
        except:
            pass  # Service not running, we'll start it
        
        # Start the process
        logger.info(f"Starting WhatsApp service from {whatsapp_dir}")
        
        # Create log files
        log_dir = "/var/log/supervisor"
        if not os.path.isdir(log_dir):
            log_dir = "/tmp"
        
        stdout_log = open(os.path.join(log_dir, "whatsapp.out.log"), "a")
        stderr_log = open(os.path.join(log_dir, "whatsapp.err.log"), "a")
        
        whatsapp_process = subprocess.Popen(
            [node_path, "index.js"],
            cwd=whatsapp_dir,
            stdout=stdout_log,
            stderr=stderr_log,
            start_new_session=True  # Detach from parent
        )
        
        logger.info(f"WhatsApp service started with PID: {whatsapp_process.pid}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to start WhatsApp service: {e}")
        return False


def stop_whatsapp_service():
    """Stop the WhatsApp service if running"""
    global whatsapp_process
    
    if whatsapp_process:
        try:
            logger.info(f"Stopping WhatsApp service (PID: {whatsapp_process.pid})")
            whatsapp_process.terminate()
            whatsapp_process.wait(timeout=5)
            logger.info("WhatsApp service stopped")
        except subprocess.TimeoutExpired:
            whatsapp_process.kill()
            logger.warning("WhatsApp service killed after timeout")
        except Exception as e:
            logger.error(f"Error stopping WhatsApp service: {e}")
        finally:
            whatsapp_process = None


async def ensure_whatsapp_running():
    """Background task to ensure WhatsApp service stays running"""
    import httpx
    
    while True:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get("http://localhost:3001/status")
                if response.status_code != 200:
                    logger.warning("WhatsApp service not responding, restarting...")
                    start_whatsapp_service()
        except Exception as e:
            logger.warning(f"WhatsApp health check failed: {e}, attempting restart...")
            start_whatsapp_service()
        
        # Check every 30 seconds
        await asyncio.sleep(30)
