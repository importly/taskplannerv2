import React, { useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { useAllTags, useCreateTag, useUpdateTag, useDeleteTag } from "../../db/gamificationHooks";

const ATTRIBUTES = ["Systems", "Algorithms", "Logic", "Communication", "Knowledge", "Craft"];

export function TagManager() {
  const { data: tags, isLoading } = useAllTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [newTag, setNewTag] = useState({ name: "", rpg_attribute: ATTRIBUTES[0], color_hex: "#E1FF00" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ id: "", name: "", rpg_attribute: "", color_hex: "#E1FF00" });
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.name.trim()) return;
    try {
      await createTag.mutateAsync(newTag);
      setNewTag({ name: "", rpg_attribute: ATTRIBUTES[0], color_hex: "#E1FF00" });
    } catch (err) {
      console.error("Failed to create tag", err);
    }
  };

  const startEdit = (tag: { id: string; name: string; rpg_attribute: string; color_hex: string | null }) => {
    setConfirmingDeleteId(null);
    setEditingId(tag.id);
    setEditForm({ id: tag.id, name: tag.name, rpg_attribute: tag.rpg_attribute, color_hex: tag.color_hex || "#E1FF00" });
  };

  const handleUpdate = async () => {
    if (!editingId || !editForm.name.trim()) return;
    try {
      await updateTag.mutateAsync(editForm);
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update tag", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTag.mutateAsync(id);
      setConfirmingDeleteId(null);
    } catch (err) {
      console.error("Failed to delete tag", err);
      setConfirmingDeleteId(null);
    }
  };

  if (isLoading) return (
    <div className="font-mono text-xs uppercase tracking-widest text-white/20 animate-pulse" style={{ padding: 16 }}>
      Loading tags...
    </div>
  );

  return (
    <div className="flex flex-col" style={{ gap: 40 }}>
      {/* Create form */}
      <section>
        <h3
          className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]"
          style={{ marginBottom: 16 }}
        >
          Create Tag
        </h3>
        <form
          onSubmit={handleAdd}
          className="grid items-end rounded-xl border border-white/5"
          style={{
            gridTemplateColumns: "1fr 1fr auto auto",
            padding: 20,
            gap: 12,
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div className="flex flex-col" style={{ gap: 6 }}>
            <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Name</label>
            <input
              type="text"
              placeholder="e.g. cuda"
              value={newTag.name}
              onChange={e => setNewTag({ ...newTag, name: e.target.value })}
              className="bg-black border border-white/10 rounded-lg text-sm outline-none focus:border-[#E1FF00] transition-colors placeholder:text-white/10"
              style={{ padding: "9px 14px" }}
              required
            />
          </div>
          <div className="flex flex-col" style={{ gap: 6 }}>
            <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Attribute</label>
            <select
              value={newTag.rpg_attribute}
              onChange={e => setNewTag({ ...newTag, rpg_attribute: e.target.value })}
              className="bg-black border border-white/10 rounded-lg text-sm outline-none focus:border-[#E1FF00] transition-colors appearance-none cursor-pointer"
              style={{ padding: "9px 14px" }}
            >
              {ATTRIBUTES.map(attr => <option key={attr} value={attr}>{attr}</option>)}
            </select>
          </div>
          <div className="flex flex-col" style={{ gap: 6 }}>
            <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Color</label>
            <div className="flex items-center" style={{ gap: 8 }}>
              <div
                className="relative shrink-0 rounded-lg overflow-hidden border border-white/10"
                style={{ width: 38, height: 38 }}
              >
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
                className="bg-black border border-white/10 rounded-lg text-xs font-mono outline-none focus:border-[#E1FF00] transition-colors uppercase"
                style={{ padding: "9px 10px", width: 90 }}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={createTag.isPending || !newTag.name.trim()}
            className="flex items-center justify-center font-bold text-sm rounded-lg border-none cursor-pointer disabled:opacity-40 transition-all hover:brightness-110"
            style={{
              background: "#E1FF00",
              color: "#000",
              padding: "9px 20px",
              gap: 6,
              height: 38,
              alignSelf: "flex-end",
            }}
          >
            <Plus size={14} /> CREATE
          </button>
        </form>
      </section>

      {/* Tags list */}
      <section>
        <h3
          className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]"
          style={{ marginBottom: 16 }}
        >
          Tags
        </h3>
        <div className="flex flex-col" style={{ gap: 8 }}>
          {tags?.length === 0 && (
            <div
              className="text-center rounded-xl border border-dashed border-white/5 text-white/20 font-mono text-xs uppercase tracking-widest"
              style={{ padding: 40 }}
            >
              No tags yet
            </div>
          )}
          {tags?.map(tag => {
            const isEditing = editingId === tag.id;
            const isConfirmingDelete = confirmingDeleteId === tag.id;

            return (
              <div
                key={tag.id}
                className="flex items-center rounded-xl border transition-all duration-150"
                style={{
                  gap: 14,
                  padding: 14,
                  background: isConfirmingDelete
                    ? "rgba(255,59,48,0.06)"
                    : "rgba(255,255,255,0.01)",
                  borderColor: isConfirmingDelete
                    ? "rgba(255,59,48,0.2)"
                    : "rgba(255,255,255,0.05)",
                }}
              >
                {/* Color dot */}
                <div
                  className="shrink-0 rounded-full"
                  style={{
                    width: 10,
                    height: 10,
                    background: tag.color_hex || "#555",
                    boxShadow: `0 0 8px ${tag.color_hex || "transparent"}`,
                  }}
                />

                {/* Body — view or edit */}
                {isEditing ? (
                  <div
                    className="flex-1 grid items-center"
                    style={{ gridTemplateColumns: "1fr 1fr auto", gap: 10 }}
                  >
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      className="bg-black border border-white/10 rounded-lg text-sm outline-none focus:border-[#E1FF00] transition-colors"
                      style={{ padding: "6px 10px" }}
                    />
                    <select
                      value={editForm.rpg_attribute}
                      onChange={e => setEditForm({ ...editForm, rpg_attribute: e.target.value })}
                      className="bg-black border border-white/10 rounded-lg text-xs outline-none focus:border-[#E1FF00] transition-colors appearance-none cursor-pointer"
                      style={{ padding: "6px 10px" }}
                    >
                      {ATTRIBUTES.map(attr => <option key={attr} value={attr}>{attr}</option>)}
                    </select>
                    <div className="relative shrink-0 rounded-md overflow-hidden border border-white/10" style={{ width: 30, height: 30 }}>
                      <input
                        type="color"
                        value={editForm.color_hex}
                        onChange={e => setEditForm({ ...editForm, color_hex: e.target.value })}
                        className="absolute inset-0 w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center" style={{ gap: 10 }}>
                    <span className="font-mono text-sm font-semibold text-white/90">{tag.name}</span>
                    <span
                      className="text-[9px] rounded font-bold uppercase tracking-[0.12em] text-white/40 border border-white/5"
                      style={{ padding: "3px 8px", background: "rgba(255,255,255,0.03)" }}
                    >
                      {tag.rpg_attribute}
                    </span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center shrink-0" style={{ gap: 4 }}>
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleUpdate}
                        disabled={updateTag.isPending}
                        className="rounded-lg border-none cursor-pointer transition-all hover:brightness-125 disabled:opacity-40"
                        style={{ padding: 7, background: "rgba(225,255,0,0.12)", color: "#E1FF00" }}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border-none cursor-pointer transition-colors hover:bg-white/10"
                        style={{ padding: 7, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : isConfirmingDelete ? (
                    <>
                      <span className="text-xs font-mono" style={{ color: "rgba(255,59,48,0.7)", marginRight: 4 }}>
                        Delete?
                      </span>
                      <button
                        onClick={() => handleDelete(tag.id)}
                        disabled={deleteTag.isPending}
                        className="rounded-lg border-none cursor-pointer transition-all hover:brightness-125 disabled:opacity-40"
                        style={{ padding: 7, background: "rgba(255,59,48,0.15)", color: "#FF3B30" }}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(null)}
                        className="rounded-lg border-none cursor-pointer transition-colors hover:bg-white/10"
                        style={{ padding: 7, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(tag)}
                        className="rounded-lg border-none cursor-pointer transition-colors hover:bg-white/10"
                        style={{ padding: 7, background: "transparent", color: "rgba(255,255,255,0.25)" }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setConfirmingDeleteId(tag.id); }}
                        className="rounded-lg border-none cursor-pointer transition-colors hover:bg-[#FF3B30]/10"
                        style={{ padding: 7, background: "transparent", color: "rgba(255,59,48,0.35)" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
