import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase, formatSbError } from "@/lib/supabase";
import { toast } from "sonner";

// Types based on the schema
export type Place = {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
};

export type Menu = {
  id: number;
  place_id: number;
  name: string;
  is_active: boolean;
  created_at: string;
};

export type PickItem = {
  id: number;
  day_key: string;
  attempt: number;
  type: "menu" | "place";
  item_id: number;
  item_name: string;
  created_at: string;
};

export type Rating = {
  id: number;
  day_key: string;
  type: "menu" | "place";
  item_id: number;
  rating: number;
  created_at: string;
};

export type AppState = {
  id: number;
  day_key: string;
  attempt_count: number;
  current_pick_type: "menu" | "place" | null;
  current_pick_item_id: number | null;
  current_pick_item_name: string | null;
  current_pick_at: string | null;
  pick_lock: boolean;
};

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

export function useLunch(room = "global", session = "global") {
  const [places, setPlaces] = useState<Place[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [appState, setAppState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isGlobalRoom = room === "global";
  const isGlobalSession = session === "global";

  // --- Helpers for KV State ---
  const getKvState = async (key: string) => {
    const { data } = await supabase.from(KV_TABLE).select("value").eq("key", key).maybeSingle();
    return data?.value;
  };

  const setKvState = async (key: string, value: any) => {
    const { error } = await supabase.from(KV_TABLE).upsert({ key, value });
    if (error) throw error;
  };

  // --- Initializers ---

  const ensureAppState = async () => {
    const dayKey = kDayKey();
    
    if (isGlobalRoom && isGlobalSession) {
      // Legacy SQL path
      const { data, error } = await supabase.from("app_state").select("*").limit(1).maybeSingle();
      if (error) throw new Error(formatSbError(error));
      
      let state = data;
      if (!state) {
        const { data: created, error: createError } = await supabase
          .from("app_state")
          .insert([{ attempt_count: 0 }])
          .select()
          .single();
        if (createError) throw new Error(formatSbError(createError));
        state = created;
      }

      // Normalize Day
      if (state.day_key !== dayKey) {
        const { data: up, error: upError } = await supabase
          .from("app_state")
          .update({
            day_key: dayKey,
            attempt_count: 0,
            current_pick_type: null,
            current_pick_item_id: null,
            current_pick_item_name: null,
            current_pick_at: null,
          })
          .eq("id", state.id)
          .select()
          .single();
        if (upError) throw new Error(formatSbError(upError));
        state = up;
      }
      return state;
    } else {
      // KV Path (Private Session)
      const key = `state:${room}:${session}`;
      const val = await getKvState(key);
      
      const defaultState: AppState = {
        id: 0, // Mock ID
        day_key: dayKey,
        attempt_count: 0,
        current_pick_type: null,
        current_pick_item_id: null,
        current_pick_item_name: null,
        current_pick_at: null,
        pick_lock: false
      };

      if (!val || val.day_key !== dayKey) {
        // Reset or Init
        await setKvState(key, defaultState);
        return defaultState;
      }
      return val as AppState;
    }
  };

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Load Data (Places/Menus)
      if (isGlobalRoom) {
        const [pRes, mRes, rRes] = await Promise.all([
          supabase.from("places").select("*").order("created_at", { ascending: false }),
          supabase.from("menus").select("*").order("created_at", { ascending: false }),
          supabase.from("ratings").select("*").order("created_at", { ascending: true }),
        ]);

        if (pRes.error) throw pRes.error;
        if (mRes.error) throw mRes.error;
        
        setPlaces(pRes.data || []);
        setMenus(mRes.data || []);
        setRatings(rRes.data || []);
      } else {
        // Load from KV
        const pKey = `places:${room}`;
        const mKey = `menus:${room}`;
        const [pData, mData] = await Promise.all([
          getKvState(pKey),
          getKvState(mKey)
        ]);
        setPlaces(pData || []);
        setMenus(mData || []);
        setRatings([]); // Ratings not supported in private rooms yet
      }

      // 2. Load State (Pick)
      const st = await ensureAppState();
      setAppState(st);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(formatSbError(err));
    } finally {
      setLoading(false);
    }
  }, [room, session, isGlobalRoom, isGlobalSession]);

  useEffect(() => {
    loadAll();

    // Subscribe to changes if Global
    if (isGlobalRoom && isGlobalSession) {
      const ch = supabase
        .channel("lunch-vA")
        .on("postgres_changes", { event: "*", schema: "public", table: "places" }, loadAll)
        .on("postgres_changes", { event: "*", schema: "public", table: "menus" }, loadAll)
        .on("postgres_changes", { event: "*", schema: "public", table: "app_state" }, loadAll)
        .subscribe();

      return () => {
        supabase.removeChannel(ch);
      };
    }
  }, [loadAll, isGlobalRoom, isGlobalSession]);

  // Derived state
  const placeMap = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);

  const activeMenuPool = useMemo(() => {
    return menus
      .filter((m) => m.is_active)
      .filter((m) => placeMap.get(m.place_id)?.is_active)
      .map((m) => {
        const pl = placeMap.get(m.place_id);
        return {
          id: m.id,
          type: "menu" as const,
          item_id: m.id,
          item_name: `${m.name} (${pl?.name || ""})`,
        };
      });
  }, [menus, placeMap]);

  const activePlacePool = useMemo(() => {
    return places
      .filter((p) => p.is_active)
      .map((p) => ({
        id: p.id,
        type: "place" as const,
        item_id: p.id,
        item_name: p.name,
      }));
  }, [places]);

  const currentPick = useMemo(() => {
    if (!appState?.current_pick_item_id) return null;
    return {
      type: appState.current_pick_type,
      item_id: appState.current_pick_item_id,
      item_name: appState.current_pick_item_name,
    };
  }, [appState]);

  const attemptLeft = useMemo(() => {
    const c = appState?.attempt_count ?? 0;
    return Math.max(0, 2 - c);
  }, [appState]);

  // --- ACTIONS ---

  const pickLunch = async () => {
    try {
      const st = await ensureAppState();
      
      let attempt = st.attempt_count + 1;
      if (st.current_pick_item_id && attempt <= st.attempt_count) {
          attempt = st.attempt_count + 1;
      }
      
      if (st.attempt_count >= 2) {
          toast.error("Today's retry limit reached!");
          return;
      }
      
      const useMenus = activeMenuPool.length > 0;
      const pool = useMenus ? activeMenuPool : activePlacePool;
      const type = useMenus ? "menu" : "place";

      if (!pool.length) {
        toast.error("No active menus or places found!");
        return;
      }

      const selected = pool[Math.floor(Math.random() * pool.length)];
      const dayKey = kDayKey();

      // Update State
      const newState = {
        ...st,
        day_key: dayKey,
        attempt_count: attempt,
        current_pick_type: type,
        current_pick_item_id: selected.item_id,
        current_pick_item_name: selected.item_name,
        current_pick_at: new Date().toISOString(),
      };

      if (isGlobalRoom && isGlobalSession) {
        const { error: upError } = await supabase
          .from("app_state")
          .update(newState)
          .eq("id", st.id);
        if (upError) throw upError;
      } else {
        await setKvState(`state:${room}:${session}`, newState);
      }
      
      setAppState(newState);
      toast.success(attempt === 1 ? "Lunch picked!" : "Retried lunch!");
      return selected;
    } catch (err: any) {
      console.error(err);
      toast.error(formatSbError(err));
    }
  };

  const submitRating = async (score: number) => {
    if (isGlobalRoom && isGlobalSession) {
        if (!currentPick) return;
        const dayKey = kDayKey();
        const { error } = await supabase.from("ratings").insert([
          {
            day_key: dayKey,
            type: currentPick.type,
            item_id: currentPick.item_id,
            rating: score,
          },
        ]);
        if (error) toast.error("Failed to save rating");
        else toast.success("Rating saved!");
    } else {
        toast.info("Ratings disabled in private rooms");
    }
  };
  
  const getAvgRating = (type: string, itemId: number) => {
      const list = ratings.filter(r => r.type === type && r.item_id === itemId);
      if(!list.length) return null;
      const sum = list.reduce((a,b)=>a + b.rating, 0);
      return (sum / list.length).toFixed(1);
  };

  // --- DATA MANAGEMENT (Adapters for PlaceManager) ---
  
  const addPlace = async (name: string): Promise<number> => {
      if (isGlobalRoom) {
          // SQL
          const { data, error } = await supabase.from("places").insert([{ name, is_active: true }]).select().single();
          if (error) throw error;
          return data.id;
      } else {
          // KV
          const newId = Date.now();
          const newPlace: Place = { id: newId, name, is_active: true, created_at: new Date().toISOString() };
          const newPlaces = [newPlace, ...places];
          await setKvState(`places:${room}`, newPlaces);
          setPlaces(newPlaces);
          return newId;
      }
  };

  const updatePlace = async (id: number, updates: Partial<Place>) => {
      if (isGlobalRoom) {
          await supabase.from("places").update(updates).eq("id", id);
      } else {
          const newPlaces = places.map(p => p.id === id ? { ...p, ...updates } : p);
          await setKvState(`places:${room}`, newPlaces);
          setPlaces(newPlaces);
      }
  };

  const deletePlace = async (id: number) => {
      if (isGlobalRoom) {
          await supabase.from("places").delete().eq("id", id);
      } else {
          const newPlaces = places.filter(p => p.id !== id);
          await setKvState(`places:${room}`, newPlaces);
          setPlaces(newPlaces);
      }
  };

  const addMenu = async (placeId: number, name: string) => {
      if (isGlobalRoom) {
          await supabase.from("menus").insert([{ place_id: placeId, name, is_active: true }]);
      } else {
          const newMenu: Menu = { 
              id: Date.now() + Math.random(), 
              place_id: placeId, 
              name, 
              is_active: true, 
              created_at: new Date().toISOString() 
          };
          const newMenus = [newMenu, ...menus];
          await setKvState(`menus:${room}`, newMenus);
          setMenus(newMenus);
      }
  };

  const updateMenu = async (id: number, updates: Partial<Menu>) => {
      if (isGlobalRoom) {
          await supabase.from("menus").update(updates).eq("id", id);
      } else {
          const newMenus = menus.map(m => m.id === id ? { ...m, ...updates } : m);
          await setKvState(`menus:${room}`, newMenus);
          setMenus(newMenus);
      }
  };

  return {
    loading,
    error,
    places,
    menus,
    appState,
    currentPick,
    attemptLeft,
    pickLunch,
    submitRating,
    getAvgRating,
    loadAll,
    // Expose management methods
    addPlace,
    updatePlace,
    deletePlace,
    addMenu,
    updateMenu,
    room,
    session
  };
}
