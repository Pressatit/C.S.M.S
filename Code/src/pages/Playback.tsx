import { PlaybackPlayer } from "../components/playback/PlaybackPlayer"

export function Playback() {
  return (
    <div className="h-full flex flex-col p-3 md:p-4">
      <PlaybackPlayer />
    </div>
  );
}