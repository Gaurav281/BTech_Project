# -*- coding: utf-8 -*-
import sys
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
import logging
from telegram import Update
from telegram.ext import Application, MessageHandler, filters, ContextTypes

# -------------------- Logging Setup --------------------
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# -------------------- Configuration --------------------
ALLOWED_CHAT_ID = -4856306364  # 🔒 Replace with your Telegram chat ID

# -------------------- Telegram Message Handler --------------------
async def handle_user_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles incoming Telegram messages."""
    if not update.message or not update.message.text:
        return

    chat_id = update.message.chat_id
    if chat_id != ALLOWED_CHAT_ID:
        logger.warning(f"Unauthorized access attempt from chat ID: {chat_id}")
        await update.message.reply_text("🚫 Access denied. This bot is private.")
        return

    # Always reply with fixed message
    await update.message.reply_text("hi from server")

# -------------------- Main Entry Point --------------------
def main() -> None:
    """Starts the Telegram bot."""
    try:
        bot_token = "6216446524:AAHUoHJV04sC6qPlr9EbFNFmVvbbjonPd1E"
        bot_app = Application.builder().token(bot_token).build()

        # Add handler for text messages
        bot_app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_user_message))

        logger.info("🤖 Telegram Bot is now running and will reply 'hi from server' to all messages...")
        bot_app.run_polling()
    except Exception as e:
        logger.critical(f"Fatal error: {e}", exc_info=True)
        raise

if __name__ == "__main__":
    main()
