import os
from datetime import datetime, timedelta
from functools import wraps

import jwt
from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from database import User, get_db

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

_SECRET  = os.environ.get("SV_JWT_SECRET", "sv_jwt_secret_changeme_in_production")
_EXP_DAYS = 7


def _make_token(user_id):
    payload = {
        "user_id": user_id,
        "exp":     datetime.utcnow() + timedelta(days=_EXP_DAYS),
    }
    return jwt.encode(payload, _SECRET, algorithm="HS256")


def _verify_token(token):
    return jwt.decode(token, _SECRET, algorithms=["HS256"])


def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        token  = header.replace("Bearer ", "").strip()
        if not token:
            return jsonify({"error": "Authentication required."}), 401
        try:
            payload = _verify_token(token)
            request.user_id = payload["user_id"]
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Session expired. Please sign in again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token."}), 401
        return f(*args, **kwargs)
    return wrapper


@auth_bp.route("/signup", methods=["POST"])
def signup():
    data     = request.get_json() or {}
    name     = (data.get("name") or "").strip()
    email    = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "")

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400

    db       = get_db()
    existing = db.query(User).filter_by(email=email).first()
    if existing:
        db.close()
        return jsonify({"error": "An account with this email already exists."}), 409

    user = User(name=name, email=email, password_hash=generate_password_hash(password))
    db.add(user)
    db.commit()
    token = _make_token(user.id)
    result = user.to_dict()
    db.close()

    return jsonify({"token": token, "user": result}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data     = request.get_json() or {}
    email    = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "")

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    db   = get_db()
    user = db.query(User).filter_by(email=email).first()
    db.close()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password."}), 401

    return jsonify({"token": _make_token(user.id), "user": user.to_dict()})


@auth_bp.route("/me", methods=["GET"])
@require_auth
def me():
    db   = get_db()
    user = db.query(User).filter_by(id=request.user_id).first()
    db.close()
    if not user:
        return jsonify({"error": "User not found."}), 404
    return jsonify(user.to_dict())