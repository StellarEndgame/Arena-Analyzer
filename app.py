from flask import Flask, send_from_directory, request, jsonify
import os

app = Flask(__name__)


@app.route("/")
def home():
    return send_from_directory(".", "index.html")


@app.route("/style.css")
def css():
    return send_from_directory(".", "style.css")


@app.route("/script.js")
def js():
    return send_from_directory(".", "script.js")


@app.route("/api/analyze", methods=["POST"])
def analyze():
    # Arena analysis will go here
    return jsonify({
        "message": "Backend is working!"
    })


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )
