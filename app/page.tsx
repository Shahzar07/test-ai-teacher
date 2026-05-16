import { AvatarEmbed } from '@/components/AvatarEmbed';
import { DocumentHub } from '@/components/DocumentHub';

export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black font-sans text-white">
      <AvatarEmbed />
      <DocumentHub />
    </main>
  );
}
