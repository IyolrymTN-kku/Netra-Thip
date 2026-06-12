export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Run watchdog every 10 minutes
    setInterval(async () => {
      try {
        await fetch("http://localhost:3000/api/scans/watchdog", {
          method: "GET",
        });
      } catch (e) {
        console.error("[Watchdog interval] failed to ping watchdog:", e);
      }
    }, 10 * 60 * 1000); // 10 minutes
  }
}
