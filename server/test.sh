RIDER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMjk0NDdiNTI1NTA2ZWUzYzlhOTc4OSIsInJvbGUiOiJyaWRlciIsImlhdCI6MTc4MTI3NjY3MCwiZXhwIjoxNzgxODgxNDcwfQ.688xdvLcs4dbFJ7aOjsgld_JLzZ1_JmYDp-PoO6Zds8"

curl -X POST http://localhost:5000/api/rides/request \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $RIDER_TOKEN" \
-d '{
  "pickup": {"lat": 26.9124, "lng": 75.7873, "address": "Jaipur Railway Station"},
  "destination": {"lat": 26.8500, "lng": 75.8000, "address": "Jaipur Airport"}
}'