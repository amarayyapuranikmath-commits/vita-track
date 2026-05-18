# AFTER (copy-paste this entire file)
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

# AFTER
client: AsyncIOMotorClient = None
db = None                                        # ← ADD this

async def connect_db():
    global client, db                            # ← ADD db
    # Clean connection string from accidental trailing spaces, quotes, or backslashes
    clean_url = settings.MONGODB_URL.strip().strip('"').strip("'").strip('\\').strip()
    client = AsyncIOMotorClient(clean_url)
    db = client[settings.DATABASE_NAME]          # ← ADD this
    
async def close_db():
    global client
    if client:
        client.close()

def get_database():
    return client[settings.DATABASE_NAME]