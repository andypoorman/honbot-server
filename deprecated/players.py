from __future__ import division
from datetime import datetime

from api import get_json
from app import db
from models import Player
from serialize import PlayerSchema
from stats import player_incr
from utils import div, needs_update

from flask import jsonify, Blueprint, abort, request
from flask.ext.rq import job
import requests


players = Blueprint('players', __name__)
nohistory = {'acc_history': 0, 'cs_history': 0, 'rnk_history': 0}


@players.route('/player/<nickname>/')
def player(nickname):
    player, fallback = get_or_update_player(nickname, 800)
    if player is None:
        abort(404)
    result = PlayerSchema().dump(player).data
    if fallback:
        result['fallback'] = fallback
    return jsonify(result)


@players.route('/ptip/')
def ptip():
    users = request.args.get('players')
    if users is None or users is '':
        abort(404)
    users = [int(u) for u in users.split(',')[:10]]
    stats = Player.query.filter(Player.id.in_(users)).all()
    result = PlayerSchema().dump(stats, many=True)
    return jsonify({'result': result[0]})


@job
def avatar(player_id):
    req = requests.get("https://www.heroesofnewerth.com/getAvatar_SSL.php?id=" + str(player_id))
    db.session.query(Player).filter_by(id=player_id).update({'avatar': req.url, 'avatar_updated': datetime.utcnow()})
    db.session.commit()


def get_or_update_player(nickname, age):
    player = get_player_nickname(nickname)
    fallback = False
    if player is None:
        new = update_player(nickname)
        if new:
            return (new, fallback)
        else:
            return (None, fallback)
    if needs_update(player.updated, age):
        updated = update_player(player.nickname, player)
        if updated is not None:
            if updated.avatar_updated is None or needs_update(player.avatar_updated, 1209600):
                avatar.delay(updated.id)
            return (updated, fallback)
        else:
            fallback = True
    return (player, fallback)


def get_player_nickname(nickname):
    player = Player.query.filter_by(nickname=nickname.lower()).first()
    if player is None:
        return None
    return player


def update_player(nickname, p=None):
    raw = get_json('/player_statistics/all/nickname/' + nickname)
    if raw is None or int(raw['account_id']) == 0:
        return None
    if p is None:
        p = Player(id=int(raw['account_id']))
        not_exists = True
    else:
        not_exists = False
    p.nickname = raw['nickname'].lower()
    var = [
        'rnk_games_played', 'rnk_wins', 'rnk_losses', 'rnk_concedes', 'rnk_concedevotes', 'rnk_buybacks', 'rnk_discos', 'rnk_kicked', 'rnk_herokills', 'rnk_herodmg', 'rnk_heroexp', 'rnk_herokillsgold', 'rnk_heroassists', 'rnk_deaths', 'rnk_goldlost2death', 'rnk_secs_dead', 'rnk_teamcreepkills', 'rnk_teamcreepdmg', 'rnk_teamcreepexp', 'rnk_teamcreepgold', 'rnk_neutralcreepkills', 'rnk_neutralcreepdmg', 'rnk_teamcreepexp', 'rnk_neutralcreepgold', 'rnk_bdmg', 'rnk_razed', 'rnk_bgold', 'rnk_denies', 'rnk_exp_denied', 'rnk_gold', 'rnk_gold_spent', 'rnk_exp', 'rnk_actions', 'rnk_secs', 'rnk_consumables', 'rnk_wards', 'rnk_level', 'rnk_level_exp', 'rnk_time_earning_exp', 'rnk_bloodlust', 'rnk_doublekill', 'rnk_triplekill', 'rnk_quadkill', 'rnk_annihilation', 'rnk_ks3', 'rnk_ks4', 'rnk_ks5', 'rnk_ks6', 'rnk_ks7', 'rnk_ks8', 'rnk_ks9', 'rnk_ks10', 'rnk_ks15', 'rnk_smackdown', 'rnk_humiliation', 'rnk_nemesis', 'rnk_retribution', 'cs_games_played', 'cs_wins', 'cs_losses', 'cs_concedes', 'cs_concedevotes', 'cs_buybacks', 'cs_discos', 'cs_kicked', 'cs_herokills', 'cs_herodmg', 'cs_heroexp', 'cs_herokillsgold', 'cs_heroassists', 'cs_deaths', 'cs_goldlost2death', 'cs_secs_dead', 'cs_teamcreepkills', 'cs_teamcreepdmg', 'cs_teamcreepexp', 'cs_teamcreepgold', 'cs_neutralcreepkills', 'cs_neutralcreepdmg', 'cs_teamcreepexp', 'cs_neutralcreepgold',
        'cs_bdmg', 'cs_bdmgexp', 'cs_razed', 'cs_bgold', 'cs_denies', 'cs_exp_denied', 'cs_gold', 'cs_gold_spent', 'cs_exp', 'cs_actions', 'cs_secs', 'cs_consumables', 'cs_wards', 'cs_level', 'cs_level_exp', 'cs_time_earning_exp', 'cs_bloodlust', 'cs_doublekill', 'cs_triplekill', 'cs_quadkill', 'cs_annihilation', 'cs_ks3', 'cs_ks4', 'cs_ks5', 'cs_ks6', 'cs_ks7', 'cs_ks8', 'cs_ks9', 'cs_ks10', 'cs_ks15', 'cs_smackdown', 'cs_humiliation', 'cs_nemesis', 'cs_retribution', 'acc_games_played', 'acc_wins', 'acc_losses', 'acc_concedes', 'acc_concedevotes', 'acc_buybacks', 'acc_discos', 'acc_kicked', 'acc_herokills', 'acc_herodmg', 'acc_heroexp', 'acc_herokillsgold', 'acc_heroassists', 'acc_deaths', 'acc_goldlost2death', 'acc_secs_dead', 'acc_teamcreepkills', 'acc_teamcreepdmg', 'acc_teamcreepexp', 'acc_teamcreepgold', 'acc_neutralcreepkills', 'acc_neutralcreepdmg', 'acc_teamcreepexp', 'acc_neutralcreepgold', 'acc_bdmg', 'acc_bdmgexp', 'acc_razed', 'acc_bgold', 'acc_denies', 'acc_exp_denied', 'acc_gold', 'acc_gold_spent', 'acc_exp', 'acc_actions', 'acc_secs', 'acc_consumables', 'acc_wards', 'acc_time_earning_exp', 'acc_bloodlust', 'acc_doublekill', 'acc_triplekill', 'acc_quadkill', 'acc_annihilation', 'acc_ks3', 'acc_ks4', 'acc_ks5', 'acc_ks6', 'acc_ks7', 'acc_ks8', 'acc_ks9', 'acc_ks10', 'acc_ks15', 'acc_smackdown', 'acc_humiliation', 'acc_nemesis', 'acc_retribution'
    ]
    for v in var:
        setattr(p, v, int(raw[v]))
    p.updated = datetime.utcnow()
    p.rnk_mmr = float(raw['rnk_amm_team_rating'])
    p.rnk_avg_kills = div(p.rnk_herokills, p.rnk_games_played)
    p.rnk_avg_deaths = div(p.rnk_deaths, p.rnk_games_played)
    p.rnk_avg_assists = div(p.rnk_heroassists, p.rnk_games_played)
    p.rnk_avg_creeps = div((p.rnk_neutralcreepkills + p.rnk_teamcreepkills), p.rnk_games_played)
    p.rnk_avg_denies = div(p.rnk_denies, p.rnk_games_played)
    rnk_minutes = div(p.rnk_secs, 60)
    p.rnk_avg_xpm = div(p.rnk_exp, rnk_minutes)
    p.rnk_avg_apm = div(p.rnk_actions, rnk_minutes)
    p.rnk_avg_gpm = div(p.rnk_gold, rnk_minutes)
    p.rnk_avg_consumables = div(p.rnk_consumables, p.rnk_games_played)
    p.rnk_avg_time = div(rnk_minutes, p.rnk_games_played)
    p.rnk_winpercent = div(p.rnk_wins, p.rnk_games_played)
    p.rnk_kdr = div(p.rnk_herokills, p.rnk_deaths)
    p.rnk_avg_wards = div(p.rnk_wards, p.rnk_games_played)
    p.rnk_kadr = div((p.rnk_herokills + p.rnk_heroassists), p.rnk_deaths)
    try:
        p.rnk_tsr = ((p.rnk_herokills / p.rnk_deaths / 1.15) * 0.65) + ((p.rnk_heroassists / p.rnk_deaths / 1.55) * 1.20) + (((p.rnk_wins / (p.rnk_wins + p.rnk_losses)) / 0.55) * 0.9) + (((p.rnk_gold / p.rnk_secs * 60) / 230) * 0.35) + ((((p.rnk_exp / p.rnk_time_earning_exp * 60) / 380)) * 0.40) + (
            (((((p.rnk_denies / p.rnk_games_played) / 12)) * 0.70) + ((((p.rnk_teamcreepkills / p.rnk_games_played) / 93)) * 0.50) + ((p.rnk_wards / p.rnk_games_played) / 1.45 * 0.30)) * (37.5 / (p.rnk_secs / p.rnk_games_played / 60)))
    except:
        p.rnk_tsr = 0
    p.cs_mmr = float(raw['cs_amm_team_rating'])
    p.cs_avg_kills = div(p.cs_herokills, p.cs_games_played)
    p.cs_avg_deaths = div(p.cs_deaths, p.cs_games_played)
    p.cs_avg_assists = div(p.cs_heroassists, p.cs_games_played)
    p.cs_avg_creeps = div((p.cs_neutralcreepkills + p.cs_teamcreepkills), p.cs_games_played)
    p.cs_avg_denies = div(p.cs_denies, p.cs_games_played)
    cs_minutes = div(p.cs_secs, 60)
    p.cs_avg_xpm = div(p.cs_exp, cs_minutes)
    p.cs_avg_apm = div(p.cs_actions, cs_minutes)
    p.cs_avg_gpm = div(p.cs_gold, cs_minutes)
    p.cs_avg_consumables = div(p.cs_consumables, p.cs_games_played)
    p.cs_avg_time = div(cs_minutes, p.cs_games_played)
    p.cs_winpercent = div(p.cs_wins, p.cs_games_played)
    p.cs_kdr = div(p.cs_herokills, p.cs_deaths)
    p.cs_avg_wards = div(p.cs_wards, p.cs_games_played)
    p.cs_kadr = div((p.cs_herokills + p.cs_heroassists), p.cs_deaths)
    try:
        p.cs_tsr = ((p.cs_herokills / p.cs_deaths / 1.15) * 0.65) + ((p.cs_heroassists / p.cs_deaths / 1.55) * 1.20) + (((p.cs_wins / (p.cs_wins + p.cs_losses)) / 0.55) * 0.9) + (((p.cs_gold / p.cs_secs * 60) / 230) * 0.35) + ((((p.cs_exp / p.cs_time_earning_exp * 60) / 380)) * 0.40) + (
            (((((p.cs_denies / p.cs_games_played) / 12)) * 0.70) + ((((p.cs_teamcreepkills / p.cs_games_played) / 93)) * 0.50) + ((p.cs_wards / p.cs_games_played) / 1.45 * 0.30)) * (37.5 / (p.cs_secs / p.cs_games_played / 60)))
    except:
        p.cs_tsr = 0
    p.acc_mmr = float(raw['acc_pub_skill'])
    p.acc_avg_kills = div(p.acc_herokills, p.acc_games_played)
    p.acc_avg_deaths = div(p.acc_deaths, p.acc_games_played)
    p.acc_avg_assists = div(p.acc_heroassists, p.acc_games_played)
    p.acc_avg_creeps = div((p.acc_neutralcreepkills + p.acc_teamcreepkills), p.acc_games_played)
    p.acc_avg_denies = div(p.acc_denies, p.acc_games_played)
    acc_minutes = div(p.acc_secs, 60)
    p.acc_avg_xpm = div(p.acc_exp, acc_minutes)
    p.acc_avg_apm = div(p.acc_actions, acc_minutes)
    p.acc_avg_gpm = div(p.acc_gold, acc_minutes)
    p.acc_avg_consumables = div(p.acc_consumables, p.acc_games_played)
    p.acc_avg_time = div(acc_minutes, p.acc_games_played)
    p.acc_winpercent = div(p.acc_wins, p.acc_games_played)
    p.acc_kdr = div(p.acc_herokills, p.acc_deaths)
    p.acc_avg_wards = div(p.acc_wards, p.acc_games_played)
    p.acc_kadr = div((p.acc_herokills + p.acc_heroassists), p.acc_deaths)
    try:
        p.acc_tsr = ((p.acc_herokills / p.acc_deaths / 1.15) * 0.65) + ((p.acc_heroassists / p.acc_deaths / 1.55) * 1.20) + (((p.acc_wins / (p.acc_wins + p.acc_losses)) / 0.55) * 0.9) + (((p.acc_gold / p.acc_secs * 60) / 230) * 0.35) + ((((p.acc_exp / p.acc_time_earning_exp * 60) / 380)) * 0.40) + (
            (((((p.acc_denies / p.acc_games_played) / 12)) * 0.70) + ((((p.acc_teamcreepkills / p.acc_games_played) / 93)) * 0.50) + ((p.acc_wards / p.acc_games_played) / 1.45 * 0.30)) * (37.5 / (p.acc_secs / p.acc_games_played / 60)))
    except:
        p.acc_tsr = 0
    if not_exists:
        db.session.add(p)
        db.session.commit()
        avatar.delay(p.id)
        player_incr()
    db.session.commit()
    return p
