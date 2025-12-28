import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes
import anthropic
from datetime import datetime

# Environment variables dan olish
TELEGRAM_TOKEN = os.environ.get("8558832351:AAFW1FXIpJrc15-BErSL-VJoIcRz-HtZPzU")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

# Tekshirish
if not TELEGRAM_TOKEN or not ANTHROPIC_API_KEY:
    raise ValueError("❌ TELEGRAM_TOKEN va ANTHROPIC_API_KEY o'rnatilmagan!")

# Anthropic client
client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# Foydalanuvchi sessiyalarini saqlash
user_conversations = {}

class AIBot:
    def __init__(self):
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

Men zamonaviy AI yordamchiman. Claude 4 modelidan foydalanaman.

🎯 Men nima qila olaman:
• Har qanday savolga javob berish
• Kod yozish va tushuntirish
• Matn tahlil qilish va yozish
• Muammolarni hal qilish
• Va boshqa ko'p narsalar!

📝 Komandalar:
/help - Yordam
/clear - Suhbatni tozalash
/settings - Sozlamalar

Menga savolingizni yuboring! 🚀
"""
        await update.message.reply_text(welcome_text)
    
    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Yordam komandasi"""
        help_text = """
📖 Yordam Ma'lumotlari:

🔹 Oddiy xabar yuboring - men javob beraman
🔹 Kod so'rang - yozib beraman
🔹 Savol bering - tushuntiraman

⚙️ Komandalar:
/start - Botni qayta boshlash
/clear - Suhbat tarixini tozalash
/settings - Sozlamalarni ko'rish
/help - Bu yordam xabari

💡 Maslahat: Savollaringizni aniq va batafsil yozing!
"""
        await update.message.reply_text(help_text)
    
    async def clear_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Suhbatni tozalash"""
        user_id = update.effective_user.id
        user_conversations[user_id] = []
        await update.message.reply_text("✅ Suhbat tarixi tozalandi! Yangi suhbat boshlaymiz.")
    
    async def settings_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Sozlamalar menyusi"""
        keyboard = [
            [InlineKeyboardButton("🗑 Suhbatni tozalash", callback_data="clear")],
            [InlineKeyboardButton("📊 Statistika", callback_data="stats")],
            [InlineKeyboardButton("ℹ️ Bot haqida", callback_data="about")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text("⚙️ Sozlamalar:", reply_markup=reply_markup)
    
    async def button_handler(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Inline button bosilganda"""
        query = update.callback_query
        await query.answer()
        
        user_id = update.effective_user.id
        
        if query.data == "clear":
            user_conversations[user_id] = []
            await query.edit_message_text("✅ Suhbat tarixi tozalandi!")
        
        elif query.data == "stats":
            msg_count = len(user_conversations.get(user_id, []))
            stats_text = f"""
📊 Statistika:

👤 Foydalanuvchi: {update.effective_user.first_name}
💬 Xabarlar soni: {msg_count}
🤖 Model: Claude Sonnet 4
⏰ Vaqt: {datetime.now().strftime('%Y-%m-%d %H:%M')}
"""
            await query.edit_message_text(stats_text)
        
        elif query.data == "about":
            about_text = """
🤖 Bot haqida:

Bu AI bot Claude 4 modelidan foydalanadi.
Anthropic kompaniyasi tomonidan ishlab chiqilgan.

✨ Xususiyatlar:
• Natural til bilan suhbat
• Ko'p tilli qo'llab-quvvatlash
• Kod yozish
• Yaratuvchilik mazmuni

Versiya: 1.0.0
Hosting: Railway.app
"""
            await query.edit_message_text(about_text)
    
    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Oddiy xabarlarni qayta ishlash"""
        user_id = update.effective_user.id
        user_message = update.message.text
        
        await update.message.chat.send_action("typing")
        
        if user_id not in user_conversations:
            user_conversations[user_id] = []
        
        user_conversations[user_id].append({
            "role": "user",
            "content": user_message
        })
        
        if len(user_conversations[user_id]) > 20:
            user_conversations[user_id] = user_conversations[user_id][-20:]
        
        try:
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=user_conversations[user_id]
            )
            
            ai_response = response.content[0].text
            
            user_conversations[user_id].append({
                "role": "assistant",
                "content": ai_response
            })
            
            if len(ai_response) > 4000:
                chunks = [ai_response[i:i+4000] for i in range(0, len(ai_response), 4000)]
                for chunk in chunks:
                    await update.message.reply_text(chunk)
            else:
                await update.message.reply_text(ai_response)
        
        except Exception as e:
            error_text = f"❌ Xatolik yuz berdi: {str(e)}\n\n/clear buyrug'i bilan suhbatni tozalab ko'ring."
            await update.message.reply_text(error_text)
    
    def run(self):
        """Botni ishga tushirish"""
        print("🤖 Bot Railway.app da ishga tushdi!")
        print(f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        self.app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    try:
        bot = AIBot()
        bot.run()
    except KeyboardInterrupt:
        print("\n✅ Bot to'xtatildi.")
    except Exception as e:
        print(f"\n❌ Xatolik: {e}")
        raise