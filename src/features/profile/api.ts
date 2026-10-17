import { http } from "@/lib/http";
import type { Profile } from "@/lib/contracts";

export async function getProfile() {
  return (await http.get<{ profile: Profile }>("/profile")).data.profile;
}

export async function updateProfile(input: Profile) {
  return (await http.patch<{ profile: Profile }>("/profile", input)).data
    .profile;
}

export async function changeProfilePassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  await http.post("/profile/password", input);
}
