import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase, formatSbError } from "@/lib/supabase";
import { toast } from "sonner";

// Types
export type Place = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

export type Menu = {
  id: string;
  place_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

export type HistoryItem = {
    date: string; // YYYY-MM-DD
    item_name: string;
    type: "menu" | "place";
    place_name?: string;
};

export type RoomData = {
  room_name: string | null;
  places: Place[];
  menus: Menu[];
  history: HistoryItem[];
};

export type PickState = {
  day_key: string;
  attempt_count: number;
  current_pick: {
    type: "menu" | "place";
    item_id: string;
    item_name: string;
    place_name?: string; // Enhanced to store context
  } | null;
  timestamp: string;
};

// Utils
export function kDayKey() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now);
}

const KV_TABLE = "kv_store_a285a6f7";

export function useLunch(roomId: string) {
  const [data, setData] = useState<RoomData>({ room_name: null, places: [], menus: [], history: [] });
  const [pickState, setPickState] = useState<PickState | null>(null);
  const [loading, setLoading] = useState(true);

  // --- KV Helpers ---
  const getKey = (type: "data" | "state") => {
    if (type === "state") return `lunch_v3_state:${roomId}:${kDayKey()}`;
    return `lunch_v3_data:${roomId}`;
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const dataKey = getKey("data");
      const stateKey = getKey("state");

      const { data: rows, error } = await supabase
        .from(KV_TABLE)
        .select("key, value")
        .in("key", [dataKey, stateKey]);

      if (error) throw error;

      const dataRow = rows?.find(r => r.key === dataKey);
      const stateRow = rows?.find(r => r.key === stateKey);

      if (dataRow) {
        // Ensure history exists for older data
        setData({
            ...dataRow.value,
            history: dataRow.value.history || []
        });
      } else {
        // Init empty room
        setData({ room_name: null, places: [], menus: [], history: [] });
      }

      if (stateRow) {
        setPickState(stateRow.value);
      } else {
        setPickState(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load room data");
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  const saveData = async (newData: RoomData) => {
    const key = getKey("data");
    const { error } = await supabase.from(KV_TABLE).upsert({ key, value: newData });
    if (error) throw error;
    setData(newData);
  };

  const saveState = async (newState: PickState) => {
    const key = getKey("state");
    const { error } = await supabase.from(KV_TABLE).upsert({ key, value: newState });
    if (error) throw error;
    setPickState(newState);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Actions ---

  const setRoomName = async (name: string) => {
    await saveData({ ...data, room_name: name });
  };

  const addPlace = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (data.places.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error("ALREADY_EXISTS");
    }

    const newPlace: Place = {
      id: crypto.randomUUID(),
      name: trimmed,
      is_active: true,
      created_at: new Date().toISOString()
    };

    await saveData({
      ...data,
      places: [newPlace, ...data.places]
    });
    return newPlace.id;
  };

  const togglePlace = async (id: string) => {
    const updated = data.places.map(p => p.id === id ? { ...p, is_active: !p.is_active } : p);
    await saveData({ ...data, places: updated });
  };

  const deletePlace = async (id: string) => {
    const updatedPlaces = data.places.filter(p => p.id !== id);
    const updatedMenus = data.menus.filter(m => m.place_id !== id);
    await saveData({ ...data, places: updatedPlaces, menus: updatedMenus });
  };

  const updatePlaceName = async (id: string, newName: string) => {
      const updated = data.places.map(p => p.id === id ? { ...p, name: newName } : p);
      await saveData({ ...data, places: updated });
  }

  const addMenu = async (placeId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const newMenu: Menu = {
      id: crypto.randomUUID(),
      place_id: placeId,
      name: trimmed,
      is_active: true,
      created_at: new Date().toISOString()
    };

    await saveData({
      ...data,
      menus: [...data.menus, newMenu]
    });
  };

  const toggleMenu = async (id: string) => {
    const updated = data.menus.map(m => m.id === id ? { ...m, is_active: !m.is_active } : m);
    await saveData({ ...data, menus: updated });
  };

  // --- Picking Logic ---
  
  const activePlacePool = useMemo(() => {
    return data.places.filter(p => p.is_active).map(p => ({
        id: p.id,
        type: "place" as const,
        name: p.name,
        place_name: p.name
    }));
  }, [data.places]);

  const activeMenuPool = useMemo(() => {
    return data.menus
        .filter(m => m.is_active)
        .filter(m => data.places.find(p => p.id === m.place_id)?.is_active)
        .map(m => {
            const place = data.places.find(p => p.id === m.place_id);
            return {
                id: m.id,
                type: "menu" as const,
                name: m.name,
                place_name: place?.name || "Unknown"
            };
        });
  }, [data.menus, data.places]);

  const attemptLeft = useMemo(() => {
      return Math.max(0, 2 - (pickState?.attempt_count ?? 0));
  }, [pickState]);

  const pickLunch = async () => {
    if (attemptLeft <= 0) {
        toast.error("Retry limit reached for today!");
        return;
    }

    const useMenus = activeMenuPool.length > 0;
    let pool = useMenus ? activeMenuPool : activePlacePool;
    const type = useMenus ? "menu" : "place";

    // --- COOLDOWN LOGIC (Exclude recent 3 days) ---
    // Extract recent names from history
    const recentNames = new Set(
        data.history
            .slice(0, 3) // Check last 3 entries
            .map(h => h.item_name.toLowerCase())
    );

    const originalPoolSize = pool.length;
    
    // Filter out recent
    const filteredPool = pool.filter(item => !recentNames.has(item.name.toLowerCase()));
    
    // If filtering removes everything, ignore filter (fallback)
    if (filteredPool.length > 0) {
        pool = filteredPool;
    } else if (originalPoolSize > 0) {
        toast("Cooldown bypassed: All active items were recently eaten.");
    }

    if (pool.length === 0) {
        toast.error("No active items to pick from!");
        return;
    }

    const selected = pool[Math.floor(Math.random() * pool.length)];
    const nextAttempt = (pickState?.attempt_count ?? 0) + 1;
    const dayKey = kDayKey();

    const newState: PickState = {
        day_key: dayKey,
        attempt_count: nextAttempt,
        current_pick: {
            type,
            item_id: selected.id,
            item_name: selected.name,
            place_name: selected.place_name
        },
        timestamp: new Date().toISOString()
    };

    // Save State (Pick)
    await saveState(newState);

    // Save History (Only if it's the 1st attempt, or we update the history entry for today?
    // Actually, usually "Final Pick" is what matters. 
    // Since we don't have a "Confirm" button, let's assume the latest pick for the day is the history.)
    
    // Update History Logic:
    // Remove any existing entry for TODAY from history
    const cleanHistory = data.history.filter(h => h.date !== dayKey);
    // Add new entry to TOP
    const newHistoryItem: HistoryItem = {
        date: dayKey,
        item_name: selected.name,
        type: type,
        place_name: selected.place_name
    };
    
    // Limit history to last 10 items
    const updatedHistory = [newHistoryItem, ...cleanHistory].slice(0, 10);
    
    await saveData({
        ...data,
        history: updatedHistory
    });

    return selected;
  };

  return {
    loading,
    roomName: data.room_name,
    places: data.places,
    menus: data.menus,
    history: data.history,
    currentPick: pickState?.current_pick,
    attemptLeft,
    
    // Actions
    setRoomName,
    addPlace,
    togglePlace,
    deletePlace,
    updatePlaceName,
    addMenu,
    toggleMenu,
    pickLunch,
    refresh: loadData
  };
}
