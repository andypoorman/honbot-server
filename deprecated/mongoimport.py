from flask.ext.script import Command
import pyprind
from app import db
from serialize import MatchSchema
from models import Match
from pymongo import MongoClient


def chunker(seq, size):
    return (seq[pos:pos + size] for pos in xrange(0, len(seq), size))


class mongoimport(Command):
    def run(self):
        findexisting = db.engine.execute('select id from match')
        exists = [int(m[0]) for m in findexisting]
        print(len(exists))
        setexists = set(exists)

        mon = MongoClient()
        matches = mon.hb.matches.aggregate([{'$group': {'_id': '$id'}}])
        matches = [x['_id'] for x in matches]

        matchesset = set(matches)

        filtered = list(setexists - matchesset)
        print(len(filtered))

        for group in chunker(filtered, 1000):
            matches = Match.query.filter(Match.id.in_(group))
            result = MatchSchema().dump(matches, many=True)[0]
            mon.hb.matches.insert(result)
