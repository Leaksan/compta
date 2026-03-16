from datetime import timezone
from api.index import app, db, User
from werkzeug.security import generate_password_hash
import datetime

with app.app_context():
    # Delete old test user if exists to avoid conflicts
    User.query.filter_by(whatsapp="123456789").delete()
    User.query.filter_by(whatsapp="+241123456789").delete()
    db.session.commit()

    user = User(
        first_name="Test",
        company_name="Test Corp",
        whatsapp="+241123456789",
        email="test@example.com",
        is_pro=True,
        plan="annual",
        activated_at=datetime.datetime.now(timezone.utc)
    )
    user.set_password("password")
    db.session.add(user)
    db.session.commit()
    print("Test user created with +241123456789")
