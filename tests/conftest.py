import pytest
import os
from app import app, db, User, Settings

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['WTF_CSRF_ENABLED'] = False

    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.session.remove()
        db.drop_all()

@pytest.fixture
def auth_client(client):
    # Register and login a user
    client.post('/api/auth/register', json={
        'firstName': 'Test',
        'companyName': 'Test Corp',
        'whatsapp': '123456789',
        'password': 'password'
    })
    return client

@pytest.fixture
def pro_client(auth_client):
    # Activate PRO
    auth_client.post('/api/activate-pro', json={'code': 'PROTEST'})
    return auth_client
