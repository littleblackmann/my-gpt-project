from pymongo import MongoClient

# 建立與 MongoDB 的連線
client = MongoClient('mongodb://localhost:27017/')  # 替換為你的 MongoDB 連線 URL
db = client['your_database_name']  # 替換為你的資料庫名稱
collection = db['your_collection_name']  # 替換為你的集合名稱

def save_user_data_to_mongo(user_id, email):
    # 儲存使用者資料到 MongoDB
    user_data = {
        'user_id': user_id,
        'email': email
    }
    collection.insert_one(user_data)

def get_history_from_mongo(user_id):
    # 從 MongoDB 中獲取使用者的歷史紀錄
    history_data = collection.find({'user_id': user_id})
    return list(history_data)