import { useEffect, useState } from "react";

// Terima parameter transmission ("matic" atau "manual")
export function useGearRatio(
  rpm: number,
  speed: number,
  transmission: string = "matic",
) {
  const [currentGear, setCurrentGear] = useState<string>(
    transmission === "matic" ? "P/N" : "N",
  );

  useEffect(() => {
    // 1. Kondisi Berhenti (Idle)
    if (speed < 5) {
      if (transmission === "matic") {
        setCurrentGear(rpm > 0 ? "1" : "P/N");
      } else {
        setCurrentGear("N"); // Manual kalau berhenti pasti Neutral (atau kopling diinjak)
      }
      return;
    }

    // 2. Kalkulasi Rasio Ninja (RPM dibagi Kecepatan)
    const ratio = rpm / speed;

    // 3. Logika untuk MATIC (4-Speed)
    if (transmission === "matic") {
      if (ratio >= 70) setCurrentGear("1");
      else if (ratio >= 42 && ratio < 70) setCurrentGear("2");
      else if (ratio >= 28 && ratio < 42) setCurrentGear("3");
      else if (ratio < 28) setCurrentGear("4"); // Overdrive
    }
    // 4. Logika untuk MANUAL (5-Speed)
    else {
      // Saat pindah gigi manual, kopling diinjak = rasio lompat drastis
      // Kita paskan rentangnya dengan rasio girboks 5-speed HR15DE
      if (ratio >= 90) setCurrentGear("1");
      else if (ratio >= 58 && ratio < 90) setCurrentGear("2");
      else if (ratio >= 42 && ratio < 58) setCurrentGear("3");
      else if (ratio >= 33 && ratio < 42) setCurrentGear("4");
      else if (ratio > 10 && ratio < 33)
        setCurrentGear("5"); // Gigi 5
      else setCurrentGear("N"); // Rasio sangat rendah/aneh = mobil jalan tapi kopling diinjak/gigi netral
    }
  }, [rpm, speed, transmission]);

  return currentGear;
}
