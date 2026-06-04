# Metlo Target Demo

This is a small Flask API instrumented with the Metlo Python agent. Use it as
a clean target when testing Metlo endpoint discovery through Netra-Thip.

## Setup On The Target Machine

Copy this folder to the machine that should host the test API. Then run:

```powershell
Copy-Item .env.example .env
notepad .env
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

In `.env`, set `METLO_HOST` to the collector URL reachable from this target
machine and set `METLO_API_KEY` to a valid Metlo collector key.

Watch the startup terminal. The Flask server can still answer endpoint
requests when the Metlo agent fails to initialize. Any `Failed to initialize
Metlo` message must be resolved before endpoint discovery will work.

The default app port is `6010` so it does not conflict with an older app on
port `6001`.

## Verify Collection

From a browser or terminal on another machine, use the target IP rather than
`localhost`. The hostname used in traffic is the hostname Metlo groups under.

Example, when the target machine is `10.170.100.100`:

```powershell
.\verify-metlo.ps1
.\request-demo-endpoints.ps1 -BaseUrl http://10.170.100.100:6010
```

`/debug/metlo` should show:

```json
{
  "reachable": true,
  "authorized": true,
  "status": 200,
  "response": "OK"
}
```

After requesting the other endpoints, refresh Metlo Web. Scan the exact same
target in Netra-Thip:

```text
http://10.170.100.100:6010
```

Expected portal rows include `Metlo Observed Endpoint - GET /users` and
`Metlo Observed Endpoint - GET /orders`, or corresponding Metlo alert rows
after Metlo raises alerts.

The request script pauses briefly between endpoints because the Metlo Python
agent forwards traces asynchronously. Keep `python app.py` running while
Metlo processes the requests.

## Troubleshooting

If `/debug/metlo` is not authorized, check the API key in `.env`.

If it is not reachable, verify network access from the target machine:

```powershell
Test-NetConnection 10.170.100.142 -Port 8081
```

If `/debug/metlo` returns success but endpoints never appear in Metlo Web,
make sure the process serving port `6010` is this `app.py`, then inspect its
terminal output for Metlo agent errors.
