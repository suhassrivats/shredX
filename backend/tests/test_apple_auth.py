import time
from types import SimpleNamespace
from unittest.mock import patch

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from models.user import User

_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _token(**overrides):
    claims = {
        'iss': 'https://appleid.apple.com',
        'aud': 'com.shredx.mobile',
        'sub': 'apple-sub-1',
        'email': 'Relay@privaterelay.appleid.com',
        'email_verified': 'true',
        'iat': int(time.time()),
        'exp': int(time.time()) + 600,
    }
    claims.update(overrides)
    return jwt.encode(claims, _KEY, algorithm='RS256')


@pytest.fixture(autouse=True)
def fake_apple_keys():
    key = SimpleNamespace(key=_KEY.public_key())
    with patch('routes.auth._apple_jwks.get_signing_key_from_jwt', return_value=key):
        yield


def _post(client, token, **body):
    return client.post('/api/auth/apple', json={'identity_token': token, **body})


def test_creates_user_on_first_sign_in(client):
    res = _post(client, _token(), full_name='Ada Lovelace')
    assert res.status_code == 200
    user = res.get_json()['user']
    assert user['email'] == 'relay@privaterelay.appleid.com'
    assert user['full_name'] == 'Ada Lovelace'
    assert res.get_json()['access_token']


def test_returning_user_without_email_claim(client):
    first = _post(client, _token()).get_json()['user']
    res = _post(client, _token(email=None))
    assert res.status_code == 200
    assert res.get_json()['user']['id'] == first['id']


def test_links_existing_email_account(client, test_user):
    res = _post(client, _token(email='test@example.com'))
    assert res.status_code == 200
    assert res.get_json()['user']['username'] == 'testuser'
    assert User.query.filter_by(email='test@example.com').one().apple_sub == 'apple-sub-1'


def test_unverified_email_does_not_link(client, test_user):
    res = _post(client, _token(email='test@example.com', email_verified='false'))
    assert res.status_code == 409


@pytest.mark.parametrize('overrides', [
    {'aud': 'com.someone.else'},
    {'iss': 'https://evil.example.com'},
    {'exp': int(time.time()) - 10},
])
def test_rejects_bad_tokens(client, overrides):
    assert _post(client, _token(**overrides)).status_code == 401


def test_rejects_wrong_signature(client):
    other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    forged = jwt.encode({'sub': 'x', 'aud': 'com.shredx.mobile', 'iss': 'https://appleid.apple.com',
                         'exp': int(time.time()) + 600}, other, algorithm='RS256')
    assert _post(client, forged).status_code == 401


def test_requires_token(client):
    assert client.post('/api/auth/apple', json={}).status_code == 400
