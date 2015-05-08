from app import app
from players import players
from matches import matches
from history import history
from stats import stats
from banner import bannerapp


def register_blueprints(app):
    app.register_blueprint(players)
    app.register_blueprint(matches)
    app.register_blueprint(history)
    app.register_blueprint(stats)
    app.register_blueprint(bannerapp)
    return app


if __name__ == '__main__':
    register_blueprints(app)
    app.run()
