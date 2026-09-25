from models import db
from datetime import datetime, timedelta
import bcrypt

class PasswordResetToken(db.Model):
    """Password reset token model for persistent storage"""
    __tablename__ = 'password_reset_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(255), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    user = db.relationship('User', backref='password_reset_tokens')
    
    def is_valid(self):
        """Check if token is valid (not expired and not used)"""
        return not self.used and datetime.utcnow() < self.expires_at
    
    @classmethod
    def cleanup_expired(cls):
        """Delete expired tokens"""
        expired = cls.query.filter(cls.expires_at < datetime.utcnow()).all()
        for token in expired:
            db.session.delete(token)
        db.session.commit()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)
    google_sub = db.Column(db.String(255), unique=True, nullable=True, index=True)
    apple_sub = db.Column(db.String(255), unique=True, nullable=True, index=True)
    full_name = db.Column(db.String(120))
    avatar_url = db.Column(db.String(255))
    role = db.Column(db.String(20), default='student')  # 'instructor' or 'student'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    workouts = db.relationship('Workout', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Hash and set the user's password"""
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def check_password(self, password):
        """Check if the provided password matches the hash"""
        if not self.password_hash:
            return False
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'full_name': self.full_name,
            'avatar_url': self.avatar_url,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

