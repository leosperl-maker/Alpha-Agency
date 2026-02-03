"""
Instagram Story Automation Service
Uses Playwright to automate Instagram Story posting

WARNING: This is against Instagram's Terms of Service.
Use at your own risk - account may be suspended.

Flow:
1. Store user's Instagram credentials (encrypted)
2. Login to Instagram via browser
3. Navigate to story creation
4. Upload media, add stickers, post
"""

import os
import asyncio
import logging
import uuid
import httpx
from datetime import datetime, timezone
from typing import Optional, Dict, List
from playwright.async_api import async_playwright, Browser, Page, TimeoutError as PlaywrightTimeout

from .database import db
from .token_encryption import encrypt_token, decrypt_token

logger = logging.getLogger("instagram_automation")

# Browser session storage
INSTAGRAM_SESSION_DIR = "/tmp/instagram_sessions"
os.makedirs(INSTAGRAM_SESSION_DIR, exist_ok=True)

class InstagramAutomation:
    """Instagram browser automation for story posting"""
    
    def __init__(self):
        self.browser: Optional[Browser] = None
        self.context = None
        self.page: Optional[Page] = None
        self.logged_in = False
        self.username = None
        
    async def init_browser(self, user_id: str):
        """Initialize browser with persistent context"""
        playwright = await async_playwright().start()
        
        # Use persistent context to save session
        session_path = os.path.join(INSTAGRAM_SESSION_DIR, f"session_{user_id}")
        
        self.browser = await playwright.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        )
        
        self.context = await self.browser.new_context(
            viewport={"width": 430, "height": 932},  # Mobile viewport
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            locale="fr-FR"
        )
        
        self.page = await self.context.new_page()
        
    async def close(self):
        """Close browser"""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
            
    async def login(self, username: str, password: str) -> Dict:
        """Login to Instagram"""
        try:
            logger.info(f"Attempting Instagram login for {username}")
            
            await self.page.goto("https://www.instagram.com/accounts/login/", wait_until="networkidle")
            await asyncio.sleep(2)
            
            # Accept cookies if present
            try:
                cookies_btn = self.page.locator('button:has-text("Autoriser"), button:has-text("Allow")')
                if await cookies_btn.count() > 0:
                    await cookies_btn.first.click()
                    await asyncio.sleep(1)
            except:
                pass
            
            # Fill login form
            await self.page.fill('input[name="username"]', username)
            await self.page.fill('input[name="password"]', password)
            
            # Click login button
            await self.page.click('button[type="submit"]')
            
            # Wait for navigation or error
            await asyncio.sleep(5)
            
            # Check if login succeeded
            current_url = self.page.url
            
            if "challenge" in current_url:
                return {
                    "success": False,
                    "error": "Vérification de sécurité requise. Connectez-vous manuellement sur Instagram et réessayez.",
                    "requires_verification": True
                }
            
            if "/accounts/login" in current_url:
                # Check for error message
                error_el = self.page.locator('#slfErrorAlert, [role="alert"]')
                if await error_el.count() > 0:
                    error_text = await error_el.first.inner_text()
                    return {"success": False, "error": f"Échec connexion: {error_text}"}
                return {"success": False, "error": "Identifiants incorrects"}
            
            # Save "Not now" on save login info popup
            try:
                not_now = self.page.locator('button:has-text("Plus tard"), button:has-text("Not Now")')
                if await not_now.count() > 0:
                    await not_now.first.click()
                    await asyncio.sleep(1)
            except:
                pass
                
            # Skip notifications popup
            try:
                not_now = self.page.locator('button:has-text("Plus tard"), button:has-text("Not Now")')
                if await not_now.count() > 0:
                    await not_now.first.click()
                    await asyncio.sleep(1)
            except:
                pass
            
            self.logged_in = True
            self.username = username
            logger.info(f"Successfully logged in as {username}")
            
            return {"success": True, "username": username}
            
        except PlaywrightTimeout:
            return {"success": False, "error": "Timeout lors de la connexion"}
        except Exception as e:
            logger.error(f"Login error: {e}")
            return {"success": False, "error": str(e)}
    
    async def check_logged_in(self) -> bool:
        """Check if currently logged in"""
        try:
            await self.page.goto("https://www.instagram.com/", wait_until="networkidle")
            await asyncio.sleep(2)
            
            # If redirected to login, not logged in
            if "/accounts/login" in self.page.url:
                return False
            
            # Check for profile icon or home feed
            profile = self.page.locator('[aria-label="Profile"], [aria-label="Profil"]')
            return await profile.count() > 0
            
        except:
            return False
    
    async def create_story(
        self, 
        media_path: str,
        text: Optional[str] = None,
        poll: Optional[Dict] = None,
        link: Optional[str] = None
    ) -> Dict:
        """
        Create and post an Instagram Story
        
        Args:
            media_path: Local path to image/video
            text: Optional text overlay
            poll: Optional poll dict {"question": "...", "options": ["A", "B"]}
            link: Optional swipe-up link (requires 10k followers)
        """
        if not self.logged_in:
            return {"success": False, "error": "Non connecté à Instagram"}
        
        try:
            logger.info("Creating Instagram story...")
            
            # Go to Instagram home
            await self.page.goto("https://www.instagram.com/", wait_until="networkidle")
            await asyncio.sleep(2)
            
            # Click on "+" or "Create" button
            create_btn = self.page.locator('[aria-label="New post"], [aria-label="Nouvelle publication"], svg[aria-label="New post"]')
            if await create_btn.count() == 0:
                # Try mobile menu
                create_btn = self.page.locator('[aria-label="Create"], [aria-label="Créer"]')
            
            if await create_btn.count() == 0:
                return {"success": False, "error": "Impossible de trouver le bouton de création"}
            
            await create_btn.first.click()
            await asyncio.sleep(1)
            
            # Select "Story" option
            story_option = self.page.locator('text=Story, text=Histoire')
            if await story_option.count() > 0:
                await story_option.first.click()
                await asyncio.sleep(1)
            
            # Upload media
            file_input = self.page.locator('input[type="file"]')
            if await file_input.count() > 0:
                await file_input.set_input_files(media_path)
                await asyncio.sleep(3)  # Wait for upload
            else:
                return {"success": False, "error": "Impossible de trouver le champ d'upload"}
            
            # Add text overlay if provided
            if text:
                try:
                    # Click on canvas to add text
                    text_btn = self.page.locator('[aria-label="Text"], [aria-label="Texte"], button:has-text("Aa")')
                    if await text_btn.count() > 0:
                        await text_btn.first.click()
                        await asyncio.sleep(0.5)
                        await self.page.keyboard.type(text)
                        await self.page.keyboard.press("Escape")
                        await asyncio.sleep(0.5)
                except Exception as e:
                    logger.warning(f"Could not add text: {e}")
            
            # Add poll if provided
            if poll:
                try:
                    stickers_btn = self.page.locator('[aria-label="Stickers"], [aria-label="Autocollants"]')
                    if await stickers_btn.count() > 0:
                        await stickers_btn.first.click()
                        await asyncio.sleep(1)
                        
                        poll_sticker = self.page.locator('text=Poll, text=Sondage')
                        if await poll_sticker.count() > 0:
                            await poll_sticker.first.click()
                            await asyncio.sleep(0.5)
                            
                            # Fill poll question and options
                            # This varies by Instagram version
                            await self.page.keyboard.type(poll.get("question", ""))
                            await asyncio.sleep(0.5)
                except Exception as e:
                    logger.warning(f"Could not add poll: {e}")
            
            # Share the story
            share_btn = self.page.locator('button:has-text("Share"), button:has-text("Partager"), [aria-label="Share"]')
            if await share_btn.count() > 0:
                await share_btn.first.click()
                await asyncio.sleep(3)
            else:
                # Try "Your story" button
                your_story = self.page.locator('button:has-text("Your story"), button:has-text("Votre story")')
                if await your_story.count() > 0:
                    await your_story.first.click()
                    await asyncio.sleep(3)
            
            logger.info("Story posted successfully!")
            return {
                "success": True,
                "message": "Story publiée avec succès",
                "username": self.username
            }
            
        except PlaywrightTimeout:
            return {"success": False, "error": "Timeout lors de la création de la story"}
        except Exception as e:
            logger.error(f"Story creation error: {e}")
            return {"success": False, "error": str(e)}


# Singleton instance
_automation_instance: Optional[InstagramAutomation] = None

async def get_automation(user_id: str) -> InstagramAutomation:
    """Get or create automation instance"""
    global _automation_instance
    if _automation_instance is None:
        _automation_instance = InstagramAutomation()
        await _automation_instance.init_browser(user_id)
    return _automation_instance


# ==================== API Functions for Route ====================

async def store_instagram_credentials(user_id: str, username: str, password: str) -> Dict:
    """Store Instagram credentials (encrypted)"""
    await db.instagram_credentials.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "username": username,
            "password_encrypted": encrypt_token(password),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"success": True, "message": "Credentials sauvegardés"}

async def get_instagram_credentials(user_id: str) -> Optional[Dict]:
    """Get stored Instagram credentials"""
    creds = await db.instagram_credentials.find_one({"user_id": user_id})
    if creds:
        return {
            "username": creds.get("username"),
            "password": decrypt_token(creds.get("password_encrypted", ""))
        }
    return None

async def test_instagram_login(user_id: str) -> Dict:
    """Test Instagram login with stored credentials"""
    creds = await get_instagram_credentials(user_id)
    if not creds:
        return {"success": False, "error": "Aucun credential Instagram stocké"}
    
    automation = await get_automation(user_id)
    result = await automation.login(creds["username"], creds["password"])
    
    # Store login result
    await db.instagram_credentials.update_one(
        {"user_id": user_id},
        {"$set": {
            "last_login_attempt": datetime.now(timezone.utc).isoformat(),
            "login_success": result.get("success", False),
            "login_error": result.get("error")
        }}
    )
    
    return result

async def post_instagram_story(
    user_id: str,
    media_url: str,
    text: Optional[str] = None,
    poll: Optional[Dict] = None
) -> Dict:
    """Post a story to Instagram"""
    
    # Download media to temp file
    temp_path = f"/tmp/story_{uuid.uuid4()}.jpg"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(media_url)
            if response.status_code != 200:
                return {"success": False, "error": "Impossible de télécharger le média"}
            
            with open(temp_path, "wb") as f:
                f.write(response.content)
    except Exception as e:
        return {"success": False, "error": f"Erreur téléchargement média: {e}"}
    
    # Get automation and ensure logged in
    automation = await get_automation(user_id)
    
    if not automation.logged_in:
        # Try to login
        login_result = await test_instagram_login(user_id)
        if not login_result.get("success"):
            return login_result
    
    # Post story
    result = await automation.create_story(
        media_path=temp_path,
        text=text,
        poll=poll
    )
    
    # Cleanup
    try:
        os.unlink(temp_path)
    except:
        pass
    
    # Log result
    await db.instagram_story_logs.insert_one({
        "user_id": user_id,
        "media_url": media_url,
        "text": text,
        "poll": poll,
        "success": result.get("success", False),
        "error": result.get("error"),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return result
