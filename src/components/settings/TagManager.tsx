import React, { useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { useAllTags, useCreateTag, useUpdateTag, useDeleteTag } from "../../db/gamificationHooks";
import { Button } from "../ui/button";

const ATTRIBUTES = ["Systems", "Algorithms", "Logic", "Communication", "Knowledge", "Craft"];

export function TagManager() {
  const { data: tags, isLoading } = useAllTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [newTag, setNewTag] = useState({ id: "", rpg_attribute: ATTRIBUTES[0], color_hex: "#E1FF00" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ id: "", rpg_attribute: "", color_hex: "" });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.id) return;
    try {
      await createTag.mutateAsync(newTag);
      setNewTag({ id: "", rpg_attribute: ATTRIBUTES[0], color_hex: "#E1FF00" });
    } catch (err) {
      console.error("Failed to create tag", err);
    }
  };

  const startEdit = (tag: any) => {
    setEditingId(tag.id);
    setEditForm(tag);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      await updateTag.mutateAsync(editForm);
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update tag", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(`Delete tag "${id}"?`)) {
      try {
        await deleteTag.mutateAsync(id);
      } catch (err) {
        console.error("Failed to delete tag", err);
      }
    }
  };

  if (isLoading) return <div className="p-4 text-muted animate-pulse font-mono text-xs uppercase tracking-widest">Initialising Tags...</div>;

  return (
    <div className="space-y-12">
      {/* Add Tag Form */}
      <section className="relative">
        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-accent/20 rounded-full" />
        <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-6">Nexus / Create Tag</h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
          <div className="space-y-2">
            <label className="text-[9px] uppercase font-bold text-white/40 tracking-widest ml-1">Slug (ID)</label>
            <input
              type="text"
              placeholder="e.g. rust"
              value={newTag.id}
              onChange={e => setNewTag({ ...newTag, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none transition-all placeholder:text-white/10"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] uppercase font-bold text-white/40 tracking-widest ml-1">Attribute</label>
            <select
              value={newTag.rpg_attribute}
              onChange={e => setNewTag({ ...newTag, rpg_attribute: e.target.value })}
              className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none transition-all appearance-none cursor-pointer"
            >
              {ATTRIBUTES.map(attr => <option key={attr} value={attr}>{attr}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] uppercase font-bold text-white/40 tracking-widest ml-1">Color</label>
            <div className="flex gap-2 items-center">
               <div className="relative w-10 h-10 shrink-0 rounded-lg overflow-hidden border border-white/10">
                <input
                  type="color"
                  value={newTag.color_hex}
                  onChange={e => setNewTag({ ...newTag, color_hex: e.target.value })}
                  className="absolute inset-0 w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                />
              </div>
              <input
                type="text"
                value={newTag.color_hex}
                onChange={e => setNewTag({ ...newTag, color_hex: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-xs font-mono focus:border-accent outline-none uppercase"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={createTag.isPending || !newTag.id}
            className="w-full h-[46px] bg-accent text-black hover:shadow-[0_0_20px_rgba(225,255,0,0.3)] transition-all font-black"
          >
            <Plus size={18} className="mr-2" /> CREATE
          </Button>
        </form>
      </section>

      {/* Tags List */}
      <section>
        <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-6">Active Registries</h3>
        <div className="grid gap-3">
          {tags?.length === 0 && (
            <div className="p-12 text-center rounded-2xl border border-dashed border-white/5 text-white/20 font-mono text-xs uppercase tracking-widest">
              No tags found in registry
            </div>
          )}
          {tags?.map(tag => (
            <div 
              key={tag.id} 
              className="group flex items-center gap-6 p-4 rounded-xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] hover:border-white/10 transition-all"
            >
              <div 
                className="w-4 h-4 rounded-full shadow-[0_0_15px_var(--shadow-color)] shrink-0" 
                style={{ backgroundColor: tag.color_hex || '#555', '--shadow-color': tag.color_hex || 'transparent' } as any} 
              />
              
              {editingId === tag.id ? (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                   <div className="text-xs font-mono text-white/40 uppercase tracking-tighter">{tag.id}</div>
                  <select
                    value={editForm.rpg_attribute}
                    onChange={e => setEditForm({ ...editForm, rpg_attribute: e.target.value })}
                    className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:border-accent outline-none appearance-none cursor-pointer"
                  >
                    {ATTRIBUTES.map(attr => <option key={attr} value={attr}>{attr}</option>)}
                  </select>
                  <div className="flex gap-2 items-center">
                    <div className="relative w-8 h-8 shrink-0 rounded-md overflow-hidden border border-white/10">
                      <input
                        type="color"
                        value={editForm.color_hex}
                        onChange={e => setEditForm({ ...editForm, color_hex: e.target.value })}
                        className="absolute inset-0 w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                      />
                    </div>
                    <input
                      type="text"
                      value={editForm.color_hex}
                      onChange={e => setEditForm({ ...editForm, color_hex: e.target.value })}
                      className="flex-1 bg-black border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-mono focus:border-accent outline-none uppercase"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <span className="font-mono text-sm font-bold tracking-tight text-white/90 min-w-[100px]">{tag.id}</span>
                    <span className="text-[9px] px-2.5 py-1 rounded-md bg-white/5 text-white/50 border border-white/5 font-black uppercase tracking-[0.15em]">
                      {tag.rpg_attribute}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {editingId === tag.id ? (
                  <>
                    <button onClick={handleUpdate} className="p-2 rounded-lg bg-accent/10 text-accent hover:bg-accent hover:text-black transition-all">
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-2 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all">
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => startEdit(tag)} 
                      className="p-2 rounded-lg bg-white/5 text-white/40 opacity-0 group-hover:opacity-100 hover:bg-white/10 hover:text-white transition-all"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(tag.id)} 
                      className="p-2 rounded-lg bg-red-500/5 text-red-500/40 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
