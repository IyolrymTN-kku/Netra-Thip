import os
from urllib.parse import urlparse

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from metlo.flask import MetloFlask


load_dotenv()

METLO_HOST = os.getenv("METLO_HOST", "").strip().rstrip("/")
METLO_API_KEY = os.getenv("METLO_API_KEY", "").strip()
APP_HOST = os.getenv("APP_HOST", "0.0.0.0").strip()
APP_PORT = int(os.getenv("APP_PORT", "6010"))

if not METLO_HOST:
    raise RuntimeError("METLO_HOST is required. Configure it in .env.")
if not METLO_API_KEY:
    raise RuntimeError("METLO_API_KEY is required. Configure it in .env.")

# Avoid routing collector traffic through a corporate/browser proxy.
collector_host = urlparse(METLO_HOST).hostname
if collector_host:
    no_proxy_values = {
        value.strip()
        for value in os.getenv("NO_PROXY", os.getenv("no_proxy", "")).split(",")
        if value.strip()
    }
    no_proxy_values.update({collector_host, "localhost", "127.0.0.1"})
    no_proxy = ",".join(sorted(no_proxy_values))
    os.environ["NO_PROXY"] = no_proxy
    os.environ["no_proxy"] = no_proxy

app = Flask(__name__)

# Metlo observes the Flask request and response traffic and forwards traces to
# the collector configured by METLO_HOST.
MetloFlask(app, METLO_HOST, METLO_API_KEY)


@app.get("/")
def home():
    return jsonify(
        {
            "service": "metlo-target-demo",
            "message": "Use /health, /users, /orders, and /debug/metlo.",
        }
    )


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/users")
def users():
    return jsonify(
        [
            {"id": 1, "username": "admin", "email": "admin@example.test"},
            {"id": 2, "username": "analyst", "email": "analyst@example.test"},
        ]
    )


@app.get("/orders")
def orders():
    return jsonify(
        [
            {"id": "ord-001", "ownerId": 1, "total": 1250.0},
            {"id": "ord-002", "ownerId": 2, "total": 340.0},
        ]
    )


@app.get("/search")
def search():
    return jsonify({"query": request.args.get("q", ""), "results": []})


@app.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    return jsonify({"authenticated": False, "username": payload.get("username", "")}), 401


@app.get("/debug/metlo")
def debug_metlo():
    verify_url = f"{METLO_HOST}/api/v1/verify"
    try:
        response = requests.get(
            verify_url,
            headers={"Authorization": METLO_API_KEY},
            timeout=5,
        )
        return jsonify(
            {
                "collector": METLO_HOST,
                "verifyUrl": verify_url,
                "reachable": True,
                "status": response.status_code,
                "authorized": response.status_code == 200,
                "response": response.text[:100],
            }
        )
    except requests.RequestException as error:
        return (
            jsonify(
                {
                    "collector": METLO_HOST,
                    "verifyUrl": verify_url,
                    "reachable": False,
                    "authorized": False,
                    "error": str(error),
                }
            ),
            503,
        )


if __name__ == "__main__":
    print(f"Metlo target demo listening on http://{APP_HOST}:{APP_PORT}")
    print(f"Metlo collector configured at {METLO_HOST}")
    app.run(host=APP_HOST, port=APP_PORT, debug=False)
