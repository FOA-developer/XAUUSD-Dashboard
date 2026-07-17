export async function GET( request: Request) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey){
    return Response.json(
      {error: "Serer misconfigured: missing Apikey"},
      {status: 500}
    )
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get( "range" ) || "5min";

  const rangeConfig: Record<string, { interval: string; outputsize: number}> = {
    "5min" : { interval:"5min", outputsize: 4000 },
    "15min": { interval: "15min", outputsize: 4000 },
    "1hour": { interval: "1h", outputsize: 2880 },
    "4hours": { interval: "4h", outputsize: 720 },
    "1day": { interval: "1day", outputsize: 120 },
    "4months": { interval: "1day", outputsize: 120 },
  }

  const { interval, outputsize } = rangeConfig[range] ?? rangeConfig["5min"]; 


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