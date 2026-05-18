export function expandTargets(input: string): string[] {
  const targets = new Set<string>();

  // Split by comma or newline
  const parts = input.split(/[\n,]+/);

  for (let part of parts) {
    part = part.trim();
    if (!part) continue;

    // Check if CIDR
    if (part.includes("/")) {
      const expanded = expandCIDR(part);
      expanded.forEach((ip) => targets.add(ip));
    }
    // Check if Range (e.g., 192.168.1.1-50 or 192.168.1.1-192.168.1.50)
    else if (part.includes("-")) {
      const expanded = expandRange(part);
      expanded.forEach((ip) => targets.add(ip));
    }
    // Normal IP or Hostname
    else {
      targets.add(part);
    }
  }

  return Array.from(targets);
}

function ipToLong(ip: string): number {
  return (
    ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>>
    0
  );
}

function longToIp(long: number): string {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255,
  ].join(".");
}

function expandCIDR(cidr: string): string[] {
  const [ip, prefixText] = cidr.split("/");
  const prefix = parseInt(prefixText, 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return [cidr];

  const ipParts = ip.split(".");
  if (ipParts.length !== 4) return [cidr];

  const ipLong = ipToLong(ip);
  const mask = ~(2 ** (32 - prefix) - 1);
  const startIp = (ipLong & mask) >>> 0;
  const endIp = (startIp | ~mask) >>> 0;

  const result: string[] = [];
  for (let i = startIp; i <= endIp; i++) {
    result.push(longToIp(i));
  }
  return result;
}

function expandRange(range: string): string[] {
  const [start, end] = range.split("-");
  const startParts = start.split(".");
  
  if (startParts.length !== 4) return [range];

  let endIpStr = end;
  // If end is just a number like '50'
  if (!end.includes(".")) {
    endIpStr = `${startParts[0]}.${startParts[1]}.${startParts[2]}.${end}`;
  }

  const endParts = endIpStr.split(".");
  if (endParts.length !== 4) return [range];

  const startLong = ipToLong(start);
  const endLong = ipToLong(endIpStr);

  if (startLong > endLong) return [range]; // Invalid range

  const result: string[] = [];
  for (let i = startLong; i <= endLong; i++) {
    result.push(longToIp(i));
  }
  return result;
}
