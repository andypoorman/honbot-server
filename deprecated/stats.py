from app import db, redis_store
from models import Player, Match

from flask import jsonify, Blueprint
from datetime import datetime


stats = Blueprint('stats', __name__)


@stats.route('/stats/')
def collection_count():
    return jsonify({
        'matches': redis_store.get('match_count') or 0,
        'players': redis_store.get('player_count') or 0,
        'success': redis_store.get('api_success') or 0,
        'failure': redis_store.get('api_failure') or 0,
        'daily': redis_store.get('api_daily') or 0,
    })


def api_success_incr():
    current = redis_store.exists('api_success')
    redis_store.incr('api_success', amount=1)
    if not current:
        now = datetime.now()
        expire = now.replace(minute=(now.minute + (now.minute % 15)), second=0, microsecond=0)
        redis_store.expireat('api_success', expire)


def api_failure_incr():
    current = redis_store.exists('api_failure')
    redis_store.incr('api_failure', amount=1)
    if not current:
        now = datetime.now()
        expire = now.replace(minute=(now.minute + (now.minute % 15)), second=0, microsecond=0)
        redis_store.expireat('api_failure', expire)


def api_daily_incr():
    current = redis_store.exists('api_daily')
    redis_store.incr('api_daily', amount=1)
    if not current:
        now = datetime.now()
        expire = now.replace(day=(now.day + 1), hour=0, minute=0, second=0, microsecond=0)
        redis_store.expireat('api_daily', expire)


def player_incr():
    players = redis_store.get('player_count') or db.session.query(Player).count()
    redis_store.set('player_count', int(players) + 1)


def match_incr():
    matches = redis_store.get('match_count') or db.session.query(Match).count()
    redis_store.set('match_count', int(matches) + 1)
