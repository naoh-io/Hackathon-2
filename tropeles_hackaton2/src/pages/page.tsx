import SectorStoryClient from "../scrollable";

export default async function SectorStoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const authToken = "";
  const onBack = () => {};

  return (
    <SectorStoryClient
      sectorId={id}
      authToken={authToken}
      onBack={onBack}
    />
  );
}