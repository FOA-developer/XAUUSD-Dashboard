export async function GET() {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey){
    return Response.json(
      {error: "Serer misconfigured: missing Apikey"},
      {status: 500}
    )
  }

  const url = `https://api.twelvedata.com/time_series?symbol=XAU/USD&interval=1day&outputsize=30&apikey=${apiKey}`
  const response = await fetch(url);
  const data = await response.json();
  console.log(data)
  if(data.status === "error"){
    return Response.json(
      {error: data.message || "Failed to fetch gold data"},
      { status: 502 }
    )
  }

   
  return Response.json(data.values)
}