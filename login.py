from flask import Blueprint, request, jsonify, session
from google.oauth2 import id_token
from google.auth.transport import requests
import os
from dotenv import load_dotenv
import logging


# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)

# Google OAuth Client ID
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
if not GOOGLE_CLIENT_ID:
    raise ValueError("GOOGLE_CLIENT_ID is not set in the environment variables")

# Create a Blueprint for login routes
login_bp = Blueprint('login', __name__)

@login_bp.route('/google', methods=['POST'])
def google_auth():
    logging.info("Received Google auth request")
    logging.info(f"Request data: {request.json}")
    try:
        token = request.json.get('id_token')
        if not token:
            logging.error("No id_token provided in request")
            return jsonify({'status': 'error', 'message': 'No token provided'}), 400
        
        logging.info(f"Verifying id_token: {token[:10]}...")  # 只記錄前10個字符
        
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), GOOGLE_CLIENT_ID)
        
        # 記錄 ID 信息
        logging.info(f"ID Info: {idinfo}")  # 在驗證後添加這一行
        
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')
        
        # 存儲用戶信息到會話
        session['user'] = {
            'id': idinfo['sub'],
            'email': idinfo['email'],
            'name': idinfo['name'],
            'picture': idinfo.get('picture', '')
        }
        logging.info(f"User {idinfo['email']} stored in session")
        logging.info(f"Session after storing user: {session}")

        return jsonify({
            'status': 'success',
            'user': {
                'name': idinfo['name'],
                'email': idinfo['email'],
                'picture': idinfo.get('picture', '')
            }
        })
    except ValueError as e:
        logging.error(f"Invalid token: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 401
    except Exception as e:
        logging.error(f"Unexpected error during authentication: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Authentication failed'}), 500

@login_bp.route('/user', methods=['GET'])
def get_user():
    logging.info(f"Current session: {session}")
    user = session.get('user')
    if user:
        return jsonify({'status': 'success', 'user': user})
    else:
        logging.info("User not found in session")
        return jsonify({'status': 'error', 'message': 'User not found'}), 401

@login_bp.route('/logout', methods=['POST'])
def logout():
    user = session.pop('user', None)
    if user:
        logging.info(f"User {user['email']} logged out")
    return jsonify({'status': 'success', 'message': 'Successfully logged out'}), 200

# Function to check if user is logged in
def is_logged_in():
    return 'user' in session
