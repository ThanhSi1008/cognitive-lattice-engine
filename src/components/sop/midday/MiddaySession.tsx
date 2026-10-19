"use client";

import React, { useState, useEffect } from "react";
import { NeuralIncubationLock } from "./NeuralIncubationLock";
import { FleetingNotesInbox, FleetingNoteItem } from "./FleetingNotesInbox";

interface MiddaySessionProps {
  userId?: string;
  s1CompletedAt?: Date | string | null;
  incubationUnlockAt?: Date | string | null;
  onUnlockedForAfternoon?: () => void;
}

export function MiddaySession({
  userId = "00000000-0000-0000-0000-000000000001",
  s1CompletedAt,
  incubationUnlockAt,
  onUnlockedForAfternoon,
}: MiddaySessionProps) {
  const [notes, setNotes] = useState<FleetingNoteItem[]>([]);

  const loadNotes = async () => {
    try {
      const res = await fetch(`/api/fleeting-notes?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (err) {
      console.error("Lỗi tải fleeting notes:", err);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [userId]);

  const handleAddNote = async (raw_content: string) => {
    const res = await fetch("/api/fleeting-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, raw_content, status: "PENDING" }),
    });
    if (res.ok) {
      await loadNotes();
    }
  };

  const handleDeleteNote = async (id: string) => {
    const res = await fetch(`/api/fleeting-notes?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const handlePurgeExpired = async () => {
    await loadNotes();
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Khóa Khoảng Nghỉ Sinh Học 4 Giờ */}
      <NeuralIncubationLock
        s1CompletedAt={s1CompletedAt}
        incubationUnlockAt={incubationUnlockAt}
        onUnlocked={onUnlockedForAfternoon}
      />

      {/* Hộp Đệm Ghi Chú Thoáng Qua 48h */}
      <FleetingNotesInbox
        userId={userId}
        notes={notes}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
        onPurgeExpired={handlePurgeExpired}
      />
    </div>
  );
}
