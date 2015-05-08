from players import get_or_update_player

from flask import send_file, Blueprint, abort
from PIL import Image, ImageDraw, ImageFont

from time import time
from os import remove, path

bannerapp = Blueprint('banner', __name__)
directory = str(path.join(path.abspath(path.dirname(path.dirname(__file__))), 'api/banners')) + '/'
fonts = str(path.join(path.abspath(path.dirname(path.dirname(__file__))), 'api/static')) + '/'


@bannerapp.route('/banner/<name>/')
def banner_view(name):
    name = name.lower()
    if '/' in name:
        name = name.split('/')[1]
    location = directory + str(name) + ".png"
    # check file exists
    exists = path.isfile(location)
    # if doesn't exist create new or 404
    if not exists:
        return new_banner(location, name, exists)
    # check file age
    now = time()
    fileCreation = path.getctime(location)
    # older than one day
    day_ago = now - (86400)
    if fileCreation < day_ago:
        return new_banner(location, name, exists)
    else:
        return serve_banner(directory + str(name) + ".png")


def serve_banner(img):
    return send_file(img, mimetype='image/png')


def new_banner(location, name, exists):
    stats = get_or_update_player(name, 86400)
    if stats:
        if exists:
            remove(location)
        img = banner(stats)
        img.save(directory + str(name) + ".png")
        return serve_banner(directory + str(name) + ".png")
    else:
        abort(404)


def banner(data):
    name_font = ImageFont.truetype(fonts + "Prototype.ttf", 30)
    mmr_font = ImageFont.truetype(fonts + "Prototype.ttf", 18)
    honbot_font = ImageFont.truetype(fonts + "Prototype.ttf", 10)
    img = Image.new("RGBA", (400, 60), (25, 25, 25))
    draw = ImageDraw.Draw(img)
    draw.text((2, -2), data['nickname'], (255, 255, 255), font=name_font)
    draw.text((335, 0), "honbot.com", (200, 200, 200), font=honbot_font)
    draw.text((1, 39), "MMR: " + str(int(data['rnk_mmr'])), (0, 128, 255), font=mmr_font)
    draw.text((98, 39), "|", (140, 140, 140), font=mmr_font)
    draw.text((110, 39), "TSR: " + str(round(data['rnk_tsr'], 1)), (220, 220, 220), font=mmr_font)
    draw.text((185, 39), "|", (140, 140, 140), font=mmr_font)
    draw.text((194, 39), " W: " + str(data['rnk_wins']), (0, 153, 0), font=mmr_font)
    next = 245 + (8 * len(str(data['rnk_wins'])))
    draw.text((next, 39), "|", (140, 140, 140), font=mmr_font)
    next += 15
    draw.text((next, 39), "L: " + str(data['rnk_losses']), (153, 0, 0), font=mmr_font)
    draw = ImageDraw.Draw(img)
    return img
