from datetime import datetime

from api import get_json
from app import db
from flask import abort, Blueprint, jsonify
from matches import multimatch
from models import Match, Player
from serialize import MatchSchema
from utils import needs_update

return_size = 25
history = Blueprint('history', __name__)


@history.route('/history/<int:pid>/<int:page>/<mode>/')
def player_history(pid, page, mode):
    """this is the main function of player history
    returns 404 if user doesn't already exist in db
    """
    count = int(page) * return_size
    player = get_or_update_history(pid)
    if player is None:
        abort(404)
    # loads up history and trims it to size
    hist = getattr(player, mode + '_history')
    hist = hist[(count - return_size):count]
    ph = verify_matches(hist, mode)
    ph = MatchSchema().dump(ph, many=True)[0]
    res = {
        'matches': len(ph),
        'page': page,
        'mode': mode,
        'result': ph
    }
    return jsonify(res)


@history.route('/cache/<int:pid>/<mode>/')
def get_cached(pid, mode):
    """Returns all matches for matching mode and pid
    """
    player = Player.query.filter_by(id=pid).first()
    find = getattr(player, mode + '_history')
    matches = Match.query.filter(Match.id.in_(find))
    result = MatchSchema().dump(matches, many=True)[0]
    res = {
        'matches': len(result),
        'mode': mode,
        'result': result
    }
    return jsonify(res)


def get_or_update_history(pid):
    p = Player.query.get(pid)
    url = '/match_history/all/accountid/' + str(pid)
    # player doesn't exist
    if p is None:
        return None
    # history never done
    if p.history_updated is None:
        raw = get_json(url)
        if raw:
            return update_history(p, raw)
        else:
            return None
    if needs_update(p.history_updated, 800):
        raw = get_json(url)
        if raw:
            return update_history(p, raw)
    return p


def update_history(p, raw):
    parsed = [[], [], []]
    for idx, history in enumerate(raw):
        parsed[idx] = [int(m.split('|')[0]) for m in history['history'].split(',')]
    p.rnk_history = parsed[0][::-1]
    p.cs_history = parsed[1][::-1]
    p.acc_history = parsed[2][::-1]
    p.history_updated = datetime.utcnow()
    db.session.commit()
    return p


def verify_matches(hist, mode):
    """
    checks for matches exist in the database. If they not exist, they soon will.
    """
    findexisting = Match.query.filter(Match.id.in_(hist)).all()
    existing = set([int(match.id) for match in findexisting])
    missing = [x for x in hist if x not in existing]
    # if any are missing USE SPECIAL SET OF SKILLS
    if len(missing) > 0:
        others = multimatch(missing)
        if others is not None:
            for o in others:
                findexisting.append(o)
    return sorted(findexisting, key=lambda x: x.id)
