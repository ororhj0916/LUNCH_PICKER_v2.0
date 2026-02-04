import React, { useState } from "react";
import { useLunch, Place, Menu } from "@/hooks/use-lunch";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { toast } from "sonner";
import { 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  X,
  Utensils
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export function PlaceManager({ lunch }: { lunch: ReturnType<typeof useLunch> }) {
  const { places, menus, addPlace, addMenu } = lunch;
  const [newName, setNewName] = useState("");
  const [newMenus, setNewMenus] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Add Place
  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error("Enter a name first");
      return;
    }
    setIsAdding(true);
    try {
      const placeId = await addPlace(newName.trim());
      
      const menuList = newMenus
        .split(/[,\n]+/)
        .map(s => s.trim())
        .filter(Boolean);

      if (menuList.length > 0 && placeId) {
        for (const name of menuList) {
            await addMenu(placeId, name);
        }
      }

      toast.success("Saved successfully");
      setNewName("");
      setNewMenus("");
    } catch (err: any) {
      if (err.message === "ALREADY_EXISTS") {
          toast.error("This place is already in the list!");
      } else {
          toast.error("Failed to add place");
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 space-y-12">
      {/* Add New Section */}
      <div className="space-y-6">
        <h3 className="text-3xl font-['Pixelify_Sans'] text-white drop-shadow-[2px_2px_0px_#000]">
          &gt; ADD NEW PLACE
        </h3>
        <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_#000] text-black">
          <div className="grid gap-4 md:grid-cols-[1fr,1fr,auto] items-start">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase">NAME</label>
              <Input 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                placeholder="Ex: McDonald's"
                onKeyDown={e => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase">MENU ITEMS (Comma separated)</label>
              <Input 
                value={newMenus}
                onChange={e => setNewMenus(e.target.value)}
                placeholder="Burger, Fries, Coke"
                onKeyDown={e => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div className="pt-5">
              <Button onClick={handleAdd} isLoading={isAdding} size="icon" className="bg-[#7000FF] hover:bg-[#8020FF]">
                <Plus className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* List Section */}
      <div className="space-y-6">
        <h3 className="text-3xl font-['Pixelify_Sans'] text-white drop-shadow-[2px_2px_0px_#000]">
          &gt; SAVED PLACES
        </h3>
        
        <div className="grid gap-4">
          {places.map(place => (
            <PlaceItem 
              key={place.id} 
              place={place} 
              allMenus={menus} 
              lunch={lunch}
            />
          ))}
          {places.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 border-4 border-dashed border-gray-700 bg-black/20 rounded-lg text-center gap-4">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center text-gray-500">
                  <Utensils className="w-8 h-8" />
              </div>
              <div>
                  <h4 className="text-xl font-bold text-gray-400">NO PLACES YET</h4>
                  <p className="text-sm text-gray-600 mt-1">Add your favorite lunch spots above!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlaceItem({ place, allMenus, lunch }: { place: Place, allMenus: Menu[], lunch: ReturnType<typeof useLunch> }) {
  const { togglePlace, deletePlace, addMenu, toggleMenu, updatePlaceName, refresh } = lunch;
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(place.name);
  const [newMenuName, setNewMenuName] = useState("");

  const placeMenus = allMenus.filter(m => m.place_id === place.id);
  const activeMenus = placeMenus.filter(m => m.is_active);

  const handleToggleActive = async () => {
    await togglePlace(place.id);
  };

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    await updatePlaceName(place.id, editName.trim());
    setIsEditing(false);
  };

  const handleAddMenu = async () => {
    if (!newMenuName.trim()) return;
    await addMenu(place.id, newMenuName.trim());
    setNewMenuName("");
    // Focus kept by React
  };

  const handleDelete = async () => {
      if(confirm('DELETE PLACE?')) {
          await deletePlace(place.id);
      }
  };

  return (
    <motion.div 
      layout
      initial={false}
      className={cn(
        "group bg-white border-4 border-black transition-all duration-200 shadow-[4px_4px_0px_0px_#000]",
        !place.is_active && "opacity-60 bg-gray-100"
      )}
    >
      <div className="p-4 flex items-center gap-4">
        <div className="flex-1 min-w-0 cursor-pointer font-mono" onClick={() => setIsOpen(!isOpen)}>
          {isEditing ? (
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <Input 
                value={editName} 
                onChange={e => setEditName(e.target.value)} 
                className="h-10 text-lg font-bold text-black"
                autoFocus
              />
              <Button size="icon" className="h-10 w-10 bg-[#00FF94] text-black hover:bg-[#33FFAB]" onClick={handleSaveName}>
                <Check className="w-5 h-5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-10 w-10 text-black" onClick={() => setIsEditing(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
               <div className="w-2 h-2 bg-black rounded-full" />
               <h4 className="text-xl font-bold text-black uppercase tracking-tight">{place.name}</h4>
               <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-0.5 border border-black">
                 {activeMenus.length} ITEMS
               </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
            {!isEditing && (
              <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-black" onClick={() => setIsEditing(true)}>
                EDIT
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-black hover:text-red-600 hover:bg-red-50" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
        </div>

        <Button 
          size="sm" 
          variant={place.is_active ? "primary" : "secondary"}
          onClick={(e) => { e.stopPropagation(); handleToggleActive(); }}
          className={cn("h-8 text-xs font-bold", place.is_active ? "bg-black text-white hover:bg-gray-800" : "bg-gray-200 text-gray-500")}
        >
          {place.is_active ? "ON" : "OFF"}
        </Button>

        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="h-8 w-8 flex items-center justify-center border-2 border-black hover:bg-black hover:text-white transition-colors text-black"
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-black/5 border-t-2 border-black"
          >
            <div className="p-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                {placeMenus.map(menu => (
                  <MenuItem key={menu.id} menu={menu} toggleMenu={toggleMenu} />
                ))}
              </div>
              <div className="flex gap-2 max-w-sm">
                <Input 
                  placeholder="Add item..." 
                  value={newMenuName}
                  onChange={e => setNewMenuName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddMenu()}
                  className="h-10 bg-white text-xs text-black"
                />
                <Button size="sm" onClick={handleAddMenu} className="h-10 bg-black text-white hover:bg-gray-800">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MenuItem({ menu, toggleMenu }: { menu: Menu, toggleMenu: any }) {
  const toggle = async () => {
    await toggleMenu(menu.id);
  };

  return (
    <button 
      onClick={toggle}
      className={cn(
        "px-3 py-1.5 border-2 text-xs font-bold font-mono transition-all",
        menu.is_active 
          ? "bg-[#00FF94] border-black text-black shadow-[2px_2px_0px_0px_#000] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_0px_#000]" 
          : "bg-gray-200 border-gray-400 text-gray-500 line-through"
      )}
    >
      {menu.name}
    </button>
  );
}
