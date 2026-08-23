"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  CloudRain,
  Leaf,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  X,
  type LucideIcon,
} from "lucide-react";

type Track = {
  title: string;
  mood: string;
  icon: LucideIcon;
  tempo: number;
  chords: number[][];
  wave: OscillatorType;
};

const TRACKS: Track[] = [
  {
    title: "Forest Notes",
    mood: "Warm woodland ambience",
    icon: Leaf,
    tempo: 2800,
    wave: "sine",
    chords: [
      [261.63, 329.63, 392, 493.88],
      [220, 261.63, 329.63, 392],
      [174.61, 220, 261.63, 329.63],
      [196, 246.94, 293.66, 392],
    ],
  },
  {
    title: "Rainy Window",
    mood: "Soft, slow focus loop",
    icon: CloudRain,
    tempo: 3300,
    wave: "triangle",
    chords: [
      [220, 261.63, 329.63, 392],
      [196, 246.94, 293.66, 369.99],
      [174.61, 220, 261.63, 329.63],
      [164.81, 207.65, 246.94, 329.63],
    ],
  },
  {
    title: "Little Library",
    mood: "Gentle pages and piano tones",
    icon: BookOpen,
    tempo: 2400,
    wave: "sine",
    chords: [
      [174.61, 220, 261.63, 329.63],
      [196, 246.94, 293.66, 349.23],
      [220, 261.63, 329.63, 392],
      [164.81, 207.65, 261.63, 329.63],
    ],
  },
];

export function MusicPlayer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.32);
  const [selectedTrack, setSelectedTrack] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeNodesRef = useRef<AudioNode[]>([]);
  const stepRef = useRef(0);
  const startAttemptRef = useRef(0);

  function clearAudio() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    activeNodesRef.current.forEach((node) => {
      try {
        node.disconnect();
      } catch {
        // It may already have ended and disconnected itself.
      }
    });
    activeNodesRef.current = [];
  }

  function scheduleChord(track: Track) {
    const context = audioContextRef.current;
    const master = masterGainRef.current;
    if (!context || !master) return;
    const chord = track.chords[stepRef.current % track.chords.length]!;
    const now = context.currentTime;
    const duration = track.tempo / 1000 + 0.9;

    chord.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = track.wave;
      oscillator.frequency.value = frequency / (index === 0 ? 2 : 1);
      oscillator.detune.value = index % 2 === 0 ? -3 : 3;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(index === 0 ? 0.07 : 0.035, now + 0.8);
      gain.gain.setValueAtTime(
        index === 0 ? 0.07 : 0.035,
        now + duration - 1.2,
      );
      gain.gain.linearRampToValueAtTime(0, now + duration);
      oscillator.connect(gain).connect(master);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.05);
      activeNodesRef.current.push(oscillator, gain);
    });

    const note = context.createOscillator();
    const noteGain = context.createGain();
    note.type = "sine";
    note.frequency.value = chord[(stepRef.current + 1) % chord.length]! * 2;
    noteGain.gain.setValueAtTime(0, now + 0.35);
    noteGain.gain.linearRampToValueAtTime(0.035, now + 0.5);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
    note.connect(noteGain).connect(master);
    note.start(now + 0.35);
    note.stop(now + 1.85);
    activeNodesRef.current.push(note, noteGain);
    stepRef.current += 1;
  }

  async function startAudio(trackIndex = selectedTrack) {
    const attempt = ++startAttemptRef.current;
    clearAudio();
    const AudioContextClass = window.AudioContext;
    const context = audioContextRef.current ?? new AudioContextClass();
    audioContextRef.current = context;
    if (!masterGainRef.current) {
      const gain = context.createGain();
      gain.connect(context.destination);
      masterGainRef.current = gain;
    }
    masterGainRef.current.gain.setTargetAtTime(
      volume,
      context.currentTime,
      0.04,
    );
    await context.resume();
    if (attempt !== startAttemptRef.current) return false;
    if (context.state !== "running") {
      throw new Error("Audio playback is waiting for user interaction.");
    }
    stepRef.current = 0;
    const track = TRACKS[trackIndex]!;
    scheduleChord(track);
    timerRef.current = setInterval(() => scheduleChord(track), track.tempo);
    setIsPlaying(true);
    return true;
  }

  function pauseAudio() {
    startAttemptRef.current += 1;
    clearAudio();
    setIsPlaying(false);
  }

  function selectTrack(index: number) {
    setSelectedTrack(index);
    if (isPlaying) void startAudio(index);
  }

  useEffect(() => {
    const context = audioContextRef.current;
    const master = masterGainRef.current;
    if (context && master) {
      master.gain.setTargetAtTime(volume, context.currentTime, 0.04);
    }
  }, [volume]);

  useEffect(
    () => () => {
      clearAudio();
      const context = audioContextRef.current;
      audioContextRef.current = null;
      masterGainRef.current = null;
      void context?.close();
    },
    [],
  );

  const track = TRACKS[selectedTrack]!;
  const TrackIcon = track.icon;

  return (
    <div className="music-player-root">
      {isOpen && (
        <section className="music-playlist-panel" aria-label="Study playlist">
          <div className="music-panel-header">
            <div>
              <div className="music-eyebrow">Study playlist</div>
              <div className="music-panel-title">Cozy focus</div>
            </div>
            <button
              className="music-icon-button"
              onClick={() => setIsOpen(false)}
              aria-label="Close playlist"
            >
              <X aria-hidden="true" />
            </button>
          </div>

          <div className="music-now-playing">
            <div className="music-cover">
              <TrackIcon aria-hidden="true" />
            </div>
            <div>
              <div className="music-track-title">{track.title}</div>
              <div className="music-track-subtitle">{track.mood}</div>
            </div>
          </div>

          <div className="music-controls">
            <button
              className="music-icon-button"
              onClick={() =>
                selectTrack((selectedTrack + TRACKS.length - 1) % TRACKS.length)
              }
              aria-label="Previous track"
            >
              <SkipBack aria-hidden="true" />
            </button>
            <button
              className="music-play-button"
              onClick={() => (isPlaying ? pauseAudio() : void startAudio())}
              aria-label={isPlaying ? "Pause music" : "Play music"}
            >
              {isPlaying ? (
                <Pause aria-hidden="true" fill="currentColor" />
              ) : (
                <Play aria-hidden="true" fill="currentColor" />
              )}
            </button>
            <button
              className="music-icon-button"
              onClick={() => selectTrack((selectedTrack + 1) % TRACKS.length)}
              aria-label="Next track"
            >
              <SkipForward aria-hidden="true" />
            </button>
          </div>

          <label className="music-volume-label">
            Volume
            <input
              type="range"
              min="0"
              max="0.7"
              step="0.01"
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
            />
          </label>

          <div className="music-track-list">
            {TRACKS.map((item, index) => {
              const ItemIcon = item.icon;
              return (
                <button
                  key={item.title}
                  className={
                    index === selectedTrack
                      ? "music-track-row is-selected"
                      : "music-track-row"
                  }
                  onClick={() => selectTrack(index)}
                >
                  <span className="music-track-icon">
                    <ItemIcon aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.mood}</small>
                  </span>
                  {index === selectedTrack && (
                    <span aria-label="Selected">
                      <Check aria-hidden="true" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="music-original-note">
            Original procedural music generated locally in your browser.
          </div>
        </section>
      )}

      <div className="music-mini-dock">
        <button
          className="music-mini-player"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
        >
          <span
            className={
              isPlaying ? "music-note-icon is-playing" : "music-note-icon"
            }
          >
            <Music2 aria-hidden="true" />
          </span>
          <span>
            <small>{isPlaying ? "Playing" : "Music"}</small>
            <strong>{track.title}</strong>
          </span>
          <span>
            {isOpen ? (
              <ChevronDown aria-hidden="true" />
            ) : (
              <ChevronUp aria-hidden="true" />
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
