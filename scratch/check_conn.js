
const url = "https://cmdkxxkstberbqcnhdjd.supabase.co";
console.log(`Checking connectivity to ${url}...`);

fetch(url)
  .then(res => {
    console.log("Success! Status:", res.status);
    process.exit(0);
  })
  .catch(err => {
    console.error("Failed to connect:", err.message);
    process.exit(1);
  });
