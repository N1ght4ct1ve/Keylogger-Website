from flask import Flask, render_template, request, session, jsonify, abort, redirect, url_for
import datetime
import os
import json
from werkzeug.exceptions import NotFound

app = Flask(__name__)

# Load configuration from .env file
def load_config():
    """Load configuration from .env file"""
    config = {}
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    config[key] = value
    
    # Fallback values if .env doesn't exist
    config.setdefault('SECRET_PASSWORD', 'default_password_change_me')
    config.setdefault('SECRET_KEY', 'default_secret_key_change_me_in_production')
    config.setdefault('SESSION_TIMEOUT', '1800')
    
    return config

# Load configuration
CONFIG = load_config()

app.secret_key = CONFIG['SECRET_KEY']

# Secret password for accessing the hidden area (loaded from config)
SECRET_PASSWORD = CONFIG['SECRET_PASSWORD']
SESSION_TIMEOUT = int(CONFIG['SESSION_TIMEOUT'])  # Convert to integer

# File to store security logs
SECURITY_LOG_FILE = 'security_logs.json'

def log_security_event(event_type, details, ip_address):
    """Log security events to file"""
    timestamp = datetime.datetime.now().isoformat()
    log_entry = {
        'timestamp': timestamp,
        'event_type': event_type,
        'details': details,
        'ip_address': ip_address,
        'user_agent': request.headers.get('User-Agent', 'Unknown')
    }
    
    # Load existing logs
    logs = []
    if os.path.exists(SECURITY_LOG_FILE):
        try:
            with open(SECURITY_LOG_FILE, 'r') as f:
                logs = json.load(f)
        except:
            logs = []
    
    # Add new log entry
    logs.append(log_entry)
    
    # Keep only last 1000 entries
    logs = logs[-1000:]
    
    # Save logs
    with open(SECURITY_LOG_FILE, 'w') as f:
        json.dump(logs, f, indent=2)

@app.before_request
def before_request():
    """Check for suspicious activity before each request"""
    ip = request.remote_addr
    path = request.path
    user_agent = request.headers.get('User-Agent', '')
    
    # List of suspicious paths that attackers commonly try
    suspicious_paths = [
        '/.env', '/admin', '/wp-admin', '/phpMyAdmin', '/phpmyadmin',
        '/config', '/backup', '/database', '/.git', '/config.php',
        '/wp-config.php', '/secrets', '/private', '/hidden',
        '/server-status', '/server-info', '/.htaccess', '/robots.txt'
    ]
    
    # Check for suspicious paths
    if any(suspicious in path.lower() for suspicious in suspicious_paths):
        log_security_event(
            'suspicious_path_access',
            f'Attempted to access: {path}',
            ip
        )
        abort(404)  # Return 404 to make it look like the path doesn't exist
    
    # Check for bot-like behavior
    bot_indicators = ['bot', 'crawler', 'spider', 'scraper', 'scan']
    if any(indicator in user_agent.lower() for indicator in bot_indicators):
        log_security_event(
            'bot_detected',
            f'Bot user agent: {user_agent}',
            ip
        )

@app.route('/')
def home():
    """Main page with the game"""
    # Clear any existing authentication when visiting the main page
    session.pop('authenticated', None)
    session.pop('auth_timestamp', None)
    session.pop('typed_string', None)
    return render_template('game.html')

@app.route('/keypress', methods=['POST'])
def handle_keypress():
    """Handle keypress events for password checking"""
    data = request.get_json()
    key = data.get('key', '')
    
    # Get current typed string from session
    current_string = session.get('typed_string', '')
    
    # Add the new key
    current_string += key
    
    # Keep only the last 20 characters to prevent memory issues
    if len(current_string) > 20:
        current_string = current_string[-20:]
    
    session['typed_string'] = current_string
    
    # Check if the secret password is in the typed string
    if SECRET_PASSWORD in current_string:
        session['authenticated'] = True
        session['auth_timestamp'] = datetime.datetime.now().timestamp()  # Add timestamp
        session['typed_string'] = ''  # Clear the string
        return jsonify({'redirect': '/secret'})
    
    return jsonify({'success': True})

@app.route('/secret')
def secret_area():
    """Secret area that requires password authentication"""
    # Check if user is authenticated
    if not session.get('authenticated'):
        # Log the unauthorized access attempt
        log_security_event(
            'unauthorized_secret_access',
            f'Direct access attempt to /secret without authentication',
            request.remote_addr
        )
        abort(404)  # Return 404 to make it look like the page doesn't exist
    
    # Check if authentication is recent (within last 30 minutes)
    auth_timestamp = session.get('auth_timestamp')
    if not auth_timestamp:
        session.pop('authenticated', None)
        log_security_event(
            'expired_secret_access',
            f'Access attempt to /secret with expired session',
            request.remote_addr
        )
        abort(404)
    
    # Check if authentication is too old (configurable timeout)
    current_time = datetime.datetime.now().timestamp()
    if current_time - auth_timestamp > SESSION_TIMEOUT:
        session.pop('authenticated', None)
        session.pop('auth_timestamp', None)
        log_security_event(
            'expired_secret_access',
            f'Access attempt to /secret with expired authentication (older than {SESSION_TIMEOUT} seconds)',
            request.remote_addr
        )
        abort(404)
    
    return render_template('secret.html')

@app.route('/logout')
def logout():
    """Logout from secret area"""
    session.pop('authenticated', None)
    session.pop('auth_timestamp', None)
    session.pop('typed_string', None)
    return redirect(url_for('home'))

@app.route('/game_score', methods=['POST'])
def save_score():
    """Save game score (optional feature)"""
    data = request.get_json()
    score = data.get('score', 0)
    
    # Log high scores for fun
    if score > 50:  # Arbitrary threshold
        log_security_event(
            'high_game_score',
            f'Player achieved score: {score}',
            request.remote_addr
        )
    
    return jsonify({'success': True})

@app.errorhandler(404)
def not_found(error):
    """Custom 404 handler that logs attempts"""
    log_security_event(
        'page_not_found',
        f'Attempted to access: {request.path}',
        request.remote_addr
    )
    return "Page not found", 404

@app.errorhandler(403)
def forbidden(error):
    """Custom 403 handler"""
    log_security_event(
        'forbidden_access',
        f'Forbidden access attempt: {request.path}',
        request.remote_addr
    )
    return "Forbidden", 403

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)