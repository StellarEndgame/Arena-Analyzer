from flask import Flask, render_template, request, jsonify
import requests
import re
from collections import defaultdict

app = Flask(__name__)

# Put your own contact/profile information here.
HEADERS = {
    "User-Agent": "ArenaAnalyzer/1.0 (Chess.com username: Stellar_Endgame)"
}


def extract_tournament_id(url):
    """
    Accepts URLs such as:
    https://www.chess.com/arena/123456
    https://www.chess.com/tournament/123456
    """

    match = re.search(
        r"chess\.com/(?:arena|tournament)/([A-Za-z0-9_-]+)",
        url
    )

    if not match:
        raise ValueError(f"Invalid Chess.com Arena URL: {url}")

    return match.group(1)


def get_tournament(tournament_id):
    url = f"https://api.chess.com/pub/tournament/{tournament_id}"

    response = requests.get(
        url,
        headers=HEADERS,
        timeout=20
    )

    if response.status_code != 200:
        raise ValueError(
            f"Chess.com API returned {response.status_code} "
            f"for tournament {tournament_id}"
        )

    return response.json()


def clean_player(player):
    """
    Converts different possible participant formats
    into a consistent structure.
    """

    if isinstance(player, str):
        return {
            "username": player,
            "club": "Unknown",
            "points": 0
        }

    username = (
        player.get("username")
        or player.get("name")
        or player.get("handle")
        or "Unknown"
    )

    club = (
        player.get("club")
        or player.get("club_name")
        or "Unknown"
    )

    points = (
        player.get("points")
        or player.get("score")
        or player.get("total_points")
        or 0
    )

    return {
        "username": username,
        "club": club,
        "points": points
    }


def analyze_tournament(data, index):
    """
    Converts Chess.com tournament data into our
    standard Arena format.

    The exact participant/leaderboard field can vary,
    so we check several possible locations.
    """

    arena_name = data.get("name", f"Arena {index}")
    arena_id = data.get("id", "")

    participants = []

    # Possible leaderboard locations.
    possible_lists = [
        data.get("players"),
        data.get("participants"),
        data.get("leaderboard"),
    ]

    raw_players = None

    for candidate in possible_lists:
        if isinstance(candidate, list):
            raw_players = candidate
            break

    if raw_players:
        participants = [
            clean_player(player)
            for player in raw_players
        ]

    return {
        "arena_number": index,
        "arena_id": arena_id,
        "name": arena_name,
        "participants": participants
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/analyze", methods=["POST"])
def analyze():

    body = request.get_json(silent=True)

    if not body:
        return jsonify({
            "error": "No data received."
        }), 400

    links = body.get("links", [])

    if not isinstance(links, list) or not links:
        return jsonify({
            "error": "Please add at least one Arena link."
        }), 400

    arenas = []
    errors = []

    for index, link in enumerate(links, start=1):

        link = link.strip()

        if not link:
            continue

        try:
            tournament_id = extract_tournament_id(link)

            data = get_tournament(tournament_id)

            arena = analyze_tournament(
                data,
                index
            )

            arena["url"] = link

            arenas.append(arena)

        except Exception as error:

            errors.append({
                "url": link,
                "error": str(error)
            })

    # -----------------------------------------
    # COMBINED PLAYER RESULTS
    # -----------------------------------------

    players = defaultdict(lambda: {
        "username": "",
        "club": "Unknown",
        "arenas": {},
        "total": 0
    })

    for arena in arenas:

        for player in arena["participants"]:

            username = player["username"].lower()

            if not username:
                continue

            if not players[username]["username"]:
                players[username]["username"] = player["username"]

            if (
                players[username]["club"] == "Unknown"
                and player["club"] != "Unknown"
            ):
                players[username]["club"] = player["club"]

            points = float(player["points"] or 0)

            players[username]["arenas"][
                str(arena["arena_number"])
            ] = points

            players[username]["total"] += points

    player_results = list(players.values())

    player_results.sort(
        key=lambda x: x["total"],
        reverse=True
    )

    # -----------------------------------------
    # COMBINED CLUB RESULTS
    # -----------------------------------------

    clubs = defaultdict(lambda: {
        "club": "",
        "arenas": {},
        "total": 0
    })

    for arena in arenas:

        arena_number = str(arena["arena_number"])

        for player in arena["participants"]:

            club = player["club"] or "Unknown"

            points = float(player["points"] or 0)

            clubs[club]["club"] = club

            clubs[club]["arenas"].setdefault(
                arena_number,
                0
            )

            clubs[club]["arenas"][arena_number] += points

            clubs[club]["total"] += points

    club_results = list(clubs.values())

    club_results.sort(
        key=lambda x: x["total"],
        reverse=True
    )

    # -----------------------------------------
    # GRAND TOTAL
    # -----------------------------------------

    grand_total = sum(
        player["total"]
        for player in player_results
    )

    return jsonify({
        "arenas": arenas,
        "players": player_results,
        "clubs": club_results,
        "grand_total": grand_total,
        "errors": errors
    })


if __name__ == "__main__":
    app.run(
        debug=True,
        host="0.0.0.0",
        port=5000
    )