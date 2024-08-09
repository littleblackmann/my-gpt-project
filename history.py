from flask import Blueprint, redirect, url_for, session
from flask_login import login_user, logout_user, current_user
from database import save_user_data_to_mongo
from flask_dance.contrib.google import make_google_blueprint, google
from dotenv import load_dotenv
import os

# .env 檔案
load_dotenv()

# 創建一個藍圖
history_bp = Blueprint('history', __name__)

# 設定 Google 登入的藍圖
google_blueprint = make_google_blueprint(
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    scope=['profile', 'email'],
    redirect_to='history.google_login'
)

# 註冊藍圖
history_bp.register_blueprint(google_blueprint, url_prefix="/google")

# Google 登入的路由
@history_bp.route('/google-login')
def google_login():
    if not current_user.is_authenticated:
        response = google.authorized_response()
        if response is None or 'access_token' not in response:
            return 'Access denied: reason={} error={}'.format(
                request.args['error_reason'],
                request.args['error_description']
            )
        
        # 獲取使用者資訊
        user_info = google.get('userinfo')
        user_id = user_info.data['id']
        email = user_info.data['email']

        # 儲存使用者資料到 MongoDB
        save_user_data_to_mongo(user_id, email)

        # 登入使用者
        user = User.get(user_id)
        login_user(user)

        return redirect(url_for('index'))
    else:
        return redirect(url_for('index'))

# 登出路由
@history_bp.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('index'))