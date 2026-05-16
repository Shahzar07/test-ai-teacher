'use client';

export function AvatarEmbed() {
  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-black">
      <iframe
        src="https://embed.liveavatar.com/v1/2acb47b9-f750-49fe-90f1-55f7ff7cb341?orientation=horizontal"
        allow="microphone; camera"
        title="LiveAvatar Embed"
        className="w-full h-full border-none pointer-events-auto"
        style={{ aspectRatio: '16/9', objectFit: 'cover' }}
      ></iframe>
    </div>
  );
}
