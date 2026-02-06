"""
MoltBot Scheduler - Automated briefings and reminders
Handles scheduled tasks like morning briefings and evening recaps
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timezone, timedelta
import logging
import httpx
import os
import asyncio

logger = logging.getLogger(__name__)

# Configuration
WHATSAPP_SERVICE_URL = os.environ.get('WHATSAPP_SERVICE_URL', 'http://localhost:3001')

class MoltBotScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler(timezone='America/Guadeloupe')
        self.db = None
        self.admin_phone = None
        self.morning_enabled = True
        self.evening_enabled = True
        self.morning_time = "08:00"
        self.evening_time = "18:00"
        
    def set_database(self, db):
        """Set database connection"""
        self.db = db
        
    async def load_config(self):
        """Load scheduler config from database"""
        try:
            config = await self.db.settings.find_one({"type": "whatsapp_config"}, {"_id": 0})
            if config:
                self.admin_phone = config.get("admin_phone")
                self.morning_enabled = config.get("morning_briefing", True)
                self.evening_enabled = config.get("evening_recap", True)
                self.morning_time = config.get("morning_time", "08:00")
                self.evening_time = config.get("evening_time", "18:00")
                logger.info(f"Scheduler config loaded: admin={self.admin_phone}, morning={self.morning_time}, evening={self.evening_time}")
        except Exception as e:
            logger.error(f"Failed to load scheduler config: {e}")
    
    async def start(self):
        """Start the scheduler with configured jobs"""
        await self.load_config()
        
        # Parse morning time
        try:
            m_hour, m_min = self.morning_time.split(":")
        except:
            m_hour, m_min = "8", "0"
        
        # Parse evening time
        try:
            e_hour, e_min = self.evening_time.split(":")
        except:
            e_hour, e_min = "18", "0"
        
        # Add morning briefing job
        self.scheduler.add_job(
            self.send_morning_briefing,
            CronTrigger(hour=int(m_hour), minute=int(m_min), day_of_week='mon-fri'),
            id='morning_briefing',
            name='Morning Briefing',
            replace_existing=True
        )
        
        # Add evening recap job
        self.scheduler.add_job(
            self.send_evening_recap,
            CronTrigger(hour=int(e_hour), minute=int(e_min), day_of_week='mon-fri'),
            id='evening_recap',
            name='Evening Recap',
            replace_existing=True
        )
        
        # Add overdue reminder (check every 2 hours during business hours)
        self.scheduler.add_job(
            self.check_overdue_tasks,
            CronTrigger(hour='9-17', minute=0, day_of_week='mon-fri'),
            id='overdue_check',
            name='Overdue Tasks Check',
            replace_existing=True
        )
        
        # Add appointment reminders (check every 5 minutes during business hours)
        self.scheduler.add_job(
            self.check_upcoming_appointments,
            CronTrigger(hour='7-20', minute='*/5'),  # Every 5 minutes from 7am to 8pm
            id='appointment_reminders',
            name='Appointment Reminders (30 min before)',
            replace_existing=True
        )
        
        # Add scheduled posts notification (check every 10 minutes)
        self.scheduler.add_job(
            self.check_scheduled_posts,
            CronTrigger(hour='6-23', minute='*/10'),  # Every 10 minutes from 6am to 11pm
            id='scheduled_posts_check',
            name='Scheduled Posts Publication',
            replace_existing=True
        )
        
        self.scheduler.start()
        logger.info("MoltBot Scheduler started")
        
    def stop(self):
        """Stop the scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("MoltBot Scheduler stopped")
    
    async def send_whatsapp_message(self, phone: str, message: str):
        """Send a message via WhatsApp"""
        if not phone:
            logger.warning("No admin phone configured for WhatsApp messages")
            return False
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{WHATSAPP_SERVICE_URL}/send",
                    json={
                        "phone": phone,
                        "message": message
                    }
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to send WhatsApp message: {e}")
            return False
    
    async def generate_briefing(self) -> str:
        """Generate morning briefing content"""
        if not self.db:
            return "❌ Database not available"
        
        today = datetime.now(timezone.utc).date()
        today_str = today.isoformat()
        now = datetime.now(timezone.utc)
        
        try:
            # Tasks
            tasks = await self.db.tasks.find(
                {"status": "todo"},
                {"_id": 0, "title": 1, "priority": 1}
            ).limit(5).to_list(5)
            
            # Appointments today
            appointments = await self.db.appointments.find(
                {"start_time": {"$regex": f"^{today_str}"}},
                {"_id": 0, "title": 1, "start_time": 1}
            ).to_list(10)
            
            # New leads (last 24h)
            yesterday = (now - timedelta(days=1)).isoformat()
            new_leads = await self.db.contacts.count_documents({"created_at": {"$gte": yesterday}})
            
            # Overdue invoices
            overdue = await self.db.invoices.count_documents({
                "status": "sent",
                "due_date": {"$lt": today_str}
            })
            
            # Build message
            msg = f"☀️ *Briefing du {today.strftime('%d/%m/%Y')}*\n"
            msg += "_Via MoltBot_\n\n"
            
            # Tasks
            msg += f"📋 *{len(tasks)} tâche(s) en cours*\n"
            for t in tasks[:3]:
                icon = "🔴" if t.get("priority") == "urgent" else "🟠" if t.get("priority") == "high" else "⚪"
                msg += f"  {icon} {t['title'][:40]}\n"
            if len(tasks) > 3:
                msg += f"  _+{len(tasks)-3} autres..._\n"
            
            # Appointments
            msg += f"\n📅 *{len(appointments)} RDV aujourd'hui*\n"
            for rdv in appointments[:3]:
                try:
                    time = datetime.fromisoformat(rdv['start_time'].replace('Z', '+00:00'))
                    msg += f"  • {time.strftime('%H:%M')} {rdv['title'][:30]}\n"
                except:
                    msg += f"  • {rdv['title'][:30]}\n"
            
            # Alerts
            if new_leads > 0:
                msg += f"\n🆕 *{new_leads} nouveau(x) lead(s)*\n"
            
            if overdue > 0:
                msg += f"\n⚠️ *{overdue} facture(s) en retard*\n"
            
            msg += "\n💪 Bonne journée !"
            
            return msg
            
        except Exception as e:
            logger.error(f"Error generating briefing: {e}")
            return f"❌ Erreur: {str(e)}"
    
    async def generate_recap(self) -> str:
        """Generate evening recap content"""
        if not self.db:
            return "❌ Database not available"
        
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        
        try:
            # Completed tasks today
            completed = await self.db.tasks.count_documents({
                "status": "done",
                "completed_at": {"$gte": today_start}
            })
            
            # Remaining tasks
            remaining = await self.db.tasks.count_documents({"status": "todo"})
            
            # New contacts today
            new_contacts = await self.db.contacts.count_documents({"created_at": {"$gte": today_start}})
            
            # Revenue today
            invoices = await self.db.invoices.find(
                {"type": "facture", "status": "paid", "paid_at": {"$gte": today_start}},
                {"total": 1}
            ).to_list(100)
            revenue = sum(inv.get("total", 0) for inv in invoices)
            
            msg = f"🌙 *Récap de la journée*\n"
            msg += "_Via MoltBot_\n\n"
            msg += f"✅ Tâches terminées: *{completed}*\n"
            msg += f"⏳ Tâches restantes: *{remaining}*\n"
            msg += f"👥 Nouveaux contacts: *{new_contacts}*\n"
            
            if revenue > 0:
                msg += f"💰 CA du jour: *{revenue:,.0f}€*\n".replace(",", " ")
            
            msg += "\n🌟 Bonne soirée !"
            
            return msg
            
        except Exception as e:
            logger.error(f"Error generating recap: {e}")
            return f"❌ Erreur: {str(e)}"
    
    async def send_morning_briefing(self):
        """Send morning briefing to admin"""
        if not self.morning_enabled or not self.admin_phone:
            logger.info("Morning briefing skipped (disabled or no phone)")
            return
        
        logger.info(f"Sending morning briefing to {self.admin_phone}")
        message = await self.generate_briefing()
        await self.send_whatsapp_message(self.admin_phone, message)
        
        # Log
        if self.db:
            await self.db.scheduler_logs.insert_one({
                "type": "morning_briefing",
                "phone": self.admin_phone,
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "success": True
            })
    
    async def send_evening_recap(self):
        """Send evening recap to admin"""
        if not self.evening_enabled or not self.admin_phone:
            logger.info("Evening recap skipped (disabled or no phone)")
            return
        
        logger.info(f"Sending evening recap to {self.admin_phone}")
        message = await self.generate_recap()
        await self.send_whatsapp_message(self.admin_phone, message)
        
        # Log
        if self.db:
            await self.db.scheduler_logs.insert_one({
                "type": "evening_recap",
                "phone": self.admin_phone,
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "success": True
            })
    
    async def check_overdue_tasks(self):
        """Check for overdue tasks and send alerts"""
        if not self.admin_phone or not self.db:
            return
        
        today = datetime.now(timezone.utc).date().isoformat()
        
        # Find tasks with past due dates
        overdue_tasks = await self.db.tasks.find(
            {
                "status": "todo",
                "due_date": {"$lt": today},
                "overdue_notified": {"$ne": True}
            },
            {"_id": 0, "id": 1, "title": 1}
        ).limit(5).to_list(5)
        
        if overdue_tasks:
            msg = f"⚠️ *{len(overdue_tasks)} tâche(s) en retard !*\n\n"
            for task in overdue_tasks:
                msg += f"• {task['title'][:40]}\n"
                # Mark as notified
                await self.db.tasks.update_one(
                    {"id": task["id"]},
                    {"$set": {"overdue_notified": True}}
                )
            
            await self.send_whatsapp_message(self.admin_phone, msg)
    
    async def check_upcoming_appointments(self):
        """
        Check for appointments happening in 30 minutes and send reminders
        Runs every 5 minutes during business hours
        """
        if not self.admin_phone or not self.db:
            return
        
        now = datetime.now(timezone.utc)
        reminder_window_start = now + timedelta(minutes=25)
        reminder_window_end = now + timedelta(minutes=35)
        
        try:
            # Find appointments in the next 25-35 minutes that haven't been reminded
            # This gives us a 10-minute window to catch appointments starting in ~30 min
            appointments = await self.db.appointments.find({
                "status": {"$in": ["scheduled", "confirmed", None]},
                "reminder_sent": {"$ne": True}
            }, {"_id": 0}).to_list(100)
            
            appointments_to_remind = []
            for appt in appointments:
                try:
                    start_time_str = appt.get("start_time", "")
                    if not start_time_str:
                        continue
                    
                    # Parse the start time
                    if start_time_str.endswith('Z'):
                        start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
                    elif '+' in start_time_str or start_time_str.endswith('+00:00'):
                        start_time = datetime.fromisoformat(start_time_str)
                    else:
                        start_time = datetime.fromisoformat(start_time_str).replace(tzinfo=timezone.utc)
                    
                    # Check if appointment is in the reminder window
                    if reminder_window_start <= start_time <= reminder_window_end:
                        appointments_to_remind.append({
                            **appt,
                            "parsed_time": start_time
                        })
                except Exception as parse_err:
                    logger.debug(f"Could not parse appointment time: {parse_err}")
                    continue
            
            # Send reminders
            for appt in appointments_to_remind:
                start_time = appt["parsed_time"]
                title = appt.get("title", "Rendez-vous")
                contact_name = appt.get("contact_name", "")
                location = appt.get("location", "")
                description = appt.get("description", "")
                
                # Build reminder message
                msg = f"⏰ *Rappel RDV dans 30 minutes !*\n\n"
                msg += f"📅 *{title}*\n"
                msg += f"🕐 {start_time.strftime('%H:%M')}\n"
                
                if contact_name:
                    msg += f"👤 {contact_name}\n"
                if location:
                    msg += f"📍 {location}\n"
                if description:
                    msg += f"📝 {description[:100]}\n"
                
                msg += "\n_Via MoltBot_ 🤖"
                
                # Send reminder
                success = await self.send_whatsapp_message(self.admin_phone, msg)
                
                if success:
                    # Mark as reminded
                    await self.db.appointments.update_one(
                        {"id": appt.get("id")},
                        {"$set": {"reminder_sent": True, "reminder_sent_at": now.isoformat()}}
                    )
                    logger.info(f"Appointment reminder sent for: {title}")
                    
                    # Log
                    await self.db.scheduler_logs.insert_one({
                        "type": "appointment_reminder",
                        "appointment_id": appt.get("id"),
                        "appointment_title": title,
                        "phone": self.admin_phone,
                        "sent_at": now.isoformat(),
                        "success": True
                    })
                    
        except Exception as e:
            logger.error(f"Error checking upcoming appointments: {e}")
    
    async def check_scheduled_posts(self):
        """
        Check for scheduled social media posts and send notification when published
        Runs every 10 minutes
        """
        if not self.admin_phone or not self.db:
            return
        
        now = datetime.now(timezone.utc)
        now_str = now.strftime("%Y-%m-%d")
        now_time = now.strftime("%H:%M")
        
        try:
            # Find posts scheduled for now or past that haven't been marked as published
            scheduled_posts = await self.db.editorial_posts.find({
                "status": "scheduled",
                "publication_notified": {"$ne": True}
            }, {"_id": 0}).to_list(50)
            
            for post in scheduled_posts:
                scheduled_date = post.get("scheduled_date", "")
                scheduled_time = post.get("scheduled_time", "23:59")
                
                # Check if it's time to publish (or past time)
                if scheduled_date < now_str or (scheduled_date == now_str and scheduled_time <= now_time):
                    # Post should be published now
                    networks = post.get("networks", [])
                    network_str = ", ".join([n.capitalize() for n in networks]) if networks else "Réseaux sociaux"
                    
                    msg = f"✅ *Publication effectuée !*\n\n"
                    msg += f"📱 {network_str}\n"
                    msg += f"📝 {post.get('title', 'Post')}\n"
                    msg += f"📅 {scheduled_date} {scheduled_time}\n"
                    
                    caption = post.get("caption", "")
                    if caption:
                        msg += f"\n💬 _{caption[:100]}{'...' if len(caption) > 100 else ''}_\n"
                    
                    msg += "\n🎉 Le post a été programmé avec succès !\n"
                    msg += "_Via MoltBot_ 🤖"
                    
                    # Send notification
                    success = await self.send_whatsapp_message(self.admin_phone, msg)
                    
                    if success:
                        # Mark post as published and notified
                        await self.db.editorial_posts.update_one(
                            {"id": post.get("id")},
                            {"$set": {
                                "status": "published",
                                "publication_notified": True,
                                "published_at": now.isoformat()
                            }}
                        )
                        logger.info(f"Publication notification sent for: {post.get('title')}")
                        
        except Exception as e:
            logger.error(f"Error checking scheduled posts: {e}")


# Global scheduler instance
moltbot_scheduler = MoltBotScheduler()
