# backend/ml/generate_data.py
import pandas as pd
import numpy as np
import random
import os

# Define our parameters
diseases = ['fever', 'cold', 'fracture', 'chest pain', 'routine checkup', 'headache', 'stomach ache']
doctor_ids = [1, 2, 3, 4, 5] 

data = []

print("Generating 5,000 historical appointment records...")

for _ in range(5000):
    doctor_id = random.choice(doctor_ids)
    disease = random.choice(diseases)
    queue_ahead = random.randint(0, 15) 
    
    base_time = 10 
    
    if disease in ['chest pain', 'fracture']:
        base_time += random.randint(15, 30) 
    elif disease in ['routine checkup', 'stomach ache']:
        base_time += random.randint(5, 15)
    else:
        base_time += random.randint(2, 8) 
        
    if doctor_id == 1: base_time -= 2
    if doctor_id == 3: base_time += 5
    
    actual_wait_time = (queue_ahead * random.randint(12, 18)) + base_time

    data.append({
        'doctor_id': doctor_id,
        'disease': disease,
        'queue_size': queue_ahead,
        'actual_wait_time_mins': actual_wait_time
    })

# --- THE FIX: Dynamic Paths ---
# Get the exact folder this script is sitting in
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(CURRENT_DIR, 'hospital_data.csv')

df = pd.DataFrame(data)
df.to_csv(CSV_PATH, index=False)

print(f"Data successfully saved to {CSV_PATH}!")