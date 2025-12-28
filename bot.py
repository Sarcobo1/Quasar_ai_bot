import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes
from datetime import datetime

# ⚠️ MUHIM: Tokenni bu yerda ochiq qoldirmang, Railway Settings -> Variables qismiga qo'shing
# Test uchun o'zgaruvchiga olyapmiz:
TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN")

if not TELEGRAM_TOKEN:
    # Agar Variable o'rnatilmagan bo'lsa, xato beradi (Lokalda ishlaganda xabar beradi)
    raise ValueError("❌ TELEGRAM_TOKEN Railway Variable-larda topilmadi!")

# Foydalanuvchi sessiyalarini saqlash
user_conversations = {}

class QuasarZenBot:
    def __init__(self):
        # Application ob'ektini yaratish
        self.app = Application.builder().token(TELEGRAM_TOKEN).build()
        self.setup_handlers()
    
    def setup_handlers(self):
        """Barcha handlerlarni sozlash"""
        self.app.add_handler(CommandHandler("start", self.start_command))
        self.app.add_handler(CommandHandler("help", self.help_command))
        self.app.add_handler(CommandHandler("clear", self.clear_command))
        self.app.add_handler(CommandHandler("settings", self.settings_command))
        self.app.add_handler(CallbackQueryHandler(self.button_handler))
        self.app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self.handle_message))
    
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Start komandasi"""
        user_id = update.effective_user.id
        user_name = update.effective_user.first_name
        user_conversations[user_id] = []
        
        welcome_text = f"""
👋 Salom {user_name}! 
🌌 **QuasarZen** botiga xush kelibsiz!

Men koinot kabi keng bilimga ega AI yordamchingizman.
Hozircha men test rejimida ishlayapman.

📝 Komandalar:
/help - Yordam menyusi
/clear - Tarixni tozalash
/settings - Sozlamalar
"""
        await update.message.reply_text(welcome_text, parse_mode='Markdown')
    
    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        await update.message.reply_text("💡 Menga Matematika, Kod yoki Tarix haqida savol bering!")

    async def clear_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = update.effective_user.id
        user_conversations[user_id] = []
        await update.message.reply_text("✅ Suhbat tarixi tozalandi!")

    async def settings_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        keyboard = [
            [InlineKeyboardButton("🗑 Tarixni tozalash", callback_data="clear")],
            [InlineKeyboardButton("ℹ️ Bot haqida", callback_data="about")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text("⚙️ Sozlamalar:", reply_markup=reply_markup)

    async def button_handler(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        query = update.callback_query
        await query.answer()
        if query.data == "clear":
            user_conversations[update.effective_user.id] = []
            await query.edit_message_text("✅ Tarix tozalandi!")
        elif query.data == "about":
            await query.edit_message_text("🌌 QuasarZen v1.0\nKoinot quvvati va Zen soddaligi.")

    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """AI o'rniga if-else mantiqi bilan ishlash"""
        user_text = update.message.text.lower()
        
        await update.message.chat.send_action("typing")

        # 1. Matematika mantiqi
        if any(word in user_text for word in ["necha", "+", "-", "*", "/", "hisobla"]):
            response = "🧮 **QuasarZen (Math):** Matematik hisob-kitoblar yaqin orada GLM-4 modeli orqali amalga oshiriladi."
        
        # 2. Kod mantiqi
        elif any(word in user_text for word in ["kod", "python", "yoz", "dastur"]):
            response = "💻 **QuasarZen (Code):** Kod yozish uchun Qwen-2.5-Coder modelini ulayapmiz. Tez orada yordam bera olaman!"
        
        # 3. Tarix mantiqi
        elif any(word in user_text for word in ["tarix", "kim", "qachon"]):
            response = "📜 **QuasarZen (History):** Tarixiy faktlar Llama-3.1 modeli tomonidan taqdim etiladi."
        
        # 4. Umumiy
        else:
            response = "🌌 **QuasarZen:** Xabaringiz qabul qilindi. Hozircha men test rejimida 'if-else' orqali javob beryapman."

        await update.message.reply_text(response, parse_mode='Markdown')

    def run(self):
        print("🤖 Bot ishga tushdi...")
        self.app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    bot = QuasarZenBot()
    bot.run()