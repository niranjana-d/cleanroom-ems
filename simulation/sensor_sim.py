import requests
import random
import time
import json

# ================= CONFIGURATION =================
API_BASE = "http://localhost:5000/api"
LOGIN_URL = f"{API_BASE}/auth/login"
ROOMS_URL = f"{API_BASE}/rooms"
RECORD_URL = f"{API_BASE}/data/record"


ADMIN_USER = {
    "email": "admin@ems.com",
    "password": "admin123"
}

# Normal operating ranges (Setpoints)
BASE_CONFIG = {
    "temperature": 21.0,  # Target 21°C
    "humidity": 45.0,     # Target 45%
    "pressure": 30.0      # Target 30 Pa
}

# Global Token Storage
AUTH_TOKEN = None

def login():
    """Logs in to get a JWT Token for fetching rooms."""
    global AUTH_TOKEN
    try:
        print(f"🔐 Logging in as {ADMIN_USER['email']}...")
        response = requests.post(LOGIN_URL, json=ADMIN_USER)
        if response.status_code == 200:
            AUTH_TOKEN = response.json().get("token")
            print("✅ Login Successful!")
            return True
        else:
            print(f"❌ Login Failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Login Connection Error: {e}")
        return False

def get_active_rooms():
    """Fetches the latest list of rooms from the backend."""
    if not AUTH_TOKEN:
        return []
    
    try:
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        response = requests.get(ROOMS_URL, headers=headers)
        
        if response.status_code == 200:
            rooms_data = response.json()
            # print(f"📋 Found {len(rooms_data)} active rooms.")
            return rooms_data
        elif response.status_code == 401:
            print("⚠️ Token expired. Re-logging in...")
            login() # Try to re-login
            return []
        else:
            print(f"❌ Failed to fetch rooms: {response.status_code}")
            return []
    except Exception as e:
        print(f"❌ Fetch Rooms Error: {e}")
        return []

def generate_reading(room_id, force_error=False):
    """Generates simulated sensor data."""
    # Add natural fluctuation (jitter)
    temp = round(BASE_CONFIG["temperature"] + random.uniform(-1.5, 1.5), 2)
    hum = round(BASE_CONFIG["humidity"] + random.uniform(-5, 5), 2)
    press = round(BASE_CONFIG["pressure"] + random.uniform(-2, 2), 2)

    # Inject Faults
    if force_error:
        failure_type = random.choice(["temp_spike", "pressure_drop"])
        if failure_type == "temp_spike":
            temp = round(random.uniform(25.0, 30.0), 2) # Too hot
            print(f"⚠️  INJECTING FAULT: High Temp in Room {room_id}!")
        elif failure_type == "pressure_drop":
            press = round(random.uniform(0.0, 8.0), 2) # Pressure loss
            print(f"⚠️  INJECTING FAULT: Pressure Drop in Room {room_id}!")

    return {
        "roomId": room_id,
        "temperature": temp,
        "humidity": hum,
        "pressure": press
    }

def run_simulation():
    print("🚀 Starting Smart EMS Simulator...")
    print("-----------------------------------")
    
    # 1. Initial Login
    if not login():
        print("⛔ script stopped due to login failure.")
        return

    while True:
        # 2. DYNAMICALLY FETCH ROOMS (Every cycle)
        # This ensures new rooms added in UI are picked up instantly.
        active_rooms = get_active_rooms()

        if not active_rooms:
            print("💤 No rooms found (or API down). Retrying in 5s...")
            time.sleep(5)
            continue

        # 3. Loop through every room found in the database
        for room in active_rooms:
            room_id = room['id']
            room_name = room['name']

            # 1 in 10 chance to cause an alert
            trigger_alert = random.random() < 0.1
            
            payload = generate_reading(room_id, force_error=trigger_alert)
            
            try:
                # Send data (POST)
                response = requests.post(RECORD_URL, json=payload)
                
                if response.status_code == 200:
                    status = response.json().get("status", "unknown")
                    icon = "🟢" if status == "green" else "🔴"
                    # Shorter print format
                    print(f"{icon} Room {room['id']} | T:{payload['temperature']}°C H:{payload['humidity']}% P:{payload['pressure']}Pa | System: {status.upper()}")
                else:
                    print(f"❌ Upload Failed: {response.status_code}")
            
            except Exception as e:
                print(f"❌ Connection Failed: {e}")

        print("-----------------------------------")
        # Wait 5 seconds before next batch
        time.sleep(5)

if __name__ == "__main__":
    run_simulation()