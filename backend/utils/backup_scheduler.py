"""
Backup Scheduler for Alpha Agency
Schedules automatic backups every 6 hours
"""

import asyncio
import logging
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

class BackupScheduler:
    """Handles scheduled backups"""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.backup_manager = None
        self.is_running = False
        
    def set_backup_manager(self, backup_manager):
        """Set the backup manager instance"""
        self.backup_manager = backup_manager
    
    async def _run_scheduled_backup(self):
        """Execute a scheduled backup"""
        if not self.backup_manager:
            logger.error("Backup manager not configured")
            return
        
        logger.info(f"Starting scheduled backup at {datetime.now(timezone.utc).isoformat()}")
        try:
            result = await self.backup_manager.create_backup(manual=False)
            logger.info(f"Scheduled backup completed: {result['status']}")
        except Exception as e:
            logger.error(f"Scheduled backup failed: {e}")
    
    def start(self):
        """Start the backup scheduler"""
        if self.is_running:
            logger.warning("Scheduler already running")
            return
        
        # Schedule backups at 00:00, 06:00, 12:00, 18:00 UTC
        self.scheduler.add_job(
            self._run_scheduled_backup,
            CronTrigger(hour='0,6,12,18', minute=0),
            id='scheduled_backup',
            name='Database Backup Every 6 Hours',
            replace_existing=True
        )
        
        self.scheduler.start()
        self.is_running = True
        logger.info("Backup scheduler started - running every 6 hours (00h, 06h, 12h, 18h)")
    
    def stop(self):
        """Stop the backup scheduler"""
        if self.is_running:
            self.scheduler.shutdown()
            self.is_running = False
            logger.info("Backup scheduler stopped")
    
    def get_next_run_time(self):
        """Get the next scheduled backup time"""
        job = self.scheduler.get_job('scheduled_backup')
        if job and job.next_run_time:
            return job.next_run_time.isoformat()
        return None
    
    def get_status(self):
        """Get scheduler status"""
        return {
            "running": self.is_running,
            "next_run": self.get_next_run_time(),
            "schedule": "0,6,12,18 UTC"
        }

# Global scheduler instance
backup_scheduler = BackupScheduler()
