from django.core.management.base import BaseCommand

from hb.api import get_json
from hb.avatar import avatar
from hb.models import Player
from hb.player import get_player

from django_rq import enqueue
from time import sleep


class Command(BaseCommand):
    help = 'This will find players that are missing and slam them into our database'

    def handle(self, *args, **options):
        players = Player.objects.raw("""SELECT DISTINCT B.`player_id`
                                             FROM hb_player A
                                             RIGHT JOIN hb_playermatchrnk B
                                             ON A.`player_id` = B.`player_id`
                                             WHERE A.`player_id` is NULL""")
        count = 0
        for player in players:
            sleep(1.5)
            data = get_json('/player_statistics/all/accountid/' + str(player.player_id))
            if data is not None:
                new = get_player(Player(), data)
                enqueue(avatar, new)
                count += 1
        self.stdout.write("success on " + str(count))
