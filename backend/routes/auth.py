from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db
from models.user import User, PasswordResetToken
from models.workout import Workout, Routine
from models.classes import Class, ClassMembership, ClassJoinRequest, AssignedWorkout, StudentWorkoutLog
from models.macros import MacroGoal, Meal, DailyIntake
import jwt
import secrets
import os
import smtplib
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def send_password_reset_email(email, reset_token):
    """Send password reset email to user"""
    # Get email configuration from environment
    smtp_host = os.getenv('SMTP_HOST')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_user = os.getenv('SMTP_USER')
    smtp_password = os.getenv('SMTP_PASSWORD')
    smtp_from = os.getenv('SMTP_FROM', smtp_user)
    app_url = os.getenv('APP_URL', 'https://fittrack-api.fly.dev')
    
    # If SMTP is not configured, log the token for development
    if not smtp_host or not smtp_user or not smtp_password:
        current_app.logger.warning(
            f"SMTP not configured. Password reset token for {email}: {reset_token}\n"
            f"Reset link: {app_url}/reset-password?token={reset_token}"
        )
        return
    
    # Create reset link
    reset_link = f"{app_url}/reset-password?token={reset_token}"
    
    # Create email message
    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'FitTrack - Password Reset Request'
    msg['From'] = smtp_from
    msg['To'] = email
    
    # Email body
    text = f"""Hello,

You requested to reset your password for your FitTrack account.

Click the following link to reset your password:
{reset_link}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
FitTrack Team"""
    
    html = f"""<html>
  <body>
    <h2>Password Reset Request</h2>
    <p>Hello,</p>
    <p>You requested to reset your password for your FitTrack account.</p>
    <p><a href="{reset_link}" style="background-color: #13ec5b; color: #102216; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
    <p>Or copy this link: {reset_link}</p>
    <p><small>This link will expire in 1 hour.</small></p>
    <p>If you didn't request this, please ignore this email.</p>
    <p>Best regards,<br>FitTrack Team</p>
  </body>
</html>"""
    
    # Attach parts
    part1 = MIMEText(text, 'plain')
    part2 = MIMEText(html, 'html')
    msg.attach(part1)
    msg.attach(part2)
    
    # Send email
    try:
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
        server.quit()
        current_app.logger.info(f"Password reset email sent to {email}")
    except Exception as e:
        current_app.logger.error(f"Failed to send email: {str(e)}")
        raise

@bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    
    # Validate required fields
    if not data.get('email') or not data.get('password') or not data.get('username'):
        return jsonify({'error': 'Email, username, and password are required'}), 400
    
    # Check if user already exists
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 409
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already taken'}), 409
    
    # Create new user
    user = User(
        email=data['email'],
        username=data['username'],
        full_name=data.get('full_name'),
        role=data.get('role', 'student')  # Default to 'student', can be 'instructor'
    )
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    # Generate access token (convert user.id to string for JWT)
    access_token = create_access_token(identity=str(user.id))
    
    return jsonify({
        'message': 'User registered successfully',
        'user': user.to_dict(),
        'access_token': access_token
    }), 201

@bp.route('/login', methods=['POST'])
def login():
    """Login user"""
    data = request.get_json()
    
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400
    
    # Find user
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    # Generate access token (convert user.id to string for JWT)
    access_token = create_access_token(identity=str(user.id))
    
    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict(),
        'access_token': access_token
    }), 200

def _unique_username_from_email(email):
    """Derive a unique username from an email, suffixing on collision."""
    base = re.sub(r'[^a-zA-Z0-9_]', '', email.split('@')[0]) or 'user'
    base = base[:60]
    candidate = base
    suffix = 0
    while User.query.filter_by(username=candidate).first():
        suffix += 1
        candidate = f"{base}{suffix}"
    return candidate


@bp.route('/google', methods=['POST'])
def google_login():
    """Sign in or sign up with a Google ID token from the mobile client."""
    data = request.get_json() or {}
    token = data.get('id_token')
    if not token:
        return jsonify({'error': 'id_token is required'}), 400

    raw_ids = os.getenv('GOOGLE_OAUTH_CLIENT_IDS', '')
    accepted_ids = [cid.strip() for cid in raw_ids.split(',') if cid.strip()]
    if not accepted_ids:
        return jsonify({'error': 'Google login is not configured on the server'}), 500

    try:
        claims = google_id_token.verify_oauth2_token(
            token, google_requests.Request(), audience=None
        )
    except ValueError as e:
        return jsonify({'error': f'Invalid Google token: {e}'}), 401

    if claims.get('aud') not in accepted_ids:
        return jsonify({'error': 'Token audience does not match a known client'}), 401
    if claims.get('iss') not in ('accounts.google.com', 'https://accounts.google.com'):
        return jsonify({'error': 'Token issuer is not Google'}), 401

    sub = claims.get('sub')
    email = (claims.get('email') or '').lower()
    if not sub or not email:
        return jsonify({'error': 'Google token missing sub or email'}), 400
    if claims.get('email_verified') is False:
        return jsonify({'error': 'Google email is not verified'}), 401

    full_name = claims.get('name')
    avatar_url = claims.get('picture')

    user = User.query.filter_by(google_sub=sub).first()
    if user is None:
        user = User.query.filter_by(email=email).first()
        if user is not None:
            user.google_sub = sub
            if not user.full_name and full_name:
                user.full_name = full_name
            if not user.avatar_url and avatar_url:
                user.avatar_url = avatar_url
        else:
            user = User(
                email=email,
                username=_unique_username_from_email(email),
                google_sub=sub,
                full_name=full_name,
                avatar_url=avatar_url,
                role='student',
            )
            db.session.add(user)
        db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict(),
        'access_token': access_token,
    }), 200


_apple_jwks = jwt.PyJWKClient('https://appleid.apple.com/auth/keys')


@bp.route('/apple', methods=['POST'])
def apple_login():
    """Sign in or sign up with a Sign in with Apple identity token from iOS."""
    data = request.get_json() or {}
    token = data.get('identity_token')
    if not token:
        return jsonify({'error': 'identity_token is required'}), 400

    raw_ids = os.getenv('APPLE_BUNDLE_IDS', 'com.shredx.mobile')
    accepted_ids = [bid.strip() for bid in raw_ids.split(',') if bid.strip()]

    try:
        signing_key = _apple_jwks.get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=['RS256'],
            audience=accepted_ids,
            issuer='https://appleid.apple.com',
        )
    except jwt.PyJWTError as e:
        return jsonify({'error': f'Invalid Apple token: {e}'}), 401

    sub = claims.get('sub')
    if not sub:
        return jsonify({'error': 'Apple token missing sub'}), 400
    email = (claims.get('email') or '').lower()
    # Apple sends email_verified as either a bool or the string "true".
    email_verified = str(claims.get('email_verified')).lower() == 'true'
    # Apple only returns the user's name to the client, and only on first sign-in.
    full_name = (data.get('full_name') or '').strip() or None

    user = User.query.filter_by(apple_sub=sub).first()
    if user is None:
        if not email:
            return jsonify({'error': 'Apple token missing email'}), 400
        user = User.query.filter_by(email=email).first() if email_verified else None
        if user is not None:
            user.apple_sub = sub
            if not user.full_name and full_name:
                user.full_name = full_name
        else:
            if User.query.filter_by(email=email).first():
                return jsonify({'error': 'Email already registered'}), 409
            user = User(
                email=email,
                username=_unique_username_from_email(email),
                apple_sub=sub,
                full_name=full_name,
                role='student',
            )
            db.session.add(user)
        db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict(),
        'access_token': access_token,
    }), 200


@bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user profile"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user.to_dict()}), 200

@bp.route('/me', methods=['DELETE'])
@jwt_required()
def delete_account():
    """Permanently delete the current user and everything they own."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    # SQLite doesn't enforce foreign keys here, so remove dependents explicitly.
    # Logs pointing at this user's workouts go first, whoever they belong to.
    own_workout_ids = [w.id for w in Workout.query.with_entities(Workout.id).filter_by(user_id=user_id)]
    StudentWorkoutLog.query.filter(
        (StudentWorkoutLog.student_id == user_id) | StudentWorkoutLog.workout_id.in_(own_workout_ids)
    ).delete(synchronize_session=False)
    # Deleting a class cascades to its memberships, join requests and assignments.
    for class_ in Class.query.filter_by(instructor_id=user_id).all():
        db.session.delete(class_)
    for assignment in AssignedWorkout.query.filter_by(instructor_id=user_id).all():
        db.session.delete(assignment)
    db.session.flush()
    for model in (ClassMembership, ClassJoinRequest):
        model.query.filter_by(student_id=user_id).delete(synchronize_session=False)
    for model in (Routine, MacroGoal, Meal, DailyIntake, PasswordResetToken):
        model.query.filter_by(user_id=user_id).delete(synchronize_session=False)
    # Workouts cascade to their exercises and sets.
    db.session.delete(user)
    db.session.commit()

    return jsonify({'message': 'Account deleted'}), 200

@bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change user password"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    if not data.get('current_password') or not data.get('new_password'):
        return jsonify({'error': 'Current password and new password are required'}), 400
    
    if not user.check_password(data['current_password']):
        return jsonify({'error': 'Current password is incorrect'}), 401
    
    user.set_password(data['new_password'])
    db.session.commit()
    
    return jsonify({'message': 'Password changed successfully'}), 200

@bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset"""
    data = request.get_json()
    
    if not data.get('email'):
        return jsonify({'error': 'Email is required'}), 400
    
    # Find user by email
    user = User.query.filter_by(email=data['email']).first()
    
    # For security, always return success even if user doesn't exist
    # This prevents email enumeration attacks
    if user:
        # Clean up expired tokens for this user
        PasswordResetToken.query.filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.expires_at < datetime.utcnow()
        ).delete()
        
        # Invalidate any existing unused tokens for this user
        PasswordResetToken.query.filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == False
        ).update({'used': True})
        
        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        
        # Store token in database with expiration (1 hour)
        reset_token_obj = PasswordResetToken(
            token=reset_token,
            user_id=user.id,
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )
        db.session.add(reset_token_obj)
        db.session.commit()
        
        # Send password reset email
        email_sent = False
        try:
            send_password_reset_email(user.email, reset_token)
            email_sent = True
        except Exception as e:
            # Log error but don't fail the request (security: don't reveal if email exists)
            current_app.logger.error(f"Failed to send password reset email: {str(e)}")
        
        # In development, log the token so it can be retrieved from logs
        if os.getenv('FLASK_ENV') == 'development' or not email_sent:
            current_app.logger.info(
                f"Password reset token for {user.email}: {reset_token}\n"
                f"Reset URL: {os.getenv('APP_URL', 'https://fittrack-api.fly.dev')}/reset-password?token={reset_token}"
            )
    
    response = {
        'message': 'If an account exists with this email, you will receive password reset instructions.'
    }
    
    # In development mode, include token in response for testing (remove in production!)
    if os.getenv('FLASK_ENV') == 'development' and user:
        response['debug_token'] = reset_token
        response['debug_message'] = 'Check server logs for reset token (development mode only)'
    
    return jsonify(response), 200

@bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password using token"""
    data = request.get_json()
    
    if not data.get('token') or not data.get('new_password'):
        return jsonify({'error': 'Token and new password are required'}), 400
    
    token = data['token']
    
    # Find token in database
    reset_token_obj = PasswordResetToken.query.filter_by(token=token).first()
    
    if not reset_token_obj:
        return jsonify({'error': 'Invalid or expired reset token'}), 400
    
    # Check if token is valid (not expired and not used)
    if not reset_token_obj.is_valid():
        if reset_token_obj.used:
            return jsonify({'error': 'This reset token has already been used'}), 400
        else:
            return jsonify({'error': 'Reset token has expired'}), 400
    
    # Find user
    user = User.query.get(reset_token_obj.user_id)
    if not user:
        reset_token_obj.used = True
        db.session.commit()
        return jsonify({'error': 'User not found'}), 404
    
    # Validate new password
    if len(data['new_password']) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long'}), 400
    
    # Set new password
    user.set_password(data['new_password'])
    
    # Mark token as used
    reset_token_obj.used = True
    db.session.commit()
    
    return jsonify({'message': 'Password reset successfully'}), 200

