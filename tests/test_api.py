import pytest
from datetime import date, timedelta
import io
import openpyxl

def test_unauthorized_access(client):
    response = client.get('/api/transactions')
    # Flask-Login redirects to login page or returns 401 depending on setup.
    # In app.py, login_manager.login_view = "auth", so it should redirect.
    assert response.status_code == 302
    assert '/auth' in response.headers['Location']

def test_register(client):
    response = client.post('/api/auth/register', json={
        'firstName': 'John',
        'companyName': 'John Ltd',
        'whatsapp': '221770000000',
        'password': 'password123'
    })
    assert response.status_code == 200
    assert response.json['success'] is True
    assert response.json['user']['first_name'] == 'John'

def test_login(client):
    # Register first
    client.post('/api/auth/register', json={
        'firstName': 'John',
        'companyName': 'John Ltd',
        'whatsapp': '221770000000',
        'password': 'password123'
    })
    # Try login
    response = client.post('/api/auth/login', json={
        'whatsapp': '221770000000',
        'password': 'password123'
    })
    assert response.status_code == 200
    assert response.json['success'] is True

def test_create_transaction(auth_client):
    response = auth_client.post('/api/transactions', json={
        'type': 'income',
        'amount': 5000,
        'label': 'Test Sale',
        'category': 'Vente',
        'date': date.today().isoformat()
    })
    assert response.status_code == 200
    assert response.json['success'] is True
    assert response.json['transaction']['amount'] == 5000

def test_free_plan_limit(auth_client):
    # Add 20 transactions
    for i in range(20):
        auth_client.post('/api/transactions', json={
            'type': 'expense',
            'amount': 100,
            'label': f'Test {i}',
            'category': 'Fournitures',
            'date': date.today().isoformat()
        })

    # 21st should fail
    response = auth_client.post('/api/transactions', json={
        'type': 'expense',
        'amount': 100,
        'label': 'Limit Test',
        'category': 'Fournitures',
        'date': date.today().isoformat()
    })
    assert response.status_code == 200
    assert response.json['success'] is False
    assert 'Limite' in response.json['error']

def test_pro_plan_no_limit(pro_client):
    # Add 21 transactions
    for i in range(21):
        pro_client.post('/api/transactions', json={
            'type': 'expense',
            'amount': 100,
            'label': f'Test {i}',
            'category': 'Fournitures',
            'date': date.today().isoformat()
        })

    # Check total count
    response = pro_client.get('/api/transactions')
    assert len(response.json) == 21

def test_save_settings(auth_client):
    response = auth_client.post('/api/settings', json={
        'currency': 'EUR',
        'field_labels': {'income': 'Revenu'}
    })
    assert response.status_code == 200
    assert response.json['success'] is True

    # Verify settings
    response = auth_client.get('/api/user/me')
    assert response.json['settings']['currency'] == 'EUR'
    assert response.json['settings']['field_labels']['income'] == 'Revenu'

def test_export_excel(auth_client):
    response = auth_client.get('/api/export')
    assert response.status_code == 200
    assert response.headers['Content-Type'] == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

def test_import_excel(pro_client):
    # Create a dummy excel file
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(['Date', 'Catégorie', 'Libellé', 'Entrée', 'Dépense', 'Quantité'])
    ws.append(['01/01/2024', 'Vente', 'Vente Test', 1000, 0, 1])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    response = pro_client.post('/api/import', data={
        'file': (buf, 'test.xlsx')
    }, content_type='multipart/form-data')

    assert response.status_code == 200
    assert response.json['success'] is True
    assert '1 transaction(s) importée(s)' in response.json['message']
