import { supabase } from './supabase';

export const LOBBY_CODE_LENGTH = 5;
export const DISPLAY_NAME_MAX_LENGTH = 20;

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_PATTERN = /^[A-Z0-9]{5}$/;
const MAX_CODE_ATTEMPTS = 5;

export type LobbyStatus = 'waiting' | 'active' | 'finished';
export type PlayerRole = 'unassigned' | 'hunter' | 'runner';

export type Lobby = {
  id: string;
  code: string;
  host_id: string;
  status: LobbyStatus;
};

export type LobbyPlayer = {
  lobby_id: string;
  user_id: string;
  display_name: string;
  role: PlayerRole;
  live_lat: number | null;
  live_lng: number | null;
  joined_at: string;
};

export function generateLobbyCode(): string {
  let code = '';
  for (let i = 0; i < LOBBY_CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeLobbyCode(input: string): string {
  return input.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, LOBBY_CODE_LENGTH);
}

export function isValidLobbyCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}

export function isValidDisplayName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= DISPLAY_NAME_MAX_LENGTH;
}

/** Creates a lobby with a fresh random code (retrying on collisions) and joins it as host. */
export async function createLobby(displayName: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const { data, error } = await supabase.rpc('create_lobby', {
      p_code: generateLobbyCode(),
      p_display_name: displayName.trim(),
    });
    if (!error) return data as string;
    if (error.code !== '23505') throw new Error(error.message);
  }
  throw new Error('Could not generate a unique lobby code. Please try again.');
}

export async function joinLobby(code: string, displayName: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_lobby', {
    p_code: normalizeLobbyCode(code),
    p_display_name: displayName.trim(),
  });
  if (error) {
    throw new Error(error.code === 'P0002' ? 'No open lobby with that code.' : error.message);
  }
  return data as string;
}

export async function fetchLobby(lobbyId: string): Promise<Lobby> {
  const { data, error } = await supabase
    .from('lobbies')
    .select('id, code, host_id, status')
    .eq('id', lobbyId)
    .single();
  if (error) throw new Error(error.message);
  return data as Lobby;
}

export async function fetchLobbyPlayers(lobbyId: string): Promise<LobbyPlayer[]> {
  const { data, error } = await supabase
    .from('lobby_players')
    .select('*')
    .eq('lobby_id', lobbyId)
    .order('joined_at');
  if (error) throw new Error(error.message);
  return data as LobbyPlayer[];
}
