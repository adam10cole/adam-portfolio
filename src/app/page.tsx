import HeroCanvas from "@/components/canvas/HeroImage";

export default function Home() {
  return (
    <main className="relative h-screen w-full">
      <div className="w-full h-screen bg-white overflow-hidden flex items-center justify-center">
        <HeroCanvas />
      </div>
    </main>
  );
}