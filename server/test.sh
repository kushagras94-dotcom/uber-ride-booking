DRIVER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMjk0OGQzZDNjYzc3MzlmMzc0MmQ2NSIsInJvbGUiOiJkcml2ZXIiLCJpYXQiOjE3ODEwOTE3MzcsImV4cCI6MTc4MTY5NjUzN30.8utCL36_qYAbtfe0GJPSqWTvtx8epi2c-gVKIwrq81Y"
RIDE_ID="6a294b487d565c72b00f2e38"

curl -X PUT http://localhost:5000/api/rides/status/$RIDE_ID \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $DRIVER_TOKEN" \
-d '{"status": "completed"}'