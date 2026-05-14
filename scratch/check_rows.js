
const url = "https://cmdkxxkstberbqcnhdjd.supabase.co/rest/v1/site_content?select=id,updated_at";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtZGt4eGtzdGJlcmJxY25oZGpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODU5MjI2MywiZXhwIjoyMDk0MTY4MjYzfQ.QMhsxkuGe5YmsWCUhsFh-qyHO3oDHdxPLe9pbuogi4c";

fetch(url, {
  headers: {
    "apikey": key,
    "Authorization": `Bearer ${key}`
  }
})
.then(r => r.json())
.then(data => console.log("Rows:", data))
.catch(e => console.error(e));
