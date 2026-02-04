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

# Set Playwright browsers path BEFORE importing playwright
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', '/pw-browsers')

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
        
        # Session directory for this user
        session_dir = os.path.join(INSTAGRAM_SESSION_DIR, user_id)
        os.makedirs(session_dir, exist_ok=True)
        
        self.browser = await playwright.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--single-process'
            ],
            timeout=60000  # 60 seconds timeout for browser launch
        )
        
        self.context = await self.browser.new_context(
            viewport={"width": 430, "height": 932},  # Mobile viewport
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            locale="fr-FR",
            storage_state=os.path.join(session_dir, "state.json") if os.path.exists(os.path.join(session_dir, "state.json")) else None
        )
        
        # Store session dir for saving later
        self.session_dir = session_dir
        self.page = await self.context.new_page()
        self.page.set_default_timeout(30000)  # 30 seconds default timeout
        
    async def save_session(self):
        """Save browser session to reuse later"""
        if self.context and hasattr(self, 'session_dir'):
            try:
                await self.context.storage_state(path=os.path.join(self.session_dir, "state.json"))
                logger.info("Session saved successfully")
            except Exception as e:
                logger.error(f"Failed to save session: {e}")
        
    async def close(self):
        """Close browser"""
        await self.save_session()  # Save session before closing
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
            
    async def login(self, username: str, password: str) -> Dict:
        """Login to Instagram"""
        try:
            logger.info(f"Attempting Instagram login for {username}")
            
            # Remove @ if present
            clean_username = username.lstrip('@')
            
            await self.page.goto("https://www.instagram.com/accounts/login/", wait_until="domcontentloaded", timeout=45000)
            await asyncio.sleep(3)
            
            # Accept cookies if present
            try:
                cookies_btn = self.page.locator('button:has-text("Autoriser"), button:has-text("Allow"), button:has-text("Tout accepter"), button:has-text("Accept")')
                if await cookies_btn.count() > 0:
                    await cookies_btn.first.click(timeout=5000)
                    await asyncio.sleep(2)
            except Exception:
                pass
            
            # Wait for login form
            try:
                await self.page.wait_for_selector('input[name="username"]', timeout=15000)
            except Exception:
                return {"success": False, "error": "Page de connexion Instagram non chargée. Réessayez."}
            
            # Fill login form
            await self.page.fill('input[name="username"]', clean_username)
            await asyncio.sleep(0.5)
            await self.page.fill('input[name="password"]', password)
            await asyncio.sleep(0.5)
            
            # Click login button
            await self.page.click('button[type="submit"]')
            
            # Wait for navigation or error
            await asyncio.sleep(6)
            
            # Check if login succeeded
            current_url = self.page.url
            
            # Security challenge
            if "challenge" in current_url or "suspicious" in current_url:
                return {
                    "success": False,
                    "error": "🔐 Instagram demande une vérification de sécurité. Connectez-vous manuellement sur Instagram depuis votre téléphone, approuvez la connexion, puis réessayez ici.",
                    "requires_verification": True,
                    "action_required": "manual_verification"
                }
            
            # Two-factor auth
            if "two_factor" in current_url:
                return {
                    "success": False,
                    "error": "🔑 Authentification à deux facteurs requise. Désactivez temporairement la 2FA ou utilisez un mot de passe d'application.",
                    "requires_2fa": True
                }
            
            # Still on login page = bad credentials
            if "/accounts/login" in current_url:
                # Check for error message
                try:
                    error_el = self.page.locator('#slfErrorAlert, [role="alert"], .eiCW-')
                    if await error_el.count() > 0:
                        error_text = await error_el.first.inner_text()
                        return {"success": False, "error": f"❌ {error_text}"}
                except Exception:
                    pass
                return {"success": False, "error": "❌ Identifiants incorrects. Vérifiez votre nom d'utilisateur et mot de passe."}
            
            # Save "Not now" on save login info popup
            try:
                not_now = self.page.locator('button:has-text("Plus tard"), button:has-text("Not Now"), div[role="button"]:has-text("Plus tard")')
                if await not_now.count() > 0:
                    await not_now.first.click(timeout=3000)
                    await asyncio.sleep(1)
            except Exception:
                pass
                
            # Skip notifications popup
            try:
                not_now = self.page.locator('button:has-text("Plus tard"), button:has-text("Not Now")')
                if await not_now.count() > 0:
                    await not_now.first.click(timeout=3000)
                    await asyncio.sleep(1)
            except Exception:
                pass
            
            # Save session for future use
            await self.save_session()
            
            self.logged_in = True
            self.username = clean_username
            logger.info(f"Successfully logged in as {clean_username}")
            
            return {"success": True, "username": clean_username, "message": "✅ Connexion réussie !"}
            
        except PlaywrightTimeout:
            return {"success": False, "error": "⏱️ Timeout - Instagram met trop de temps à répondre. Réessayez dans quelques minutes."}
        except Exception as e:
            logger.error(f"Login error: {e}")
            return {"success": False, "error": f"❌ Erreur: {str(e)}"}
    
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
            
        except Exception:
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


# Singleton instance - per account
_automation_instances: Dict[str, InstagramAutomation] = {}

async def get_automation(account_id: str) -> InstagramAutomation:
    """Get or create automation instance for a specific account"""
    global _automation_instances
    
    # Check if existing instance is still valid
    if account_id in _automation_instances:
        instance = _automation_instances[account_id]
        # If browser closed, recreate
        if instance.browser is None or not instance.browser.is_connected():
            del _automation_instances[account_id]
    
    if account_id not in _automation_instances:
        _automation_instances[account_id] = InstagramAutomation()
        await _automation_instances[account_id].init_browser(account_id)
    
    return _automation_instances[account_id]

async def cleanup_automation(account_id: str):
    """Clean up automation instance for an account"""
    global _automation_instances
    if account_id in _automation_instances:
        try:
            await _automation_instances[account_id].close()
        except Exception:
            pass
        del _automation_instances[account_id]


# ==================== API Functions for Multi-Account ====================

async def test_account_login(account_id: str, username: str, password: str) -> Dict:
    """Test login for a specific Instagram account"""
    try:
        # Cleanup any existing session first to start fresh
        await cleanup_automation(account_id)
        
        automation = await get_automation(account_id)
        result = await automation.login(username, password)
        
        # If failed, cleanup the instance
        if not result.get("success"):
            await cleanup_automation(account_id)
        
        return result
    except Exception as e:
        logger.error(f"Test login error: {e}")
        await cleanup_automation(account_id)
        return {"success": False, "error": f"Erreur lors du test: {str(e)}"}

async def post_story_for_account(
    account_id: str,
    username: str,
    password: str,
    media_url: str,
    text: Optional[str] = None,
    poll: Optional[Dict] = None
) -> Dict:
    """Post a story for a specific Instagram account"""
    
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
    
    # Get automation for this account
    automation = await get_automation(account_id)
    
    # Ensure logged in
    if not automation.logged_in:
        login_result = await automation.login(username, password)
        if not login_result.get("success"):
            try:
                os.unlink(temp_path)
            except Exception:
                pass
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
    except Exception:
        pass
    
    return result


# ==================== Legacy API Functions (for backward compatibility) ====================

async def store_instagram_credentials(user_id: str, username: str, password: str) -> Dict:
    """Store Instagram credentials (encrypted) - Legacy"""
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
    """Get stored Instagram credentials - Legacy"""
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
    except Exception:
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
