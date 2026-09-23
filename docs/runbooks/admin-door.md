# Admin Door Runbook

> **Audience:** Author (operator) only  
> **Classification:** Operational — do not publish publicly  
> **Last updated:** 2026-09-22  

---

## 1. What is the Admin Door?

The Admin Console (`/admin`) is blocked at the WAF layer for **all** IPs by default. To access it, you must temporarily whitelist your current public IP address using the `admin-door` CLI command. The door automatically closes after the session TTL expires (default: 60 minutes).

This design means even a compromised CloudFront URL cannot expose the admin console to an attacker unless they also hold a whitelisted IP, a valid Author passkey, AND are within the allowed geo-region.

---

## 2. Opening the Admin Door

### Step 1 – Find your current public IP
```bash
curl -s https://checkip.amazonaws.com
# Output: 203.0.113.42
```

### Step 2 – Open the door
```bash
pnpm cli admin-door --open --cidr 203.0.113.42/32 --ttl 3600
```

This command:
1. Updates the `slow-light-admin-door-production` WAFv2 IP set to include your CIDR.
2. Schedules an automatic close after `--ttl` seconds (default 3600 = 1 hour).
3. Writes an entry to the audit log.

Expected output:
```
[admin-door] ✔ IP 203.0.113.42/32 added to WAF IP set.
[admin-door] ✔ Auto-close scheduled at 2026-09-22T15:30:00+05:30.
[admin-door] ✔ Audit event recorded.
```

### Step 3 – Navigate to Admin Console
Open your browser and navigate to `https://your-domain.com/admin`.  
Authenticate with your Author passkey when prompted.

---

## 3. Closing the Admin Door

### Option A – Automatic (preferred)
The door closes automatically after the TTL elapses. No action needed.

### Option B – Manual close (immediate)
```bash
pnpm cli admin-door --close
```

This clears all IPs from the WAF IP set immediately and logs the closure.

---

## 4. Verifying door status
```bash
pnpm cli admin-door --status
```

Output example:
```
[admin-door] Status: OPEN
[admin-door] Whitelisted CIDRs: ["203.0.113.42/32"]
[admin-door] Auto-close at: 2026-09-22T15:30:00+05:30 (42 min remaining)
```

---

## 5. Security rules

- **Never open with a /0 or /8 CIDR.** Always use `/32` (single IPv4) or `/128` (single IPv6).
- **Never leave the door open overnight.** TTL must be ≤ 3600 seconds.
- **Do not open from a shared network** (café, hotel, VPN exit node). Admin access from a private, controlled network only.
- Any manual modification to the WAF IP set without using the CLI tool is a security incident and must be reported.

---

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Admin page returns 403 after opening | IP change (mobile/VPN) | Re-run `--open` with updated IP |
| CLI fails with `AccessDeniedException` | Operator IAM permissions | Check operator role has `wafv2:UpdateIPSet` |
| Door won't close | WAF API throttling | Wait 30 s, retry `--close` |
