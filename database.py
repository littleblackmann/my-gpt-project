from pymongo import MongoClient, ASCENDING
from bson.objectid import ObjectId
from datetime import datetime


class Database:
    def __init__(self, uri='mongodb://localhost:27017/', db_name='chat_app'):
        self.client = MongoClient(uri)
        self.db = self.client[db_name]
        self.chats = self.db['chats']
        self.messages = self.db['messages']
        
        # 創建索引
        self.chats.create_index([("user_id", ASCENDING)])
        self.messages.create_index([("chat_id", ASCENDING)])

    def create_chat(self, user_id, title="New Chat"):
        chat = {
            'user_id': user_id,
            'title': title,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        result = self.chats.insert_one(chat)
        return str(result.inserted_id)

    def get_chat(self, chat_id):
        return self.chats.find_one({"_id": ObjectId(chat_id)})

    def get_user_chats(self, user_id):
        return list(self.chats.find({"user_id": user_id}).sort("updated_at", -1))

    def insert_message(self, chat_id, role, content):
        message = {
            'chat_id': ObjectId(chat_id),
            'role': role,
            'content': content,
            'timestamp': datetime.utcnow()
        }
        self.messages.insert_one(message)
        self.chats.update_one(
            {"_id": ObjectId(chat_id)},
            {"$set": {"updated_at": datetime.utcnow()}}
        )

    def get_chat_messages(self, chat_id):
        return list(self.messages.find({"chat_id": ObjectId(chat_id)}).sort("timestamp", 1))

    def close(self):
        self.client.close()

    def update_chat_title(self, chat_id, new_title):
        self.chats.update_one(
            {"_id": ObjectId(chat_id)},
            {"$set": {"title": new_title, "updated_at": datetime.utcnow()}}
        )

    def delete_chat(self, chat_id):
        self.chats.delete_one({"_id": ObjectId(chat_id)})
        self.messages.delete_many({"chat_id": ObjectId(chat_id)})