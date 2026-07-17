export type StudentAvatarId = "student-boy" | "student-girl" | "business-student" | "founder-student" | "defense-student" | "creative-girl";

export const studentAvatarOptions: Array<{
  id: StudentAvatarId;
  label: string;
  accent: string;
  hair: string;
  shirt: string;
  bg: string;
}> = [
  { id: "student-boy", label: "男学生", accent: "#2f80d0", hair: "#27384d", shirt: "#0b4a83", bg: "#e9f5ff" },
  { id: "student-girl", label: "女学生", accent: "#ef8bb8", hair: "#5a3a2c", shirt: "#d95f95", bg: "#fff0f7" },
  { id: "business-student", label: "商务学生", accent: "#c79a2d", hair: "#2b3345", shirt: "#123f6d", bg: "#fff7df" },
  { id: "founder-student", label: "创业学生", accent: "#17a07f", hair: "#3b2c21", shirt: "#0f7b73", bg: "#eafff8" },
  { id: "defense-student", label: "答辩学生", accent: "#7c6cf0", hair: "#2f2f4f", shirt: "#5146b8", bg: "#f0eeff" },
  { id: "creative-girl", label: "创意女生", accent: "#4fb4eb", hair: "#3f2c68", shirt: "#1e88a8", bg: "#eefaff" },
];

export const defaultStudentAvatarId: StudentAvatarId = "student-boy";

export function normalizeStudentAvatarId(avatarId?: string): StudentAvatarId {
  return studentAvatarOptions.some((option) => option.id === avatarId) ? (avatarId as StudentAvatarId) : defaultStudentAvatarId;
}
