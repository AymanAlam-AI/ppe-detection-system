import json
import os
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from werkzeug.security import generate_password_hash

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    name          = Column(String(120), nullable=False)
    email         = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    created_at    = Column(DateTime, default=datetime.now)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "email": self.email}


class VideoAnalysis(Base):
    __tablename__ = "video_analyses"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=True)
    filename      = Column(String(255), nullable=False)
    original_filename = Column(String(255))
    upload_time   = Column(DateTime, default=datetime.now)
    status        = Column(String(50), default="pending")
    media_type    = Column(String(20), default="video")

    duration_seconds   = Column(Float)
    total_frames       = Column(Integer)
    fps                = Column(Integer)
    total_detections   = Column(Integer, default=0)
    violations         = Column(Integer, default=0)
    compliant          = Column(Integer, default=0)
    compliance_rate    = Column(Float, default=0.0)
    processing_time    = Column(Float)
    estimated_people   = Column(Integer, default=0)
    inferred_violations = Column(Integer, default=0)

    class_counts_json     = Column(Text)
    violation_frames_json = Column(Text)
    output_video_path     = Column(String(500))

    @property
    def class_counts(self):
        return json.loads(self.class_counts_json) if self.class_counts_json else {}

    @class_counts.setter
    def class_counts(self, value):
        self.class_counts_json = json.dumps(value)

    @property
    def violation_frames(self):
        return json.loads(self.violation_frames_json) if self.violation_frames_json else []

    @violation_frames.setter
    def violation_frames(self, value):
        self.violation_frames_json = json.dumps(value)

    def to_dict(self):
        return {
            "id":                 self.id,
            "filename":           self.filename,
            "original_filename":  self.original_filename,
            "upload_time":        self.upload_time.isoformat() if self.upload_time else None,
            "status":             self.status,
            "media_type":         self.media_type,
            "duration_seconds":   self.duration_seconds,
            "total_frames":       self.total_frames,
            "fps":                self.fps,
            "total_detections":   self.total_detections,
            "violations":         self.violations,
            "compliant":          self.compliant,
            "compliance_rate":    self.compliance_rate,
            "processing_time":    self.processing_time,
            "estimated_people":   self.estimated_people,
            "inferred_violations": self.inferred_violations,
            "helmets_detected":   self.class_counts.get("helmet", 0),
            "class_counts":       self.class_counts,
            "violation_frames":   self.violation_frames[:100],
            "output_video_path":  self.output_video_path,
        }


def _migrate(engine):
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    if "video_analyses" in existing_tables:
        existing_cols = [c["name"] for c in inspector.get_columns("video_analyses")]
        if "user_id" not in existing_cols:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE video_analyses ADD COLUMN user_id INTEGER"))
                conn.commit()


def _seed(session):
    ayman = session.query(User).filter_by(email="aymanalam2005@gmail.com").first()
    if not ayman:
        ayman = User(
            name="Ayman Alam",
            email="aymanalam2005@gmail.com",
            password_hash=generate_password_hash("ayman@2025"),
        )
        session.add(ayman)
        session.commit()

    session.query(VideoAnalysis).filter(VideoAnalysis.user_id == None).update({"user_id": ayman.id})
    session.commit()


def get_db():
    db_path = os.path.join(os.path.dirname(__file__), "ppe_database.db")
    engine  = create_engine(f"sqlite:///{db_path}")
    _migrate(engine)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    _seed(session)
    return session