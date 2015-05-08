from __future__ import print_function
from app import app
from stats import api_success_incr, api_failure_incr, api_daily_incr

from requests import get, exceptions
from time import sleep


baseurl = 'http://api.heroesofnewerth.com'


def get_json(endpoint):
    url = ''.join([baseurl, endpoint, app.config['API_TOKEN']])
    count = 0
    api_daily_incr()
    if app.debug:
        print(url)
    while True:
        try:
            raw = get(url)
        except exceptions.Timeout:
            count += 1
        if raw.status_code == 429 and count < 10:
            count += 1
            sleep(0.4)
        elif raw.status_code == 200:
            api_success_incr()
            return raw.json()
        else:
            api_failure_incr()
            return None
