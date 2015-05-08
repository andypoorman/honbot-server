from app import ma
from marshmallow import fields


class PlayerSchema(ma.Schema):

    class Meta:
        fields = ('id', 'nickname', 'avatar', 'avatar_updated', 'updated', 'acc_actions', 'acc_annihilation', 'acc_avg_apm', 'acc_avg_assists', 'acc_avg_consumables', 'acc_avg_creeps', 'acc_avg_deaths', 'acc_avg_denies', 'acc_avg_gpm', 'acc_avg_kills', 'acc_avg_time', 'acc_avg_wards', 'acc_avg_xpm', 'acc_bdmg', 'acc_bdmgexp', 'acc_bgold', 'acc_bloodlust', 'acc_buybacks', 'acc_concedes', 'acc_concedevotes', 'acc_consumables', 'acc_deaths', 'acc_denies', 'acc_discos', 'acc_doublekill', 'acc_exp', 'acc_exp_denied', 'acc_games_played', 'acc_gold', 'acc_gold_spent', 'acc_goldlost2death', 'acc_heroassists', 'acc_herodmg', 'acc_heroexp', 'acc_herokills', 'acc_herokillsgold', 'acc_humiliation', 'acc_kadr', 'acc_kdr', 'acc_kicked', 'acc_ks10', 'acc_ks15', 'acc_ks3', 'acc_ks4', 'acc_ks5', 'acc_ks6', 'acc_ks7', 'acc_ks8', 'acc_ks9', 'acc_losses', 'acc_mmr', 'acc_nemesis', 'acc_neutralcreepdmg', 'acc_neutralcreepgold', 'acc_neutralcreepkills', 'acc_quadkill', 'acc_razed', 'acc_retribution', 'acc_secs', 'acc_secs_dead', 'acc_smackdown', 'acc_teamcreepdmg', 'acc_teamcreepexp', 'acc_teamcreepgold', 'acc_teamcreepkills', 'acc_time_earning_exp', 'acc_triplekill', 'acc_tsr', 'acc_wards', 'acc_winpercent', 'acc_wins', 'cs_actions', 'cs_annihilation', 'cs_avg_apm', 'cs_avg_assists', 'cs_avg_consumables', 'cs_avg_creeps', 'cs_avg_deaths', 'cs_avg_denies', 'cs_avg_gpm', 'cs_avg_kills', 'cs_avg_time', 'cs_avg_wards', 'cs_avg_xpm', 'cs_bdmg', 'cs_bdmgexp', 'cs_bgold', 'cs_bloodlust', 'cs_buybacks', 'cs_concedes', 'cs_concedevotes', 'cs_consumables', 'cs_deaths', 'cs_denies', 'cs_discos', 'cs_doublekill', 'cs_exp', 'cs_exp_denied', 'cs_games_played', 'cs_gold', 'cs_gold_spent', 'cs_goldlost2death', 'cs_heroassists', 'cs_herodmg', 'cs_heroexp',
                  'cs_herokills', 'cs_herokillsgold', 'cs_humiliation', 'cs_kadr', 'cs_kdr', 'cs_kicked', 'cs_ks10', 'cs_ks15', 'cs_ks3', 'cs_ks4', 'cs_ks5', 'cs_ks6', 'cs_ks7', 'cs_ks8', 'cs_ks9', 'cs_level', 'cs_level_exp', 'cs_losses', 'cs_mmr', 'cs_nemesis', 'cs_neutralcreepdmg', 'cs_neutralcreepgold', 'cs_neutralcreepkills', 'cs_quadkill', 'cs_razed', 'cs_retribution', 'cs_secs', 'cs_secs_dead', 'cs_smackdown', 'cs_teamcreepdmg', 'cs_teamcreepexp', 'cs_teamcreepgold', 'cs_teamcreepkills', 'cs_time_earning_exp', 'cs_triplekill', 'cs_tsr', 'cs_wards', 'cs_winpercent', 'cs_wins', 'rnk_actions', 'rnk_annihilation', 'rnk_avg_apm', 'rnk_avg_assists', 'rnk_avg_consumables', 'rnk_avg_creeps', 'rnk_avg_deaths', 'rnk_avg_denies', 'rnk_avg_gpm', 'rnk_avg_kills', 'rnk_avg_time', 'rnk_avg_wards', 'rnk_avg_xpm', 'rnk_bdmg', 'rnk_bgold', 'rnk_bloodlust', 'rnk_buybacks', 'rnk_concedes', 'rnk_concedevotes', 'rnk_consumables', 'rnk_deaths', 'rnk_denies', 'rnk_discos', 'rnk_doublekill', 'rnk_exp', 'rnk_exp_denied', 'rnk_games_played', 'rnk_gold', 'rnk_gold_spent', 'rnk_goldlost2death', 'rnk_heroassists', 'rnk_herodmg', 'rnk_heroexp', 'rnk_herokills', 'rnk_herokillsgold', 'rnk_humiliation', 'rnk_kadr', 'rnk_kdr', 'rnk_kicked', 'rnk_ks10', 'rnk_ks15', 'rnk_ks3', 'rnk_ks4', 'rnk_ks5', 'rnk_ks6', 'rnk_ks7', 'rnk_ks8', 'rnk_ks9', 'rnk_level', 'rnk_level_exp', 'rnk_losses', 'rnk_mmr', 'rnk_nemesis', 'rnk_neutralcreepdmg', 'rnk_neutralcreepgold', 'rnk_neutralcreepkills', 'rnk_quadkill', 'rnk_razed', 'rnk_retribution', 'rnk_secs', 'rnk_secs_dead', 'rnk_smackdown', 'rnk_teamcreepdmg', 'rnk_teamcreepexp', 'rnk_teamcreepgold', 'rnk_teamcreepkills', 'rnk_time_earning_exp', 'rnk_triplekill', 'rnk_tsr', 'rnk_wards', 'rnk_winpercent', 'rnk_wins')


class PlayerMatchSchema(ma.Schema):

    class Meta:
        fields = ('player_id', 'nickname', 'match_id', 'deaths', 'win', 'apm', 'cs', 'concedevotes', 'kdr', 'denies', 'discos', 'kicked', 'gpm', 'bdmg', 'herodmg', 'xpm', 'secs_dead',
                  'clan_id', 'goldlost2death', 'hero_id', 'concedes', 'mmr_change', 'kills', 'consumables', 'assists', 'buybacks', 'level', 'items', 'wards', 'team', 'position', 'exp_denied')


class MatchSchema(ma.Schema):
    players = fields.Nested(PlayerMatchSchema, many=True)

    class Meta:
        fields = ('id', 'length', 'players', 'mode', 'version', 'date', 'map_used')
