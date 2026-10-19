"use client";

import React, { useState, useEffect } from "react";
import { AtomicZettelStudio } from "./AtomicZettelStudio";
import { CheckCircle2 } from "lucide-react";

interface AfternoonSessionProps {
  userId?: string;
  onCompleteSession: (zettelUid: string) => void;
}

export function AfternoonSession({
  userId = "00000000-0000-0000-0000-000000000001",
  onCompleteSession,
}: AfternoonSessionProps) {
  const [literatureNote, setLiteratureNote] = useState<any>(null);
  const [fleetingNotes, setFleetingNotes] = useState<any[]>([]);
  const [existingZettels, setExistingZettels] = useState<any[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [publishedUid, setPublishedUid] = useState<string | null>(null);

  useEffect(() => {
    // Tải dữ liệu Literature Note mới nhất
    fetch(`/api/literature-notes?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.notes && data.notes.length > 0) {
          setLiteratureNote(data.notes[0]);
        }
      })
      .catch((err) => console.error(err));

    // Tải Fleeting Notes đang pending
    fetch(`/api/fleeting-notes?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.notes) {
          setFleetingNotes(data.notes.filter((n: any) => n.status === "PENDING"));
        }
      })
      .catch((err) => console.error(err));

    // Tải danh sách Zettels hiện có để làm mục tiêu liên kết
    fetch(`/api/zettels?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.zettels) {
          setExistingZettels(data.zettels);
        }
      })
      .catch((err) => console.error(err));
  }, [userId]);

  const handlePublished = (uid: string) => {
    setPublishedUid(uid);
    setIsCompleted(true);
    onCompleteSession(uid);
  };

  if (isCompleted && publishedUid) {
    return (
      <div className="bg-purple-950/30 border border-purple-800 rounded-2xl p-8 flex flex-col items-center text-center gap-4">
        <CheckCircle2 className="w-12 h-12 text-purple-400" />
        <h2 className="text-xl font-bold text-white">Xuất Bản Zettel [[{publishedUid}]] Thành Công!</h2>
        <p className="text-sm text-slate-300 max-w-lg">
          Zettel nguyên tử và tối thiểu 2 liên kết hai chiều đã được lưu vào đồ thị mạng lưới tri thức. Các thẻ FSRS nhiễu loạn đã được đưa vào hàng đợi ôn tập.
        </p>
        <div className="text-xs text-slate-400 font-mono bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
          Hãy sẵn sàng cho Phiên Tối: Gợi nhớ trang trắng và Luyện tập đan xen FSRS.
        </div>
      </div>
    );
  }

  return (
    <AtomicZettelStudio
      userId={userId}
      literatureNote={literatureNote}
      fleetingNotes={fleetingNotes}
      existingZettels={
        existingZettels.length >= 2
          ? existingZettels
          : [
              {
                zettel_uid: "20261019000001",
                atomic_title: "Ngắt mạch nợ nhận thức bảo toàn khả năng xử lý thông tin",
                domain_category: "Cognitive Science",
              },
              {
                zettel_uid: "20261019000002",
                atomic_title: "Phản hồi phi tuyến tính và bẫy trễ trong hệ thống phức tạp",
                domain_category: "System Dynamics",
              },
            ]
      }
      onZettelPublished={handlePublished}
    />
  );
}
