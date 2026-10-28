import requests

BASE = "https://data.elexon.co.uk/bmrs/api/v1/datasets"

params = {
    "publishDateTimeFrom": "2026-01-01T00:00:00Z",
    "publishDateTimeTo": "2026-01-02T00:00:00Z",
    "fuelType": "WIND",
}

response = requests.get(
    f"{BASE}/FUELHH/stream",
    params=params,
    timeout=60,
)

print("Status:", response.status_code)
response.raise_for_status()

data = response.json()

print("Records returned:", len(data))
print("First 5 records:")

for row in data[:5]:
    print(row)



from collections import Counter

counts = Counter(row["settlementDate"] for row in data)
print("Records by settlement date:", counts)