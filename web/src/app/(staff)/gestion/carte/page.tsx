import FleetMap from "@/components/FleetMap";

export default function Carte() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-[#0B1F3A]">Carte en temps réel</h1>
      <FleetMap />
    </div>
  );
}
