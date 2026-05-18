# AFTER (copy-paste this entire file)
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

# AFTER
client: AsyncIOMotorClient = None
db = None                                        # ← ADD this

async def connect_db():
    global client, db
    try:
        # Clean connection string from accidental trailing spaces, quotes, or backslashes
        clean_url = settings.MONGODB_URL.strip().strip('"').strip("'").strip('\\').strip()
        client = AsyncIOMotorClient(clean_url)
        db = client[settings.DATABASE_NAME]
        # Verify connection by doing a quick ping
        await client.admin.command('ping')
        print("✅ DATABASE: Connected to MongoDB successfully!")
    except Exception as e:
        print(f"❌ DATABASE CONNECTION ERROR: {e}")
        print("⚠️ FALLBACK: Falling back to local MongoDB to prevent server crash...")
        client = AsyncIOMotorClient("mongodb://localhost:27017")
        db = client["vitatrack"]
    
async def close_db():
    global client
    if client:
        client.close()

def get_database():
    return client[settings.DATABASE_NAME]