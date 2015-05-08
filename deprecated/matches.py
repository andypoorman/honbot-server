from api import get_json
from app import db
from models import Match, PlayerMatch
from serialize import MatchSchema
from stats import match_incr
from utils import divmin, div

from pytz import utc
from flask import jsonify, Blueprint, abort

from datetime import datetime

matches = Blueprint('matches', __name__)


@matches.route('/match/<int:mid>/')
def match(mid):
    """
    Returns a single match from ID
    Players are returned in an array and their items are a json array dumped into a string
    """
    m = Match.query.filter_by(id=mid).first()
    if m is None:
        raw = get_json('/match/all/matchid/' + str(mid))
        if raw:
            m = single_match(raw, mid)
            db.session.add(m)
            db.session.commit()
        else:
            abort(404)
    result = MatchSchema().dump(m)
    return jsonify(result[0])


def multimatch(matches):
    raw = get_json('/multi_match/all/matchids/' + '+'.join(str(x) for x in matches))
    if raw is None:
        return None
    result = []
    for m in raw[0]:
        temp = []
        temp.append([m])
        c = m['match_id']
        temp.append([x for x in raw[1] if x['match_id'] == c])
        temp.append([x for x in raw[2] if x['match_id'] == c])
        temp.append([x for x in raw[3] if x['match_id'] == c])
        match = single_match(temp, c)
        result.append(match)
        db.session.add(match)
    db.session.commit()
    return result


def single_match(raw, mid):
    m = Match(id=mid)
    match_incr()
    if raw[0][0]['officl'] == "1" and raw[0][0]['cas'] == "1":
        # m.mode = 'cs'
        m.mode = 2
    elif raw[0][0]['officl'] == "1" and raw[0][0]['cas'] == "0":
        # m.mode = "rnk"
        m.mode = 1
    else:
        # m.mode = "acc"
        m.mode = 3
    m.version = raw[3][0]['version']
    m.map_used = raw[3][0]['map']
    m.length = raw[3][0]['time_played']
    # '2014-07-27 01:31:18'
    unaware_date = datetime.strptime(raw[3][0]['mdt'], '%Y-%m-%d %H:%M:%S')
    m.date = utc.localize(unaware_date)
    pitems = {}
    for p in raw[1]:
        items = []
        for item in range(1, 7):
            if p['slot_' + str(item)]:
                items.append(int(p['slot_' + str(item)]))
        pitems[p['account_id']] = items
    for p in raw[2]:
        if p['account_id'] not in pitems:
            pitems[p['account_id']] = []
        m.players.append(PlayerMatch(
            player_id=int(p['account_id']),
            nickname=p['nickname'],
            clan_id=int(p['clan_id']),
            hero_id=int(p['hero_id']),
            position=int(p['position']),
            items=pitems[p['account_id']],
            team=int(p['team']),
            level=int(p['level']),
            win=int(p['wins']),
            concedes=int(p['concedes']),
            concedevotes=int(p['concedevotes']),
            buybacks=int(p['buybacks']),
            discos=int(p['discos']),
            kicked=int(p['kicked']),
            mmr_change=float(p['amm_team_rating']),
            herodmg=int(p['herodmg']),
            kills=int(p['herokills']),
            assists=int(p['heroassists']),
            deaths=int(p['deaths']),
            kdr=div(p['herokills'], p['deaths']),
            goldlost2death=int(p['goldlost2death']),
            secs_dead=int(p['secs_dead']),
            cs=int(p['teamcreepkills']) + int(p['neutralcreepkills']),
            bdmg=p['bdmg'],
            denies=p['denies'],
            exp_denied=p['exp_denied'],
            gpm=divmin(p['gold'], m.length),
            xpm=divmin(p['exp'], m.length),
            apm=divmin(p['actions'], m.length),
            consumables=int(p['consumables']),
            wards=int(p['wards'])
        ))
    return m
