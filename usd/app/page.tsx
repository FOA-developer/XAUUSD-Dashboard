import Chart from "./components/Chart";

export default function Home() {
  return (
    <div className="flex h-screen flex-col bg-[#0a0e17] px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col">
        <Chart />
      </div>
    </div>
  );
}
