import { dailyRoomNameForAppointment } from "@/lib/consultationAccess";

const DAILY_API_BASE = "https://api.daily.co/v1";

export class DailyApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "DailyApiError";
  }
}

function apiKey(): string {
  const key = process.env.DAILY_API_KEY;
  if (!key) {
    throw new DailyApiError("Daily is not configured.", 500);
  }
  return key;
}

async function dailyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${DAILY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    // Never surface raw Daily payloads to callers/logs beyond a short message.
    const message =
      (payload && typeof payload.error === "string" && payload.error) ||
      (payload && typeof payload.info === "string" && payload.info) ||
      "Daily API request failed.";
    throw new DailyApiError(String(message), res.status);
  }
  return payload as T;
}

export type DailyRoomInfo = {
  name: string;
  url: string;
  /** Unix seconds; present when Daily returns room config.exp */
  exp?: number | null;
};

export async function getDailyRoom(name: string): Promise<DailyRoomInfo | null> {
  try {
    const room = await dailyFetch<{
      name: string;
      url: string;
      config?: { exp?: number | null };
    }>(`/rooms/${encodeURIComponent(name)}`);
    return {
      name: room.name,
      url: room.url,
      exp: room.config?.exp ?? null,
    };
  } catch (err) {
    if (err instanceof DailyApiError && err.status === 404) return null;
    throw err;
  }
}

async function createDailyRoomWithName(name: string): Promise<DailyRoomInfo> {
  const room = await dailyFetch<{
    name: string;
    url: string;
    config?: { exp?: number | null };
  }>("/rooms", {
    method: "POST",
    body: JSON.stringify({
      name,
      privacy: "private",
      properties: {
        enable_chat: false,
        enable_screenshare: false,
        start_video_off: false,
        start_audio_off: false,
        eject_at_room_exp: true,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
      },
    }),
  });

  return {
    name: room.name,
    url: room.url,
    exp: room.config?.exp ?? null,
  };
}

/**
 * Reuse existing appointment room_id when present.
 * Otherwise use a deterministic room name so concurrent joins cannot create two rooms.
 */
export async function ensureDailyRoom(
  existingRoomId: string | null,
  appointmentId: string
): Promise<DailyRoomInfo> {
  if (existingRoomId) {
    const existing = await getDailyRoom(existingRoomId);
    if (existing) return existing;
  }

  const name = dailyRoomNameForAppointment(appointmentId);
  const preexisting = await getDailyRoom(name);
  if (preexisting) return preexisting;

  try {
    return await createDailyRoomWithName(name);
  } catch (err) {
    // Likely a create race: another request created the same deterministic name.
    const raced = await getDailyRoom(name);
    if (raced) return raced;
    throw err;
  }
}

export async function createDailyMeetingToken(input: {
  roomName: string;
  userName: string;
  isOwner: boolean;
  expiresInSeconds?: number;
}): Promise<string> {
  const exp =
    Math.floor(Date.now() / 1000) + (input.expiresInSeconds ?? 60 * 60 * 2);

  const tokenRes = await dailyFetch<{ token: string }>("/meeting-tokens", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        room_name: input.roomName,
        user_name: input.userName,
        is_owner: input.isOwner,
        enable_screenshare: false,
        start_video_off: false,
        start_audio_off: false,
        exp,
      },
    }),
  });

  return tokenRes.token;
}
