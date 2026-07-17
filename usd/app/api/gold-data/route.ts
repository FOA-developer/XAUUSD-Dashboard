export async function GET( request: Request) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey){
    return Response.json(
      {error: "Serer misconfigured: missing Apikey"},
      {status: 500}
    )
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get( "range" ) || "4months";

  const rangeConfig: Record<string, { interval: string; outputsize: number}> = {
    "15min": { interval: "1min", outputsize: 15 },
    "1hour": { interval: "15min", outputsize: 60 },
    "1day": { interval: "5min", outputsize: 288 },
    "1week": { interval: "1h", outputsize: 168 },
    "3months": { interval: "1day", outputsize: 90},
  }

  const { interval, outputsize } = rangeConfig[range] ?? rangeConfig["4months"]; 


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