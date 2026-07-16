export async function GET( request: Request) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey){
    return Response.json(
      {error: "Serer misconfigured: missing Apikey"},
      {status: 500}
    )
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get( "range" ) || "4month";

  const rangeConfig: Record<string, { interval: string; outputsize: number}> = {
    "1day": { interval: "5min", outputsize: 288 },
    "1week": { interval: "1h", outputsize: 168 },
    "1month": { interval: "1day", outputsize: 30 },
  }

  const { interval, outputsize } = rangeConfig[range] ?? rangeConfig["1month"]; 


  const url = `https://api.twelvedata.com/time_series?symbol=XAU/USD&interval=${interval}&outputsize=${outputsize}&apikey=${apiKey}`
  const response = await fetch(url);
  const data = await response.json();

  if(data.status === "error"){
    return Response.json(
      {error: data.message || "Failed to fetch gold data"},
      { status: 502 }
    )
  }

   
  return Response.json(data.values)
}