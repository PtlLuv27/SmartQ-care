# backend/ml/train_model.py
import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error
import joblib

# --- THE FIX: Dynamic Paths ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(CURRENT_DIR, 'hospital_data.csv')
MODEL_PATH = os.path.join(CURRENT_DIR, 'wait_time_estimator.joblib')

print("Loading data...")
df = pd.read_csv(CSV_PATH)

# Separate the Features and Target
X = df[['doctor_id', 'disease', 'queue_size']]
y = df['actual_wait_time_mins']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Build the Pipeline
preprocessor = ColumnTransformer(
    transformers=[
        ('cat', OneHotEncoder(handle_unknown='ignore'), ['disease'])
    ], 
    remainder='passthrough'
)

model_pipeline = Pipeline(steps=[
    ('preprocessor', preprocessor),
    ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))
])

# Train the Model
print("Training the Random Forest model...")
model_pipeline.fit(X_train, y_train)

# Evaluate the accuracy
predictions = model_pipeline.predict(X_test)
error = mean_absolute_error(y_test, predictions)
print(f"Model trained! Average prediction error is off by roughly {error:.2f} minutes.")

# Save the trained model
joblib.dump(model_pipeline, MODEL_PATH)
print(f"Model saved to {MODEL_PATH}! Ready for FastAPI integration.")