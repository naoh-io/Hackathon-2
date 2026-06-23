"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext"; 
import SectorStory from "@/components/SectorStory"; 

export default function SectorStoryClient({ sectorId }) {
  const router = useRouter();
  const { token, status: authStatus } = useAuth();

  if (authStatus === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0f0d] text-white/60">
        <p role="status">Verificando sesión…</p>
      </div>
    );
  }

  if (authStatus === "unauthenticated") {
    router.replace("/login");
    return null;
  }

  return (
    <SectorStory
      sectorId={sectorId}
      authToken={token}
      onBack={() => router.push("/sectors")} 
    />
  );
}