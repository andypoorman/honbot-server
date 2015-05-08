from __future__ import print_function
import json

import pyprind
import pytz
from models import Match, PlayerMatch
from flask.ext.script import Command
from sqlalchemy import create_engine
from sqlalchemy.orm import load_only
from config import remote
from app import db


def psetup(data):
    p = {}
    p['id'] = data[1]
    p['match_id'] = data[2]
    p['deaths'] = data[3]
    p['win'] = data[4]
    p['apm'] = data[5]
    p['cs'] = data[6]
    p['buybacks'] = data[7]
    p['exp_denied'] = data[16]
    p['secs_dead'] = data[18]
    p['gpm'] = data[19]
    p['bdmg'] = data[20]
    p['herodmg'] = data[21]
    p['xpm'] = data[22]
    p['kdr'] = data[23]
    p['mmr_change'] = data[24]
    p['goldlost2death'] = data[25]
    p['denies'] = data[26]
    p['hero_id'] = data[27]
    p['herokills'] = data[28]
    p['consumables'] = data[29]
    p['assists'] = data[30]
    p['nickname'] = data[31]
    p['level'] = data[32]
    p['wards'] = data[33]
    p['team'] = data[34]
    p['position'] = data[35]
    p['items'] = json.loads(data[36])
    p['concedes'] = 0
    p['concedevotes'] = 0
    p['clan_id'] = 0
    return p


class sqlpull(Command):
    def run(self):
        engine = create_engine(remote, pool_recycle=3600)
        conn = engine.connect()
        result = engine.execute("select match_id from honbot_matches")
        matches = set([int(m[0]) for m in result])
        print(len(matches))

        findexisting = db.engine.execute('select id from match')
        exists = set([int(m[0]) for m in findexisting])

        print(len(exists))

        filtered = matches - exists

        print(len(filtered))


        my_prbar = pyprind.ProgBar(len(matches), monitor=True, title="sqlpull")
        for m in filtered:
            match = list(engine.execute("select * from honbot_matches where match_id = %i" % m))[0]
            if match[4] == 'rnk':
                newmode = 1
                playerlocation = "select * from honbot_playermatches where match_id = %i"
            elif match[4] == 'cs':
                newmode = 2
                playerlocation = "select * from honbot_playermatchescasual where match_id = %i"
            elif match[4] == 'acc':
                newmode = 3
                playerlocation = "select * from honbot_playermatchespublic where match_id = %i"



            temptime = match[3].split(':')
            totaltime = 0
            if len(temptime) == 3:
                totaltime += int(temptime[0]) * 60 * 60
                totaltime += int(temptime[1]) * 60
                totaltime += int(temptime[2])
            if len(temptime) == 2:
                totaltime += int(temptime[0]) * 60
                totaltime += int(temptime[1])
            if len(temptime) == 1:
                totaltime += int(temptime[0])

            matchstring = '0.0.0.0'
            if '99' not in str(match[6]):
                matchstring = '%d.%d.%d.%d' % (match[6], match[7], match[8], match[9])


            newmatch = Match(
                id=m,
                version=matchstring,
                map_used=match[5],
                length=totaltime,
                date=pytz.utc.localize(match[1]),
                mode=newmode,
            )
            players = list(engine.execute(playerlocation % m))
            if len(players) < 1:
                continue
            for player in players:
                p = psetup(player)
                newmatch.players.append(PlayerMatch(
                    player_id=int(p['id']),
                    nickname=p['nickname'],
                    clan_id=int(p['clan_id']),
                    hero_id=int(p['hero_id']),
                    position=int(p['position']),
                    items=p['items'],
                    team=int(p['team']),
                    level=int(p['level']),
                    win=bool(int(p['win'])),
                    concedes=int(p['concedes']),
                    concedevotes=int(p['concedevotes']),
                    buybacks=int(p['buybacks']),
                    discos=0,
                    kicked=0,
                    mmr_change=float(p['mmr_change']),
                    herodmg=int(p['herodmg']),
                    kills=int(p['herokills']),
                    assists=int(p['assists']),
                    deaths=int(p['deaths']),
                    kdr=float(p['kdr']),
                    goldlost2death=int(p['goldlost2death']),
                    secs_dead=int(p['secs_dead']),
                    cs=int(p['cs']),
                    bdmg=int(p['bdmg']),
                    denies=int(p['denies']),
                    exp_denied=p['exp_denied'],
                    gpm=float(p['gpm']),
                    xpm=float(p['xpm']),
                    apm=float(p['apm']),
                    consumables=int(p['consumables']),
                    wards=int(p['wards'])
                ))
            db.session.add(newmatch)
            db.session.commit()
            my_prbar.update(item_id=m)

        print(my_prbar)
